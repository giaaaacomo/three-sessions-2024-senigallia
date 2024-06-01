import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

let scene;
let groundMate, humanMate;
let groundGeom;
let animation;
let onWindowResize;
let noise3D;
let controls;
let loaderGLTF;
let mixer;

// Separate the animations into two arrays
let mainAnimations = [];
let idleAnimations = [];

export function sketch() {
    // console.log("Sketch launched")

    // PARAMETERS
    const p = {
        // colors
        availableColorsHighlights: [0xffffff, 0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff],
        availableColors: [0xffffff, 0xcc0000, 0x00cc00, 0x0000cc, 0xcccc00, 0x00cccc, 0xcc00cc],
        // objects
        lightSpeed: 1,
        // ...
        // view
        lookAtCenter: new THREE.Vector3(0, 0, 0),
        cameraPosition: new THREE.Vector3(0, 1, -10),
        autoRotate: false,
        autoRotateSpeed: -.05,
        camera: 35,
        // ...
        // world
        background: new THREE.Color(0xffffff),
        floor: -0.5,
        // ...
    }

    // select main scene color, random choose for now
    let whichColor = p.availableColors.length * Math.random() | 0
    p.background = new THREE.Color(p.availableColors[whichColor])

    // other parameters
    let near = 0.2, far = 200
    let shadowMapWidth = 2048, shadowMapHeight = 2048

    // CAMERA
    let camera = new THREE.PerspectiveCamera(p.camera, window.innerWidth / window.innerHeight, near, far)
    camera.position.copy(p.cameraPosition)
    camera.lookAt(p.lookAtCenter)

    // WINDOW RESIZE
    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onWindowResize)

    // CONTROLS
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 5
    controls.maxDistance = 15
    controls.maxPolarAngle = Math.PI / 2
    controls.minPolarAngle = Math.PI / 2 - 0.2
    controls.maxAzimuthAngle = - Math.PI / 2
    controls.minAzimuthAngle = Math.PI / 2
    controls.autoRotate = p.autoRotate
    controls.autoRotateSpeed = p.autoRotateSpeed
    controls.target = p.lookAtCenter

    // SCENE
    scene = new THREE.Scene()
    scene.background = p.background
    scene.fog = new THREE.Fog(scene.background, 10, 30)
    // materials
    humanMate = new THREE.MeshStandardMaterial({
        color: p.background,
        roughness: 0.5,
        metalness: 0,
        fog: true,
        flatShading: true,
    })
    groundMate = new THREE.MeshStandardMaterial({
        color: p.background,
        roughness: 1,
        metalness: 0,
        fog: true,
    })


    // GEOMETRIES
    // let's make a ground
    groundGeom = new THREE.PlaneGeometry(20, 20)
    let ground = new THREE.Mesh(groundGeom, groundMate)
    ground.position.set(0, p.floor, 0)
    ground.rotation.x = - Math.PI / 2
    ground.scale.set(100, 100, 100)
    ground.castShadow = false
    ground.receiveShadow = true
    scene.add(ground)

    // Let's load our low poly human
    loaderGLTF = new GLTFLoader();
    loaderGLTF.load(
        './assets/models/Orlando_pose_threejs.glb',
        (gltf) => {
            // Separate animations into main and idle arrays
            mainAnimations = gltf.animations.slice(0, gltf.animations.length - 3);
            idleAnimations = gltf.animations.slice(gltf.animations.length - 3);

            human = gltf.scene;
            const box = new THREE.Box3().setFromObject(human);
            const size = box.getSize(new THREE.Vector3());
            human.traverse((node) => {
                if (node.isMesh) {
                    node.material = humanMate;
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            human.position.y = p.floor + size.y / 2 - 0.5;
            human.position.z = 2;
            human.rotation.y = Math.PI;

            // Create Animation Actions for main and idle animations
            const mainActions = mainAnimations.map(clip => mixer.clipAction(clip));
            const idleActions = idleAnimations.map(clip => mixer.clipAction(clip));

            let currentAction;
            const crossfadeDuration = 0.5; // Crossfade duration in seconds

            function playAnimations() {
                // Pick a random main animation
                const mainAction = mainActions[Math.floor(Math.random() * mainActions.length)];

                // Crossfade from the current animation to the new main animation
                if (currentAction) {
                    mainAction.crossFadeFrom(currentAction, crossfadeDuration, true);
                }
                mainAction.play();

                // After the main animation finishes, play a random idle animation
                mainAction.getClip().duration
                    ? setTimeout(() => {
                        const idleAction = idleActions[Math.floor(Math.random() * idleActions.length)];
                        idleAction.crossFadeFrom(mainAction, crossfadeDuration, true);
                        idleAction.play();

                        // After the idle animation, play another random main animation
                        idleAction.getClip().duration
                            ? setTimeout(() => {
                                playAnimations();
                            }, idleAction.getClip().duration * 1000)
                            : playAnimations();
                    }, mainAction.getClip().duration * 1000)
                    : playAnimations();

                currentAction = mainAction;
            }

            // Start the animation sequence
            playAnimations();

            scene.add(human);
        },
        (xhr) => {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded')
        },
        (error) => {
            // console.log('An error happened loading the GLTF scene')
        }
    );
}
    export function dispose() {
        cancelAnimationFrame(animation);
        controls?.dispose();
        groundGeom?.dispose();
        groundMate?.dispose();
        humanMate?.dispose();
        noise3D = null;
        window.removeEventListener('resize', onWindowResize);
    }

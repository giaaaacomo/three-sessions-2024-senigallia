import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

let scene
let groundMate, humanMate
let groundGeom
let animation
let onWindowResize
let noise3D
/* let renderer
let clock; */
// let gui
let controls
let loaderGLTF
let mixer

const mixers = [], objects = [];
animate();

export function sketch() {
    // console.log("Sketch launched")

    // PARAMETERS ------------------------------------------------------------------------------
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
    controls.maxDistance = 45
    controls.maxPolarAngle = Math.PI / 2
    controls.minPolarAngle = Math.PI / 2 - 0.2
    controls.maxAzimuthAngle = - Math.PI / 2 //limite per non andare dietro
    controls.minAzimuthAngle = Math.PI / 2
    controls.autoRotate = p.autoRotate
    controls.autoRotateSpeed = p.autoRotateSpeed
    controls.target = p.lookAtCenter

    // SCENE ------------------------------------------------------------------------------
    scene = new THREE.Scene()
    scene.background = p.background
    scene.fog = new THREE.Fog(scene.background, 1, 50)

    // MATERIALI ------------------------------------------------------------------------------
    //materiale omino
    humanMate = new THREE.MeshStandardMaterial({
        color: p.background,
        roughness: 0.5,
        metalness: 0,
        fog: true,
        flatShading: true,
    })
    //materiale delle pareti
    groundMate = new THREE.MeshStandardMaterial({
        color: p.background,
        roughness: 1,
        metalness: 0,
        fog: true,
    })


    //materiale emissivo della cornice
    let emissiveMaterial = new THREE.MeshStandardMaterial({
    emissive: 0xff0000, // Colore rosso
    emissiveIntensity: 200, // Intensità della luce emissiva
    roughness: 0.5,
    metalness: 0,
    fog: true,
    flatShading: true
    });

// GEOMETRIES ------------------------------------------------------------------------------


    
    // let's make a ground PIANO
    groundGeom = new THREE.PlaneGeometry(20, 20)
    let ground = new THREE.Mesh(groundGeom, groundMate)
    ground.position.set(0, p.floor, 0)
    ground.rotation.x = - Math.PI / 2
    ground.scale.set(100, 100, 100)
    ground.castShadow = false
    ground.receiveShadow = true
    scene.add(ground)

   
// Creazione del piano con buco rettangolare
const width = 18;
const height = 8;
const holeWidth = 3;
const holeHeight = 4;

// Creazione della forma principale
const shape = new THREE.Shape();
shape.moveTo(-width / 2, -height / 2);
shape.lineTo(width / 2, -height / 2);
shape.lineTo(width / 2, height / 2);
shape.lineTo(-width / 2, height / 2);
shape.lineTo(-width / 2, -height / 2);

// Creazione del buco rettangolare
const hole = new THREE.Path();
hole.moveTo(-holeWidth / 2, -holeHeight / 2);
hole.lineTo(holeWidth / 2, -holeHeight / 2);
hole.lineTo(holeWidth / 2, holeHeight / 2);
hole.lineTo(-holeWidth / 2, holeHeight / 2);
hole.lineTo(-holeWidth / 2, -holeHeight / 2);

shape.holes.push(hole);

// Creazione della geometria e del materiale
const newgeometry = new THREE.ShapeGeometry(shape);
const newmaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
const plane = new THREE.Mesh(newgeometry, newmaterial);

scene.add(plane);

// Creazione del perimetro luminoso per il buco
const holeShape = new THREE.Shape();
holeShape.moveTo(-holeWidth / 2, -holeHeight / 2);
holeShape.lineTo(holeWidth / 2, -holeHeight / 2);
holeShape.lineTo(holeWidth / 2, holeHeight / 2);
holeShape.lineTo(-holeWidth / 2, holeHeight / 2);
holeShape.lineTo(-holeWidth / 2, -holeHeight / 2);

const holeGeometry = new THREE.ShapeGeometry(holeShape);
const emissivetrialMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 200});
const holeMesh = new THREE.Mesh(holeGeometry, emissivetrialMaterial);

// Posiziona il perimetro del buco in modo che si sovrapponga al buco del piano
holeMesh.position.z = 0.01;
plane.position.z=8;
plane.position.y=2;

plane.add(holeMesh);

// Let's load our low poly human
    // GLTFLoader
    let gltfLoaded = false
    let human
    loaderGLTF = new GLTFLoader()
    loaderGLTF.load(
    // resource URL
    './assets/models/Orlando_NLA_threejs.glb',
    // called when the resource is loaded
    (gltf) => {
        human = gltf.scene

        // Regola la scala dell'omino
        const scale = 0.85; // Scala desiderata
        human.scale.set(scale, scale, scale);

        // Posizione desiderata
        const positionX = 0; // Posizione lungo l'asse X
        const positionY = p.floor; // Posizione lungo l'asse Y (sul pavimento)
        const positionZ = 5; // Posizione lungo l'asse Z

        // Applica la posizione
        human.position.set(positionX, positionY, positionZ);

        // Regola la rotazione dell'omino
        const rotationY = Math.PI; // Rotazione attorno all'asse Y
        human.rotation.y = rotationY;

        // Abilita le ombre sull'omino
        human.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        // Animazioni
        mixer = new THREE.AnimationMixer(human);
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();

        // Aggiungi l'omino alla scena
        scene.add(human);

        // Indica che il modello è stato caricato
        gltfLoaded = true;
    },
    (xhr) => {
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    (error) => {
        // console.log('An error happened loading the GLTF scene')
    }
)

    
   
// GLTFLoader DELLA SCENA DA BLENDER - M
let gltfLoaded2 = false;
let pannelli;
let pannelliPosition = { x: 0, y: -1, z: 3.5 }; // Posizione iniziale dell'elemento
let pannelliRotation = Math.PI; // Rotazione iniziale attorno all'asse Y

loaderGLTF.load(
    './assets/models/scena_tarot.gltf',
    (gltf) => {
        pannelli = gltf.scene;

        // Ruota l'elemento di 180 gradi attorno all'asse Y per correggere l'import 
      /*  pannelli.rotation.y = pannelliRotation;
        // Imposta la posizione iniziale dell'elemento
        pannelli.position.set(pannelliPosition.x, pannelliPosition.y, pannelliPosition.z);
        // Crea i materiali
        const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const redEmissiveMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 500
        });
        // Assegna i materiali alle mesh 
        pannelli.traverse((node) => {
            if (node.isMesh) {
                if (node.name === 'bordo') {
                    node.material = redEmissiveMaterial;
                } else {
                    node.material = groundMate;
                }
                // Abilita le ombre per ogni mesh
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        // Aggiungi l'elemento alla scena
        scene.add(pannelli); */
        // Indica che il modello è stato caricato


        gltfLoaded2 = true;
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('An error happened loading the GLTF scene', error);
    }
);




    // LIGHTS ------------------------------------------------------------------------------

    //  RECT LIGHT TRA I DUE MURI per luce indiretta
    RectAreaLightUniformsLib.init();
    // Variabili per la RectAreaLight
    let rectLightWidth = 2;
    let rectLightHeight = 5.5;
    let rectLightIntensity = 15;
    let rectLightColor = 0xffffff;
    let rectLightXPosition = 6; // Spostamento a sinistra
    let rectLightYPosition = 3; // in altezza
    let rectLightZPosition = 9.5;
    let rectLightRotationY = Math.PI / 2; // Rotazione 
    // Creazione della RectAreaLight
    const rectLight = new THREE.RectAreaLight(rectLightColor, rectLightIntensity, rectLightWidth, rectLightHeight);
    rectLight.position.set(rectLightXPosition, rectLightYPosition, rectLightZPosition);
    rectLight.rotation.y = rectLightRotationY; // Applicazione della rotazione
        // Aggiungi la RectAreaLight alla scena
    scene.add(rectLight);
    // Aggiungi il RectAreaLightHelper per visualizzare l'area della luce
    const rectLightHelper = new RectAreaLightHelper(rectLight);
    rectLight.add(rectLightHelper);
    


    const lightScale = 1; // Scala per la luce direzionale

    //DIRECTIONAL LIGHT
    const light = new THREE.DirectionalLight(0xffffff, .1); //colore , posizione
    light.position.set(0 * lightScale, 2 * lightScale, 7 * lightScale); // Moltiplica per la scala
    light.castShadow = true;
    light.shadow.radius = 8;
    light.shadow.camera.near = 2;
    light.shadow.camera.far = 200;
    light.shadow.bias = 0.0001;
    light.shadow.mapSize.width = shadowMapWidth;
    light.shadow.mapSize.height = shadowMapHeight;
    scene.add(light);

    const lightHelper = new THREE.DirectionalLightHelper(light, 5);
    scene.add(lightHelper);

    // GUI
    // gui = new GUI.GUI()
    // const nameFolder = gui.addFolder('Name of the folder')
    // nameFolder.add(cube.rotation, 'x', 0, Math.PI * 2)
    // nameFolder.open()
    // ...

    // NOISE
    noise3D = NOISE.createNoise3D()
    const t0 = Math.random() * 10

    const clock = new THREE.Clock()

    // ANIMATE
    const animate = () => {
        if (showStats) stats.begin() // XXX

        // ANIMATION
        const t = t0 + performance.now() * 0.0001
        const t1 = t * p.lightSpeed + 0
        light.position.x = -3 + noise3D(0, t1, 0) * 6
        // ...

        let dt = clock.getDelta()
        if (mixer) mixer.update(dt)

        controls.update()
        renderer.render(scene, camera) // RENDER
        if (showStats) stats.end() // XXX

        animation = requestAnimationFrame(animate) // CIAK
    }
    animate()
}

export function dispose() {
    cancelAnimationFrame(animation)
    controls?.dispose()
    groundGeom?.dispose()
    groundMate?.dispose()
    humanMate?.dispose()
    noise3D = null
    // gui?.destroy()
    // ...
    window.removeEventListener('resize', onWindowResize)
}
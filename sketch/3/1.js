//TEST CLOTH + 3D MODEL

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, animation, onWindowResize, controls, onMouseMove
let groundGeom
let groundMate, clothMaterial, mirrorMate
let world
let noise3D
let cloth, clothParticles, constraints = []
let flowField

export function sketch() {

    let mouse = new THREE.Vector2()
    onMouseMove = (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    };
    window.addEventListener('mousemove', onMouseMove);

    const p = {
        // cloth
        clothWidth: 10,
        clothHeight: 10,
        clothResolution: 22,
        // view
        lookAtCenter: new THREE.Vector3(0, 2, 0),
        cameraPosition: new THREE.Vector3(-1 + Math.random() * 2, -0.6, - 10 - Math.random()* 2),
        autoRotate: true,
        autoRotateSpeed: -.1 + Math.random() * .1,
        camera: 35,
        // world
        background: new THREE.Color(0x000000),
        clothMass: 1,
        gravity: 40,
        wind: true,
        windStrength: .1 + Math.random(),
        floor: -1,
    };

    // other parameters
    let near = 0.2, far = 1000;
    let shadowMapWidth = 2048, shadowMapHeight = 2048;
    let paused = false;

    // CAMERA
    let camera = new THREE.PerspectiveCamera(p.camera, window.innerWidth / window.innerHeight, near, far)
    camera.position.copy(p.cameraPosition)
    camera.lookAt(p.lookAtCenter)

    // WINDOW RESIZE
    onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // SCENE
    scene = new THREE.Scene()
    scene.background = p.background
    scene.fog = new THREE.Fog(scene.background, 3, 20)
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, p.gravity, 0)
    });
    world.solver.iterations = 10

    // MATERIALS
    groundMate = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: .7,
        metalness: .3,
        fog: true,
        
    })
    mirrorMate = new THREE.MeshPhongMaterial({
        color: 0x999999,
        envMap: cubeTextures[0].texture,
        emissive: 0xffffff,
        // side: THREE.DoubleSide,
        // combine: THREE.addOperation,
        reflectivity: .3,
        // flatShading: true,
        shininess: 100,
        specular: 0xffffff,
        fog: true
    })

    // Static ground plane
    groundGeom = new THREE.PlaneGeometry(20, 20)
    let ground = new THREE.Mesh(groundGeom, groundMate)
    ground.position.set(0, p.floor, 0)
    ground.rotation.x = - Math.PI / 2
    ground.scale.set(100, 100, 100)
    ground.castShadow = false
    ground.receiveShadow = true
    scene.add(ground)
    const groundBody = new CANNON.Body({
        position: new CANNON.Vec3(0, p.floor - 1, 0),
        mass: 0,
        shape: new CANNON.Plane(),
    });
    // groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    // groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    // world.addBody(groundBody);
    // ground.position.copy(groundBody.position);
    // ground.quaternion.copy(groundBody.quaternion);

    // CONTROLS
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;
    controls.minPolarAngle = Math.PI / 2 - 0.4;
    controls.autoRotate = p.autoRotate;
    controls.autoRotateSpeed = p.autoRotateSpeed;
    controls.target = p.lookAtCenter;
    
    // FORESTA
    const treeLength = 4
    const lanceGeometry = new THREE.CylinderGeometry(0.01, 0.05, treeLength, 16);
    const numRows = 1 + Math.random() * 5;
    const numCols = 1 + Math.random() * 5;
    const spacing = .3 + Math.random() * .7;
    const spacingVariability = 1;
    const lances = [];

    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const lance = new THREE.Mesh(lanceGeometry, mirrorMate);
            lance.castShadow = true;
            lance.position.set(
                (j - (numCols - 1) / 2) * spacing - (Math.random() * spacing / 2 * spacingVariability),
                p.floor,
                (i - (numRows - 1) / 2) * spacing + (Math.random() * spacing / 2 * spacingVariability)
            );
            scene.add(lance);

            const lanceShape = new CANNON.Cylinder(0.01, 0.05, treeLength, 8);
            const lanceBody = new CANNON.Body({ mass: 1 });
            lanceBody.addShape(lanceShape);
            lanceBody.position.copy(lance.position);
            world.addBody(lanceBody);

            // Crea un corpo fisico statico per l'ancoraggio al terreno
            const anchorBody = new CANNON.Body({ mass: 0 });
            anchorBody.position.set(lance.position.x, p.floor, lance.position.z);
            world.addBody(anchorBody);

            // Aggiungi un vincolo a cerniera tra la base della lancia e l'ancoraggio al terreno
            const constraint = new CANNON.HingeConstraint(lanceBody, anchorBody, {
                pivotA: new CANNON.Vec3(0, - treeLength / 2, 0),
                pivotB: new CANNON.Vec3(0, 0, 0),
                axisA: new CANNON.Vec3(1, 0, 0),
                axisB: new CANNON.Vec3(0, 0, 1),
            });
            world.addConstraint(constraint);

            lances.push({ mesh: lance, body: lanceBody });
        }
    }

    // Funzione per aggiornare la posizione delle lance
    function updateLances() {
        for (const lance of lances) {
            lance.mesh.position.copy(lance.body.position);
            lance.mesh.quaternion.copy(lance.body.quaternion);
        }
    }

    const light = new THREE.DirectionalLight(0xffffff, 4)
    light.position.set(10, 20, -20)
    light.target.position.set(0, 0, 0)
    light.castShadow = true
    light.shadow.radius = 8
    light.shadow.camera.near = 2
    light.shadow.camera.far = 200
    light.shadow.bias = 0.0001
    light.shadow.mapSize.width = shadowMapWidth
    light.shadow.mapSize.height = shadowMapHeight
    scene.add(light)
    const lightHelper = new THREE.DirectionalLightHelper(light, 5);
    // scene.add(lightHelper);

    const lightD = new THREE.DirectionalLight(0xffffff, 10)
    lightD.position.set(-4, 0, -5)
    lightD.target.position.set(0, 4, 0)
    scene.add(lightD)

    const ambientLight = new THREE.AmbientLight(0xffffff)
    scene.add(ambientLight)

    // NOISE
    noise3D = NOISE.createNoise3D()
    let t0 = Math.random() * 10

    // Parametri del flowfield
    const flowfieldResolution = 50;
    const flowfieldScale = 0.1;
    let flowField;

    // Funzione per generare il flowfield utilizzando noise3D
    function generateFlowfield() {
        flowField = new Array(flowfieldResolution);

        for (let i = 0; i < flowfieldResolution; i++) {
            flowField[i] = new Array(flowfieldResolution);
            for (let j = 0; j < flowfieldResolution; j++) {
                const x = i * flowfieldScale;
                const z = j * flowfieldScale;
                const noise = noise3D(x, 0, z);
                const angle = noise * Math.PI * 2;
                flowField[i][j] = new CANNON.Vec3(Math.cos(angle), 0, Math.sin(angle));
            }
        }
    }

    // Funzione per simulare il vento con il flowfield
    function simulateWindWithFlowfield() {
        const windStrength = -p.windStrength; // Riduce l'intensità del vento
        for (const lance of lances) {
            const position = lance.body.position;
            const cellX = Math.floor((position.x + 10) / 20 * flowfieldResolution);
            const cellZ = Math.floor((position.z + 10) / 20 * flowfieldResolution);

            // Verifica che gli indici siano all'interno dei limiti del flowfield
            if (cellX >= 0 && cellX < flowfieldResolution && cellZ >= 0 && cellZ < flowfieldResolution) {
                const windDirection = flowField[cellX][cellZ];
                const windForce = windDirection.scale(windStrength);
                lance.body.applyForce(windForce, new CANNON.Vec3(0, 1, 0));
            }
        }
    }

    generateFlowfield();

    // ANIMATE
    const timeStep = 1 / 60
    const stepsPerFrame = 1
    let lastCallTime

    const animate = () => {
        if (showStats) stats.begin();

        // ANIMATION
        if (!paused) {

            const t = performance.now() / 1000

            if (!lastCallTime) {
                for (let i = 0; i < stepsPerFrame; i++) {
                    world.step(timeStep);
                }
            } else {
                const dt = t - lastCallTime;
                const numSteps = Math.ceil(dt / timeStep);
                for (let i = 0; i < numSteps; i++) {
                    world.step(timeStep);
                }
            }
            lastCallTime = t

            // CANNON SIMULATION

            if (p.wind) {

            }

            updateLances();
            simulateWindWithFlowfield();

        }

        controls.update()
        renderer.render(scene, camera)
        if (showStats) stats.end()

        animation = requestAnimationFrame(animate)
    };
    animate()
}

export function dispose() {
    cancelAnimationFrame(animation)
    controls?.dispose()
    clothMaterial?.dispose()
    mirrorMate?.dispose()
    groundGeom?.dispose()
    groundMate?.dispose()
    world = null
    noise3D = null
    flowField = null
    window?.removeEventListener('resize', onWindowResize)
    window?.removeEventListener('mousemove', onMouseMove)
}
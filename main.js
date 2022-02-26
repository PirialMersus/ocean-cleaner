import './style.css'


import * as THREE from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {Water} from 'three/examples/jsm/objects/Water.js';
import {Sky} from 'three/examples/jsm/objects/Sky.js';
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, renderer;
let controls, water, sun;

const loader = new GLTFLoader();

function random(min, max) {
    return Math.random() * (max - min) + min;
}

// loader.load('assets/boat/scene.gltf', function(gltf){
//     scene.add(gltf.scene)
//     gltf.scene.scale.set(3, 3, 3)
//     gltf.scene.position.set(5,13,50)
//     gltf.scene.rotation.y = 1.5
// })

class Boat {
    constructor() {
        loader.load('assets/boat/scene.gltf', (gltf) => {
            scene.add(gltf.scene)
            gltf.scene.scale.set(3, 3, 3)
            gltf.scene.position.set(5, 13.05, 50)
            gltf.scene.rotation.y = 1.5

            this.boat = gltf.scene
            this.speed = {
                vel: 0,
                rot: 0
            }
        })
    }

    stop() {
        this.speed.vel = 0
        this.speed.rot = 0

    }

    update() {
        if (this.boat) {
            const time = performance.now() * 0.001;
            this.boat.rotation.y += this.speed.rot
            this.boat.translateX(this.speed.vel)
            this.boat.translateY(Math.sin(time) * 0.005)
        }
    }
}

async function loadModel(url) {
    return new Promise((res, rej) => {
        loader.load(url, (gltf) => {
            res(gltf.scene)
        })
    })
}


let boatModel = null

async function createTrash() {
    if (!boatModel) {
        boatModel = await loadModel('assets/trash/scene.gltf')
    }
    return new Trash(boatModel.clone())
}

const boat = new Boat()

class Trash {
    constructor(_scene) {
        scene.add(_scene)
        _scene.scale.set(1.5, 1.5, 1.5)
        _scene.position.set(random(-150, 150), -0.5, random(-150, 150))

        this.trash = _scene

    }
}

let trashes = []
const TRASH_COUNT = 50

init();
animate();

async function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(30, 30, 100);


    sun = new THREE.Vector3();

    // Water

    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', function (texture) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

            }),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );

    water.rotation.x = -Math.PI / 2;

    scene.add(water);

    // Skybox

    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const parameters = {
        elevation: 2,
        azimuth: 180
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    function updateSun() {

        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        sky.material.uniforms['sunPosition'].value.copy(sun);
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();

        scene.environment = pmremGenerator.fromScene(sky).texture;

    }

    updateSun();


    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 10, 0);
    controls.minDistance = 40.0;
    controls.maxDistance = 200.0;
    controls.update();


    const waterUniforms = water.material.uniforms;

    for(let i = 0;i < TRASH_COUNT; i ++){
        const trash = await createTrash()
        trashes.push(trash)
    }

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', (e) => {
        if (e.key === "ArrowUp") {
            boat.speed.vel = 1
        }
        if (e.key === "ArrowDown") {
            boat.speed.vel = -1
        }
        if (e.key === "ArrowRight") {
            boat.speed.rot = -0.05
        }
        if (e.key === "ArrowLeft") {
            boat.speed.rot = 0.05
        }
    });
    window.addEventListener('keyup', (e) => {
        boat.stop()
    });


}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function isColliding(obj1, obj2) {
    return (
        Math.abs(obj1.position.x - obj2.position.x) < 15 &&
        Math.abs(obj1.position.z - obj2.position.z) < 15
    )
}
function checkCollisions(){
    if(boat.boat){
        trashes.forEach(trash => {
            if(trash.trash){
                if(isColliding(boat.boat, trash.trash)){
                    scene.remove(trash.trash)
                }
            }
        })
    }
}

function animate() {

    requestAnimationFrame(animate);
    render();
    boat.update()
    checkCollisions()
}

function render() {

    water.material.uniforms['time'].value += 1.0 / 60.0;

    renderer.render(scene, camera);

}
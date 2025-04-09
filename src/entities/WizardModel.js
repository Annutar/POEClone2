import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';

export class WizardModel {
    constructor(game) {
        this.game = game;
        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.loader = new GLTFLoader();
    }

    async load() {
        try {
            const gltf = await this.loader.loadAsync('assets/models/wizard.glb');
            this.model = gltf.scene;
            
            // Set up animations if they exist
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.model);
                gltf.animations.forEach((clip) => {
                    this.animations[clip.name] = this.mixer.clipAction(clip);
                });
            }

            // Set up model properties
            this.model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    // Ensure proper material settings
                    if (node.material) {
                        node.material.roughness = 0.7;
                        node.material.metalness = 0.3;
                    }
                }
            });

            // Calculate the bounding box to determine proper scaling
            const box = new THREE.Box3().setFromObject(this.model);
            const size = box.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);
            
            // Scale the model to be approximately 1.8 units tall
            const targetHeight = 1.8;
            const scale = targetHeight / maxDimension;
            this.model.scale.set(scale, scale, scale);
            
            // Center the model
            const center = box.getCenter(new THREE.Vector3());
            this.model.position.sub(center.multiplyScalar(scale));
            
            // Adjust the model's position to stand on the ground
            this.model.position.y = targetHeight / 2;

            // Add a point light to the staff if it exists
            const staff = this.model.getObjectByName('staff') || this.model.getObjectByName('Staff');
            if (staff) {
                const light = new THREE.PointLight(0x00ffff, 1, 3);
                light.position.set(0, 0.5, 0);
                staff.add(light);
            }

            return this.model;
        } catch (error) {
            console.error('Error loading wizard model:', error);
            throw error;
        }
    }

    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }

    playAnimation(name, loop = true) {
        if (this.animations[name]) {
            this.animations[name].reset();
            this.animations[name].setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
            this.animations[name].play();
        }
    }

    stopAnimation(name) {
        if (this.animations[name]) {
            this.animations[name].stop();
        }
    }
} 
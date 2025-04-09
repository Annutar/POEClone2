import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.1/dist/esm-browser/index.js';

export class PowerUp {
    constructor(game, type, position, duration, effectValue) {
        console.log("[PowerUp.constructor] Initializing...");
        this.game = game;
        this.id = uuidv4();
        this.type = type; // e.g., 'MultiShot'
        this.duration = duration; // seconds
        this.effectValue = effectValue; // e.g., +5 projectiles
        this.pickupRadiusSq = 1.0; // Squared radius for collision check
        this.isActive = true; // Is it on the ground?

        console.log("[PowerUp.constructor] Creating mesh...");
        this.mesh = this.createMesh();
        if (this.mesh) {
            console.log("[PowerUp.constructor] Mesh created successfully.");
        } else {
            console.error("[PowerUp.constructor] FAILED to create mesh!");
        }
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.5; // Float slightly above ground
        
        this.mesh.userData.powerUp = this; // Link mesh back to this instance

        this.initialY = this.mesh.position.y;
        this.bobTime = Math.random() * Math.PI * 2; // Random start for bobbing
        console.log(`[PowerUp.constructor] ${type} PowerUp initialized.`);
    }

    createMesh() {
        let color = 0xffff00; // Yellow default
        if (this.type === 'MultiShot') {
            color = 0x00ff00; // Green for MultiShot
        }
        // Simple glowing sphere
        const geometry = new THREE.SphereGeometry(0.3, 16, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            wireframe: true
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = false;

        // Add a point light for a glow effect
        const light = new THREE.PointLight(color, 0.8, 2);
        mesh.add(light);

        return mesh;
    }

    update(deltaTime) {
        if (!this.isActive) return;
        
        // Simple bobbing animation
        this.bobTime += deltaTime * 3;
        this.mesh.position.y = this.initialY + Math.sin(this.bobTime) * 0.1;
        this.mesh.rotation.y += deltaTime * 0.5;
    }

    // Called when picked up by the player
    onPickup(player) {
        console.log(`Player picked up ${this.type} power-up!`);
        this.isActive = false;
        player.applyPowerUp(this.type, this.duration, this.effectValue);
        // Manager will handle removing from scene
    }
} 
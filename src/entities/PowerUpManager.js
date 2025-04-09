import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { PowerUp } from './PowerUp.js';

export class PowerUpManager {
    constructor(game) {
        this.game = game;
        this.powerUps = [];
        this.container = new THREE.Group();
        this.game.scene.add(this.container);
        console.log("PowerUpManager initialized.");
    }

    spawnPowerUp(type, position, duration, effectValue) {
        console.log("[PowerUpManager.spawnPowerUp] Creating new PowerUp...");
        const powerUp = new PowerUp(this.game, type, position, duration, effectValue);
        this.powerUps.push(powerUp);
        this.container.add(powerUp.mesh);
        console.log(`[PowerUpManager.spawnPowerUp] Spawned ${type} power-up at ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`);
    }

    update(deltaTime) {
        const playerPosition = this.game.player?.mesh?.position;
        if (!playerPosition) return;

        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (!powerUp.isActive) continue; // Already picked up

            powerUp.update(deltaTime);

            // Check for player collision
            const distanceSq = playerPosition.distanceToSquared(powerUp.mesh.position);
            if (distanceSq < powerUp.pickupRadiusSq) {
                powerUp.onPickup(this.game.player);
                this.removePowerUp(powerUp, i);
            }
        }
    }

    removePowerUp(powerUp, index) {
        // Remove mesh from scene
        if (powerUp.mesh && powerUp.mesh.parent) {
            powerUp.mesh.parent.remove(powerUp.mesh);
        }
        // Remove from tracking array
        this.powerUps.splice(index, 1);
        // Potential cleanup of geometry/material if needed
    }

    // Method for enemies to call
    trySpawnDrop(enemyPosition, dropChance = 0.1) { // 100% chance default for testing
        console.log(`[PowerUpManager.trySpawnDrop] Checking drop chance (${dropChance})...`);
        if (Math.random() < dropChance) {
            console.log(`[PowerUpManager.trySpawnDrop] Drop chance success! Spawning MultiShot.`);
            // For now, only spawn MultiShot
            const type = 'MultiShot';
            const duration = 15; // seconds
            const effectValue = 5; // +5 projectiles
            this.spawnPowerUp(type, enemyPosition.clone(), duration, effectValue);
        } else {
            console.log(`[PowerUpManager.trySpawnDrop] Drop chance failed.`);
        }
    }
} 
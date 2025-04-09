import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.1/dist/esm-browser/index.js';

export class Projectile {
  constructor(game, options = {}) {
    // Properties set during construction OR reset
    this.game = game;
    this.id = uuidv4(); // Assign a unique ID always
    this.mesh = this.createMesh(options); // Create mesh on initial construction

    // Initialize with default/dummy values initially
    this.type = 'generic';
    this.source = null;
    this.damage = 0;
    this.speed = 15;
    this.range = 30;
    this.targetType = 'enemy';
    this.color = 0xffffff;
    this.scale = 1.0;
    this.velocity = new THREE.Vector3();
    this.distanceTraveled = 0;
    this.isActive = false; // Start inactive by default

    // If options are provided during construction (e.g., pool initialization)
    // apply them. This avoids calling reset during initial pool creation.
    if (options && Object.keys(options).length > 0) {
      this._applyOptions(options);
      // Note: We don't add to manager here, pool init adds the mesh only.
    }
  }

  // Method to apply options, used by constructor and reset
  _applyOptions(options = {}) {
    this.type = options.type || 'generic';
    this.source = options.source;
    this.damage = options.damage || 10;
    this.speed = options.speed || 15;
    this.range = options.range || 30;
    this.targetType = options.targetType || 'enemy';
    this.color = options.color || 0xffffff;
    this.scale = options.scale || 1.0;

    this.velocity.copy(options.velocity || new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(this.speed);
    this.distanceTraveled = 0;
    this.isActive = true; // Mark as active when reset/spawned

    // Set initial position and look direction
    if (options.position) {
      this.mesh.position.copy(options.position);
    }
    this.mesh.lookAt(this.mesh.position.clone().add(this.velocity));
    this.mesh.scale.set(this.scale, this.scale, this.scale);
    
    // Update material color if applicable
    if (this.mesh.material && this.mesh.material.color) {
        this.mesh.material.color.setHex(this.color);
    }
  }

  // Reset method for reusing pooled objects
  reset(options) {
      console.log(`Resetting ${this.constructor.name} projectile.`);
      this._applyOptions(options);
      // Any subclass-specific reset logic can go in overridden reset methods
  }

  createMesh(options) {
    // Basic sphere as a placeholder
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: this.color }); // Initial color
    const mesh = new THREE.Mesh(geometry, material);
    // Scale is applied in _applyOptions/reset
    return mesh;
  }

  update(delta) {
    if (!this.isActive) return;

    const moveDistance = this.speed * delta;
    const moveVector = this.velocity.clone().multiplyScalar(delta);
    this.mesh.position.add(moveVector);
    this.distanceTraveled += moveDistance;

    // Check range limit
    if (this.distanceTraveled >= this.range) {
      this.destroy(); // Deactivate
      return;
    }
  }

  onHit(target) {
    if (!this.isActive) return; 
    
    console.log(`${this.type} hit target:`, target);
    
    // Apply damage
    if (target && typeof target.takeDamage === 'function') {
        target.takeDamage(this.damage, this.source);
    }
    
    // Optional: Add impact effect (particle, sound)
    this.playImpactEffect();

    this.destroy(); // Deactivate
  }
  
  playImpactEffect(){
      // Placeholder for particle effects or sound
      console.log(`*${this.type} impact*`);
       // Example: Simple particle burst
      if (this.game.particleManager) { // Assuming a ParticleManager exists
          this.game.particleManager.createExplosion(this.mesh.position, this.color, 5, 0.2);
      }
  }

  // Deactivates the projectile, manager handles returning to pool
  destroy() {
    console.log(`Deactivating ${this.type} projectile (ID: ${this.id}).`);
    this.isActive = false;
  }

  // No longer needed as mesh stays in scene, just hidden
  /* removeFromScene() {
      if (this.mesh && this.mesh.parent) {
          this.mesh.parent.remove(this.mesh);
      }
  } */
} 
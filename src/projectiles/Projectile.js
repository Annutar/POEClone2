import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.1/dist/esm-browser/index.js';

export class Projectile {
  constructor(game, options = {}) {
    // Properties set during construction OR reset
    this.game = game;
    this.id = uuidv4(); // Assign a unique ID always
    this.isActive = false; // Start inactive by default for pooling

    // Apply initial options FIRST to set properties like color, speed, etc.
    this._applyOptions(options); 
    
    // Create mesh AFTER properties are set
    this.mesh = this.createMesh(); 

    // Initialize other necessary properties if not handled by _applyOptions
    // Ensure mesh exists before adding properties potentially related to it
    if (!this.velocity) this.velocity = new THREE.Vector3();
    if (this.distanceTraveled === undefined) this.distanceTraveled = 0;

    // Note: Mesh is added to the scene/manager by the pooling logic usually,
    // not directly in the constructor unless specified.
  }

  // Method to apply options, used by constructor and reset
  _applyOptions(options = {}) {
    this.type = options.type || 'generic';
    this.source = options.source; // Who fired it? (e.g., player)
    this.damage = options.damage || 10;
    this.speed = options.speed || 15;
    this.range = options.range || 30;
    this.targetType = options.targetType || 'enemy'; // What does it hit?
    this.color = options.color !== undefined ? options.color : 0xffffff; // Handle 0 as a valid color
    this.scale = options.scale || 1.0;

    // Ensure velocity exists before copying
    if (!this.velocity) this.velocity = new THREE.Vector3(); 
    this.velocity.copy(options.velocity || new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(this.speed);
    
    this.distanceTraveled = 0;
    this.isActive = true; // Mark as active when reset/spawned

    // Set initial position and look direction if mesh exists
    if (this.mesh) {
      if (options.position) {
        this.mesh.position.copy(options.position);
      }
      // Ensure velocity is not zero before looking at it
      if (this.velocity.lengthSq() > 0.0001) {
         this.mesh.lookAt(this.mesh.position.clone().add(this.velocity));
      }
      this.mesh.scale.set(this.scale, this.scale, this.scale);
      
      // Update material color if applicable and mesh exists
      if (this.mesh.material && this.mesh.material.color) {
          this.mesh.material.color.setHex(this.color);
      }
      // Update emissive color if applicable
      if (this.mesh.material && this.mesh.material.emissive) {
          this.mesh.material.emissive.setHex(this.color); // Often emissive matches base color
      }
    }
  }

  // Reset method for reusing pooled objects
  reset(options) {
      console.log(`Resetting ${this.constructor.name} projectile.`);
      // Ensure mesh exists before applying options that might modify it
      if (!this.mesh) {
          console.warn("Projectile mesh missing during reset, recreating.");
          this.mesh = this.createMesh(); 
          // Potentially add mesh back to container if it was removed? Depends on pooling strategy.
          if (this.game.projectileManager && this.game.projectileManager.projectileContainer && !this.mesh.parent) {
              this.game.projectileManager.projectileContainer.add(this.mesh);
          }
      }
      this._applyOptions(options); 
      this.mesh.visible = true; // Ensure it's visible on reset
      // Subclass-specific reset logic should be called via super.reset(options) in the subclass
  }

  createMesh() { // Removed options from parameters
    // Basic sphere as a placeholder
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    // Use this.color now, which should be set by _applyOptions
    const material = new THREE.MeshBasicMaterial({ color: this.color !== undefined ? this.color : 0xffffff }); 
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(this.scale, this.scale, this.scale); // Apply scale immediately
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
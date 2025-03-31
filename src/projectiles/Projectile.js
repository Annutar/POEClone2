import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.1/dist/esm-browser/index.js';

export class Projectile {
  constructor(game, options = {}) {
    this.game = game;
    this.id = uuidv4();
    this.type = options.type || 'generic'; // e.g., 'magic_orb', 'arrow'
    this.source = options.source; // Who shot this (e.g., Player instance)
    this.damage = options.damage || 10;
    this.speed = options.speed || 15;
    this.range = options.range || 30; // Max distance projectile travels
    this.targetType = options.targetType || 'enemy'; // What does this projectile target? ('enemy', 'player')
    this.color = options.color || 0xffffff;
    this.scale = options.scale || 1.0; // Add scale property

    this.velocity = options.velocity ? options.velocity.clone().normalize().multiplyScalar(this.speed) : new THREE.Vector3(0, 0, 1).multiplyScalar(this.speed);
    this.distanceTraveled = 0;
    this.isActive = true;

    // Create mesh (to be overridden by subclasses)
    this.mesh = this.createMesh(options);
    if (options.position) {
      this.mesh.position.copy(options.position);
    }
    
    // Rotate mesh to face velocity direction
    this.mesh.lookAt(this.mesh.position.clone().add(this.velocity));

    // Add to the scene via ProjectileManager
    this.game.projectileManager.addProjectile(this);
  }

  createMesh(options) {
    // Basic sphere as a placeholder
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(this.scale, this.scale, this.scale); // Apply scale
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
      this.destroy();
      return;
    }

    // Collision detection (handled by ProjectileManager)
  }

  onHit(target) {
    if (!this.isActive) return; // Prevent multiple hits from same projectile
    
    console.log(`${this.type} hit target:`, target);
    
    // Apply damage
    if (target && typeof target.takeDamage === 'function') {
        target.takeDamage(this.damage, this.source);
    }
    
    // Optional: Add impact effect (particle, sound)
    this.playImpactEffect();

    // Destroy projectile after hit
    this.destroy();
  }
  
  playImpactEffect(){
      // Placeholder for particle effects or sound
      console.log(`*${this.type} impact*`);
       // Example: Simple particle burst
      if (this.game.particleManager) { // Assuming a ParticleManager exists
          this.game.particleManager.createExplosion(this.mesh.position, this.color, 5, 0.2);
      }
  }

  destroy() {
    this.isActive = false;
    this.game.projectileManager.removeProjectile(this);
    // Effects like fading out could be added here
  }

  removeFromScene() {
      if (this.mesh && this.mesh.parent) {
          this.mesh.parent.remove(this.mesh);
          // Optional: Dispose geometry and material to free memory
          // if (this.mesh.geometry) this.mesh.geometry.dispose();
          // if (this.mesh.material) this.mesh.material.dispose();
      }
  }
} 
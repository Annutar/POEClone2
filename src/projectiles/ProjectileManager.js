import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class ProjectileManager {
  constructor(game) {
    this.game = game;
    this.projectiles = [];
    this.projectileContainer = new THREE.Group();
    this.game.scene.add(this.projectileContainer);
  }

  addProjectile(projectile) {
    this.projectiles.push(projectile);
    this.projectileContainer.add(projectile.mesh);
  }

  removeProjectile(projectile) {
    projectile.removeFromScene();
    const index = this.projectiles.indexOf(projectile);
    if (index > -1) {
      this.projectiles.splice(index, 1);
    }
  }

  update(delta) {
    // Update all active projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      if (!projectile.isActive) {
        // Should have been removed already, but double-check
        this.removeProjectile(projectile); 
        continue;
      }

      projectile.update(delta);
      
      // Check collisions after updating position
      if (projectile.isActive) { // Check again, as update might have deactivated it (range)
          this.checkCollision(projectile);
      }
    }
  }

  checkCollision(projectile) {
    let potentialTargets = [];

    // Determine who the projectile should hit
    if (projectile.targetType === 'enemy' && this.game.enemyManager) {
      potentialTargets = this.game.enemyManager.enemies;
    } else if (projectile.targetType === 'player' && this.game.player && !this.game.player.isDead) {
      potentialTargets = [this.game.player];
    }
    
    if (potentialTargets.length === 0) return;

    const projectileBox = new THREE.Box3().setFromObject(projectile.mesh);

    for (const target of potentialTargets) {
      if (!target || !target.mesh || target.isDead || !target.mesh.parent) {
        continue; // Skip invalid or dead targets
      }

      // Simple AABB collision detection
      const targetBox = new THREE.Box3().setFromObject(target.mesh);
      
      if (projectileBox.intersectsBox(targetBox)) {
        // Collision detected!
        projectile.onHit(target);
        // Projectile destroys itself in onHit, so we can break the inner loop
        return; 
      }
    }
  }

  clearAll() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].removeFromScene();
    }
    this.projectiles = [];
  }
} 
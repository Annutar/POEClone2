import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { PowerUp } from '../entities/PowerUp.js'; // Assuming PowerUp is needed elsewhere? If not, remove.
import { MagicOrb } from '../projectiles/MagicOrb.js'; // Import specific types we'll pool
import { Arrow } from '../projectiles/Arrow.js';

const MAX_PROJECTILES = 200; // Set a reasonable cap

export class ProjectileManager {
  constructor(game) {
    this.game = game;
    this.activeProjectiles = [];
    this.projectilePool = [];
    this.projectileContainer = new THREE.Group();
    this.game.scene.add(this.projectileContainer);
    this.initializePool(MAX_PROJECTILES);
    console.log(`ProjectileManager initialized with pool size ${MAX_PROJECTILES}.`);
  }

  initializePool(size) {
      const halfSize = Math.floor(size / 2);
      const remainder = size % 2; // Handle odd pool sizes

      console.log(`Initializing pool: ${halfSize} Arrows, ${halfSize + remainder} MagicOrbs`);

      // Create Arrows
      for (let i = 0; i < halfSize; i++) {
          const proj = new Arrow(this.game, { position: new THREE.Vector3(-9999, -9999, -9999) });
          proj.isActive = false;
          this.projectileContainer.add(proj.mesh);
          proj.mesh.visible = false; 
          this.projectilePool.push(proj);
      }
      
      // Create MagicOrbs
      for (let i = 0; i < halfSize + remainder; i++) {
           const proj = new MagicOrb(this.game, { position: new THREE.Vector3(-9999, -9999, -9999) });
          proj.isActive = false;
          this.projectileContainer.add(proj.mesh);
          proj.mesh.visible = false;
          this.projectilePool.push(proj);
      }
      
      console.log(`Pool initialized with ${this.projectilePool.length} total projectiles.`);
  }

  getProjectile(ProjectileClass, options) {
      // Find an inactive projectile of the correct type in the pool
      let projectile = this.projectilePool.find(p => !p.isActive && p instanceof ProjectileClass);

      if (projectile) {
          // Reset and reuse from pool
          projectile.reset(options);
          projectile.mesh.visible = true; // Make it visible
          this.activeProjectiles.push(projectile);
          console.log(`Reused ${ProjectileClass.name} from pool.`);
          return projectile;
      } else {
          // Optional: Dynamically grow pool if needed (or just log a warning)
          console.warn(`Projectile pool limit reached or no inactive ${ProjectileClass.name} found!`);
          // Could potentially create a new one if pool isn't full, but risky for performance spikes.
          // For now, we just won't fire if the pool is exhausted.
          return null; 
      }
  }

  update(delta) {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
        const projectile = this.activeProjectiles[i];
        
        if (!projectile.isActive) { 
             // This projectile was deactivated (hit/expired), move it back to pool
            this.returnProjectileToPool(projectile, i);
            continue;
        }

        projectile.update(delta);

        // Simple collision detection (can be optimized later)
        this.checkCollision(projectile);
    }
  }

  checkCollision(projectile) {
      if (!this.game.enemyManager || !this.game.enemyManager.enemies) return;

      const enemies = this.game.enemyManager.enemies;
      for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (!enemy || enemy.isDead || !projectile.isActive) continue;

          // Basic distance check (using squared distance for performance)
          const distanceSq = projectile.mesh.position.distanceToSquared(enemy.mesh.position);
          const hitRadiusSq = (enemy.hitRadius || 0.5) * (enemy.hitRadius || 0.5); // Use enemy hit radius
          
          if (distanceSq < hitRadiusSq) {
              // Hit detected!
              projectile.onHit(enemy);
              // No need to check further enemies for this projectile
              break; 
          }
      }
  }

  returnProjectileToPool(projectile, index) {
      projectile.isActive = false;
      projectile.mesh.visible = false; // Hide it
      projectile.mesh.position.set(-9999, -9999, -9999); // Move it off-screen
      this.activeProjectiles.splice(index, 1); // Remove from active list
      // It remains in the main `projectilePool` array
      console.log(`Returned ${projectile.constructor.name} to pool.`);
  }
  
  // This method is no longer used directly by Player
  /* addProjectile(projectile) {
    this.activeProjectiles.push(projectile);
    this.projectileContainer.add(projectile.mesh);
  } */

  // This method is no longer used directly by Player
  /* removeProjectile(projectile) {
    const index = this.activeProjectiles.indexOf(projectile);
    if (index > -1) {
      this.activeProjectiles.splice(index, 1);
      projectile.removeFromScene();
      // How to handle returning to pool?
    }
  } */
} 
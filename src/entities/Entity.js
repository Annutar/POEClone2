import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class Entity {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.health = 100;
    this.maxHealth = 100;
    this.isDead = false;
    this.type = 'entity';
  }
  
  update(delta) {
    // Base update method, to be overridden by derived classes
  }
  
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    
    // Check for death
    if (this.health <= 0 && !this.isDead) {
      this.die();
    }
    
    // Visual feedback for taking damage
    this.flashRed();
  }
  
  flashRed() {
    if (!this.mesh || !this.mesh.material) {
      return;
    }
    
    // Store original color
    const originalColor = this.mesh.material.color.clone();
    
    // Set to red
    this.mesh.material.color.set(0xff0000);
    
    // Return to original color after a short delay
    setTimeout(() => {
      if (this.mesh && this.mesh.material) {
        this.mesh.material.color.copy(originalColor);
      }
    }, 100);
  }
  
  die() {
    this.isDead = true;
    
    // Play death animation or effect
    this.playDeathAnimation();
    
    // Remove from scene after a delay
    setTimeout(() => {
      if (this.mesh && this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
    }, 1000);
  }
  
  playDeathAnimation() {
    if (!this.mesh) {
      return;
    }
    
    // Simple death animation - sink into ground
    const duration = 1000; // ms
    const startTime = Date.now();
    const startY = this.mesh.position.y;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      if (this.mesh) {
        // Sink into ground
        this.mesh.position.y = startY * (1 - progress);
        
        // Rotate
        this.mesh.rotation.x += 0.1;
        
        // Scale down
        const scale = 1 - 0.5 * progress;
        this.mesh.scale.set(scale, scale, scale);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }
    };
    
    animate();
  }
} 
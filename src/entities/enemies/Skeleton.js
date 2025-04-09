import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Enemy } from './Enemy.js';
import { Player } from '../Player.js'; // Import Player class

export class Skeleton extends Enemy {
  constructor(game) {
    super(game);
    
    // Skeleton specific attributes
    this.maxHealth = 30;
    this.health = this.maxHealth;
    this.attackDamage = 5;
    this.attackRange = 1.2;
    this.attackSpeed = 0.8;
    this.moveSpeed = 5.0;
    this.detectionRange = 8;
    this.xpValue = 10;
    this.type = 'skeleton';
    
    // Create mesh
    this.createMesh();
    this.createNameTag(); // Add name tag
  }
  
  createMesh() {
    // Body (torso)
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.position.y = 0.5;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    head.castShadow = true;
    this.mesh.add(head);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.25, 0.1, 0);
    leftArm.castShadow = true;
    this.mesh.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.25, 0.1, 0);
    rightArm.castShadow = true;
    this.mesh.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, -0.4, 0);
    leftLeg.castShadow = true;
    this.mesh.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, -0.4, 0);
    rightLeg.castShadow = true;
    this.mesh.add(rightLeg);
    
    // Add a weapon (simple sword)
    const swordGeometry = new THREE.BoxGeometry(0.08, 0.5, 0.05);
    const swordMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    this.weapon = new THREE.Mesh(swordGeometry, swordMaterial);
    this.weapon.position.set(0.35, 0.2, 0);
    this.weapon.rotation.z = Math.PI / 4; // Angle the sword
    this.mesh.add(this.weapon);
    
    // Store original arm positions for animation
    this.rightArmOriginalPosition = rightArm.position.clone();
    this.rightArm = rightArm;
  }
  
  update(delta) {
    super.update(delta);
    
    // Skeleton specific behavior - slightly erratic movement
    if (this.targetPosition && Math.random() < 0.05) {
      // Occasionally make small random adjustments to path
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5
      );
      this.targetPosition.add(offset);
    }
  }
  
  attackAnimation() {
    // Move the sword arm forward
    const armForwardPos = this.rightArmOriginalPosition.clone();
    armForwardPos.z += 0.3;
    this.rightArm.position.copy(armForwardPos);
    
    // Return to original position after a delay
    setTimeout(() => {
      if (this.rightArm) {
        this.rightArm.position.copy(this.rightArmOriginalPosition);
      }
    }, 200);
  }
  
  takeDamage(amount, source) {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);
    this.lastDamageSource = source; // Store the source of the damage
    
    // --- Add Flash Effect ---
    this.playDamageEffect();
    // ----------------------
    
    if (this.health <= 0) {
      this.die();
    }
  }
  
  playDamageEffect() {
    if (!this.mesh) return;

    const originalMaterials = new Map();
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        originalMaterials.set(child.uuid, child.material.clone());
        if (!child.material.emissive) {
           child.material.emissive = new THREE.Color(0x000000);
        }
        child.material.emissive.setHex(0xff0000); // Flash red
        child.material.needsUpdate = true;
      }
    });

    setTimeout(() => {
      if (!this.mesh) return; // Check if mesh still exists
      this.mesh.traverse((child) => {
        if (child.isMesh && originalMaterials.has(child.uuid)) {
          // Restore original material properties, keeping the instance if possible
          const originalMat = originalMaterials.get(child.uuid);
          child.material.emissive.setHex(originalMat.emissive ? originalMat.emissive.getHex() : 0x000000);
          child.material.needsUpdate = true;
           // If other properties were changed, restore them here too
           // child.material.color.copy(originalMat.color);
        }
      });
    }, 100); // Duration of the flash
  }
  
  die() {
    if (this.isDead) return;
    this.isDead = true;
    console.log(`${this.type} died`);

    // Grant XP to player
    if (this.game.player && !this.game.player.isDead) {
      this.game.player.onEnemyKilled(this);
    }

    // Try to drop a power-up
    if (this.game.powerUpManager) {
        console.log(`[Skeleton.die] Attempting power-up drop...`);
        this.game.powerUpManager.trySpawnDrop(this.mesh.position, 1.0); // 100% drop chance for testing
    } else {
        console.warn(`[Skeleton.die] PowerUpManager not found.`);
    }

    // Play death animation
    this.playDeathAnimation();

    // Set timer for removal
    setTimeout(() => {
      this.removeFromScene();
      if (this.game.enemyManager) {
        this.game.enemyManager.removeEnemy(this);
      }
    }, 1800); // Skeleton might have a longer collapse animation
  }
  
  playDeathAnimation() {
    if (!this.mesh) return;
    
    // Skeleton specific death - fall apart
    const duration = 1000; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      if (this.mesh && this.isDead) { // Check if actually dead for animation
        // Make skeleton parts fall apart
        this.mesh.children.forEach(part => {
          part.position.y -= 0.05 * (1 - progress); // Slow down fall towards end
          part.rotation.z += (Math.random() - 0.5) * 0.2 * (1 - progress);
          part.rotation.x += (Math.random() - 0.5) * 0.2 * (1 - progress);
        });
        
        // Rotate body
        this.mesh.rotation.z += 0.05 * (1 - progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }
    };
    
    animate();
  }
  
  makeSound() {
    // Skeleton bone rattling sound (would be audio in a real game)
    console.log('*Bone rattling*');
  }
  
  removeFromScene() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    // Optionally notify enemy manager
    // this.game.enemyManager.removeEnemy(this);
  }
} 
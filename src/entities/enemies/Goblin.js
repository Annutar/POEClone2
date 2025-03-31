import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Enemy } from './Enemy.js';
import { Player } from '../Player.js'; // Import Player class

export class Goblin extends Enemy {
  constructor(game) {
    super(game);
    
    // Goblin specific attributes
    this.maxHealth = 20;
    this.health = this.maxHealth;
    this.attackDamage = 6;
    this.attackRange = 1.5;
    this.attackSpeed = 1.5; // Fast attacks
    this.moveSpeed = 4;
    this.detectionRange = 12;
    this.xpValue = 12;
    this.type = 'goblin';
    
    // Goblin group behavior
    this.friends = [];
    this.callForHelpRange = 10;
    this.hasCalled = false;
    
    // Create mesh
    this.createMesh();
    this.createNameTag(); // Add name tag
  }
  
  createMesh() {
    // Goblin body
    const bodyGeometry = new THREE.BoxGeometry(0.35, 0.5, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.position.y = 0.4;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.4;
    head.scale.set(1, 1.2, 1); // Elongated head
    head.castShadow = true;
    this.mesh.add(head);
    
    // Ears
    const earGeometry = new THREE.ConeGeometry(0.05, 0.2, 4);
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    
    // Left ear
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.12, 0.4, 0);
    leftEar.rotation.z = Math.PI / 4;
    this.mesh.add(leftEar);
    
    // Right ear
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.12, 0.4, 0);
    rightEar.rotation.z = -Math.PI / 4;
    this.mesh.add(rightEar);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.4, 0.15);
    this.mesh.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.4, 0.15);
    this.mesh.add(rightEye);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    
    // Left arm
    this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.leftArm.position.set(-0.25, 0.1, 0);
    this.leftArm.rotation.z = -Math.PI / 8;
    this.mesh.add(this.leftArm);
    
    // Right arm
    this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.rightArm.position.set(0.25, 0.1, 0);
    this.rightArm.rotation.z = Math.PI / 8;
    this.mesh.add(this.rightArm);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.1, -0.25, 0);
    this.mesh.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.1, -0.25, 0);
    this.mesh.add(rightLeg);
    
    // Weapon (club)
    const clubGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    const clubMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    this.weapon = new THREE.Mesh(clubGeometry, clubMaterial);
    this.weapon.position.set(0, 0.2, 0);
    this.rightArm.add(this.weapon);
    
    // Store original positions for animation
    this.rightArmOriginalRotation = this.rightArm.rotation.clone();
  }
  
  update(delta) {
    super.update(delta);
    
    // Goblin specific behavior
    if (!this.isDead && this.game.player && !this.game.player.isDead) {
        // Call for help when injured
        if (this.health < this.maxHealth * 0.5 && !this.hasCalled) {
          this.callForHelp();
        }
        
        // Randomly jump around when close to player
        const distanceToPlayer = this.mesh.position.distanceTo(this.game.player.mesh.position);
        if (distanceToPlayer < 5 && Math.random() < 0.02) {
          this.dodge();
        }
    }
  }
  
  callForHelp() {
    this.hasCalled = true;
    console.log('*Goblin screeches for help*');
    
    // Find nearby goblins
    const nearbyEnemies = this.game.enemyManager.enemies.filter(enemy => {
      if (enemy === this || enemy.type !== 'goblin') return false;
      
      const distance = this.mesh.position.distanceTo(enemy.mesh.position);
      return distance < this.callForHelpRange;
    });
    
    // Make them aggressive and target the player
    nearbyEnemies.forEach(goblin => {
      if (goblin && !goblin.isAggressive && this.game.player) {
        goblin.isAggressive = true;
        goblin.targetPosition = this.game.player.mesh.position.clone();
        if (!goblin.friends.includes(this)) goblin.friends.push(this);
        if (!this.friends.includes(goblin)) this.friends.push(goblin);
      }
    });
    
    // Spawn additional goblins if not many responded
    if (nearbyEnemies.length < 2) {
      for (let i = 0; i < 2 - nearbyEnemies.length; i++) {
        const newGoblin = this.game.enemyManager.spawnEnemyNearPosition(this.mesh.position, Goblin);
        if (newGoblin && this.game.player) {
            newGoblin.isAggressive = true;
            newGoblin.targetPosition = this.game.player.mesh.position.clone();
            if (!newGoblin.friends.includes(this)) newGoblin.friends.push(this);
            if (!this.friends.includes(newGoblin)) this.friends.push(newGoblin);
        }
      }
    }
  }
  
  dodge() {
    // Quick sideways jump to avoid attacks
    const angle = Math.random() * Math.PI * 2;
    const jumpDistance = 2;
    const x = this.mesh.position.x + Math.cos(angle) * jumpDistance;
    const z = this.mesh.position.z + Math.sin(angle) * jumpDistance;
    
    // Add a small vertical hop
    const startY = this.mesh.position.y;
    const jumpHeight = 0.5;
    const jumpDuration = 300; // ms
    const startTime = Date.now();
    
    const jump = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / jumpDuration);
      
      if (progress < 1 && !this.isDead) {
        // Parabolic jump
        const heightProgress = 4 * progress * (1 - progress);
        this.mesh.position.y = startY + jumpHeight * heightProgress;
        
        // Move horizontally
        this.mesh.position.x += (x - this.mesh.position.x) * 0.1;
        this.mesh.position.z += (z - this.mesh.position.z) * 0.1;
        
        requestAnimationFrame(jump);
      } else if (!this.isDead) {
        // Land
        this.mesh.position.y = startY;
      }
    };
    
    jump();
  }
  
  attackAnimation() {
    // Goblin swings club down
    const startRotation = this.rightArm.rotation.clone();
    
    // Raise club up
    this.rightArm.rotation.x = -Math.PI / 2;
    
    // Swing club down after short delay
    setTimeout(() => {
      if (this.rightArm && !this.isDead) {
        this.rightArm.rotation.x = Math.PI / 2;
        
        // Return to original position
        setTimeout(() => {
          if (this.rightArm && !this.isDead) {
            this.rightArm.rotation.copy(this.rightArmOriginalRotation);
          }
        }, 150);
      }
    }, 100);
  }
  
  // Override takeDamage to store the source and handle dodge
  takeDamage(amount, source) {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);
    this.lastDamageSource = source;
    
    // Flash effect
    this.playDamageEffect();
    
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
          // Restore original material properties
           const originalMat = originalMaterials.get(child.uuid);
           child.material.emissive.setHex(originalMat.emissive ? originalMat.emissive.getHex() : 0x000000);
           child.material.needsUpdate = true;
        }
      });
    }, 100); // Duration of the flash
  }
  
  die() {
    if (this.isDead) return;
    this.isDead = true;
    console.log('Goblin died');

    // If killed by player, trigger kill effect
    if (this.lastDamageSource instanceof Player) {
        this.game.player.onEnemyKilled(this);
    }
    
    // Tell friends this goblin died
    this.friends.forEach(friend => {
      if (friend && !friend.isDead) {
        // Remove self from friend's list
        const index = friend.friends.indexOf(this);
        if (index > -1) {
            friend.friends.splice(index, 1);
        }
        // 50% chance to flee when friend dies
        if (Math.random() < 0.5) {
          friend.flee();
        }
      }
    });
    this.friends = []; // Clear own friend list

    // Play death animation
    this.playDeathAnimation(); // Generic death for now
    
    // Remove from game world after delay
    setTimeout(() => {
      this.removeFromScene();
    }, 1000); 
  }
  
  playDeathAnimation() {
    // Simple fade-out death animation for Goblin
    const duration = 1000; 
    const startTime = Date.now();
    this.mesh.traverse(child => {
        if (child.material) {
            child.material.transparent = true;
        }
    });

    const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const originalOpacity = 1; // Assume starting opacity is 1

        if (this.mesh && this.isDead) {
            this.mesh.traverse(child => {
                if (child.material) {
                    child.material.opacity = originalOpacity * (1 - progress);
                }
            });
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
    };
    animate();
  }
  
  flee() {
    // Run away from player
    if (!this.game.player) return; // Can't flee if player doesn't exist
    
    const fleeDir = new THREE.Vector3()
      .subVectors(this.mesh.position, this.game.player.mesh.position)
      .normalize()
      .multiplyScalar(15);
    
    this.targetPosition = new THREE.Vector3(
      this.mesh.position.x + fleeDir.x,
      this.mesh.position.y,
      this.mesh.position.z + fleeDir.z
    );
    
    // Increase speed when fleeing
    this.moveSpeed *= 1.5;
    
    // Make cowardly sound
    this.makeSound();
  }
  
  makeSound() {
    // Goblin cackle/screech
    console.log('*Goblin screech*');
  }
  
  removeFromScene() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
} 
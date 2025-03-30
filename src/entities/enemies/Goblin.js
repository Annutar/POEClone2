import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Enemy } from './Enemy.js';

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
    
    // Goblin specific behavior - call for help when injured
    if (this.health < this.maxHealth * 0.5 && !this.hasCalled) {
      this.callForHelp();
    }
    
    // Randomly jump around when close to player
    const distanceToPlayer = this.mesh.position.distanceTo(this.game.player.mesh.position);
    if (distanceToPlayer < 5 && Math.random() < 0.02) {
      this.dodge();
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
      goblin.isAggressive = true;
      goblin.targetPosition = this.game.player.mesh.position.clone();
      goblin.friends.push(this);
      this.friends.push(goblin);
    });
    
    // Spawn additional goblins if not many responded
    if (nearbyEnemies.length < 2) {
      for (let i = 0; i < 2 - nearbyEnemies.length; i++) {
        const newGoblin = this.game.enemyManager.spawnEnemyNearPosition(this.mesh.position, Goblin);
        newGoblin.isAggressive = true;
        newGoblin.targetPosition = this.game.player.mesh.position.clone();
        newGoblin.friends.push(this);
        this.friends.push(newGoblin);
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
  
  takeDamage(amount) {
    super.takeDamage(amount);
    
    // Goblins sometimes dodge after being hit
    if (!this.isDead && Math.random() < 0.3) {
      this.dodge();
    }
  }
  
  die() {
    super.die();
    
    // Tell friends this goblin died
    this.friends.forEach(friend => {
      if (!friend.isDead) {
        // 50% chance to flee when friend dies
        if (Math.random() < 0.5) {
          friend.flee();
        }
      }
    });
  }
  
  flee() {
    // Run away from player
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
} 
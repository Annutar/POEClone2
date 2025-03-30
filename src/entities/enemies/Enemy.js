import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Entity } from '../Entity.js';

export class Enemy extends Entity {
  constructor(game) {
    super(game);
    
    // Enemy specific attributes
    this.detectionRange = 10;
    this.attackRange = 1.5;
    this.attackDamage = 10;
    this.attackSpeed = 1.0;
    this.moveSpeed = 3;
    this.lastAttackTime = 0;
    this.isAggressive = true;
    this.targetPosition = null;
    this.type = 'enemy';
    this.xpValue = 10;
    
    // Pathfinding
    this.pathUpdateInterval = 500; // ms
    this.lastPathUpdate = 0;
  }
  
  update(delta) {
    // Skip if dead
    if (this.isDead) return;
    
    // Skip if player is dead
    if (this.game.player.isDead) return;
    
    // Check if player is in detection range
    const distanceToPlayer = this.mesh.position.distanceTo(this.game.player.mesh.position);
    
    if (distanceToPlayer < this.detectionRange && this.isAggressive) {
      // Update path to player occasionally
      const now = Date.now();
      if (now - this.lastPathUpdate > this.pathUpdateInterval) {
        this.targetPosition = this.game.player.mesh.position.clone();
        this.lastPathUpdate = now;
      }
      
      // If in attack range, attack player
      if (distanceToPlayer < this.attackRange) {
        this.attackPlayer();
      } 
      // Otherwise move towards player
      else {
        this.moveToTarget(delta);
      }
    }
    // If we have a target position (from getting hit, etc.), move towards it
    else if (this.targetPosition) {
      this.moveToTarget(delta);
      
      // Check if we've reached the target
      if (this.mesh.position.distanceTo(this.targetPosition) < 0.5) {
        this.targetPosition = null;
      }
    }
    // Otherwise wander randomly
    else if (Math.random() < 0.01) {
      this.wander();
    }
  }
  
  moveToTarget(delta) {
    if (!this.targetPosition) return;
    
    // Calculate direction to target
    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition, this.mesh.position);
    direction.y = 0; // Keep on ground plane
    
    // If close enough, stop
    if (direction.length() < 0.1) {
      return;
    }
    
    // Normalize and scale by move speed
    direction.normalize();
    const movement = direction.clone().multiplyScalar(delta * this.moveSpeed);
    
    // Move enemy
    this.mesh.position.add(movement);
    
    // Rotate to face direction of movement
    this.mesh.lookAt(this.mesh.position.clone().add(direction));
  }
  
  attackPlayer() {
    // Don't attack if player is dead
    if (this.game.player.isDead) return;
    
    const now = Date.now();
    const attackCooldown = 1000 / this.attackSpeed;
    
    // Check if attack is off cooldown
    if (now - this.lastAttackTime < attackCooldown) {
      return;
    }
    
    // Face player
    this.mesh.lookAt(this.game.player.mesh.position);
    
    // Play attack animation
    this.attackAnimation();
    
    // Deal damage to player
    this.game.player.takeDamage(this.attackDamage);
    
    // Update attack cooldown
    this.lastAttackTime = now;
  }
  
  attackAnimation() {
    // Base attack animation - to be overridden by subclasses
    
    // Simple forward lunge
    const startPos = this.mesh.position.clone();
    const playerDir = new THREE.Vector3()
      .subVectors(this.game.player.mesh.position, this.mesh.position)
      .normalize()
      .multiplyScalar(0.3);
    
    // Move forward
    this.mesh.position.add(playerDir);
    
    // Move back after a short delay
    setTimeout(() => {
      if (this.mesh && !this.isDead) {
        this.mesh.position.copy(startPos);
      }
    }, 150);
  }
  
  wander() {
    // Random position within a certain radius of current position
    const radius = 5;
    const angle = Math.random() * Math.PI * 2;
    const x = this.mesh.position.x + Math.cos(angle) * radius;
    const z = this.mesh.position.z + Math.sin(angle) * radius;
    
    this.targetPosition = new THREE.Vector3(x, this.mesh.position.y, z);
  }
  
  takeDamage(amount) {
    super.takeDamage(amount);
    
    // If not already aggressive, become aggressive when hit
    if (!this.isDead) {
      this.isAggressive = true;
      this.targetPosition = this.game.player.mesh.position.clone();
      
      // Make a sound when hit
      this.makeSound();
    }
  }
  
  die() {
    super.die();
    
    // Drop loot
    this.dropLoot();
  }
  
  dropLoot() {
    // Random chance to drop an item
    if (Math.random() < 0.3) {
      this.game.itemManager.spawnRandomItem(this.mesh.position);
    }
  }
  
  makeSound() {
    // Base sound method - to be overridden by subclasses
    console.log('Enemy sound');
  }
} 
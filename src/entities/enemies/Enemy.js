import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Entity } from '../Entity.js';
import { Player } from '../Player.js'; // Import Player for type checking

export class Enemy extends Entity {
  constructor(game) {
    super(game);
    
    // Base Enemy attributes (will be overridden by subclasses)
    this.maxHealth = 10;
    this.health = this.maxHealth;
    this.attackDamage = 1;
    this.attackRange = 1;
    this.attackSpeed = 1;
    
    // Store base speed, initialize current speed and multiplier
    this.baseMoveSpeed = 5.5; // Increased from 3 to be faster than player's base of 5
    this.moveSpeed = this.baseMoveSpeed;
    this.speedMultiplier = 1.0;
    
    this.detectionRange = 10;
    this.xpValue = 5;
    this.isDead = false;
    this.isAggressive = true;
    this.targetPosition = null;
    this.lastAttackTime = 0;
    this.lastPathUpdate = 0;
    this.pathUpdateInterval = 1000;
    this.lastDamageSource = null; // Track who damaged last for XP
    
    // Name tag related
    this.nameTagSprite = null;
  }
  
  // Override this method in subclasses to create specific meshes
  createMesh() {
    const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = 0.5;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    // Note: Adding mesh to scene is typically handled by EnemyManager
  }
  
  createNameTag(name = this.type) {
    if (!this.mesh) {
        console.warn('Cannot create name tag before mesh exists for', name);
        return;
    }
    if (this.nameTagSprite) return; // Already created

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 12;
    const fontFamily = 'Georgia, serif';
    context.font = `Bold ${fontSize}px ${fontFamily}`;
    const textWidth = context.measureText(name).width;

    canvas.width = textWidth + 6;
    canvas.height = fontSize + 6;
    
    // Re-apply font after resizing canvas
    context.font = `Bold ${fontSize}px ${fontFamily}`;
    context.fillStyle = 'rgba(255, 255, 255, 0.85)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        depthTest: false
    });
    this.nameTagSprite = new THREE.Sprite(spriteMaterial);
    
    // Scale the sprite based on text size
    const aspect = canvas.width / canvas.height;
    const scaleFactor = 0.3;
    this.nameTagSprite.scale.set(scaleFactor * aspect, scaleFactor, 1);

    // Position above the mesh
    // Calculate the bounding box to find the top
    const bbox = new THREE.Box3().setFromObject(this.mesh);
    const height = bbox.max.y - bbox.min.y;
    this.nameTagSprite.position.set(0, height + 0.3, 0); // Position relative to mesh center

    this.mesh.add(this.nameTagSprite); // Add sprite to the enemy mesh group
    // console.log('Created name tag for:', name); // Reduce logging spam
  }

  updateNameTag() {
      if (this.nameTagSprite) {
          // Set fixed Y offset relative to the enemy mesh origin
          // Adjust this value if needed based on average enemy model height/origin
          const fixedYOffset = 1.2; 
          this.nameTagSprite.position.y = fixedYOffset; 
          
          // SpriteMaterial should handle facing the camera automatically
      }
  }

  update(delta) {
    // Skip if dead
    if (this.isDead) return;
    
    // Update name tag
    if (this.mesh && !this.nameTagSprite) {
      this.createNameTag();
    } else if (this.nameTagSprite) {
      this.updateNameTag();
    }
    
    // Skip if player is dead or game is loading
    if (!this.game.player || this.game.player.isDead) return;
    
    // --- Update Effective Move Speed Based on Player Level ---
    // Scale slightly slower than player's multiplier to allow kiting
    const playerLevel = this.game.player.level;
    const levelScaleFactor = 0.0195 * playerLevel; // Almost matches player's 0.02 per level
    this.speedMultiplier = 1.0 + levelScaleFactor;
    this.moveSpeed = this.baseMoveSpeed * this.speedMultiplier;
    // ---------------------------------------------------------
    
    // --- Calculate Effective Detection Range --- 
    const playerScale = this.game.player.sizeMultiplier || 1.0;
    const effectiveDetectionRange = this.detectionRange * (1 + (playerScale - 1) * 0.5); 
    
    // Check if player is in effective detection range
    const distanceToPlayer = this.mesh.position.distanceTo(this.game.player.mesh.position);
    
    if (distanceToPlayer < effectiveDetectionRange && this.isAggressive) {
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
    
    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition, this.mesh.position);
    direction.y = 0; // Keep on ground plane
    
    if (direction.length() < 0.1) return;
    
    direction.normalize();
    // Use the dynamically updated this.moveSpeed
    const movement = direction.clone().multiplyScalar(delta * this.moveSpeed);
    
    this.mesh.position.add(movement);
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
    
    // ---> ADD MESH CHECK <---
    if (!this.mesh) {
        console.warn('Enemy attack attempted before mesh was ready.');
        return; // Don't proceed if mesh doesn't exist
    }
    // ---> END CHECK <---

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

  removeFromScene() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
      // Consider disposing texture/material for name tag if removing many enemies
      if(this.nameTagSprite && this.nameTagSprite.material.map) {
          this.nameTagSprite.material.map.dispose();
      }
      if(this.nameTagSprite && this.nameTagSprite.material) {
          this.nameTagSprite.material.dispose();
      }
    }
  }
} 
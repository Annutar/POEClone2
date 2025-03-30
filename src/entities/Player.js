import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Entity } from './Entity.js';
import { Weapon } from '../items/Weapon.js';

export class Player extends Entity {
  constructor(game) {
    super(game);
    
    // Player attributes
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.maxMana = 100;
    this.mana = this.maxMana;
    this.manaRegen = 5; // Per second
    this.attackSpeed = 1.0;
    this.attackDamage = 10;
    this.attackRange = 1.5;
    this.moveSpeed = 5;
    this.inventory = [];
    this.equipment = {
      weapon: null
    };
    
    // Cooldowns
    this.lastAttackTime = 0;
    
    // Movement
    this.targetPosition = null;
    this.isMoving = false;
    
    // Create player mesh
    this.createMesh();
  }
  
  createMesh() {
    // Create a character mesh
    const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0x3333ff });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 0.5, 0);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Add weapon container
    this.weaponContainer = new THREE.Object3D();
    this.weaponContainer.position.set(0.3, 0.5, 0);
    this.mesh.add(this.weaponContainer);
  }
  
  update(delta) {
    // Skip update if dead
    if (this.isDead) return;
    
    // Handle keyboard movement
    const direction = this.game.inputHandler.getMovementDirection();
    if (direction.length() > 0) {
      // Cancel any click-to-move action when using keyboard
      this.targetPosition = null;
      
      // Move character based on direction
      const movement = direction.clone().multiplyScalar(delta * this.moveSpeed);
      this.mesh.position.add(movement);
      
      // Rotate character to face movement direction
      this.mesh.lookAt(this.mesh.position.clone().add(direction));
    }
    
    // Handle click-to-move
    if (this.targetPosition) {
      const direction = new THREE.Vector3();
      direction.subVectors(this.targetPosition, this.mesh.position);
      direction.y = 0; // Keep movement on the xz plane
      
      const distance = direction.length();
      
      // If we're close enough to target, stop moving
      if (distance < 0.1) {
        this.targetPosition = null;
        this.isMoving = false;
      } else {
        // Normalize and scale by move speed
        direction.normalize();
        const movement = direction.clone().multiplyScalar(delta * this.moveSpeed);
        this.mesh.position.add(movement);
        
        // Rotate character to face movement direction
        this.mesh.lookAt(this.mesh.position.clone().add(direction));
        
        this.isMoving = true;
      }
    }
    
    // Regenerate mana
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * delta);
  }
  
  moveToPoint(position) {
    this.targetPosition = position.clone();
    this.targetPosition.y = this.mesh.position.y;
    this.isMoving = true;
  }
  
  attack(target) {
    // Can't attack if dead
    if (this.isDead) return;
    
    const now = Date.now();
    const weaponCooldown = 1000 / this.attackSpeed;
    
    // Check if attack is off cooldown
    if (now - this.lastAttackTime < weaponCooldown) {
      return;
    }
    
    // Calculate distance to target
    const distance = this.mesh.position.distanceTo(target.mesh.position);
    
    // Check if target is in range
    if (distance > this.attackRange) {
      // Move towards target if out of range
      this.moveToPoint(target.mesh.position);
      return;
    }
    
    // Face the target
    this.mesh.lookAt(target.mesh.position);
    
    // Calculate damage
    let damage = this.attackDamage;
    if (this.equipment.weapon) {
      damage += this.equipment.weapon.damage;
      
      // Apply weapon attributes
      if (this.equipment.weapon.attributes) {
        this.equipment.weapon.attributes.forEach(attr => {
          if (attr.type === 'damage_multiplier') {
            damage *= attr.value;
          }
        });
      }
    }
    
    // Apply damage
    target.takeDamage(damage);
    
    // Update attack cooldown
    this.lastAttackTime = now;
    
    // Play attack animation
    this.playAttackAnimation();
  }
  
  playAttackAnimation() {
    // Simple attack animation by scaling the weapon
    if (this.equipment.weapon && this.equipment.weapon.mesh) {
      const weaponMesh = this.equipment.weapon.mesh;
      
      // Scale up quickly
      const scaleUp = new THREE.Vector3(1.5, 1.5, 1.5);
      weaponMesh.scale.copy(scaleUp);
      
      // Scale back to normal after a short delay
      setTimeout(() => {
        weaponMesh.scale.set(1, 1, 1);
      }, 150);
    }
  }
  
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    
    // Check for death
    if (this.health <= 0) {
      this.die();
    }
  }
  
  die() {
    console.log('Player died');
    
    // Set isDead flag
    this.isDead = true;
    
    // Change appearance to indicate death
    if (this.mesh && this.mesh.material) {
      this.mesh.material.color.set(0x777777); // Gray color to indicate death
      this.mesh.rotation.x = Math.PI / 2; // Rotate to lay flat (face up)
    }
    
    // Create death UI
    this.createDeathUI();
  }
  
  createDeathUI() {
    // Create death screen overlay
    const deathScreen = document.createElement('div');
    deathScreen.id = 'death-screen';
    deathScreen.style.position = 'absolute';
    deathScreen.style.top = '0';
    deathScreen.style.left = '0';
    deathScreen.style.width = '100%';
    deathScreen.style.height = '100%';
    deathScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    deathScreen.style.display = 'flex';
    deathScreen.style.flexDirection = 'column';
    deathScreen.style.justifyContent = 'center';
    deathScreen.style.alignItems = 'center';
    deathScreen.style.zIndex = '1000';
    
    // Death message
    const deathMessage = document.createElement('h1');
    deathMessage.textContent = 'You Died';
    deathMessage.style.color = '#ff0000';
    deathMessage.style.fontFamily = 'Arial, sans-serif';
    deathMessage.style.marginBottom = '20px';
    
    // Respawn button
    const respawnButton = document.createElement('button');
    respawnButton.textContent = 'Respawn';
    respawnButton.style.padding = '10px 20px';
    respawnButton.style.fontSize = '1.2em';
    respawnButton.style.cursor = 'pointer';
    respawnButton.style.backgroundColor = '#333';
    respawnButton.style.color = '#fff';
    respawnButton.style.border = '2px solid #666';
    respawnButton.style.borderRadius = '5px';
    
    // Add respawn functionality
    respawnButton.addEventListener('click', () => {
      this.respawn();
      document.body.removeChild(deathScreen);
    });
    
    // Append elements
    deathScreen.appendChild(deathMessage);
    deathScreen.appendChild(respawnButton);
    document.body.appendChild(deathScreen);
  }
  
  respawn() {
    // Reset health and mana
    this.health = this.maxHealth;
    this.mana = this.maxMana;
    
    // Reset appearance
    if (this.mesh && this.mesh.material) {
      this.mesh.material.color.set(0x3333ff); // Original color
      this.mesh.rotation.x = 0; // Reset rotation
    }
    
    // Reset position to spawn point (0, 0, 0 or other designated spawn point)
    this.mesh.position.set(0, 0.5, 0);
    
    // Clear target position to stop movement
    this.targetPosition = null;
    this.isMoving = false;
    
    // Reset isDead flag
    this.isDead = false;
  }
  
  addToInventory(item) {
    this.inventory.push(item);
    
    // Update UI
    this.game.ui.updateInventory();
  }
  
  equipItem(item) {
    if (item instanceof Weapon) {
      // Unequip previous weapon if exists
      if (this.equipment.weapon) {
        // Remove the weapon mesh from the container
        this.weaponContainer.remove(this.equipment.weapon.mesh);
        
        // Add previous weapon back to inventory
        this.inventory.push(this.equipment.weapon);
      }
      
      // Equip new weapon
      this.equipment.weapon = item;
      
      // Remove from inventory
      const index = this.inventory.indexOf(item);
      if (index !== -1) {
        this.inventory.splice(index, 1);
      }
      
      // Add the weapon mesh to the container
      this.weaponContainer.add(item.mesh);
      
      // Update UI
      this.game.ui.updateInventory();
    }
  }
} 
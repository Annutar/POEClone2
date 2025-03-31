import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Entity } from './Entity.js';
import { Weapon } from '../items/Weapon.js';
import { Staff } from '../items/weapons/Staff.js';
import { Bow } from '../items/weapons/Bow.js';
import { Axe } from '../items/weapons/Axe.js';

export class Player extends Entity {
  constructor(game) {
    super(game);
    
    // Player base attributes
    this.baseMaxHealth = 100;
    this.baseMaxMana = 100;
    this.baseManaRegen = 5;
    this.baseAttackSpeed = 1.0;
    this.baseAttackDamage = 10;
    this.baseAttackRange = 1.5;
    this.baseMoveSpeed = 5;
    
    // Current stats (initialized from base)
    this.maxHealth = this.baseMaxHealth;
    this.health = this.maxHealth;
    this.maxMana = this.baseMaxMana;
    this.mana = this.maxMana;
    this.manaRegen = this.baseManaRegen;
    this.attackSpeed = this.baseAttackSpeed;
    this.attackDamage = this.baseAttackDamage;
    this.attackRange = this.baseAttackRange;
    this.moveSpeed = this.baseMoveSpeed;
    
    // Inventory and Equipment
    this.inventory = [];
    this.equipment = {
      weapon: null
    };
    
    // Cooldowns
    this.lastAttackTime = 0;
    
    // Movement
    this.targetPosition = null;
    this.isMoving = false;
    
    // Kill-based power scaling
    this.killCount = 0;
    this.sizeMultiplier = 1.0;
    this.speedMultiplier = 1.0;
    this.damageMultiplier = 1.0;
    this.appliedBuffs = []; // To store descriptions of random buffs
    
    // Create player mesh
    this.createMesh();
    
    // Give the player a random starting weapon
    this.giveRandomStartingWeapon();
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
    
    // Apply initial scale based on sizeMultiplier
    this.applyScale();
  }
  
  applyScale() {
    if (this.mesh) {
      this.mesh.scale.set(this.sizeMultiplier, this.sizeMultiplier, this.sizeMultiplier);
      // Adjust weapon container position based on scale if needed
      // this.weaponContainer.position.set(0.3 * this.sizeMultiplier, 0.5 * this.sizeMultiplier, 0);
    }
  }
  
  update(delta) {
    // Skip update if dead
    if (this.isDead) return;
    
    // Calculate effective move speed
    const effectiveMoveSpeed = this.baseMoveSpeed * this.speedMultiplier;
    
    // Handle keyboard movement
    const direction = this.game.inputHandler.getMovementDirection();
    if (direction.length() > 0) {
      this.targetPosition = null;
      const movement = direction.clone().multiplyScalar(delta * effectiveMoveSpeed);
      this.mesh.position.add(movement);
      this.mesh.lookAt(this.mesh.position.clone().add(direction));
    }
    
    // Handle click-to-move
    if (this.targetPosition) {
      const direction = new THREE.Vector3();
      direction.subVectors(this.targetPosition, this.mesh.position);
      direction.y = 0; 
      const distance = direction.length();
      
      if (distance < 0.1) {
        this.targetPosition = null;
        this.isMoving = false;
      } else {
        direction.normalize();
        const movement = direction.clone().multiplyScalar(delta * effectiveMoveSpeed);
        this.mesh.position.add(movement);
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
    if (this.isDead) return;
    
    // Calculate effective attack speed
    const effectiveAttackSpeed = this.baseAttackSpeed * this.speedMultiplier;
    const now = Date.now();
    const weaponCooldown = 1000 / effectiveAttackSpeed;
    
    if (now - this.lastAttackTime < weaponCooldown) {
      return;
    }
    
    const distance = this.mesh.position.distanceTo(target.mesh.position);
    if (distance > this.attackRange) {
      this.moveToPoint(target.mesh.position);
      return;
    }
    
    this.mesh.lookAt(target.mesh.position);
    
    // Calculate base damage
    let damage = this.baseAttackDamage;
    if (this.equipment.weapon) {
      damage += this.equipment.weapon.damage || 0;
      // Apply weapon attributes
      if (this.equipment.weapon.attributes) {
        this.equipment.weapon.attributes.forEach(attr => {
          if (attr.type === 'damage_multiplier') {
            damage *= attr.value;
          }
          // Add other weapon attribute effects here if needed
        });
      }
    }
    
    // Apply player's damage multiplier
    const effectiveDamage = damage * this.damageMultiplier;
    
    // Apply damage, passing player as the source
    target.takeDamage(effectiveDamage, this); 
    
    this.lastAttackTime = now;
    this.playAttackAnimation();
  }
  
  playAttackAnimation() {
    // Simple attack animation by scaling the weapon
    if (this.equipment.weapon && this.equipment.weapon.mesh) {
      const weaponMesh = this.equipment.weapon.mesh;
      const originalScale = weaponMesh.scale.clone();
      const scaleUp = new THREE.Vector3(1.5, 1.5, 1.5);
      
      // Scale up quickly
      weaponMesh.scale.multiply(scaleUp);
      
      // Scale back to normal after a short delay
      setTimeout(() => {
        weaponMesh.scale.copy(originalScale);
      }, 150);
    }
  }
  
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.die();
    }
  }
  
  die() {
    console.log('Player died');
    this.isDead = true;
    if (this.mesh && this.mesh.material) {
      this.mesh.material.color.set(0x777777); 
      this.mesh.rotation.x = Math.PI / 2; 
    }
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
    // Reset stats but keep accumulated buffs/kills
    this.health = this.maxHealth;
    this.mana = this.maxMana;
    
    if (this.mesh && this.mesh.material) {
      this.mesh.material.color.set(0x3333ff);
      this.mesh.rotation.x = 0; 
    }
    
    this.mesh.position.set(0, 0.5 * this.sizeMultiplier, 0); // Adjust spawn height based on size
    this.targetPosition = null;
    this.isMoving = false;
    this.isDead = false;
    
    // Re-apply scale on respawn
    this.applyScale();
  }
  
  addToInventory(item) {
    this.inventory.push(item);
    
    // Update UI if it exists
    if (this.game.ui) {
      this.game.ui.updateInventory();
    }
  }
  
  equipItem(item) {
    try {
      if (!item) {
        console.warn('Cannot equip null item');
        return;
      }
      
      if (item instanceof Weapon) {
        // Unequip previous weapon if exists
        if (this.equipment.weapon) {
          // Remove the weapon mesh from the container
          if (this.weaponContainer && this.equipment.weapon.mesh) {
            this.weaponContainer.remove(this.equipment.weapon.mesh);
          }
          
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
        if (this.weaponContainer && item.mesh) {
          this.weaponContainer.add(item.mesh);
        } else {
          console.warn('Cannot add weapon mesh: container or mesh is missing');
        }
        
        // Update UI if it exists
        if (this.game.ui) {
          this.game.ui.updateInventory();
        }
      }
    } catch (error) {
      console.warn('Error equipping item:', error.message);
    }
  }
  
  giveRandomStartingWeapon() {
    try {
      // Choose a random weapon type
      const weaponTypes = [Staff, Bow, Axe];
      const WeaponClass = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      
      // Determine rarity (better chance for magic/rare than normal loot)
      let rarity = 'normal';
      const rarityRoll = Math.random();
      
      if (rarityRoll < 0.2) {
        rarity = 'rare';
      } else if (rarityRoll < 0.6) {
        rarity = 'magic';
      }
      
      console.log(`Starting with ${rarity} ${WeaponClass.name}`);
      
      // Create the weapon
      const weapon = new WeaponClass(this.game, {
        id: 'starting-weapon',
        rarity,
        position: new THREE.Vector3()
      });
      
      // Add attributes based on rarity (only if itemManager is initialized)
      if (this.game.itemManager && this.game.itemManager.attributePool) {
        if (rarity === 'magic') {
          this.addRandomAttributesToWeapon(weapon, 1);
        } else if (rarity === 'rare') {
          this.addRandomAttributesToWeapon(weapon, 2);
        }
      }
      
      // Equip the weapon (this will handle missing UI)
      this.equipItem(weapon);
    } catch (error) {
      console.warn("Could not give starting weapon:", error.message);
    }
  }
  
  addRandomAttributesToWeapon(weapon, count) {
    // Make sure weapon and itemManager exist
    if (!weapon || !this.game.itemManager || !this.game.itemManager.attributePool) {
      console.warn('Cannot add attributes: weapon or attribute pool is missing');
      return;
    }

    try {
      // Clone the attribute pool from ItemManager
      const attributePool = [...this.game.itemManager.attributePool];
      
      for (let i = 0; i < count; i++) {
        if (attributePool.length === 0) break;
        
        // Select random attribute
        const index = Math.floor(Math.random() * attributePool.length);
        const attribute = attributePool.splice(index, 1)[0];
        
        // Add attribute to weapon
        if (!weapon.attributes) {
          weapon.attributes = [];
        }
        weapon.attributes.push({...attribute});
      }
    } catch (error) {
      console.warn('Error adding attributes to weapon:', error.message);
    }
  }
  
  // --- Power Scaling Mechanic ---
  onEnemyKilled(enemy) {
    this.killCount++;
    console.log(`%cKill count: ${this.killCount}`, 'color: yellow; font-weight: bold;');

    // --- Apply Guaranteed Buffs per Kill --- 
    const sizeIncrease = 0.05; // Increased size buff
    this.sizeMultiplier += sizeIncrease;
    this.applyScale();
    console.log(` Size Multiplier: ${this.sizeMultiplier.toFixed(2)} (+${sizeIncrease})`);
    
    const speedIncrease = 0.03; // Increased speed buff
    this.speedMultiplier += speedIncrease;
    this.attackSpeed = this.baseAttackSpeed * this.speedMultiplier; 
    this.moveSpeed = this.baseMoveSpeed * this.speedMultiplier;
    console.log(` Speed Multiplier: ${this.speedMultiplier.toFixed(2)} (+${speedIncrease}) -> Move: ${this.moveSpeed.toFixed(2)}, Attack: ${this.attackSpeed.toFixed(2)}`);

    const damageIncrease = 0.08; // Increased damage buff
    this.damageMultiplier += damageIncrease;
    console.log(` Damage Multiplier: ${this.damageMultiplier.toFixed(2)} (+${damageIncrease})`);
    
    // --- Apply Random Powerful Buff Every 3 Kills (more frequent) ---
    if (this.killCount > 0 && this.killCount % 3 === 0) {
      console.log(`%cApplying powerful buff at ${this.killCount} kills...`, 'color: cyan');
      this.applyRandomPowerfulBuff();
    } else {
      console.log(` Next powerful buff at ${Math.ceil(this.killCount / 3) * 3} kills`);
    }
    
    // Heal the player more significantly
    const healAmount = 15;
    this.health = Math.min(this.maxHealth, this.health + healAmount);
    console.log(` Healed for ${healAmount}. Current Health: ${Math.round(this.health)}/${this.maxHealth}`);
    
    // Update UI immediately to show heal/stat changes
    if (this.game.ui) {
      this.game.ui.update(); 
    }
  }

  applyRandomPowerfulBuff() {
    const buffs = [
      { type: 'health_increase', value: 35, description: '+35 Max Health' }, // Buffed
      { type: 'mana_increase', value: 25, description: '+25 Max Mana' },   // Buffed
      { type: 'damage_boost', value: 0.2, description: '+20% Damage Multiplier' }, // Buffed
      { type: 'speed_boost', value: 0.1, description: '+10% Speed Multiplier' },  // Buffed
      // { type: 'crit_chance', value: 0.05, description: '+5% Crit Chance (Not Implemented)' },
      // { type: 'lifesteal', value: 0.02, description: '+2% Lifesteal (Not Implemented)' }
    ];

    const randomBuff = buffs[Math.floor(Math.random() * buffs.length)];
    this.appliedBuffs.push(randomBuff.description);
    console.log(`%c-> Applied Buff: ${randomBuff.description}`, 'color: lightgreen; font-weight: bold;');

    switch (randomBuff.type) {
      case 'health_increase':
        this.maxHealth += randomBuff.value;
        this.health += randomBuff.value; 
        console.log(`   New Max Health: ${this.maxHealth}`);
        break;
      case 'mana_increase':
        this.maxMana += randomBuff.value;
        this.mana += randomBuff.value;
        console.log(`   New Max Mana: ${this.maxMana}`);
        break;
      case 'damage_boost':
        this.damageMultiplier += randomBuff.value;
        console.log(`   New Damage Multiplier: ${this.damageMultiplier.toFixed(2)}`);
        break;
      case 'speed_boost':
        this.speedMultiplier += randomBuff.value;
        this.attackSpeed = this.baseAttackSpeed * this.speedMultiplier; 
        this.moveSpeed = this.baseMoveSpeed * this.speedMultiplier;
        console.log(`   New Speed Multiplier: ${this.speedMultiplier.toFixed(2)} -> Move: ${this.moveSpeed.toFixed(2)}, Attack: ${this.attackSpeed.toFixed(2)}`);
        break;
    }
    // UI update is handled in onEnemyKilled after this call
  }
} 
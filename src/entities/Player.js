import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Entity } from './Entity.js';
import { Weapon } from '../items/Weapon.js';
import { Staff } from '../items/weapons/Staff.js';
import { Bow } from '../items/weapons/Bow.js';
import { Axe } from '../items/weapons/Axe.js';
import { MagicOrb } from '../projectiles/MagicOrb.js';
import { Arrow } from '../projectiles/Arrow.js';
import { Projectile } from '../projectiles/Projectile.js';

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
    
    // Mesh and Appearance related
    this.mesh = null; // Mesh will be created based on starting weapon
    this.weaponContainer = new THREE.Object3D(); // Keep the container
    this.modelHeight = 1; // Default height, might be overridden by model
    
    // Give the player a starting weapon AND set appearance
    this.giveRandomStartingWeapon();
  }
  
  setAppearanceBasedOnWeapon(weaponClassName) {
    console.log(`Setting appearance based on: ${weaponClassName}`);
    // Remove old mesh if it exists (e.g., on respawn with different logic)
    if (this.mesh) {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        // Dispose geometry/material if needed
    }

    let weaponOffsetX = 0.3;
    let weaponOffsetY = 0.5;
    let weaponOffsetZ = 0;

    switch(weaponClassName) {
        case 'Staff':
            this.mesh = this.createMageMesh();
            this.modelHeight = 1.8;
            weaponOffsetX = 0.35; // Slightly further out for robes
            weaponOffsetY = 0.6;
            break;
        case 'Bow':
            this.mesh = this.createArcherMesh();
            this.modelHeight = 1.6;
            weaponOffsetX = 0.25; 
            weaponOffsetY = 0.45; 
            weaponOffsetZ = 0.2; // Move bow forward
            break;
        case 'Axe':
            this.mesh = this.createMarauderMesh();
            this.modelHeight = 1.7;
            weaponOffsetX = 0.4; // Further out for bulkier model
            weaponOffsetY = 0.55;
            break;
        default:
            console.warn("Unknown weapon class for appearance, creating default mesh.");
            this.mesh = this.createDefaultMesh(); // Fallback
            this.modelHeight = 1.0;
            break;
    }

    // Add weapon container to the new mesh
    // Use calculated offsets, scaled by base model height ratio
    const scaleRatio = this.modelHeight / 1.6; // Ratio relative to original default height estimate
    this.weaponContainer.position.set(weaponOffsetX * scaleRatio, weaponOffsetY * scaleRatio, weaponOffsetZ * scaleRatio); 
    this.mesh.add(this.weaponContainer);

    // Set initial position and apply scale
    this.mesh.position.set(0, this.modelHeight / 2 * this.sizeMultiplier, 0);
    this.applyScale(); 
    
    // Add the newly created mesh to the scene (important!)
    if (this.game.scene && this.mesh) {
        console.log(`Adding player mesh to scene for weapon: ${weaponClassName}`);
        this.game.scene.add(this.mesh);
    } else {
        console.error("Could not add player mesh to scene. Scene or Mesh missing.");
    }
  }

  createDefaultMesh() {
      // Simple box as fallback
      const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
      const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
  }

  createMageMesh() {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4aae, roughness: 0.7 });
    const detailMaterial = new THREE.MeshStandardMaterial({ color: 0x8a8aff, roughness: 0.6 });
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a7e, roughness: 0.7 }); // Darker blue for hat

    // Robe Body (Cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.1, 0.4, 1.5, 12);
    const body = new THREE.Mesh(bodyGeo, bodyMaterial);
    body.position.y = 1.5 / 2;
    group.add(body);

    // Head (Sphere)
    const headGeo = new THREE.SphereGeometry(0.25, 16, 12);
    const head = new THREE.Mesh(headGeo, detailMaterial);
    const headYPos = 1.5 + 0.15;
    head.position.y = headYPos;
    group.add(head);

    // --- Add Hat --- 
    const hatGeo = new THREE.ConeGeometry(0.35, 0.6, 10); // radius, height, segments
    const hat = new THREE.Mesh(hatGeo, hatMaterial);
    hat.position.y = headYPos + 0.3; // RAISED: Position base near top of head
    group.add(hat);
    // ---------------

    // Shoulders/Sleeves (optional detail)
    const sleeveGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.5, 8);
    const leftSleeve = new THREE.Mesh(sleeveGeo, bodyMaterial);
    leftSleeve.position.set(-0.2, 1.3, 0);
    leftSleeve.rotation.z = Math.PI / 6;
    group.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, bodyMaterial);
    rightSleeve.position.set(0.2, 1.3, 0);
    rightSleeve.rotation.z = -Math.PI / 6;
    group.add(rightSleeve);

    group.traverse(child => { 
        if (child.isMesh) {
            child.castShadow = true; 
            child.receiveShadow = true; 
        }
    });
    return group;
  }

  createArcherMesh() {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3d5c3d, roughness: 0.8 }); // Dark green
    const detailMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // Brown leather

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.4, 0.7, 0.25);
    const torso = new THREE.Mesh(torsoGeo, detailMaterial); 
    torso.position.y = 0.3 + 0.7 / 2;
    group.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 16, 12);
    const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xcccccc })); // Skin tone placeholder
    head.position.y = torso.position.y + 0.7 / 2 + 0.1;
    group.add(head);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const leftLeg = new THREE.Mesh(legGeo, bodyMaterial);
    leftLeg.position.set(-0.1, 0.6 / 2, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, bodyMaterial);
    rightLeg.position.set(0.1, 0.6 / 2, 0);
    group.add(rightLeg);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
    const leftArm = new THREE.Mesh(armGeo, bodyMaterial);
    leftArm.position.set(-0.25, torso.position.y, 0);
    leftArm.rotation.z = Math.PI / 12;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, bodyMaterial);
    rightArm.position.set(0.25, torso.position.y, 0);
    rightArm.rotation.z = -Math.PI / 12;
    group.add(rightArm);

    group.traverse(child => { 
        if (child.isMesh) {
            child.castShadow = true; 
            child.receiveShadow = true; 
        }
    });
    return group;
  }

  createMarauderMesh() {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x9d4a4a, roughness: 0.6 }); // Reddish/Brown
    const armorMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.3 });

    // Torso (Bulkier)
    const torsoGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const torso = new THREE.Mesh(torsoGeo, bodyMaterial);
    torso.position.y = 0.4 + 0.8 / 2;
    group.add(torso);

    // Head (Slightly larger / Helmet placeholder)
    const headGeo = new THREE.BoxGeometry(0.3, 0.35, 0.3); // Boxy head/helmet
    const head = new THREE.Mesh(headGeo, armorMaterial);
    head.position.y = torso.position.y + 0.8 / 2 + 0.1;
    group.add(head);

    // Legs (Sturdier)
    const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const leftLeg = new THREE.Mesh(legGeo, armorMaterial);
    leftLeg.position.set(-0.15, 0.7 / 2, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, armorMaterial);
    rightLeg.position.set(0.15, 0.7 / 2, 0);
    group.add(rightLeg);

    // Arms (Bulkier)
    const armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
    const leftArm = new THREE.Mesh(armGeo, bodyMaterial);
    leftArm.position.set(-0.35, torso.position.y, 0);
    leftArm.rotation.z = Math.PI / 10;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, bodyMaterial);
    rightArm.position.set(0.35, torso.position.y, 0);
    rightArm.rotation.z = -Math.PI / 10;
    group.add(rightArm);

    group.traverse(child => { 
        if (child.isMesh) {
            child.castShadow = true; 
            child.receiveShadow = true; 
        }
    });
    return group;
  }
  
  applyScale() {
    if (this.mesh) {
      this.mesh.scale.set(this.sizeMultiplier, this.sizeMultiplier, this.sizeMultiplier);
      // Adjust position based on new scale to keep bottom potentially grounded
      this.mesh.position.y = this.modelHeight / 2 * this.sizeMultiplier;
    }
  }
  
  update(delta) {
    // Skip update if dead
    if (this.isDead) return;
    
    // Calculate effective move speed
    const effectiveMoveSpeed = this.baseMoveSpeed * this.speedMultiplier;
    
    // --- Handle Keyboard Movement ONLY ---
    const direction = this.game.inputHandler.getMovementDirection();
    if (direction.length() > 0) {
      // Set targetPosition to null to ensure keyboard overrides any potential residual click move target
      this.targetPosition = null; 
      this.isMoving = true;
      
      const movement = direction.clone().multiplyScalar(delta * effectiveMoveSpeed);
      this.mesh.position.add(movement);
      
      // Rotate character to face movement direction
      this.mesh.lookAt(this.mesh.position.clone().add(direction));
    } else {
        this.isMoving = false; // Not moving if no direction input
    }
    // -------------------------------------
    
    // Regenerate mana
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * delta);
  }
  
  attack(target) {
    // This method now handles ONLY direct clicks on enemies
    if (this.isDead || !this.equipment.weapon) return;

    const weaponType = this.equipment.weapon.constructor.name;
    
    if (weaponType === 'Staff' || weaponType === 'Bow') {
        // RANGED: Launch projectile directly at the target enemy
        this.mesh.lookAt(target.mesh.position); 
        this.launchProjectile(target.mesh.position, weaponType); // Pass target position
    } else { 
        // MELEE: Perform melee attack logic
        const distance = this.mesh.position.distanceTo(target.mesh.position);
        if (distance > this.attackRange) {
            console.log("Target out of melee range");
            return; 
        }
        this.performMeleeAttack(target);
    }
    
    this.playAttackAnimation();
  }

  attackTowardsPoint(targetPoint) {
    // This method handles clicks on the ground (attack in direction)
    if (this.isDead || !this.equipment.weapon) return;

    const weaponType = this.equipment.weapon.constructor.name;

    // Only allow attacking towards point for RANGED weapons
    if (weaponType === 'Staff' || weaponType === 'Bow') {
        // Make player face the target point before firing
        const lookTarget = targetPoint.clone();
        lookTarget.y = this.mesh.position.y; // Look horizontally
        this.mesh.lookAt(lookTarget); 
        
        // Launch projectile towards the target point
        this.launchProjectile(targetPoint, weaponType); 
    } else {
        // Melee characters do nothing when clicking the ground
        console.log("Cannot perform melee attack towards a point.");
        return; 
    }

    this.playAttackAnimation();
  }

  performMeleeAttack(target) {
    this.mesh.lookAt(target.mesh.position);
    
    // Calculate base damage (already includes weapon damage)
    let damage = this.baseAttackDamage;
    if (this.equipment.weapon) {
      damage += this.equipment.weapon.damage || 0;
      if (this.equipment.weapon.attributes) {
        this.equipment.weapon.attributes.forEach(attr => {
          if (attr.type === 'damage_multiplier') damage *= attr.value;
        });
      }
    }
    const effectiveDamage = damage * this.damageMultiplier;
    target.takeDamage(effectiveDamage, this); 
  }

  launchProjectile(targetPosition, weaponType) { // Changed parameter name
      // --- Mana Check ---
      const manaCost = 5; 
      if (this.mana < manaCost) {
          console.log("Not enough mana to fire!");
          return; 
      }
      // ------------------

      // Player already looking at targetPosition (from attack or attackTowardsPoint)
      // this.mesh.lookAt(targetPosition); // This is now redundant here

      // Calculate projectile properties
      let damage = this.baseAttackDamage;
      let projectileColor = 0xffffff;
      let ProjectileClass = Projectile; 
      let launchOffset = 0.5; 

      if (this.equipment.weapon) {
        damage += this.equipment.weapon.damage || 0;
        projectileColor = this.getProjectileColorFromWeapon(this.equipment.weapon);
         if (this.equipment.weapon.attributes) {
            this.equipment.weapon.attributes.forEach(attr => {
                if (attr.type === 'damage_multiplier') damage *= attr.value;
            });
        }
      }
      const effectiveDamage = damage * this.damageMultiplier;
      
      if (weaponType === 'Staff') {
          ProjectileClass = MagicOrb;
          launchOffset = this.modelHeight * 0.6; 
      } else if (weaponType === 'Bow') {
          ProjectileClass = Arrow;
          launchOffset = this.modelHeight * 0.5; 
      }

      
      // Calculate spawn position
      const spawnPosition = this.mesh.position.clone();
      const direction = new THREE.Vector3();
      // Calculate direction vector FROM player TO targetPosition
      direction.subVectors(targetPosition, this.mesh.position).normalize();
      
      // Adjust spawn height and position it slightly in front
      spawnPosition.y += launchOffset * this.sizeMultiplier; 
      spawnPosition.addScaledVector(direction, 0.5 * this.sizeMultiplier); 

      // Use the calculated direction for velocity
      const velocity = direction.multiplyScalar(ProjectileClass.prototype.speed || 15); 
      
      // --- Deduct Mana ---
      this.mana -= manaCost;
      console.log(`Used ${manaCost} mana. Current Mana: ${this.mana.toFixed(1)}`);
       if (this.game.ui) {
           this.game.ui.update(); 
       }
      // -----------------

      // Create the projectile
      new ProjectileClass(this.game, {
          position: spawnPosition,
          velocity: velocity, // Use the calculated velocity
          damage: effectiveDamage,
          color: projectileColor,
          source: this,
          targetType: 'enemy',
          scale: this.sizeMultiplier // Pass player scale to projectile
      });
      
      console.log(`Launched ${weaponType === 'Staff' ? 'MagicOrb' : 'Arrow'} towards point`);
  }
  
  getProjectileColorFromWeapon(weapon) {
      if (!weapon) return 0xffffff;
      switch (weapon.rarity) {
          case 'magic': return 0x6666ff; // Blue
          case 'rare': return 0xffff66;  // Yellow
          // Add specific colors for unique weapons?
          // case 'unique_staff_of_fire': return 0xff6600;
          default: 
            // Default based on type
            if(weapon instanceof Staff) return 0xaa88ff; // Lavender default for staff
            if(weapon instanceof Bow) return 0x8B4513; // Brown default for bow (arrow shaft)
            return 0xffffff;
      }
  }
  
  playAttackAnimation() {
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
    
    // Reset appearance properties (color/rotation)
    if (this.mesh) { 
        this.mesh.rotation.x = 0; 
        // Reset materials if they were changed (e.g., death color)
        this.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                // This is simplistic, might need original material stored
                if(child.material.emissive) child.material.emissive.setHex(0x000000);
                // Reset color if needed: child.material.color.set(originalColor);
            }
        });
    }
    
    this.mesh.position.set(0, this.modelHeight / 2 * this.sizeMultiplier, 0); // Adjust spawn height
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
      
      // --- SET APPEARANCE FIRST ---
      this.setAppearanceBasedOnWeapon(WeaponClass.name);
      // ---------------------------
      
      // Determine rarity
      let rarity = 'normal';
      const rarityRoll = Math.random();
      if (rarityRoll < 0.2) rarity = 'rare';
      else if (rarityRoll < 0.6) rarity = 'magic';
      
      console.log(`Starting with ${rarity} ${WeaponClass.name}`);
      
      // Create the weapon
      const weapon = new WeaponClass(this.game, {
        id: 'starting-weapon',
        rarity,
        position: new THREE.Vector3() // Position doesn't matter as it's equipped
      });
      
      // Add attributes based on rarity
      if (this.game.itemManager && this.game.itemManager.attributePool) {
        if (rarity === 'magic') {
          this.addRandomAttributesToWeapon(weapon, 1);
        } else if (rarity === 'rare') {
          this.addRandomAttributesToWeapon(weapon, 2);
        }
      }
      
      // Equip the weapon
      this.equipItem(weapon);

    } catch (error) {
      console.error("Error giving starting weapon or setting appearance:", error);
      // Ensure a fallback mesh exists if something went wrong
      if (!this.mesh) {
          this.mesh = this.createDefaultMesh();
          this.modelHeight = 1.0;
          this.mesh.position.set(0, this.modelHeight / 2, 0);
          if(this.game.scene) this.game.scene.add(this.mesh);
      }
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

    // Increase size slightly
    const sizeIncrease = 0.05; // Increased size buff
    this.sizeMultiplier += sizeIncrease;
    this.applyScale();
    console.log(` Size Multiplier: ${this.sizeMultiplier.toFixed(2)} (+${sizeIncrease})`);
    
    // --- Scale Melee Range --- 
    this.attackRange = this.baseAttackRange * this.sizeMultiplier;
    console.log(` Attack Range: ${this.attackRange.toFixed(2)}`);
    // -------------------------

    // Increase speed slightly
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
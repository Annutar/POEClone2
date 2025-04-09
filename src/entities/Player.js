import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Entity } from './Entity.js';
import { Weapon } from '../items/Weapon.js';
import { Staff } from '../items/weapons/Staff.js';
import { Bow } from '../items/weapons/Bow.js';
import { Axe } from '../items/weapons/Axe.js';
import { MagicOrb } from '../projectiles/MagicOrb.js';
import { Arrow } from '../projectiles/Arrow.js';
import { Projectile } from '../projectiles/Projectile.js';
import { WizardModel } from './WizardModel.js';

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
    
    // Level System (replacing kill-based power scaling)
    this.level = 1;
    this.maxLevel = 20; // Level cap
    this.currentXP = 0;
    this.xpToNextLevel = 50; // Halved initial XP (was 100)
    this.sizeMultiplier = 1.0;
    this.speedMultiplier = 1.0;
    this.damageMultiplier = 1.0;
    this.appliedBuffs = []; // To store descriptions of level bonuses
    
    // Mesh and Appearance related
    this.mesh = null; // Mesh will be set during async init
    this.weaponContainer = new THREE.Object3D(); // Keep the container
    this.modelHeight = 1; // Default height, might be overridden by model
    
    // DON'T give starting weapon here
    // this.giveRandomStartingWeapon(); 

    this.wizardModel = new WizardModel(game);
  }

  // New async initialization method
  async init() {
    console.log("Initializing Player appearance and weapon...");
    await this.giveRandomStartingWeapon(); // This now handles async appearance setting
    console.log("Player appearance and weapon initialized.");
  }
  
  async setAppearanceBasedOnWeapon(weaponClassName) {
    console.log(`Setting appearance based on: ${weaponClassName}`);
    // Remove old mesh if it exists
    if (this.mesh) {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }

    let weaponOffsetX = 0.3;
    let weaponOffsetY = 0.5;
    let weaponOffsetZ = 0;

    switch(weaponClassName) {
        case 'Staff':
            try {
                this.mesh = await this.wizardModel.load();
                this.modelHeight = 1.8;
                weaponOffsetX = 0.35;
                weaponOffsetY = 0.6;
            } catch (error) {
                console.error('Failed to load wizard model, falling back to default mesh:', error);
                this.mesh = this.createMageMesh();
            }
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
  
  update(deltaTime) {
    super.update(deltaTime);
    if (this.wizardModel) {
        this.wizardModel.update(deltaTime);
    }
    
    // Calculate effective move speed
    const effectiveMoveSpeed = this.baseMoveSpeed * this.speedMultiplier;
    
    // --- Handle Keyboard Movement ONLY ---
    const direction = this.game.inputHandler.getMovementDirection();
    if (direction.length() > 0) {
      // Set targetPosition to null to ensure keyboard overrides any potential residual click move target
      this.targetPosition = null; 
      this.isMoving = true;
      
      const movement = direction.clone().multiplyScalar(deltaTime * effectiveMoveSpeed);
      this.mesh.position.add(movement);
      
      // Rotate character to face movement direction
      this.mesh.lookAt(this.mesh.position.clone().add(direction));
    } else {
        this.isMoving = false; // Not moving if no direction input
    }
    // -------------------------------------
    
    // Regenerate mana
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * deltaTime);
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
    
    // Reset level system
    this.level = 1;
    this.currentXP = 0;
    this.xpToNextLevel = 50; // Reset to initial XP requirement
    
    // Reset multipliers to base values
    this.sizeMultiplier = 1.0;
    this.speedMultiplier = 1.0;
    this.damageMultiplier = 1.0;
    
    // Reset stats to base values
    this.maxHealth = this.baseMaxHealth;
    this.maxMana = this.baseMaxMana;
    this.manaRegen = this.baseManaRegen;
    this.attackSpeed = this.baseAttackSpeed;
    this.attackDamage = this.baseAttackDamage;
    this.attackRange = this.baseAttackRange;
    this.moveSpeed = this.baseMoveSpeed;
    
    // Clear applied buffs
    this.appliedBuffs = [];
    
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
    
    // Update UI to show reset stats
    if (this.game.ui) {
      this.game.ui.update();
    }
    
    console.log("Player respawned with reset level (Level 1)");
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
  
  // --- Level System Mechanic ---
  onEnemyKilled(enemy) {
    // Convert enemy kill to XP gain
    let xpGain = 20; // Base XP for any enemy
    
    // Adjust XP based on enemy type
    switch(enemy.constructor.name) {
      case 'Skeleton':
        xpGain = 15;
        break;
      case 'Wolf':
        xpGain = 20;
        break;
      case 'Goblin':
        xpGain = 25;
        break;
      case 'CaveBear':
        xpGain = 35;
        break;
      case 'Sasquatch':
        xpGain = 50;
        break;
      default:
        xpGain = 15;
    }
    
    // Heal the player when killing an enemy
    const healAmount = 10 + Math.floor(this.level / 2); // Scales with level
    this.health = Math.min(this.maxHealth, this.health + healAmount);
    console.log(` Healed for ${healAmount}. Current Health: ${Math.round(this.health)}/${this.maxHealth}`);
    
    // Grant XP
    this.gainXP(xpGain);
    
    // Update UI
    if (this.game.ui) {
      this.game.ui.update();
    }
  }
  
  gainXP(amount) {
    if (this.isDead) return;
    this.currentXP += amount;
    console.log(`Gained ${amount} XP. Total XP: ${this.currentXP}/${this.xpToNextLevel}`);
    
    // Check for level up
    while (this.currentXP >= this.xpToNextLevel) {
      this.levelUp();
    }

    // Update UI (Use the general update method)
    if (this.game.ui) {
      this.game.ui.update(); // Use the general UI update
    }
  }

  levelUp() {
    if (this.level >= this.maxLevel) return;

    this.currentXP -= this.xpToNextLevel; // Carry over excess XP
    this.level++;
    console.log(`Leveled up to Level ${this.level}!`);

    // --- Trigger Visual Effects --- 
    this.createLevelUpEffects(); 
    // ----------------------------

    // --- Apply Level Bonuses --- 
    // Example: Increase max health and mana
    const healthIncrease = Math.floor(this.maxHealth * 0.1); // +10% base max health
    const manaIncrease = Math.floor(this.maxMana * 0.05); // +5% base max mana
    this.maxHealth += healthIncrease;
    this.maxMana += manaIncrease;
    this.health = this.maxHealth; // Full heal on level up
    this.mana = this.maxMana;   // Full mana restore
    this.appliedBuffs.push(`Level ${this.level}: +${healthIncrease} Max Health, +${manaIncrease} Max Mana`);
    
    // Example: Slight stat boosts (adjust multipliers)
    this.speedMultiplier += 0.01; // +1% speed per level
    this.damageMultiplier += 0.02; // +2% damage per level
    this.appliedBuffs.push(`Level ${this.level}: +1% Move Speed, +2% Damage`);
    
    // Example: Increase size slightly (visual effect)
    this.sizeMultiplier += 0.01;
    this.applyScale(); // Re-apply scale to the mesh
    // --- End Level Bonuses ---

    // Calculate XP for the next level (use halved base)
    this.xpToNextLevel = Math.floor(50 * Math.pow(1.15, this.level - 1));

    // Update UI (Use the general update method)
    if (this.game.ui) {
      this.game.ui.update(); // Use the general UI update
    }
  }
  
  createLevelUpEffects() {
    if (!this.mesh || !this.game.scene) return;
    
    // Create a burst of particles around the player
    const particleCount = 50 + (this.level * 10); // More particles at higher levels
    const colors = [0xffff00, 0x00ffff, 0xff00ff, 0xffffff]; // Yellow, cyan, magenta, white
    
    // Create particle group
    const particles = [];
    
    // Get player position
    const playerPos = this.mesh.position.clone();
    const height = this.modelHeight * this.sizeMultiplier;
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
      // Create a small sphere for each particle
      const size = Math.random() * 0.1 + 0.05;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      const material = new THREE.MeshBasicMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 1
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Position around player
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2 + 1;
      const x = playerPos.x + Math.cos(angle) * radius;
      const z = playerPos.z + Math.sin(angle) * radius;
      const y = playerPos.y + (Math.random() * height * 1.5);
      
      particle.position.set(x, y, z);
      
      // Add velocity for animation
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5 + 5,
        (Math.random() - 0.5) * 5
      );
      
      // Add to scene and tracking array
      this.game.scene.add(particle);
      particles.push(particle);
    }
    
    // Create a light flash at player position
    const light = new THREE.PointLight(0xffff00, 5, 10);
    light.position.copy(playerPos);
    light.position.y += height / 2;
    this.game.scene.add(light);
    
    // Create a ring expanding outward
    const ringGeometry = new THREE.RingGeometry(0.5, 0.6, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(playerPos);
    ring.position.y += 0.1; // Slightly above ground
    ring.rotation.x = Math.PI / 2; // Lay flat
    this.game.scene.add(ring);
    
    // Animate the particles and effects
    let frame = 0;
    const maxFrames = 60; // 1 second at 60fps
    
    const animate = () => {
      frame++;
      
      // Update particles
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        // Apply gravity
        particle.userData.velocity.y -= 0.1;
        
        // Move particle
        particle.position.x += particle.userData.velocity.x * 0.05;
        particle.position.y += particle.userData.velocity.y * 0.05;
        particle.position.z += particle.userData.velocity.z * 0.05;
        
        // Fade out
        if (particle.material.opacity > 0) {
          particle.material.opacity -= 0.02;
        }
      }
      
      // Update light
      if (light.intensity > 0) {
        light.intensity -= 0.2;
      }
      
      // Update ring
      ring.scale.x += 0.2;
      ring.scale.y += 0.2;
      ring.scale.z += 0.2;
      ring.material.opacity -= 0.015;
      
      // Continue animation
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        // Clean up
        particles.forEach(particle => {
          this.game.scene.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
        });
        
        this.game.scene.remove(light);
        this.game.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
      }
    };
    
    // Start animation
    animate();
    
    // Play a sound effect if audio is available
    if (this.game.audioManager) {
      // Option to play a level up sound here
      this.game.audioManager.playSound('assets/audio/Levelup.mp3', 0.875); // Increased volume by 25% (from 0.7)
    }
  }
  
  applyLevelBonus() {
    // Apply special bonuses at certain levels
    let bonusApplied = false;
    
    switch(this.level) {
      case 5:
        // Level 5: Significant health boost
        this.maxHealth += 50;
        this.health += 50;
        this.appliedBuffs.push("Level 5: +50 Max Health");
        console.log(`%cLevel 5 Bonus: +50 Max Health (New Max: ${this.maxHealth})`, 'color: lightgreen; font-weight: bold;');
        bonusApplied = true;
        break;
        
      case 10:
        // Level 10: Mana capacity and regeneration
        this.maxMana += 50;
        this.mana += 50;
        this.manaRegen += 3;
        this.appliedBuffs.push("Level 10: +50 Max Mana, +3 Mana Regen");
        console.log(`%cLevel 10 Bonus: +50 Max Mana, +3 Mana Regen`, 'color: lightgreen; font-weight: bold;');
        bonusApplied = true;
        break;
        
      case 15:
        // Level 15: Major damage bonus
        this.damageMultiplier += 0.25;
        this.appliedBuffs.push("Level 15: +25% Damage");
        console.log(`%cLevel 15 Bonus: +25% Damage Multiplier (New: ${this.damageMultiplier.toFixed(2)})`, 'color: lightgreen; font-weight: bold;');
        bonusApplied = true;
        break;
        
      case 20:
        // Level 20 (Max): Master of All
        this.maxHealth += 100;
        this.health += 100;
        this.maxMana += 75;
        this.mana += 75;
        this.damageMultiplier += 0.2;
        this.speedMultiplier += 0.15;
        this.attackSpeed = this.baseAttackSpeed * this.speedMultiplier;
        this.moveSpeed = this.baseMoveSpeed * this.speedMultiplier;
        this.appliedBuffs.push("Level 20 MASTER: +100 Health, +75 Mana, +20% Damage, +15% Speed");
        console.log(`%cMAX LEVEL 20 ACHIEVED! Major bonuses to all stats applied!`, 'color: gold; font-weight: bold; font-size: 14px');
        bonusApplied = true;
        break;
    }
    
    // For other levels, apply a random small bonus
    if (!bonusApplied && this.level % 2 === 0) { // Every even level that doesn't have a special bonus
      const randomBonusType = Math.floor(Math.random() * 4);
      
      switch(randomBonusType) {
        case 0: // Health
          const healthBonus = 20;
          this.maxHealth += healthBonus;
          this.health += healthBonus;
          this.appliedBuffs.push(`Level ${this.level}: +${healthBonus} Max Health`);
          console.log(`%cLevel ${this.level} Bonus: +${healthBonus} Max Health`, 'color: lightgreen; font-weight: bold;');
          break;
          
        case 1: // Mana
          const manaBonus = 15;
          this.maxMana += manaBonus;
          this.mana += manaBonus;
          this.appliedBuffs.push(`Level ${this.level}: +${manaBonus} Max Mana`);
          console.log(`%cLevel ${this.level} Bonus: +${manaBonus} Max Mana`, 'color: lightgreen; font-weight: bold;');
          break;
          
        case 2: // Damage
          const damageBonus = 0.1;
          this.damageMultiplier += damageBonus;
          this.appliedBuffs.push(`Level ${this.level}: +10% Damage`);
          console.log(`%cLevel ${this.level} Bonus: +10% Damage`, 'color: lightgreen; font-weight: bold;');
          break;
          
        case 3: // Speed
          const speedBonus = 0.05;
          this.speedMultiplier += speedBonus;
          this.attackSpeed = this.baseAttackSpeed * this.speedMultiplier;
          this.moveSpeed = this.baseMoveSpeed * this.speedMultiplier;
          this.appliedBuffs.push(`Level ${this.level}: +5% Speed`);
          console.log(`%cLevel ${this.level} Bonus: +5% Speed`, 'color: lightgreen; font-weight: bold;');
          break;
      }
    }
  }
} 
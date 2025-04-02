import { Skeleton } from './enemies/Skeleton.js';
import { Wolf } from './enemies/Wolf.js';
import { Goblin } from './enemies/Goblin.js';
import { CaveBear } from './enemies/CaveBear.js';
import { Sasquatch } from './enemies/Sasquatch.js';

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.enemies = [];
    
    // Dynamic enemy limits based on player level
    this.baseMaxEnemies = 20;
    this.maxEnemies = this.baseMaxEnemies; // Will be updated based on player level
    
    this.spawnRadius = 15;
    this.enemyTypes = [
      { type: Skeleton, weight: 0.3 },
      { type: Wolf, weight: 0.25 },
      { type: Goblin, weight: 0.25 },
      { type: CaveBear, weight: 0.1 },
      { type: Sasquatch, weight: 0.1 }
    ];
    
    // Spawn timing control
    this.lastPackSpawnTime = Date.now();
    this.baseTimeBetweenPacks = 5000; // Base: 5 seconds between pack spawns
    this.minTimeBetweenPacks = this.baseTimeBetweenPacks; // Will be updated based on player level
    
    // Performance optimization settings
    this.updateFrequencyDivider = 1; // Every nth enemy gets updated each frame
    this.lowDetailDistance = 40; // Distance at which enemies switch to low detail updates
    this.cullingDistance = 60; // Distance at which enemies are culled (not updated)
    
    // Enemy redistribution settings
    this.redistributionDistance = 40; // Reduced by half (was 80) - closer redistribution trigger
    this.lastRedistributionTime = Date.now();
    this.redistributionInterval = 3000; // Check every 3 seconds
    this.redistributionChance = 0.5; // 50% chance to move a far enemy
    
    // Enemy packs scaling
    this.minPackSize = 2;
    this.maxPackSize = 5; // Base max pack size, will increase with player level
  }
  
  update(delta) {
    // First check if we should adjust enemy parameters based on player level
    this.updateDynamicParameters();
    
    // Update all enemies with performance optimizations
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      // Remove dead enemies
      if (enemy.isDead) {
        this.enemies.splice(i, 1);
        continue;
      }
      
      // Performance optimization - only update enemies close to the player
      if (this.game.player && this.game.player.mesh) {
        const distanceToPlayer = enemy.mesh.position.distanceTo(this.game.player.mesh.position);
        
        // If enemy is too far away, don't update it at all
        if (distanceToPlayer > this.cullingDistance) {
          continue;
        }
        
        // For enemies in medium distance, update less frequently based on player level
        if (distanceToPlayer > this.lowDetailDistance) {
          // Only update some enemies each frame (every nth enemy)
          if (i % this.updateFrequencyDivider !== 0) {
            continue;
          }
        }
      }
      
      // Update enemy
      enemy.update(delta);
    }
    
    // Redistribute far-away enemies to keep action around the player
    this.redistributeEnemies();
    
    // Spawn new enemies if needed
    this.trySpawnEnemies();
  }
  
  updateDynamicParameters() {
    if (!this.game.player) return;
    
    const playerLevel = this.game.player.level;
    
    // Scale maximum enemies based on player level
    // - Level 1-5: Base enemies (20)
    // - Level 6-10: Gradually increase to 40
    // - Level 11-15: Gradually increase to 60
    // - Level 16-20: Gradually increase to 100 (insane amount)
    if (playerLevel <= 5) {
      this.maxEnemies = this.baseMaxEnemies;
    } else if (playerLevel <= 10) {
      this.maxEnemies = this.baseMaxEnemies + Math.floor((playerLevel - 5) * 4); // 20-40
    } else if (playerLevel <= 15) {
      this.maxEnemies = 40 + Math.floor((playerLevel - 10) * 4); // 40-60
    } else {
      this.maxEnemies = 60 + Math.floor((playerLevel - 15) * 10); // 60-100+ for highest levels
    }
    
    // Scale pack sizes based on player level
    this.minPackSize = Math.min(5, 2 + Math.floor(playerLevel / 5)); // Increases from 2 to 5
    this.maxPackSize = Math.min(14, 5 + Math.floor(playerLevel / 2)); // Scales from 5 to 14 max
    
    // Decrease time between spawns as player levels up (more frequent spawns)
    // But don't go below 2 seconds to prevent overwhelming the player
    const timeReduction = playerLevel * 150; // 150ms reduction per level
    this.minTimeBetweenPacks = Math.max(2000, this.baseTimeBetweenPacks - timeReduction);
    
    // Performance optimizations for higher levels
    if (playerLevel >= 15) {
      // Update fewer enemies per frame at high levels
      this.updateFrequencyDivider = 2 + Math.floor((playerLevel - 15) / 2); // 2-4 at high levels
      
      // Increase culling distance slightly at high levels for performance
      this.cullingDistance = 60 + (playerLevel - 15) * 2; // 60-70 at high levels
    } else {
      this.updateFrequencyDivider = 1; // Default - update all enemies
      this.cullingDistance = 60; // Default culling distance
    }
  }
  
  spawnInitialEnemies() {
    // Spawn initial set of enemies in packs based on player level
    const playerLevel = this.game.player ? this.game.player.level : 1;
    const initialPacks = 2 + Math.floor(playerLevel / 5); // 2-6 packs based on level
    
    for (let i = 0; i < initialPacks; i++) {
      this.spawnEnemyPack();
    }
  }
  
  trySpawnEnemies() {
    // Spawn new enemies if below max count, and enough time has passed since last pack
    const now = Date.now();
    const timeSinceLastSpawn = now - this.lastPackSpawnTime;
    
    // Get player level (defaulting to 1 if not available)
    const playerLevel = this.game.player ? this.game.player.level : 1;
    
    // Scale spawn chance based on player level
    const baseSpawnChance = 0.06; // Doubled from 0.03 (3%) to 0.06 (6%)
    const levelBonus = 0.002 * playerLevel; // 0.2% increased chance per level
    const spawnChance = Math.min(0.20, baseSpawnChance + levelBonus); // Cap increased to 20%
    
    if (this.enemies.length < this.maxEnemies && timeSinceLastSpawn > this.minTimeBetweenPacks) {
      if (Math.random() < spawnChance) {
        this.spawnEnemyPack();
        this.lastPackSpawnTime = now;
      }
    }
  }
  
  spawnEnemyPack() {
    // Determine enemy type for the entire pack
    const enemyType = this.getRandomEnemyType();
    
    // Get player level (defaulting to 1 if not available)
    const playerLevel = this.game.player ? this.game.player.level : 1;
    
    // Determine dynamic pack size based on player level
    const minSize = this.minPackSize;
    const maxSize = this.maxPackSize;
    
    // Calculate random pack size within range
    const packSize = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));
    
    // Adjust for remaining capacity
    const adjustedPackSize = Math.min(packSize, this.maxEnemies - this.enemies.length);
    if (adjustedPackSize <= 0) return; // No space for more enemies
    
    // Get player position
    const playerPos = this.game.player.mesh.position;
    
    // Calculate pack center position at a certain distance from player
    // Scale distance based on player level (higher level = more spread out)
    const minDistance = 12; // Minimum spawn distance
    const maxDistance = minDistance + (playerLevel * 0.5); // Increasing with level
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.spawnRadius + minDistance;
    const centerX = playerPos.x + Math.cos(angle) * distance;
    const centerZ = playerPos.z + Math.sin(angle) * distance;
    
    // Get a readable name for logging
    let enemyTypeName = 'unknown';
    if (enemyType === Skeleton) enemyTypeName = 'Skeleton';
    else if (enemyType === Wolf) enemyTypeName = 'Wolf';
    else if (enemyType === Goblin) enemyTypeName = 'Goblin';
    else if (enemyType === CaveBear) enemyTypeName = 'CaveBear';
    else if (enemyType === Sasquatch) enemyTypeName = 'Sasquatch';
    
    console.log(`Spawning level-scaled pack of ${adjustedPackSize} ${enemyTypeName} enemies`);
    
    // Pack spread scales slightly with pack size and player level
    const baseSpread = 3;
    const packSpread = baseSpread + (playerLevel / 10) + (adjustedPackSize / 10);
    
    // Spawn the pack of enemies around the center point
    for (let i = 0; i < adjustedPackSize; i++) {
      // Each enemy is positioned within a radius from the pack center
      const enemyAngle = Math.random() * Math.PI * 2;
      const enemyDistance = Math.random() * packSpread + 1; // 1-[packSpread+1] units from center
      const x = centerX + Math.cos(enemyAngle) * enemyDistance;
      const z = centerZ + Math.sin(enemyAngle) * enemyDistance;
      
      // Create and add the enemy
      const enemy = new enemyType(this.game);
      enemy.mesh.position.set(x, 0.5, z);
      this.game.scene.add(enemy.mesh);
      this.enemies.push(enemy);
      
      // Apply level scaling to enemies at higher player levels
      if (playerLevel > 10) {
        // Scale enemy health and damage for challenging high-level gameplay
        const levelScaling = 1 + ((playerLevel - 10) * 0.1); // +10% per level above 10
        enemy.maxHealth *= levelScaling;
        enemy.health = enemy.maxHealth;
        enemy.attackDamage *= levelScaling;
      }
    }
  }
  
  spawnRandomEnemy() {
    // This method is kept for backward compatibility
    // Get player position
    const playerPos = this.game.player.mesh.position;
    
    // Calculate random position at a certain distance from player
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.spawnRadius + 10; // At least 10 units away
    const x = playerPos.x + Math.cos(angle) * distance;
    const z = playerPos.z + Math.sin(angle) * distance;
    
    // Determine enemy type
    const enemyType = this.getRandomEnemyType();
    
    // Create and add the enemy
    const enemy = new enemyType(this.game);
    enemy.mesh.position.set(x, 0.5, z);
    this.game.scene.add(enemy.mesh);
    this.enemies.push(enemy);
    
    return enemy;
  }
  
  getRandomEnemyType() {
    // Select random enemy type based on weights
    const totalWeight = this.enemyTypes.reduce((sum, type) => sum + type.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const enemyType of this.enemyTypes) {
      random -= enemyType.weight;
      if (random <= 0) {
        return enemyType.type;
      }
    }
    
    // Default fallback
    return this.enemyTypes[0].type;
  }
  
  spawnEnemyNearPosition(position, type) {
    // Spawn specific enemy type near a position
    const radius = 2;
    const angle = Math.random() * Math.PI * 2;
    const x = position.x + Math.cos(angle) * radius;
    const z = position.z + Math.sin(angle) * radius;
    
    const enemyClass = type || this.getRandomEnemyType();
    const enemy = new enemyClass(this.game);
    enemy.mesh.position.set(x, 0.5, z);
    this.game.scene.add(enemy.mesh);
    this.enemies.push(enemy);
    
    return enemy;
  }
  
  removeAllEnemies() {
    // Remove all enemies from scene and array
    for (const enemy of this.enemies) {
      if (enemy.mesh && enemy.mesh.parent) {
        enemy.mesh.parent.remove(enemy.mesh);
      }
    }
    
    this.enemies = [];
  }
  
  redistributeEnemies() {
    // Only check periodically to avoid performance impact
    const now = Date.now();
    if (now - this.lastRedistributionTime < this.redistributionInterval) {
      return;
    }
    this.lastRedistributionTime = now;
    
    // Can't redistribute without player
    if (!this.game.player || !this.game.player.mesh) {
      return;
    }
    
    const playerPos = this.game.player.mesh.position;
    const farEnemies = [];
    
    // Collect enemies that are too far from player
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (!enemy.mesh || !enemy.mesh.position || enemy.isDead) continue;
      
      const distanceToPlayer = enemy.mesh.position.distanceTo(playerPos);
      if (distanceToPlayer > this.redistributionDistance) {
        farEnemies.push(enemy);
      }
    }
    
    // If we have enemies too far away, move some of them
    if (farEnemies.length > 0) {
      // Calculate how many to move - more at higher levels for faster pace
      const playerLevel = this.game.player ? this.game.player.level : 1;
      const baseToMove = Math.ceil(farEnemies.length * this.redistributionChance);
      const levelBonus = Math.floor(playerLevel / 5); // Additional enemies to move based on level
      const enemiesToMove = Math.min(farEnemies.length, baseToMove + levelBonus);
      
      console.log(`Redistributing ${enemiesToMove} far-away enemies closer to player`);
      
      // Randomly select the enemies to move
      const shuffledEnemies = this.shuffleArray(farEnemies).slice(0, enemiesToMove);
      
      // Reposition each selected enemy
      shuffledEnemies.forEach(enemy => {
        // Calculate new position around player, similar to spawning but closer
        const angle = Math.random() * Math.PI * 2;
        const minDistance = this.lowDetailDistance * 0.8; // Just outside regular update zone
        const maxDistance = this.lowDetailDistance * 1.2; // But not too far
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        const x = playerPos.x + Math.cos(angle) * distance;
        const z = playerPos.z + Math.sin(angle) * distance;
        
        // Reposition the enemy
        enemy.mesh.position.set(x, 0.5, z);
        
        // Reset enemy target if it has one
        if (typeof enemy.targetPosition !== 'undefined') {
          enemy.targetPosition = null;
        }
      });
    }
  }
  
  // Utility method to shuffle an array (Fisher-Yates algorithm)
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
} 
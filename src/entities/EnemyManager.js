import { Skeleton } from './enemies/Skeleton.js';
import { Wolf } from './enemies/Wolf.js';
import { Goblin } from './enemies/Goblin.js';
import { CaveBear } from './enemies/CaveBear.js';
import { Sasquatch } from './enemies/Sasquatch.js';

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.enemies = [];
    this.maxEnemies = 20;
    this.spawnRadius = 15;
    this.enemyTypes = [
      { type: Skeleton, weight: 0.3 },
      { type: Wolf, weight: 0.25 },
      { type: Goblin, weight: 0.25 },
      { type: CaveBear, weight: 0.1 },
      { type: Sasquatch, weight: 0.1 }
    ];
  }
  
  update(delta) {
    // Update all enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      // Remove dead enemies
      if (enemy.isDead) {
        this.enemies.splice(i, 1);
        continue;
      }
      
      // Update enemy
      enemy.update(delta);
    }
    
    // Spawn new enemies if needed
    this.trySpawnEnemies();
  }
  
  spawnInitialEnemies() {
    // Spawn initial set of enemies
    for (let i = 0; i < 10; i++) {
      this.spawnRandomEnemy();
    }
  }
  
  trySpawnEnemies() {
    // Spawn new enemies if below max count
    if (this.enemies.length < this.maxEnemies) {
      // Random chance to spawn a new enemy
      if (Math.random() < 0.05) {
        this.spawnRandomEnemy();
      }
    }
  }
  
  spawnRandomEnemy() {
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
} 
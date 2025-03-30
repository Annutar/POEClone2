import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.1/dist/esm-browser/index.js';
import { Weapon } from './Weapon.js';
import { Staff } from './weapons/Staff.js';
import { Bow } from './weapons/Bow.js';
import { Axe } from './weapons/Axe.js';

export class ItemManager {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.attributePool = [
      { type: 'damage_multiplier', value: 1.2, description: '20% Increased Damage' },
      { type: 'damage_multiplier', value: 1.5, description: '50% Increased Damage' },
      { type: 'attack_speed', value: 0.2, description: '20% Increased Attack Speed' },
      { type: 'attack_speed', value: 0.4, description: '40% Increased Attack Speed' },
      { type: 'move_speed', value: 0.15, description: '15% Increased Movement Speed' },
      { type: 'move_speed', value: 0.3, description: '30% Increased Movement Speed' },
      { type: 'spell_repeat', value: 1, description: 'Spells Repeat an additional time' },
      { type: 'chain', value: 2, description: 'Attacks Chain to 2 additional targets' },
      { type: 'health_regen', value: 2, description: '+2 Health Regeneration per second' },
      { type: 'mana_regen', value: 3, description: '+3 Mana Regeneration per second' },
    ];
  }
  
  update(delta) {
    // Rotate items for visual effect
    for (const item of this.items) {
      if (item.mesh) {
        item.mesh.rotation.y += delta;
      }
    }
  }
  
  spawnRandomItem(position) {
    // Determine item type
    const itemTypes = [
      { type: Staff, weight: 0.33 },
      { type: Bow, weight: 0.33 },
      { type: Axe, weight: 0.34 }
    ];
    
    // Select random item type based on weights
    const totalWeight = itemTypes.reduce((sum, type) => sum + type.weight, 0);
    let random = Math.random() * totalWeight;
    let ItemClass;
    
    for (const itemType of itemTypes) {
      random -= itemType.weight;
      if (random <= 0) {
        ItemClass = itemType.type;
        break;
      }
    }
    
    // Default to first item type if something went wrong
    if (!ItemClass) {
      ItemClass = itemTypes[0].type;
    }
    
    // Determine rarity
    let rarity = 'normal';
    const rarityRoll = Math.random();
    
    if (rarityRoll < 0.05) {
      rarity = 'rare';
    } else if (rarityRoll < 0.25) {
      rarity = 'magic';
    }
    
    // Create the item
    const item = new ItemClass(this.game, {
      id: uuidv4(),
      rarity,
      position: position.clone()
    });
    
    // Add attributes based on rarity
    if (rarity === 'magic') {
      this.addRandomAttributes(item, 1);
    } else if (rarity === 'rare') {
      this.addRandomAttributes(item, 2 + Math.floor(Math.random() * 2)); // 2-3 attributes
    }
    
    // Add to scene and manager
    this.game.scene.add(item.mesh);
    this.items.push(item);
    
    return item;
  }
  
  addRandomAttributes(item, count) {
    try {
      if (!item || !item.attributes) {
        console.warn('Invalid item or missing attributes array');
        return;
      }
      
      // Ensure we have attributes in the pool
      if (!this.attributePool || !this.attributePool.length) {
        console.warn('Attribute pool is empty or undefined');
        return;
      }
      
      // Get random attributes from pool
      const availableAttributes = [...this.attributePool];
      
      for (let i = 0; i < count; i++) {
        if (availableAttributes.length === 0) break;
        
        // Select random attribute
        const index = Math.floor(Math.random() * availableAttributes.length);
        const attribute = availableAttributes.splice(index, 1)[0];
        
        // Add attribute to item
        item.attributes.push({...attribute});
      }
    } catch (error) {
      console.warn('Error adding random attributes:', error.message);
    }
  }
  
  pickupItem(item) {
    // Remove from scene
    this.game.scene.remove(item.mesh);
    
    // Remove from items array
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
    
    // Add to player inventory
    this.game.player.addToInventory(item);
  }
  
  getItemById(id) {
    return this.items.find(item => item.id === id);
  }
  
  removeItem(item) {
    // Remove from scene
    if (item.mesh && item.mesh.parent) {
      item.mesh.parent.remove(item.mesh);
    }
    
    // Remove from items array
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }
} 
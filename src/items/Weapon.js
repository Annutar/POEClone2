import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Item } from './Item.js';

export class Weapon extends Item {
  constructor(game, options = {}) {
    super(game, options);
    
    this.type = 'weapon';
    this.damage = options.damage || 10;
    this.attackSpeed = options.attackSpeed || 1.0;
    this.range = options.range || 1.5;
    
    // Visual effects
    this.trailEffect = null;
  }
  
  createMesh() {
    // Base weapon mesh - to be overridden by subclasses
    const geometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
    let material;
    
    // Change material color based on rarity
    switch (this.rarity) {
      case 'magic':
        material = new THREE.MeshStandardMaterial({ color: 0x5555ff });
        break;
      case 'rare':
        material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        break;
      default:
        material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    }
    
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Add visual effect for rare items
    if (this.rarity === 'rare') {
      this.addGlow();
    }
    
    // Add floating animation
    this.addFloatingAnimation();
    
    return this.mesh;
  }
  
  addGlow() {
    // Simple glow effect using a point light
    const light = new THREE.PointLight(0xffff00, 0.5, 1);
    light.position.set(0, 0, 0);
    this.mesh.add(light);
  }
  
  addFloatingAnimation() {
    // Add a slight floating animation for items on the ground
    this.mesh.position.y = 0.5;
    
    // This animation will be handled in the ItemManager update
  }
  
  use(target) {
    // Use the weapon (attack)
    console.log(`Using ${this.name} against target`);
    
    // Calculate damage including weapon attributes
    let damage = this.damage;
    
    // Apply attributes
    if (this.attributes) {
      this.attributes.forEach(attr => {
        if (attr.type === 'damage_multiplier') {
          damage *= attr.value;
        }
      });
    }
    
    // Apply damage to target
    if (target && typeof target.takeDamage === 'function') {
      target.takeDamage(damage);
    }
    
    return damage;
  }
  
  getDescription() {
    let description = `${this.name} (${this.rarity})\n`;
    description += `Damage: ${this.damage}\n`;
    description += `Attack Speed: ${this.attackSpeed}\n`;
    
    if (this.attributes && this.attributes.length > 0) {
      description += '\nAttributes:\n';
      this.attributes.forEach(attr => {
        description += `- ${attr.description}\n`;
      });
    }
    
    return description;
  }
} 
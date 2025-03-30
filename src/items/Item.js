import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class Item {
  constructor(game, options = {}) {
    this.game = game;
    this.id = options.id || Math.random().toString(36).substring(2, 9);
    this.name = options.name || 'Unknown Item';
    this.rarity = options.rarity || 'normal';
    this.type = options.type || 'item';
    this.attributes = options.attributes || [];
    
    // Create the mesh
    this.mesh = this.createMesh();
    
    // Set position if provided
    if (options.position) {
      this.mesh.position.copy(options.position);
    }
  }
  
  createMesh() {
    // Base item mesh - to be overridden by subclasses
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
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
        material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    }
    
    return new THREE.Mesh(geometry, material);
  }
  
  update(delta) {
    // Base update method - to be overridden if needed
    
    // Make items float and rotate when on the ground
    if (this.mesh) {
      this.mesh.rotation.y += delta;
      
      // Floating effect
      const time = Date.now() * 0.001;
      this.mesh.position.y = 0.5 + Math.sin(time * 2) * 0.1;
    }
  }
  
  pickup() {
    // Called when player picks up item
    console.log(`Picked up ${this.name}`);
    
    // Remove from scene
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    
    return this;
  }
  
  use() {
    // Base use method - to be overridden by subclasses
    console.log(`Using ${this.name}`);
    return true;
  }
  
  // Get attribute value by type
  getAttributeValue(type) {
    const attribute = this.attributes.find(attr => attr.type === type);
    return attribute ? attribute.value : null;
  }
  
  // Get full attribute by type
  getAttribute(type) {
    return this.attributes.find(attr => attr.type === type);
  }
  
  getDescription() {
    let description = `${this.name} (${this.rarity})\n`;
    
    if (this.attributes && this.attributes.length > 0) {
      description += '\nAttributes:\n';
      this.attributes.forEach(attr => {
        description += `- ${attr.description}\n`;
      });
    }
    
    return description;
  }
} 
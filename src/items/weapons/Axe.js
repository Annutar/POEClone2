import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Weapon } from '../Weapon.js';

export class Axe extends Weapon {
  constructor(game, options = {}) {
    // Set axe-specific properties
    options.damage = options.damage || 20;
    options.attackSpeed = options.attackSpeed || 0.9;
    options.range = options.range || 2; // Short range for melee
    options.name = options.name || generateAxeName(options.rarity);
    
    super(game, options);
    
    this.type = 'axe';
    this.sweepAngle = Math.PI / 2; // 90 degrees
    
    // Create mesh
    this.createMesh();
  }
  
  createMesh() {
    // Create the main group
    this.mesh = new THREE.Group();
    
    // Handle (shaft)
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8);
    
    // Color based on rarity
    let handleColor;
    switch (this.rarity) {
      case 'magic':
        handleColor = 0x5555ff;
        break;
      case 'rare':
        handleColor = 0xffff00;
        break;
      default:
        handleColor = 0x8b4513; // Brown
    }
    
    const handleMaterial = new THREE.MeshStandardMaterial({ color: handleColor });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2; // Rotate to be horizontal
    this.mesh.add(handle);
    
    // Axe head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0, 0.6); // Position at the end of the handle
    
    // Create blade part
    const bladeGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.05);
    
    // Blade color based on rarity
    let bladeColor;
    switch (this.rarity) {
      case 'magic':
        bladeColor = 0x00aaff;
        break;
      case 'rare':
        bladeColor = 0xff00ff;
        break;
      default:
        bladeColor = 0xcccccc; // Silver
    }
    
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: bladeColor });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.15, 0);
    headGroup.add(blade);
    
    // Create edge (sharper part)
    const edgeGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8);
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.rotation.x = Math.PI / 2;
    edge.position.set(0.15, 0.15, 0);
    headGroup.add(edge);
    
    // Back spike
    const spikeGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const spikeMaterial = new THREE.MeshStandardMaterial({ color: bladeColor });
    const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    spike.rotation.z = Math.PI / 2;
    spike.position.set(-0.15, 0.15, 0);
    headGroup.add(spike);
    
    // Add head to axe
    this.mesh.add(headGroup);
    
    // Add decorative elements for magic and rare axes
    if (this.rarity === 'magic' || this.rarity === 'rare') {
      // Add runes or glowing symbols
      const runeGeometry = new THREE.PlaneGeometry(0.1, 0.1);
      const runeColor = this.rarity === 'magic' ? 0x00aaff : 0xff00ff;
      const runeMaterial = new THREE.MeshStandardMaterial({
        color: runeColor,
        emissive: runeColor,
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide
      });
      
      const rune = new THREE.Mesh(runeGeometry, runeMaterial);
      rune.position.set(0, 0, 0.03);
      rune.rotation.x = Math.PI / 2;
      blade.add(rune);
      
      // Add glow
      const light = new THREE.PointLight(runeColor, 0.5, 1);
      light.position.copy(rune.position);
      blade.add(light);
    }
    
    // Position for floating
    this.mesh.rotation.y = Math.PI / 4;
    
    return this.mesh;
  }
  
  use(target) {
    // Perform a melee attack
    this.swingAttack(target);
    
    // Calculate damage including axe attributes
    let damage = this.damage;
    
    // Apply attributes
    if (this.attributes) {
      this.attributes.forEach(attr => {
        if (attr.type === 'damage_multiplier') {
          damage *= attr.value;
        }
      });
    }
    
    return damage;
  }
  
  swingAttack(target) {
    // Calculate distance to target
    const player = this.game.player.mesh;
    const distance = player.position.distanceTo(target.mesh.position);
    
    // Check if in range
    if (distance > this.range) {
      console.log('Target out of range');
      return 0;
    }
    
    // Play attack animation
    this.playSwingAnimation();
    
    // Deal damage directly
    target.takeDamage(this.damage);
    
    // Check for area damage (cleave)
    const hasAOE = this.attributes.some(attr => attr.type === 'chain');
    
    if (hasAOE) {
      // Find nearby enemies
      const nearbyEnemies = this.game.enemyManager.enemies.filter(enemy => {
        if (enemy === target || enemy.isDead) return false;
        
        const distToTarget = target.mesh.position.distanceTo(enemy.mesh.position);
        return distToTarget < 2; // 2 unit cleave radius
      });
      
      // Deal damage to nearby enemies (50% of normal damage)
      nearbyEnemies.forEach(enemy => {
        enemy.takeDamage(this.damage * 0.5);
        this.createImpactEffect(enemy.mesh.position.clone());
      });
    }
    
    // Create impact effect
    this.createImpactEffect(target.mesh.position.clone());
    
    return this.damage;
  }
  
  playSwingAnimation() {
    if (!this.game.player.equipment.weapon) return;
    
    // Get weapon container from player
    const weaponContainer = this.game.player.weaponContainer;
    if (!weaponContainer) return;
    
    // Store original rotation
    const originalRotation = weaponContainer.rotation.clone();
    
    // Swing animation
    const swingDuration = 300; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / swingDuration);
      
      if (progress < 0.5) {
        // Wind up (first half of animation)
        const windupProgress = progress * 2; // Scale to 0-1 range
        weaponContainer.rotation.z = originalRotation.z - this.sweepAngle * windupProgress;
      } else {
        // Swing through (second half of animation)
        const swingProgress = (progress - 0.5) * 2; // Scale to 0-1 range
        weaponContainer.rotation.z = originalRotation.z - this.sweepAngle + (this.sweepAngle * 2 * swingProgress);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset rotation
        weaponContainer.rotation.copy(originalRotation);
      }
    };
    
    animate();
  }
  
  createImpactEffect(position) {
    // Create a slash effect
    const slashGeometry = new THREE.RingGeometry(0.3, 0.5, 32, 1, 0, Math.PI * 1.5);
    const slashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    const slash = new THREE.Mesh(slashGeometry, slashMaterial);
    slash.position.copy(position);
    slash.position.y += 0.5; // Adjust to hit at body height
    
    // Face camera
    slash.lookAt(this.game.camera.position);
    
    // Add to scene
    this.game.scene.add(slash);
    
    // Animate expansion and fade
    const startTime = Date.now();
    const duration = 200; // ms
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Scale up
      const scale = 1 + progress;
      slash.scale.set(scale, scale, scale);
      
      // Fade out
      slash.material.opacity = 0.6 * (1 - progress);
      
      // Rotate slash
      slash.rotation.z += 0.1;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Remove slash
        this.game.scene.remove(slash);
      }
    };
    
    animate();
  }
}

// Helper function to generate axe names
function generateAxeName(rarity) {
  const prefixes = {
    normal: ['Iron', 'Steel', 'Wooden', 'Simple'],
    magic: ['Frost', 'Raging', 'Fierce', 'Brutal'],
    rare: ['Soul Reaver', 'Goremaw', 'Flesh Render', 'Skull Splitter']
  };
  
  const suffixes = {
    normal: ['Axe', 'Hatchet', 'Chopper', 'Cleaver'],
    magic: ['Axe of Might', 'War Axe', 'Battleaxe', 'Heavy Axe'],
    rare: ['Butcher', 'Executioner', 'Berserker Axe', 'Devourer']
  };
  
  const rarityType = rarity || 'normal';
  
  const prefix = prefixes[rarityType][Math.floor(Math.random() * prefixes[rarityType].length)];
  const suffix = suffixes[rarityType][Math.floor(Math.random() * suffixes[rarityType].length)];
  
  return `${prefix} ${suffix}`;
} 
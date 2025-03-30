import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Weapon } from '../Weapon.js';

export class Staff extends Weapon {
  constructor(game, options = {}) {
    // Set staff-specific properties
    options.damage = options.damage || 15;
    options.attackSpeed = options.attackSpeed || 0.8;
    options.range = options.range || 8; // Longer range for casting
    options.name = options.name || generateStaffName(options.rarity);
    
    super(game, options);
    
    this.type = 'staff';
    this.manaCost = 10;
    this.projectileSpeed = 15;
    this.projectileColor = 0x00aaff;
    
    // Create mesh
    this.createMesh();
  }
  
  createMesh() {
    // Staff body (long cylinder)
    const staffGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8);
    
    // Color based on rarity
    let staffColor;
    switch (this.rarity) {
      case 'magic':
        staffColor = 0x5555ff;
        break;
      case 'rare':
        staffColor = 0xffff00;
        break;
      default:
        staffColor = 0x8b4513; // Brown
    }
    
    const staffMaterial = new THREE.MeshStandardMaterial({ color: staffColor });
    this.mesh = new THREE.Mesh(staffGeometry, staffMaterial);
    
    // Add a gem/orb at the top
    const orbGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    
    // Orb color based on rarity
    let orbColor;
    switch (this.rarity) {
      case 'magic':
        orbColor = 0x00aaff;
        break;
      case 'rare':
        orbColor = 0xff00ff;
        break;
      default:
        orbColor = 0x88aaff;
    }
    
    const orbMaterial = new THREE.MeshStandardMaterial({ 
      color: orbColor,
      emissive: orbColor,
      emissiveIntensity: 0.5
    });
    
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.y = 0.8;
    this.mesh.add(orb);
    
    // Add glow effect for magic and rare staffs
    if (this.rarity !== 'normal') {
      const light = new THREE.PointLight(orbColor, 0.7, 1);
      light.position.copy(orb.position);
      this.mesh.add(light);
    }
    
    // Position for floating
    this.mesh.rotation.x = Math.PI / 2; // Lay horizontally when on ground
    
    return this.mesh;
  }
  
  use(target) {
    // Check if player has enough mana
    if (this.game.player.mana < this.manaCost) {
      console.log('Not enough mana');
      return 0;
    }
    
    // Use mana
    this.game.player.mana -= this.manaCost;
    
    // Create a magical projectile
    this.castSpell(target);
    
    // Calculate damage including staff attributes
    let damage = this.damage;
    
    // Apply attributes
    if (this.attributes) {
      this.attributes.forEach(attr => {
        if (attr.type === 'damage_multiplier') {
          damage *= attr.value;
        }
        
        // Handle spell repeat
        if (attr.type === 'spell_repeat') {
          // Cast additional projectiles
          for (let i = 0; i < attr.value; i++) {
            setTimeout(() => {
              if (this.game.player.mana >= this.manaCost) {
                this.game.player.mana -= this.manaCost;
                this.castSpell(target);
              }
            }, 200 * (i + 1));
          }
        }
      });
    }
    
    return damage;
  }
  
  castSpell(target) {
    // Create projectile
    const projectileGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const projectileMaterial = new THREE.MeshStandardMaterial({
      color: this.projectileColor,
      emissive: this.projectileColor,
      emissiveIntensity: 0.8
    });
    
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Start position (player's location)
    const startPos = this.game.player.mesh.position.clone();
    startPos.y += 0.5; // Adjust to cast from chest height
    projectile.position.copy(startPos);
    
    // Add projectile to scene
    this.game.scene.add(projectile);
    
    // Calculate direction to target
    const direction = new THREE.Vector3();
    direction.subVectors(target.mesh.position, startPos).normalize();
    
    // Add light to projectile
    const light = new THREE.PointLight(this.projectileColor, 0.7, 2);
    projectile.add(light);
    
    // Animate projectile
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000; // seconds
      
      // Move projectile
      const distance = elapsed * this.projectileSpeed;
      const newPos = startPos.clone().add(direction.clone().multiplyScalar(distance));
      projectile.position.copy(newPos);
      
      // Check if projectile hit the target
      const distanceToTarget = projectile.position.distanceTo(target.mesh.position);
      
      if (distanceToTarget < 0.5) {
        // Hit target
        target.takeDamage(this.damage);
        
        // Create impact effect
        this.createImpactEffect(projectile.position.clone());
        
        // Remove projectile
        this.game.scene.remove(projectile);
      } else if (elapsed > 3) {
        // Remove projectile after 3 seconds
        this.game.scene.remove(projectile);
      } else {
        // Continue animation
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  createImpactEffect(position) {
    // Create a simple explosion effect
    const impactGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const impactMaterial = new THREE.MeshStandardMaterial({
      color: this.projectileColor,
      emissive: this.projectileColor,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.8
    });
    
    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
    impact.position.copy(position);
    
    // Add to scene
    this.game.scene.add(impact);
    
    // Animate expansion and fade
    const startTime = Date.now();
    const duration = 300; // ms
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Scale up
      const scale = 1 + progress * 2;
      impact.scale.set(scale, scale, scale);
      
      // Fade out
      impact.material.opacity = 0.8 * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Remove impact
        this.game.scene.remove(impact);
      }
    };
    
    animate();
  }
}

// Helper function to generate staff names
function generateStaffName(rarity) {
  const prefixes = {
    normal: ['Wooden', 'Simple', 'Apprentice\'s', 'Basic'],
    magic: ['Azure', 'Arcane', 'Shimmering', 'Mage\'s', 'Mystic'],
    rare: ['Tempest', 'Doomcaster\'s', 'Stormcaller\'s', 'Ancient', 'Corrupted']
  };
  
  const suffixes = {
    normal: ['Staff', 'Rod', 'Walking Stick', 'Branch'],
    magic: ['Focus', 'Staff of Power', 'Arcane Rod', 'Scepter'],
    rare: ['Staff of Devastation', 'Grand Scepter', 'Runestaff', 'Worldender']
  };
  
  const rarityType = rarity || 'normal';
  
  const prefix = prefixes[rarityType][Math.floor(Math.random() * prefixes[rarityType].length)];
  const suffix = suffixes[rarityType][Math.floor(Math.random() * suffixes[rarityType].length)];
  
  return `${prefix} ${suffix}`;
} 
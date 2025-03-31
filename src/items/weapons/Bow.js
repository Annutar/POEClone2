import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Weapon } from '../Weapon.js';

export class Bow extends Weapon {
  constructor(game, options = {}) {
    // Set bow-specific properties
    options.damage = options.damage || 12;
    options.attackSpeed = options.attackSpeed || 1.2;
    options.range = options.range || 10; // Long range for bows
    options.name = options.name || generateBowName(options.rarity);
    
    super(game, options);
    
    this.type = 'bow';
    this.arrowSpeed = 20;
    this.arrowColor = 0x8b4513;
    
    // Create mesh
    this.createMesh();
  }
  
  createMesh() {
    // Bow is created using a curved line
    const bowCurve = new THREE.EllipseCurve(
      0, 0,                // Center x, y
      0.5, 0.2,            // x radius, y radius
      0, Math.PI,          // Start angle, end angle
      false,               // Clockwise
      0                    // Rotation
    );
    
    const bowPoints = bowCurve.getPoints(20);
    const bowGeometry = new THREE.BufferGeometry().setFromPoints(bowPoints);
    
    // Line material color based on rarity
    let bowColor;
    switch (this.rarity) {
      case 'magic':
        bowColor = 0x5555ff;
        break;
      case 'rare':
        bowColor = 0xffff00;
        break;
      default:
        bowColor = 0x8b4513; // Brown
    }
    
    // Create the bow mesh using ThickTube approach (a series of cylinders)
    this.mesh = new THREE.Group();
    
    // Create bow body (arc)
    const bowThickness = 0.02;
    for (let i = 1; i < bowPoints.length; i++) {
      const p1 = bowPoints[i - 1];
      const p2 = bowPoints[i];
      
      // Calculate direction and length
      const direction = new THREE.Vector2(p2.x - p1.x, p2.y - p1.y);
      const length = direction.length();
      
      // Create cylinder
      const cylinderGeometry = new THREE.CylinderGeometry(
        bowThickness, bowThickness, length, 6
      );
      const cylinderMaterial = new THREE.MeshStandardMaterial({ color: bowColor });
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
      
      // Position and rotate
      const midPoint = new THREE.Vector3(
        (p1.x + p2.x) / 2,
        (p1.y + p2.y) / 2,
        0
      );
      cylinder.position.copy(midPoint);
      
      // Rotate to match segment direction
      cylinder.rotation.z = Math.atan2(direction.y, direction.x) - Math.PI / 2;
      
      this.mesh.add(cylinder);
    }
    
    // Add bowstring
    const stringGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(bowPoints[0].x, bowPoints[0].y, 0),
      new THREE.Vector3(bowPoints[bowPoints.length - 1].x, bowPoints[bowPoints.length - 1].y, 0)
    ]);
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const bowstring = new THREE.Line(stringGeometry, stringMaterial);
    this.mesh.add(bowstring);
    
    // Add decorative elements for magic and rare bows
    if (this.rarity === 'magic' || this.rarity === 'rare') {
      // Add gem
      const gemGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const gemColor = this.rarity === 'magic' ? 0x00aaff : 0xff00ff;
      const gemMaterial = new THREE.MeshStandardMaterial({
        color: gemColor,
        emissive: gemColor,
        emissiveIntensity: 0.5
      });
      
      const gem = new THREE.Mesh(gemGeometry, gemMaterial);
      gem.position.set(0, 0, 0.02);
      this.mesh.add(gem);
      
      // Add glow
      const light = new THREE.PointLight(gemColor, 0.5, 1);
      light.position.copy(gem.position);
      this.mesh.add(light);
    }
    
    // Position for floating
    // this.mesh.rotation.z = Math.PI / 2; // REMOVE this line - rotation handled below

    // --- Set Correct Orientation for Holding --- 
    // Rotate the entire group so the bow stands upright along Y when held
    this.mesh.rotation.x = Math.PI / 2; 
    // Add Y rotation for diagonal placement across body
    this.mesh.rotation.y = Math.PI / 4; 
    // -------------------------------------------
    
    return this.mesh;
  }
  
  use(target) {
    // Fire an arrow
    this.fireArrow(target);
    
    // Calculate damage including bow attributes
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
  
  fireArrow(target) {
    // Create arrow
    const arrowLength = 0.5;
    const arrowGeometry = new THREE.CylinderGeometry(0.01, 0.01, arrowLength, 6);
    const arrowMaterial = new THREE.MeshStandardMaterial({ color: this.arrowColor });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    // Arrow head
    const headGeometry = new THREE.ConeGeometry(0.02, 0.05, 6);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const arrowHead = new THREE.Mesh(headGeometry, headMaterial);
    arrowHead.position.y = arrowLength / 2;
    arrow.add(arrowHead);
    
    // Start position (player's location)
    const startPos = this.game.player.mesh.position.clone();
    startPos.y += 0.5; // Adjust to fire from chest height
    arrow.position.copy(startPos);
    
    // Add arrow to scene
    this.game.scene.add(arrow);
    
    // Calculate direction to target
    const direction = new THREE.Vector3();
    direction.subVectors(target.mesh.position, startPos).normalize();
    
    // Rotate arrow to point in direction of travel
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    
    // Apply attributes for special effects
    const chainCount = this.getAttributeValue('chain') || 0;
    let targets = [target];
    
    // Find potential chain targets if attribute is present
    if (chainCount > 0) {
      const potentialTargets = this.game.enemyManager.enemies.filter(enemy => 
        enemy !== target && !enemy.isDead && 
        enemy.mesh.position.distanceTo(target.mesh.position) < 5
      );
      
      // Sort by distance to primary target
      potentialTargets.sort((a, b) => {
        const distA = a.mesh.position.distanceTo(target.mesh.position);
        const distB = b.mesh.position.distanceTo(target.mesh.position);
        return distA - distB;
      });
      
      // Add chain targets (limited by chain count)
      targets = targets.concat(potentialTargets.slice(0, chainCount));
    }
    
    // Animate arrow for first target
    this.animateArrow(arrow, startPos, direction, targets, 0, chainCount);
  }
  
  animateArrow(arrow, startPos, direction, targets, currentTargetIndex, chainCount) {
    if (currentTargetIndex >= targets.length) {
      // All targets processed, remove arrow
      this.game.scene.remove(arrow);
      return;
    }
    
    const currentTarget = targets[currentTargetIndex];
    
    // Animate arrow flight
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000; // seconds
      
      // Move arrow
      const distance = elapsed * this.arrowSpeed;
      const newPos = startPos.clone().add(direction.clone().multiplyScalar(distance));
      arrow.position.copy(newPos);
      
      // Check if arrow hit the target
      const distanceToTarget = arrow.position.distanceTo(currentTarget.mesh.position);
      
      if (distanceToTarget < 0.5) {
        // Hit target
        currentTarget.takeDamage(this.damage);
        
        // Create impact effect
        this.createImpactEffect(arrow.position.clone());
        
        // Check for chain
        if (currentTargetIndex < targets.length - 1) {
          // Chain to next target
          const nextTarget = targets[currentTargetIndex + 1];
          
          // Get new direction for chain
          const newDirection = new THREE.Vector3()
            .subVectors(nextTarget.mesh.position, arrow.position)
            .normalize();
          
          // Update arrow rotation to new direction
          arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), newDirection);
          
          // Start chained animation
          this.animateArrow(
            arrow, 
            arrow.position.clone(), 
            newDirection, 
            targets, 
            currentTargetIndex + 1, 
            chainCount
          );
        } else {
          // No more targets, remove arrow
          this.game.scene.remove(arrow);
        }
      } else if (elapsed > 3) {
        // Remove arrow after 3 seconds
        this.game.scene.remove(arrow);
      } else {
        // Continue animation
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  createImpactEffect(position) {
    // Create a simple impact effect
    const impactGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const impactMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    
    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
    impact.position.copy(position);
    
    // Add to scene
    this.game.scene.add(impact);
    
    // Animate expansion and fade
    const startTime = Date.now();
    const duration = 200; // ms
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Scale up
      const scale = 1 + progress;
      impact.scale.set(scale, scale, scale);
      
      // Fade out
      impact.material.opacity = 0.6 * (1 - progress);
      
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

// Helper function to generate bow names
function generateBowName(rarity) {
  const prefixes = {
    normal: ['Wooden', 'Hunter\'s', 'Simple', 'Recurve'],
    magic: ['Windforce', 'Eagle Eye', 'Hawk', 'Whistling'],
    rare: ['Doomfletch', 'Windripper', 'Death\'s Harp', 'Storm Cloud']
  };
  
  const suffixes = {
    normal: ['Bow', 'Shortbow', 'Hunting Bow'],
    magic: ['Bow of Precision', 'Piercer', 'Long Bow', 'Compound Bow'],
    rare: ['Spine Bow', 'Imperial Bow', 'Harbinger Bow', 'Thicket Bow']
  };
  
  const rarityType = rarity || 'normal';
  
  const prefix = prefixes[rarityType][Math.floor(Math.random() * prefixes[rarityType].length)];
  const suffix = suffixes[rarityType][Math.floor(Math.random() * suffixes[rarityType].length)];
  
  return `${prefix} ${suffix}`;
} 
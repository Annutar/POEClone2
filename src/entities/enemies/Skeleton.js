import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Enemy } from './Enemy.js';

export class Skeleton extends Enemy {
  constructor(game) {
    super(game);
    
    // Skeleton specific attributes
    this.maxHealth = 30;
    this.health = this.maxHealth;
    this.attackDamage = 5;
    this.attackRange = 1.2;
    this.attackSpeed = 0.8;
    this.moveSpeed = 3;
    this.detectionRange = 8;
    this.xpValue = 10;
    this.type = 'skeleton';
    
    // Create mesh
    this.createMesh();
  }
  
  createMesh() {
    // Body (torso)
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.position.y = 0.5;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    head.castShadow = true;
    this.mesh.add(head);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.25, 0.1, 0);
    leftArm.castShadow = true;
    this.mesh.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.25, 0.1, 0);
    rightArm.castShadow = true;
    this.mesh.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, -0.4, 0);
    leftLeg.castShadow = true;
    this.mesh.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, -0.4, 0);
    rightLeg.castShadow = true;
    this.mesh.add(rightLeg);
    
    // Add a weapon (simple sword)
    const swordGeometry = new THREE.BoxGeometry(0.08, 0.5, 0.05);
    const swordMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    this.weapon = new THREE.Mesh(swordGeometry, swordMaterial);
    this.weapon.position.set(0.35, 0.2, 0);
    this.weapon.rotation.z = Math.PI / 4; // Angle the sword
    this.mesh.add(this.weapon);
    
    // Store original arm positions for animation
    this.rightArmOriginalPosition = rightArm.position.clone();
    this.rightArm = rightArm;
  }
  
  update(delta) {
    super.update(delta);
    
    // Skeleton specific behavior - slightly erratic movement
    if (this.targetPosition && Math.random() < 0.05) {
      // Occasionally make small random adjustments to path
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5
      );
      this.targetPosition.add(offset);
    }
  }
  
  attackAnimation() {
    // Move the sword arm forward
    const armForwardPos = this.rightArmOriginalPosition.clone();
    armForwardPos.z += 0.3;
    this.rightArm.position.copy(armForwardPos);
    
    // Return to original position after a delay
    setTimeout(() => {
      if (this.rightArm) {
        this.rightArm.position.copy(this.rightArmOriginalPosition);
      }
    }, 200);
  }
  
  playDeathAnimation() {
    if (!this.mesh) return;
    
    // Skeleton specific death - fall apart
    const duration = 1000; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      if (this.mesh && !this.isDead) {
        // Make skeleton parts fall apart
        this.mesh.children.forEach(part => {
          part.position.y -= 0.05;
          part.rotation.z += (Math.random() - 0.5) * 0.2;
          part.rotation.x += (Math.random() - 0.5) * 0.2;
        });
        
        // Rotate body
        this.mesh.rotation.z += 0.05;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }
    };
    
    animate();
    
    // Call the parent method for cleanup
    super.playDeathAnimation();
  }
  
  makeSound() {
    // Skeleton bone rattling sound (would be audio in a real game)
    console.log('*Bone rattling*');
  }
} 
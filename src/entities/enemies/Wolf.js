import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Enemy } from './Enemy.js';

export class Wolf extends Enemy {
  constructor(game) {
    super(game);
    
    // Wolf specific attributes
    this.maxHealth = 25;
    this.health = this.maxHealth;
    this.attackDamage = 8;
    this.attackRange = 1.0;
    this.attackSpeed = 1.2;
    this.moveSpeed = 5.5; // Wolves are faster
    this.detectionRange = 15; // Better sense of smell
    this.xpValue = 15;
    this.type = 'wolf';
    
    // Wolf state
    this.isProwling = false;
    
    // Create mesh
    this.createMesh();
  }
  
  createMesh() {
    // Wolf body
    const bodyGeometry = new THREE.BoxGeometry(0.7, 0.4, 0.9);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.position.y = 0.3;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Head
    const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.4);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.set(0, 0.15, 0.45);
    this.head.castShadow = true;
    this.mesh.add(this.head);
    
    // Snout
    const snoutGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.2);
    const snoutMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
    snout.position.set(0, -0.05, 0.3);
    this.head.add(snout);
    
    // Ears
    const earGeometry = new THREE.ConeGeometry(0.05, 0.15, 4);
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    
    // Left ear
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.1, 0.2, 0);
    leftEar.rotation.x = -Math.PI / 4;
    this.head.add(leftEar);
    
    // Right ear
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.1, 0.2, 0);
    rightEar.rotation.x = -Math.PI / 4;
    this.head.add(rightEar);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    // Front legs
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(-0.25, -0.3, 0.3);
    this.mesh.add(frontLeftLeg);
    
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.25, -0.3, 0.3);
    this.mesh.add(frontRightLeg);
    
    // Back legs
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-0.25, -0.3, -0.3);
    this.mesh.add(backLeftLeg);
    
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(0.25, -0.3, -0.3);
    this.mesh.add(backRightLeg);
    
    // Tail
    const tailGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const tailMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    this.tail = new THREE.Mesh(tailGeometry, tailMaterial);
    this.tail.position.set(0, 0.1, -0.6);
    this.mesh.add(this.tail);
    
    // Store original positions for animation
    this.headOriginalPosition = this.head.position.clone();
    this.tailOriginalPosition = this.tail.position.clone();
  }
  
  update(delta) {
    super.update(delta);
    
    // Wolf specific behavior - prowl before attacking
    const distanceToPlayer = this.mesh.position.distanceTo(this.game.player.mesh.position);
    
    if (distanceToPlayer < this.detectionRange && !this.isProwling && Math.random() < 0.01) {
      this.startProwling();
    }
    
    // Animate tail
    if (this.tail && Math.random() < 0.05) {
      this.wag();
    }
  }
  
  startProwling() {
    this.isProwling = true;
    this.moveSpeed *= 0.5; // Slow down while prowling
    
    // Circle around player for a few seconds
    const duration = 2000 + Math.random() * 2000;
    const startTime = Date.now();
    const center = this.game.player.mesh.position.clone();
    const startAngle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 3;
    
    const prowl = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      
      if (elapsed < duration && !this.isDead) {
        // Calculate position on circle around player
        const angle = startAngle + (elapsed / duration) * Math.PI * 2;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;
        
        this.targetPosition = new THREE.Vector3(x, this.mesh.position.y, z);
        
        // Keep facing player
        this.mesh.lookAt(center);
        
        requestAnimationFrame(prowl);
      } else if (!this.isDead) {
        // Done prowling, lunge at player
        this.isProwling = false;
        this.moveSpeed *= 2; // Restore speed and add bonus
        this.targetPosition = this.game.player.mesh.position.clone();
        
        // Make attack sound
        console.log('*Wolf howl*');
      }
    };
    
    prowl();
  }
  
  attackAnimation() {
    // Lunge with mouth open
    const startPos = this.mesh.position.clone();
    const playerDir = new THREE.Vector3()
      .subVectors(this.game.player.mesh.position, this.mesh.position)
      .normalize()
      .multiplyScalar(0.5);
    
    // Move head forward (simulating mouth opening)
    this.head.position.z += 0.1;
    
    // Lunge forward
    this.mesh.position.add(playerDir);
    
    // Return to original position after a delay
    setTimeout(() => {
      if (this.mesh && !this.isDead) {
        this.mesh.position.copy(startPos);
        this.head.position.copy(this.headOriginalPosition);
      }
    }, 200);
  }
  
  wag() {
    // Simple tail wagging animation
    this.tail.rotation.y = (Math.random() - 0.5) * 0.5;
  }
  
  makeSound() {
    // Wolf growling sound
    console.log('*Wolf growl*');
  }
} 
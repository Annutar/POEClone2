import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Enemy } from './Enemy.js';
import { Player } from '../Player.js';

export class Sasquatch extends Enemy {
  constructor(game) {
    super(game);
    
    // Sasquatch attributes
    this.maxHealth = 120;
    this.health = this.maxHealth;
    this.attackDamage = 20; 
    this.attackRange = 1.4; 
    this.attackSpeed = 0.7;
    this.moveSpeed = 3.0; // Slightly faster than bear
    this.detectionRange = 14;
    this.xpValue = 60;
    this.type = 'sasquatch';
    
    // Create mesh
    this.createMesh();
    this.createNameTag(); // Add name tag
  }
  
  createMesh() {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // Woody Brown

    // Torso (Tall Box)
    const torsoGeo = new THREE.BoxGeometry(0.7, 1.4, 0.5); // Width, Height, Depth
    const torso = new THREE.Mesh(torsoGeo, bodyMaterial);
    torso.position.y = 0.7; // Center of torso height
    group.add(torso);

    // Head (Simple Sphere)
    const headGeo = new THREE.SphereGeometry(0.3, 12, 10);
    const head = new THREE.Mesh(headGeo, bodyMaterial);
    head.position.y = 1.4 + 0.15; // Top of torso + head radius offset
    group.add(head);

    // Arms (Long Boxes)
    const armGeo = new THREE.BoxGeometry(0.2, 1.0, 0.2);
    this.leftArm = new THREE.Mesh(armGeo, bodyMaterial);
    this.leftArm.position.set(-0.45, 1.0, 0); // Attach high on torso
    this.leftArm.rotation.z = Math.PI / 8;
    group.add(this.leftArm);
    this.rightArm = new THREE.Mesh(armGeo, bodyMaterial);
    this.rightArm.position.set(0.45, 1.0, 0);
    this.rightArm.rotation.z = -Math.PI / 8;
    group.add(this.rightArm);

    // Legs (Thick Boxes)
    const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const leftLeg = new THREE.Mesh(legGeo, bodyMaterial);
    leftLeg.position.set(-0.2, 0.4, 0); // Bottom of torso is y=0
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, bodyMaterial);
    rightLeg.position.set(0.2, 0.4, 0);
    group.add(rightLeg);

    group.traverse(child => { 
        if (child.isMesh) {
            child.castShadow = true; 
            child.receiveShadow = true; 
        }
    });
    
    this.mesh = group;
  }
  
  // Override takeDamage to store the source and flash
  takeDamage(amount, source) {
    if (this.isDead) return;
    this.health = Math.max(0, this.health - amount);
    this.lastDamageSource = source; 
    this.playDamageEffect();
    if (this.health <= 0) {
      this.die();
    }
  }

  playDamageEffect() {
    if (!this.mesh) return;
    const originalMaterials = new Map();
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        originalMaterials.set(child.uuid, child.material.clone());
        if (!child.material.emissive) {
           child.material.emissive = new THREE.Color(0x000000);
        }
        child.material.emissive.setHex(0xff0000);
        child.material.needsUpdate = true;
      }
    });
    setTimeout(() => {
      if (!this.mesh) return;
      this.mesh.traverse((child) => {
        if (child.isMesh && originalMaterials.has(child.uuid)) {
          const originalMat = originalMaterials.get(child.uuid);
          child.material.emissive.setHex(originalMat.emissive ? originalMat.emissive.getHex() : 0x000000);
          child.material.needsUpdate = true;
        }
      });
    }, 100);
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    console.log('Sasquatch died');
    if (this.lastDamageSource instanceof Player) {
      this.game.player.onEnemyKilled(this);
    }
    this.playDeathAnimation();
    setTimeout(() => {
      this.removeFromScene();
    }, 1200); 
  }
  
  playDeathAnimation() {
    // Fall backwards animation
    const duration = 1000;
    const startTime = Date.now();
    const startRotation = this.mesh.rotation.clone();
    const endRotation = new THREE.Euler(startRotation.x + Math.PI / 2, startRotation.y, startRotation.z);

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      if (this.mesh && this.isDead) {
          this.mesh.rotation.x = THREE.MathUtils.lerp(startRotation.x, endRotation.x, progress);
          this.mesh.rotation.y = THREE.MathUtils.lerp(startRotation.y, endRotation.y, progress);
          this.mesh.rotation.z = THREE.MathUtils.lerp(startRotation.z, endRotation.z, progress);
          if (progress < 1) {
              requestAnimationFrame(animate);
          }
      }
    };
    animate();
  }
  
  attackAnimation() {
    // Ground slam simulation - move arms down quickly
    // Note: Actual ground interaction/effect would need more work

    if (!this.leftArm || !this.rightArm) {
      console.warn('Sasquatch attackAnimation called before arms were initialized.');
      return; // Exit if arms aren't ready
    }

    const leftArmStartRot = this.leftArm.rotation.clone();
    const rightArmStartRot = this.rightArm.rotation.clone();
    
    // Raise arms
    this.leftArm.rotation.z = -Math.PI / 3;
    this.rightArm.rotation.z = Math.PI / 3;

    // Slam down
    setTimeout(() => {
      if (this.leftArm && this.rightArm && !this.isDead) {
        this.leftArm.rotation.z = Math.PI / 1.5;
        this.rightArm.rotation.z = -Math.PI / 1.5;

        // Return to original rotation after slam
        setTimeout(() => {
          if (this.leftArm && this.rightArm && !this.isDead) {
            this.leftArm.rotation.copy(leftArmStartRot);
            this.rightArm.rotation.copy(rightArmStartRot);
          }
        }, 250);
      }
    }, 150); 
  }

  makeSound() {
    console.log('*Sasquatch Howl/Roar*');
  }
  
  removeFromScene() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
} 
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Enemy } from './Enemy.js';
import { Player } from '../Player.js';

export class CaveBear extends Enemy {
  constructor(game) {
    super(game);
    
    // Cave Bear attributes
    this.maxHealth = 150; 
    this.health = this.maxHealth;
    this.attackDamage = 25; 
    this.attackRange = 1.2; 
    this.attackSpeed = 0.5; // Slow attacks
    this.moveSpeed = 4.8;   // Increased to be slightly slower than base player
    this.hitRadius = 1.2;   // Larger hit radius for CaveBear
    this.detectionRange = 12; 
    this.xpValue = 50;
    this.type = 'cavebear';
    
    // Create mesh
    this.createMesh();
    this.createNameTag(); // Add name tag
  }
  
  createMesh() {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 }); // Darker, richer brown
    const detailMaterial = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 }); // Even darker for details

    // Main Body (Bulkier Box)
    const bodyWidth = 1.0;
    const bodyHeight = 0.8;
    const bodyDepth = 1.6;
    const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth); 
    const body = new THREE.Mesh(bodyGeo, bodyMaterial);
    body.position.y = bodyHeight / 2 + 0.1; // Raise slightly off ground
    group.add(body);

    // Head (Sphere, slightly flattened)
    const headRadius = 0.4;
    const headGeo = new THREE.SphereGeometry(headRadius, 12, 10);
    const head = new THREE.Mesh(headGeo, bodyMaterial);
    head.scale.set(1, 0.9, 1); // Slightly flatten vertically
    head.position.set(0, 1.0, bodyDepth / 2); // MOVED Head Up (Y=1.0) and Forward (Z=bodyDepth/2)
    group.add(head);

    // Snout (Box)
    const snoutGeo = new THREE.BoxGeometry(0.3, 0.25, 0.3);
    const snout = new THREE.Mesh(snoutGeo, detailMaterial); // Darker snout
    snout.position.set(0, -0.05, headRadius * 0.8); // Attach to front of head, slightly lower
    head.add(snout); // Add snout to head group

    // Ears (Small Spheres)
    const earRadius = 0.15;
    const earGeo = new THREE.SphereGeometry(earRadius, 8, 6);
    const leftEar = new THREE.Mesh(earGeo, bodyMaterial);
    leftEar.position.set(-headRadius * 0.7, headRadius * 0.6, -headRadius * 0.2);
    head.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, bodyMaterial);
    rightEar.position.set(headRadius * 0.7, headRadius * 0.6, -headRadius * 0.2);
    head.add(rightEar);

    // Legs (Thicker, slightly tapered Cylinders)
    const legRadiusTop = 0.28;
    const legRadiusBottom = 0.25;
    const legHeight = 0.6;
    const legGeo = new THREE.CylinderGeometry(legRadiusTop, legRadiusBottom, legHeight, 8);
    
    const legPositions = [
        new THREE.Vector3(-bodyWidth * 0.35, legHeight / 2, bodyDepth * 0.35), // Front left
        new THREE.Vector3(bodyWidth * 0.35, legHeight / 2, bodyDepth * 0.35),  // Front right
        new THREE.Vector3(-bodyWidth * 0.35, legHeight / 2, -bodyDepth * 0.35), // Back left
        new THREE.Vector3(bodyWidth * 0.35, legHeight / 2, -bodyDepth * 0.35)  // Back right
    ];

    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, bodyMaterial);
        leg.position.copy(pos);
        group.add(leg);
        
        // Simple Paws (Flattened Spheres)
        const pawRadius = legRadiusBottom * 1.1;
        const pawGeo = new THREE.SphereGeometry(pawRadius, 8, 6);
        const paw = new THREE.Mesh(pawGeo, detailMaterial); // Darker paws
        paw.scale.set(1, 0.4, 1.1); // Flatten and slightly elongate
        paw.position.y = -legHeight * 0.5;
        leg.add(paw); // Add paw to leg
    });

    // Tail (Small Sphere)
    const tailRadius = 0.15;
    const tailGeo = new THREE.SphereGeometry(tailRadius, 6, 5);
    const tail = new THREE.Mesh(tailGeo, detailMaterial); // Use darker detail material
    // Position at the back, slightly above the base of the body
    tail.position.set(0, bodyHeight * 0.3 + 0.1, -bodyDepth * 0.5 - tailRadius * 0.5);
    group.add(tail);

    group.traverse(child => { 
        if (child.isMesh) {
            child.castShadow = true; 
            child.receiveShadow = true; 
        }
    });
    
    // Assign the group to this.mesh
    this.mesh = group;
    // Base class handles adding mesh to scene if needed via manager
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
    console.log(`${this.type} died`);

    // Grant XP to player
    if (this.game.player && !this.game.player.isDead) {
      this.game.player.onEnemyKilled(this);
    }

    // Try to drop a power-up
    if (this.game.powerUpManager) {
        console.log(`[CaveBear.die] Attempting power-up drop...`);
        this.game.powerUpManager.trySpawnDrop(this.mesh.position, 1.0); // 100% drop chance for testing
    } else {
        console.warn(`[CaveBear.die] PowerUpManager not found.`);
    }

    // Play death animation (specific to CaveBear)
    this.playDeathAnimation(); 

    // Set timer for removal
    setTimeout(() => {
      this.removeFromScene();
      if (this.game.enemyManager) {
        this.game.enemyManager.removeEnemy(this);
      }
    }, 2000); // CaveBear might have a longer animation
  }
  
  playDeathAnimation() {
    // Simple fall over animation
    const duration = 1000; 
    const startTime = Date.now();
    const startRotation = this.mesh.rotation.clone();
    const endRotation = new THREE.Euler(this.mesh.rotation.x, this.mesh.rotation.y, this.mesh.rotation.z + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1)); // Fall sideways

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (this.mesh && this.isDead) {
          // Interpolate rotation
          this.mesh.rotation.x = THREE.MathUtils.lerp(startRotation.x, endRotation.x, progress);
          this.mesh.rotation.y = THREE.MathUtils.lerp(startRotation.y, endRotation.y, progress);
          this.mesh.rotation.z = THREE.MathUtils.lerp(startRotation.z, endRotation.z, progress);
          
          // Optional: Sink into ground slightly
          this.mesh.position.y -= 0.005;
          
          if (progress < 1) {
              requestAnimationFrame(animate);
          }
      }
    };
    animate();
  }
  
  attackAnimation() {
    // Add check to ensure mesh exists before animation
    if (!this.mesh) {
        console.warn("CaveBear attackAnimation called but mesh is undefined.");
        return; 
    }
    
    // Heavy swipe animation
    const startRot = this.mesh.rotation.clone();
    const swipeAngle = Math.PI / 4; // 45 degree swipe
    
    // Rotate quickly for swipe
    this.mesh.rotation.y += swipeAngle * (Math.random() > 0.5 ? 1 : -1);

    // Return to original rotation after a delay
    setTimeout(() => {
      if (this.mesh && !this.isDead) {
        this.mesh.rotation.copy(startRot);
      }
    }, 300); // Slower return for heavy attack
  }

  makeSound() {
    console.log('*Cave Bear Roar*');
  }
  
  removeFromScene() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
} 
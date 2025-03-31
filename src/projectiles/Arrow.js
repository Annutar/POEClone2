import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Projectile } from './Projectile.js';

export class Arrow extends Projectile {
  constructor(game, options = {}) {
    options.type = 'arrow';
    options.speed = options.speed || 25; // Arrows are faster
    options.range = options.range || 40;
    options.color = options.color || 0x8B4513; // Brown for wood
    super(game, options);
  }

  createMesh(options) {
    const group = new THREE.Group();
    
    // Shaft
    const shaftLength = 0.6;
    const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, shaftLength, 6);
    const shaftMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.8 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.x = Math.PI / 2; // Align shaft along Z-axis (forward)
    shaft.position.z = shaftLength / 2; // Center it so tip is at origin
    group.add(shaft);

    // Arrowhead
    const headLength = 0.1;
    const headGeo = new THREE.ConeGeometry(0.04, headLength, 4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.5, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.rotation.x = Math.PI / 2;
    head.position.z = shaftLength + headLength / 2 - 0.01; // Position at the front
    group.add(head);

    // Fletching (feathers)
    const fletchingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }); // White feathers
    for (let i = 0; i < 3; i++) {
        const fletchingGeo = new THREE.PlaneGeometry(0.05, 0.15);
        const fletching = new THREE.Mesh(fletchingGeo, fletchingMat);
        const angle = (i / 3) * Math.PI * 2;
        fletching.position.set(
            Math.cos(angle) * 0.03,
            Math.sin(angle) * 0.03,
            0.1 // Position near the back of the shaft
        );
        fletching.rotation.z = angle + Math.PI / 2;
        fletching.rotation.y = Math.PI / 6; // Angle them slightly
        group.add(fletching);
    }

    group.scale.set(this.scale, this.scale, this.scale); // Scale the entire arrow group

    return group;
  }
  
   playImpactEffect(){
      console.log(`*Arrow impact*`);
      // Less flashy explosion for arrows
      if (this.game.particleManager) {
          this.game.particleManager.createExplosion(this.mesh.position, 0xaaaaaa, 3, 0.1, 0.5);
      }
  }
  
  // Override destroy if needed (e.g., stick in target?)
  // destroy() {
  //   super.destroy();
  // }
} 
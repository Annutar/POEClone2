import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Projectile } from './Projectile.js';

export class MagicOrb extends Projectile {
  constructor(game, options = {}) {
    options.type = 'magic_orb';
    options.speed = options.speed || 12;
    options.range = options.range || 25;
    options.color = options.color || 0x8a8aff; // Default magic color
    super(game, options);
    
    // Add a light source to the orb
    this.light = new THREE.PointLight(this.color, 0.8, 5); // color, intensity, distance
    this.mesh.add(this.light);
  }

  createMesh(options) {
    const baseRadius = 0.15;
    const geometry = new THREE.SphereGeometry(baseRadius, 12, 12);
    const material = new THREE.MeshStandardMaterial({
        color: this.color,
        emissive: this.color,
        emissiveIntensity: 1.5,
        roughness: 0.4,
        metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(this.scale, this.scale, this.scale); // Scale the main orb
    
    // Add a light source to the orb (Light properties like distance might need scaling too?)
    this.light = new THREE.PointLight(this.color, 0.8 * this.scale, 5 * this.scale); // Scale intensity and range slightly
    mesh.add(this.light);

    // Optional trail
    const trailMat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.3 });
    const trailGeo = new THREE.SphereGeometry(0.1, 6, 6); // Base size for trail
    this.trail = new THREE.Mesh(trailGeo, trailMat);
    // Keep trail scale relative to the main orb's base size, but maybe slightly less affected by player scale?
    const trailScaleFactor = 1.0 + (this.scale - 1.0) * 0.5; // Example: Trail scales half as much as orb
    this.trail.scale.set(1.5 * trailScaleFactor, 1.5 * trailScaleFactor, 3.0 * trailScaleFactor); 
    mesh.add(this.trail);
    this.trail.position.z = -0.3 * this.scale; // Position trail behind scaled orb

    return mesh;
  }
  
  update(delta) {
      super.update(delta);
      // Add subtle bobbing or rotation if desired
      // this.mesh.rotation.y += delta * 2;
      // this.mesh.position.y += Math.sin(Date.now() * 0.005) * 0.01;
       // Rotate trail opposite to movement for effect
       if(this.trail) {
           this.trail.rotation.z += delta * 5;
       }
  }
  
   playImpactEffect(){
      console.log(`*Magic impact (${this.color.toString(16)})*`);
      if (this.game.particleManager) {
          // Larger, brighter explosion for magic
          this.game.particleManager.createExplosion(this.mesh.position, this.color, 10, 0.4, 0.8);
      }
  }
  
  // Override destroy if fade-out or specific cleanup is needed
  // destroy() {
  //   super.destroy();
  // }
} 
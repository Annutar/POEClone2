import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class InputHandler {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.raycaster = new THREE.Raycaster();
    this.mousePosition = new THREE.Vector2();
    this.targetPosition = new THREE.Vector3();
  }

  handleKeyDown(event) {
    this.keys[event.code] = true;
    
    // Toggle inventory with 'I' key
    if (event.code === 'KeyI') {
      const inventory = document.getElementById('inventory');
      inventory.style.display = inventory.style.display === 'none' ? 'block' : 'none';
    }
  }

  handleKeyUp(event) {
    this.keys[event.code] = false;
  }

  handleMouseMove(event) {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    
    // Calculate normalized device coordinates
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  handleClick(event) {
    // Don't process clicks if player is dead
    if (!this.game.player || this.game.player.isDead) return;
    
    // Left click (button 0)
    if (event.button === 0) { 
      // Update the raycaster with the mouse position and camera
      this.raycaster.setFromCamera(this.mousePosition, this.game.camera);
      
      // Priority 1: Check for intersections with items
      const itemMeshes = this.game.itemManager ? this.game.itemManager.items.map(i => i.mesh).filter(m => m) : [];
      const itemIntersects = this.raycaster.intersectObjects(itemMeshes);
      if (itemIntersects.length > 0) {
        const itemMesh = itemIntersects[0].object;
        const item = this.game.itemManager.items.find(i => i.mesh === itemMesh);
        if (item) {
            console.log('Clicked on item, picking up:', item.name);
            this.game.itemManager.pickupItem(item);
            return; // Stop processing click after picking up item
        }
      }

      // Priority 2: Check for intersections with enemies
      const enemyMeshes = this.game.enemyManager 
          ? this.game.enemyManager.enemies
              .filter(e => e && !e.isDead && e.mesh && e.mesh.parent)
              .map(e => e.mesh) 
          : [];
      // Only check enemy meshes if there are any
      if (enemyMeshes.length > 0) {
        const enemyIntersects = this.raycaster.intersectObjects(enemyMeshes);
        if (enemyIntersects.length > 0) {
          const enemyMesh = enemyIntersects[0].object;
          const enemy = this.game.enemyManager.enemies.find(e => e.mesh === enemyMesh);
          if (enemy) {
            console.log('Clicked on enemy, attacking:', enemy.type);
            this.game.player.attack(enemy); // Attack specific enemy
            return; // Attack initiated, stop processing
          }
        }
      }
      
      // Priority 3: If no item or enemy clicked, check for ground click to attack towards point
      const groundMeshes = this.game.mapGenerator ? this.game.mapGenerator.groundMeshes : [];
      if (groundMeshes.length > 0) {
          const groundIntersects = this.raycaster.intersectObjects(groundMeshes);
          if (groundIntersects.length > 0) {
              const targetPoint = groundIntersects[0].point;
              console.log('Clicked on ground, attacking towards point:', targetPoint);
              this.game.player.attackTowardsPoint(targetPoint); // Call new method
              return;
          }
      }

      // If nothing was hit (ground, enemy, item)
      console.log('Left click missed everything.');

    } 
    // Right click (button 2) - currently unused
  }

  // Get movement direction from keyboard input
  getMovementDirection() {
    // If player is dead, return zero vector (no movement)
    if (this.game.player.isDead) return new THREE.Vector3(0, 0, 0);
    
    const direction = new THREE.Vector3(0, 0, 0);
    
    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      direction.z -= 1;
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      direction.z += 1;
    }
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      direction.x -= 1;
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      direction.x += 1;
    }
    
    // Normalize the direction vector
    if (direction.length() > 0) {
      direction.normalize();
    }
    
    return direction;
  }
} 
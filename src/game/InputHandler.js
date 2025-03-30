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
    if (this.game.player.isDead) return;
    
    // Left click for movement or attack
    if (event.button === 0) {
      // Update the raycaster with the mouse position and camera
      this.raycaster.setFromCamera(this.mousePosition, this.game.camera);
      
      // Check for intersections with enemies
      const enemyIntersects = this.raycaster.intersectObjects(
        this.game.enemyManager.enemies.map(enemy => enemy.mesh)
      );
      
      // If we clicked on an enemy, attack it
      if (enemyIntersects.length > 0) {
        const enemyMesh = enemyIntersects[0].object;
        const enemy = this.game.enemyManager.enemies.find(e => e.mesh === enemyMesh);
        if (enemy) {
          this.game.player.attack(enemy);
          return;
        }
      }
      
      // Check for intersections with items
      const itemIntersects = this.raycaster.intersectObjects(
        this.game.itemManager.items.map(item => item.mesh)
      );
      
      // If we clicked on an item, pick it up
      if (itemIntersects.length > 0) {
        const itemMesh = itemIntersects[0].object;
        const item = this.game.itemManager.items.find(i => i.mesh === itemMesh);
        if (item) {
          this.game.itemManager.pickupItem(item);
          return;
        }
      }
      
      // Otherwise, calculate movement target on the ground
      const groundIntersects = this.raycaster.intersectObjects(
        this.game.mapGenerator.groundMeshes
      );
      
      if (groundIntersects.length > 0) {
        this.targetPosition.copy(groundIntersects[0].point);
        this.game.player.moveToPoint(this.targetPosition);
      }
    }
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
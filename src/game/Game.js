import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Player } from '../entities/Player.js';
import { MapGenerator } from '../map/MapGenerator.js';
import { EnemyManager } from '../entities/EnemyManager.js';
import { ItemManager } from '../items/ItemManager.js';
import { InputHandler } from './InputHandler.js';
import { UI } from './UI.js';

export class Game {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.mapGenerator = null;
    this.enemyManager = null;
    this.itemManager = null;
    this.inputHandler = null;
    this.ui = null;
    this.clock = new THREE.Clock();
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.raycaster = new THREE.Raycaster();
    this.mousePosition = new THREE.Vector2();
  }

  init() {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x666666);
    this.scene.add(ambientLight);
    
    // Add directional light (like sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);
    
    // Set up the isometric camera
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -10 * aspectRatio, 10 * aspectRatio, 10, -10, 1, 1000
    );
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);
    
    // Set up the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    
    // Initialize game components
    this.mapGenerator = new MapGenerator(this);
    this.mapGenerator.generateMap();
    
    this.player = new Player(this);
    this.scene.add(this.player.mesh);
    
    this.enemyManager = new EnemyManager(this);
    this.enemyManager.spawnInitialEnemies();
    
    this.itemManager = new ItemManager(this);
    
    this.inputHandler = new InputHandler(this);
    this.ui = new UI(this);
  }
  
  update() {
    const delta = this.clock.getDelta();
    
    // Update player
    this.player.update(delta);
    
    // Update enemies
    this.enemyManager.update(delta);
    
    // Update items
    this.itemManager.update(delta);
    
    // Update camera to follow player
    this.updateCamera();
    
    // Update UI
    this.ui.update();
  }
  
  updateCamera() {
    if (this.player && this.player.mesh) {
      const targetPosition = this.player.mesh.position.clone();
      this.camera.position.x = targetPosition.x + 20;
      this.camera.position.z = targetPosition.z + 20;
      this.camera.lookAt(targetPosition);
    }
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  onWindowResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.camera.left = -10 * aspectRatio;
    this.camera.right = 10 * aspectRatio;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  onKeyDown(event) {
    this.inputHandler.handleKeyDown(event);
  }
  
  onKeyUp(event) {
    this.inputHandler.handleKeyUp(event);
  }
  
  onMouseMove(event) {
    this.inputHandler.handleMouseMove(event);
  }
  
  onClick(event) {
    this.inputHandler.handleClick(event);
  }
} 
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Player } from '../entities/Player.js';
import { MapGenerator } from '../map/MapGenerator.js';
import { EnemyManager } from '../entities/EnemyManager.js';
import { ItemManager } from '../items/ItemManager.js';
import { InputHandler } from './InputHandler.js';
import { UI } from './UI.js';
import { AudioManager } from '../audio/AudioManager.js';
import { ProjectileManager } from '../projectiles/ProjectileManager.js';

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
    this.projectileManager = null;
    this.audioManager = null;
  }

  async init() {
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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // Initialize Item Manager FIRST
    this.itemManager = new ItemManager(this);
    console.log("ItemManager initialized.");

    // Initialize Map Generator
    this.mapGenerator = new MapGenerator(this);
    const mapContainer = this.mapGenerator.generateMap();
    if (mapContainer) {
         this.scene.add(mapContainer);
         console.log("Map generated and added to scene.");
    } else {
        console.error("Map generation failed!");
        return; 
    }

    // Initialize Projectile Manager EARLY (before player/enemies that might shoot)
    try {
        this.projectileManager = new ProjectileManager(this);
        console.log("ProjectileManager initialized.");
    } catch (error) {
        console.error("Failed to initialize ProjectileManager:", error);
    }

    // Initialize Enemy Manager AFTER map is generated
    try {
        this.enemyManager = new EnemyManager(this); 
        console.log("EnemyManager initialized.");
        console.log(`EnemyManager will handle spawning.`);
    } catch (error) {
        console.error("Failed to initialize EnemyManager:", error);
    }

    // Initialize UI
    try {
        this.ui = new UI(this);
        console.log("UI initialized.");
    } catch (error) {
        console.error("Failed to initialize UI:", error);
    }

    // Initialize Audio Manager
    try {
      this.audioManager = new AudioManager(this.camera);
      console.log("AudioManager initialized.");
      // Load and play ambient sound asynchronously (no need to await here if background loading is okay)
      this.audioManager.loadAmbientSound(
        'assets/audio/darkominous-lo-fi-piano-song-318669.mp3',
        0.14,
        () => {
          console.log("Ambient sound loaded callback - attempting to play.");
          this.audioManager.playAmbientSound();
        }
      );
    } catch (error) {
      console.error("Failed to initialize AudioManager:", error);
    }

    // Initialize Player AFTER MapGenerator and ItemManager
    try {
        this.player = new Player(this);
        // *** Await the player's async initialization ***
        await this.player.init(); 
        console.log("Player initialized successfully."); 
    } catch (error) {
        console.error("Failed to initialize Player:", error);
        return; // Stop if player fails
    }
    
    // Link player's input handlers AFTER player exists and is initialized
    this.inputHandler = new InputHandler(this);

    // Update UI initially AFTER player is fully initialized
    if (this.ui && this.player) {
      this.ui.updateHealth(this.player.health, this.player.maxHealth);
      this.ui.updateMana(this.player.mana, this.player.maxMana);
      this.ui.updateInventory(this.player.inventory, this.player.equipment);
    } else {
      console.warn("Could not perform initial UI update. UI or Player missing.");
    }

    console.log("Game initialization complete.");
    this.startGameLoop();
  }

  // Method to start the animation loop
  startGameLoop() {
    const animate = () => {
        requestAnimationFrame(animate);
        this.update(); // Call the game's update logic
        this.render(); // Call the game's render logic
    };
    animate();
    console.log("Game loop started.");
  }

  update() {
    const delta = this.clock.getDelta();
    
    if (this.player) this.player.update(delta);
    if (this.enemyManager) this.enemyManager.update(delta);
    if (this.itemManager) this.itemManager.update(delta);
    if (this.projectileManager) this.projectileManager.update(delta);
    
    // Update camera to follow player
    this.updateCamera();
    
    // Update UI
    if (this.ui) {
      this.ui.update();
    }
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
    if (this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  onWindowResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.camera.left = -10 * aspectRatio;
    this.camera.right = 10 * aspectRatio;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  onKeyDown(event) {
    if (this.inputHandler) {
      this.inputHandler.handleKeyDown(event);
    }
  }
  
  onKeyUp(event) {
    if (this.inputHandler) {
      this.inputHandler.handleKeyUp(event);
    }
  }
  
  onMouseMove(event) {
    if (this.inputHandler) {
      this.inputHandler.handleMouseMove(event);
    }
  }
  
  onClick(event) {
    if (this.inputHandler) {
      this.inputHandler.handleClick(event);
    }
  }
} 
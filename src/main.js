import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Game } from './game/Game.js';
import { MapGenerator } from './map/MapGenerator.js';
import { Player } from './entities/Player.js';
import { ItemManager } from './items/ItemManager.js';
import { EnemyManager } from './entities/EnemyManager.js';
import { InputHandler } from './game/InputHandler.js';
import { UI } from './game/UI.js';
import { ProjectileManager } from './projectiles/ProjectileManager.js';

// Loading management
let loadingProgressBar;
let loadingScreen;

function updateLoadingProgress(percent) {
  if (loadingProgressBar) {
    loadingProgressBar.style.width = `${percent}%`;
  }
}

function hideLoadingScreen() {
  if (loadingScreen) {
    // Fade out animation
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 0.5s';
    
    // Remove after animation completes
    setTimeout(() => {
      if (loadingScreen && loadingScreen.parentNode) {
        loadingScreen.parentNode.removeChild(loadingScreen);
      }
    }, 500);
  }
}

// Initialize the game
try {
  // Get loading screen elements
  loadingScreen = document.getElementById('loading-screen');
  loadingProgressBar = document.getElementById('loading-progress-bar');
  
  // Update initial progress
  updateLoadingProgress(10);
  
  const game = new Game();
  
  // Setup async initialization
  async function initializeGame() {
    try {
      // Initialize the game (core systems)
      game.init();
      updateLoadingProgress(20);
      
      // Initialize Projectile Manager EARLY
      game.projectileManager = new ProjectileManager(game);
      updateLoadingProgress(30);

      // Initialize map with proper timing
      await initializeMapWithProgress(game);
      updateLoadingProgress(60);
      
      // Initialize remaining components
      await initializeEntities(game);
      updateLoadingProgress(100);
      
      // Start game loop once everything is loaded
      setTimeout(() => {
        hideLoadingScreen();
        startGameLoop(game);
      }, 500);
    } catch (error) {
      console.error('Error during game initialization:', error);
      updateLoadingProgress(100);
      hideLoadingScreen();
      showErrorMessage(error);
    }
  }
  
  // Initialize map with progress updates
  async function initializeMapWithProgress(game) {
    return new Promise(resolve => {
      // Small delay to ensure UI updates before heavy processing
      setTimeout(() => {
        try {
          if (game.mapGenerator && game.mapGenerator.mapContainer) {
            // Map seems to be already generated
            resolve();
            return;
          }
          
          // Create map generator if it doesn't exist
          if (!game.mapGenerator) {
              game.mapGenerator = new MapGenerator(game);
          }
          updateLoadingProgress(40);
          
          // Call the main map generation method
          game.mapGenerator.generateMap(); 
          updateLoadingProgress(60);
          
          // Map generation includes terrain, rivers, bridges, vegetation, and fog
          
          resolve();
        } catch (error) {
          console.error("Error generating map:", error);
          
          // Create fallback terrain
          const planeGeometry = new THREE.PlaneGeometry(100, 100);
          planeGeometry.rotateX(-Math.PI / 2);
          const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x33691e });
          const groundMesh = new THREE.Mesh(planeGeometry, groundMaterial);
          groundMesh.receiveShadow = true;
          game.scene.add(groundMesh);
          game.mapGenerator = { groundMeshes: [groundMesh], mapContainer: new THREE.Group() }; // Ensure fallback has container
          game.scene.add(game.mapGenerator.mapContainer);
          
          resolve();
        }
      }, 100);
    });
  }
  
  // Initialize entities with progress updates
  async function initializeEntities(game) {
    return new Promise(resolve => {
      setTimeout(() => {
        // Initialize item manager first (player needs it for starting weapon)
        game.itemManager = new ItemManager(game);
        updateLoadingProgress(80);
        
        // Initialize player
        game.player = new Player(game);
        game.scene.add(game.player.mesh);
        updateLoadingProgress(85);
        
        // Initialize enemy manager
        game.enemyManager = new EnemyManager(game);
        game.enemyManager.spawnInitialEnemies();
        updateLoadingProgress(90);
        
        // Initialize UI and input handlers
        game.inputHandler = new InputHandler(game);
        game.ui = new UI(game);
        updateLoadingProgress(95);
        
        resolve();
      }, 100);
    });
  }
  
  // Start the game loop
  function startGameLoop(game) {
    function animate() {
      requestAnimationFrame(animate);
      game.update();
      game.render();
    }
    
    animate();
    
    // Event listeners
    window.addEventListener('resize', () => game.onWindowResize());
    window.addEventListener('keydown', (event) => game.onKeyDown(event));
    window.addEventListener('keyup', (event) => game.onKeyUp(event));
    window.addEventListener('mousemove', (event) => game.onMouseMove(event));
    window.addEventListener('click', (event) => game.onClick(event));
  }
  
  // Start the initialization process
  initializeGame();
  
} catch (error) {
  console.error('Error initializing game:', error);
  showErrorMessage(error);
}

function showErrorMessage(error) {
  // Display error to user
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'absolute';
  errorDiv.style.top = '50%';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translate(-50%, -50%)';
  errorDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  errorDiv.style.color = '#ff0000';
  errorDiv.style.padding = '20px';
  errorDiv.style.borderRadius = '5px';
  errorDiv.style.fontFamily = 'Arial, sans-serif';
  errorDiv.style.zIndex = '1000';
  errorDiv.innerHTML = `<h2>Game Error</h2><p>${error.message}</p>`;
  document.body.appendChild(errorDiv);
} 
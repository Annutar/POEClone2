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

function showLoadingScreen() {
  loadingScreen = document.getElementById('loading-screen');
  loadingProgressBar = document.getElementById('loading-bar');
  if (loadingScreen) {
    loadingScreen.style.display = 'flex';
  }
  updateLoadingProgress(10); // Show initial progress
}

function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}

// Main entry point - now async
async function main() {
  showLoadingScreen();
  
  try {
    const game = new Game();
    
    // Update progress (optional)
    updateLoadingProgress(30);
    
    // Initialize the game asynchronously
    await game.init();
    
    // Update progress (optional)
    updateLoadingProgress(100);

    // Add event listeners AFTER game init is complete
    window.addEventListener('resize', () => game.onWindowResize(), false);
    window.addEventListener('keydown', (event) => game.onKeyDown(event), false);
    window.addEventListener('keyup', (event) => game.onKeyUp(event), false);
    window.addEventListener('mousemove', (event) => game.onMouseMove(event), false);
    window.addEventListener('click', (event) => game.onClick(event), false);

    console.log("Game setup complete, starting...");
    
    // Hide loading screen
    hideLoadingScreen();

    // Game loop is started inside game.init(), no need to call it here
    
  } catch (error) {
    console.error("Failed to initialize or start the game:", error);
    // Display an error message to the user on the loading screen
    if(loadingScreen) {
      const errorElement = document.createElement('p');
      errorElement.textContent = "Error initializing game. See console for details.";
      errorElement.style.color = "red";
      loadingScreen.appendChild(errorElement);
      updateLoadingProgress(0); // Reset progress bar on error
    }
  }
}

// Start the main function
main();

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
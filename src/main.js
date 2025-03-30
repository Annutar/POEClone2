import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Game } from './game/Game.js';

// Initialize the game
const game = new Game();
game.init();

// Start the game loop
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
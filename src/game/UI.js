export class UI {
  constructor(game) {
    this.game = game;
    
    // Try to get UI elements, create fallbacks if not found
    this.healthElement = document.getElementById('health') || this.createFallbackElement('health');
    this.manaElement = document.getElementById('mana') || this.createFallbackElement('mana');
    this.inventoryElement = document.getElementById('inventory') || this.createFallbackElement('inventory');
    
    // Level display elements
    this.levelTextElement = document.getElementById('level-text') || this.createFallbackElement('level-text');
    this.levelBarElement = document.getElementById('level-bar') || this.createFallbackElement('level-bar');
    this.xpTextElement = document.getElementById('xp-text') || this.createFallbackElement('xp-text');
    
    // Tooltip element for item information
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'tooltip';
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.display = 'none';
    this.tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.tooltip.style.color = 'white';
    this.tooltip.style.padding = '10px';
    this.tooltip.style.borderRadius = '5px';
    this.tooltip.style.zIndex = '1000';
    document.body.appendChild(this.tooltip);
    
    // Add UI update throttling
    this.lastUpdateTime = 0;
    this.updateInterval = 100; // Update UI max 10 times per second
    
    this.powerUpsElement = document.getElementById('powerups') || this.createFallbackElement('powerups'); // Get power-up element
  }

  // Helper method to create fallback UI elements
  createFallbackElement(id) {
    console.warn(`UI element #${id} not found, creating fallback`);
    const element = document.createElement('div');
    element.id = id;
    element.style.display = 'none'; // Hide fallback elements
    document.body.appendChild(element);
    return element;
  }

  // Add methods for direct health and mana updates from Game.js
  updateHealth(current, max) {
    try {
      if (this.healthElement) {
        this.healthElement.textContent = `Health: ${Math.round(current)}/${max}`;
      }
    } catch (error) {
      console.warn('Error updating health display:', error.message);
    }
  }
  
  updateMana(current, max) {
    try {
      if (this.manaElement) {
        this.manaElement.textContent = `Mana: ${Math.round(current)}/${max}`;
      }
    } catch (error) {
      console.warn('Error updating mana display:', error.message);
    }
  }

  update() {
    try {
      // Throttle UI updates for performance
      const now = Date.now();
      if (now - this.lastUpdateTime < this.updateInterval) {
        return;
      }
      this.lastUpdateTime = now;
      
      if (this.game.player) {
        // Update health display
        if (this.healthElement) {
          this.healthElement.textContent = `Health: ${Math.round(this.game.player.health)}/${this.game.player.maxHealth}`;
        }
        
        // Update mana display
        if (this.manaElement) {
          this.manaElement.textContent = `Mana: ${Math.round(this.game.player.mana)}/${this.game.player.maxMana}`;
        }
        
        // Update level display
        if (this.levelTextElement) {
          // Show level with special formatting if at max level
          const levelText = this.game.player.level >= this.game.player.maxLevel ?
            `✨ Level ${this.game.player.level} (MAX) ✨` :
            `Level ${this.game.player.level}`;
          this.levelTextElement.textContent = levelText;
        }
        
        // Update XP display
        if (this.xpTextElement) {
          if (this.game.player.level >= this.game.player.maxLevel) {
            this.xpTextElement.textContent = 'XP: MAX LEVEL';
            
            // Set progress bar to 100% for max level
            if (this.levelBarElement) {
              this.levelBarElement.style.width = '100%';
              // Special max level color gradient
              this.levelBarElement.style.background = 'linear-gradient(to right, #ffd700, #ff5500)';
              this.levelBarElement.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.7)';
            }
          } else {
            const xpPercent = Math.round((this.game.player.currentXP / this.game.player.xpToNextLevel) * 100);
            this.xpTextElement.textContent = `XP: ${this.game.player.currentXP}/${this.game.player.xpToNextLevel} (${xpPercent}%)`;
            
            // Update progress bar width
            if (this.levelBarElement) {
              this.levelBarElement.style.width = `${xpPercent}%`;
              // Standard color gradient for normal levels
              this.levelBarElement.style.background = 'linear-gradient(to right, #4a8af4, #42f4c8)';
              this.levelBarElement.style.boxShadow = '0 0 8px rgba(66, 244, 200, 0.5)';
            }
          }
        }
        
        // Update Power-ups display
        this.updatePowerUpsDisplay(this.game.player.activePowerUps);
      }
    } catch (error) {
      console.warn('Error updating UI:', error.message);
    }
  }

  updatePowerUpsDisplay(activePowerUps) {
    if (!this.powerUpsElement) return;

    const now = Date.now();
    let content = '';

    for (const type in activePowerUps) {
        const powerUp = activePowerUps[type];
        const remainingTime = Math.max(0, (powerUp.expiry - now) / 1000);
        let effectText = '';
        if (type === 'MultiShot') {
            const totalProjectiles = 1 + powerUp.count * powerUp.value;
            effectText = `${type} (${totalProjectiles} Proj)`; // Show total projectiles
        } else {
            effectText = `${type} (x${powerUp.count})`; // Default display
        }
        content += `<div>${effectText}: ${remainingTime.toFixed(1)}s</div>`;
    }

    this.powerUpsElement.innerHTML = content;
    // Optional: Add styling for the power-up list
    this.powerUpsElement.style.marginTop = '10px';
    this.powerUpsElement.style.fontSize = '14px';
    this.powerUpsElement.style.color = '#00ff00'; // Match MultiShot color for now
  }

  showTooltip(item, x, y) {
    try {
      // Ensure we have tooltip element and valid item
      if (!this.tooltip || !item) {
        return;
      }
      
      // Set tooltip content
      this.tooltip.innerHTML = this.generateTooltipContent(item);
      
      // Position tooltip near mouse but not under it
      const safeX = Math.max(0, Math.min(x + 15, window.innerWidth - this.tooltip.offsetWidth));
      const safeY = Math.max(0, Math.min(y - 15, window.innerHeight - this.tooltip.offsetHeight));
      this.tooltip.style.left = `${safeX}px`;
      this.tooltip.style.top = `${safeY}px`;
      
      // Show tooltip
      this.tooltip.style.display = 'block';
    } catch (error) {
      console.warn('Error showing tooltip:', error.message);
    }
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  updateInventory() {
    try {
      // Check if inventory element exists
      if (!this.inventoryElement) {
        console.warn('Cannot update inventory: inventory element not found');
        return;
      }
      
      // Clear inventory display
      this.inventoryElement.innerHTML = '';
      
      // Add header
      const header = document.createElement('h3');
      header.textContent = 'Inventory';
      this.inventoryElement.appendChild(header);
      
      // Check if player has items
      if (!this.game.player || !this.game.player.inventory || this.game.player.inventory.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = 'No items';
        emptyMessage.style.color = '#999';
        emptyMessage.style.fontStyle = 'italic';
        this.inventoryElement.appendChild(emptyMessage);
        return;
      }
      
      // Create inventory container
      const container = document.createElement('div');
      container.className = 'inventory-container';
      container.style.display = 'grid';
      container.style.gridTemplateColumns = 'repeat(4, 1fr)';
      container.style.gap = '10px';
      
      // Add items to inventory
      this.game.player.inventory.forEach((item, index) => {
        // Skip null or undefined items
        if (!item) return;
        
        // Create item element
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.style.width = '50px';
        itemElement.style.height = '50px';
        itemElement.style.backgroundColor = '#333';
        itemElement.style.border = `2px solid ${this.getItemRarityColor(item.rarity)}`;
        itemElement.style.display = 'flex';
        itemElement.style.justifyContent = 'center';
        itemElement.style.alignItems = 'center';
        itemElement.style.cursor = 'pointer';
        
        // Add item name (first letter)
        const itemName = document.createElement('div');
        itemName.textContent = item.name ? item.name.charAt(0) : '?';
        itemName.style.color = this.getItemRarityColor(item.rarity);
        itemName.style.fontWeight = 'bold';
        itemElement.appendChild(itemName);
        
        // Add hover effect
        itemElement.addEventListener('mouseover', (e) => {
          this.showTooltip(item, e.clientX, e.clientY);
        });
        
        itemElement.addEventListener('mouseout', () => {
          this.hideTooltip();
        });
        
        // Add click effect (equip item)
        itemElement.addEventListener('click', () => {
          this.game.player.equipItem(item);
        });
        
        container.appendChild(itemElement);
      });
      
      this.inventoryElement.appendChild(container);
    } catch (error) {
      console.warn('Error updating inventory:', error.message);
    }
  }

  generateTooltipContent(item) {
    try {
      if (!item) return '';
      
      // Get item rarity color
      const rarityColor = this.getItemRarityColor(item.rarity);
      
      // Create tooltip content
      let content = `
        <div style="color: ${rarityColor}; font-weight: bold;">${item.name || 'Unknown Item'}</div>
        <div style="color: white; font-size: 0.9em;">${item.type || ''}</div>
        <hr style="border-color: #444; margin: 5px 0;">
      `;
      
      // Add weapon-specific details if it's a weapon
      if (item.type === 'weapon') {
        content += `<div>Damage: ${item.damage || 0}</div>`;
        content += `<div>Attack Speed: ${item.attackSpeed || 1.0}</div>`;
      }
      
      // Add attributes if any
      if (item.attributes && item.attributes.length > 0) {
        content += `<div style="margin-top: 5px; color: #aaffaa;">`;
        item.attributes.forEach(attr => {
          if (attr && attr.description) {
            content += `<div>${attr.description}</div>`;
          }
        });
        content += `</div>`;
      }
      
      return content;
    } catch (error) {
      console.warn('Error generating tooltip content:', error.message);
      return '<div>Item Info Unavailable</div>';
    }
  }

  getItemRarityColor(rarity) {
    switch (rarity) {
      case 'magic': return '#8888ff';
      case 'rare': return '#ffff00';
      case 'unique': return '#ff8000';
      case 'legendary': return '#ff00ff'; // Placeholder
      default: return '#ffffff'; // Normal
    }
  }

  // Added simple level up effect placeholder (can be enhanced)
  showLevelUpEffect() {
    const levelText = this.levelTextElement;
    if (levelText) {
      levelText.style.transition = 'transform 0.2s, color 0.2s';
      levelText.style.transform = 'scale(1.2)';
      levelText.style.color = '#ffff00'; // Flash yellow
      setTimeout(() => {
        levelText.style.transform = 'scale(1.0)';
        levelText.style.color = 'white'; // Reset color
      }, 200);
    }
  }
}

// Helper functions for UI
function getItemRarityColor(rarity) {
  switch (rarity) {
    case 'normal':
      return '#FFFFFF';
    case 'magic':
      return '#5555FF';
    case 'rare':
      return '#FFFF00';
    default:
      return '#FFFFFF';
  }
}

function getItemAttributesHTML(item) {
  let html = '';
  
  if (item.attributes) {
    item.attributes.forEach(attr => {
      html += `<div style="color: #88CCFF;">${attr.description}</div>`;
    });
  }
  
  if (item.damage) {
    html += `<div>Damage: ${item.damage}</div>`;
  }
  
  if (item.attackSpeed) {
    html += `<div>Attack Speed: ${item.attackSpeed}</div>`;
  }
  
  return html;
} 
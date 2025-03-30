export class UI {
  constructor(game) {
    this.game = game;
    this.healthElement = document.getElementById('health');
    this.manaElement = document.getElementById('mana');
    this.inventoryElement = document.getElementById('inventory');
  }

  update() {
    if (this.game.player) {
      // Update health display
      this.healthElement.textContent = `Health: ${Math.round(this.game.player.health)}/${this.game.player.maxHealth}`;
      
      // Update mana display
      this.manaElement.textContent = `Mana: ${Math.round(this.game.player.mana)}/${this.game.player.maxMana}`;
    }
  }

  showItemTooltip(item, x, y) {
    // Create tooltip element if it doesn't exist
    let tooltip = document.getElementById('item-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'item-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      tooltip.style.color = getItemRarityColor(item.rarity);
      tooltip.style.padding = '10px';
      tooltip.style.borderRadius = '5px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '1000';
      tooltip.style.maxWidth = '250px';
      document.body.appendChild(tooltip);
    }

    // Set tooltip content and position
    tooltip.innerHTML = `
      <div style="color: ${getItemRarityColor(item.rarity)}; font-weight: bold;">${item.name}</div>
      <div style="color: white; font-size: 0.9em;">${item.type}</div>
      <hr style="border-color: #444; margin: 5px 0;">
      ${getItemAttributesHTML(item)}
    `;
    
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y + 15}px`;
    tooltip.style.display = 'block';
  }

  hideItemTooltip() {
    const tooltip = document.getElementById('item-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  updateInventory() {
    // Clear current inventory display
    this.inventoryElement.innerHTML = '';
    
    // Add header
    const header = document.createElement('div');
    header.textContent = 'Inventory';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '10px';
    this.inventoryElement.appendChild(header);
    
    // Add items
    if (this.game.player && this.game.player.inventory.length > 0) {
      this.game.player.inventory.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.textContent = item.name;
        itemElement.style.color = getItemRarityColor(item.rarity);
        itemElement.style.cursor = 'pointer';
        itemElement.style.padding = '2px';
        
        // Add hover effect
        itemElement.addEventListener('mouseover', (e) => {
          this.showItemTooltip(item, e.clientX, e.clientY);
        });
        
        itemElement.addEventListener('mouseout', () => {
          this.hideItemTooltip();
        });
        
        // Add click event for equipping or using
        itemElement.addEventListener('click', () => {
          this.game.player.equipItem(item);
          this.updateInventory();
        });
        
        this.inventoryElement.appendChild(itemElement);
      });
    } else {
      const emptyText = document.createElement('div');
      emptyText.textContent = 'No items';
      emptyText.style.fontStyle = 'italic';
      this.inventoryElement.appendChild(emptyText);
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
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class MapGenerator {
  constructor(game) {
    this.game = game;
    this.mapSize = 100;
    this.tileSize = 1;
    this.groundMeshes = [];
    this.waterMeshes = [];
    this.objectMeshes = [];
    
    // Map features
    this.riverWidth = 3;
    this.bridgeCount = 3;
    this.treeCount = 100;
    this.bushCount = 80;
    this.rockCount = 50;
    
    // Map data
    this.mapData = [];
    for (let i = 0; i < this.mapSize; i++) {
      this.mapData[i] = [];
      for (let j = 0; j < this.mapSize; j++) {
        this.mapData[i][j] = {
          type: 'ground',
          height: 0,
          object: null
        };
      }
    }
  }
  
  generateMap() {
    // Create map container
    this.mapContainer = new THREE.Group();
    this.game.scene.add(this.mapContainer);
    
    // Generate base terrain
    this.generateTerrain();
    
    // Generate rivers
    this.generateRivers();
    
    // Generate bridges
    this.generateBridges();
    
    // Generate trees, bushes, and rocks
    this.generateVegetation();
    
    // Generate fog of war
    this.generateFog();
    
    return this.mapContainer;
  }
  
  generateTerrain() {
    // Create ground plane geometry
    const planeGeometry = new THREE.PlaneGeometry(this.mapSize, this.mapSize, 50, 50);
    planeGeometry.rotateX(-Math.PI / 2); // Rotate to be flat on XZ plane
    
    // Apply height variation using noise
    const positions = planeGeometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      
      // Small height variations for natural look
      const height = this.generateHeight(x, z);
      positions.setY(i, height);
    }
    
    // Update normals after changing geometry
    planeGeometry.computeVertexNormals();
    
    // Create ground material
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x33691e, // Dark forest green
      roughness: 0.8,
      metalness: 0.2
    });
    
    // Create ground mesh
    const groundMesh = new THREE.Mesh(planeGeometry, groundMaterial);
    groundMesh.receiveShadow = true;
    groundMesh.name = 'ground';
    
    // Add to scene and store reference
    this.mapContainer.add(groundMesh);
    this.groundMeshes.push(groundMesh);
  }
  
  generateHeight(x, z) {
    // Simple noise function for height
    const scale = 0.1;
    const height = Math.sin(x * scale) * Math.cos(z * scale) * 0.2;
    return height;
  }
  
  generateRivers() {
    // Generate a meandering river across the map
    const riverPoints = this.generateRiverPath();
    
    // Create the river mesh
    const riverGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    riverGeometry.rotateX(-Math.PI / 2); // Flat on XZ plane
    
    const riverMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e88e5, // Blue water
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.8
    });
    
    // Create river segments
    for (let i = 1; i < riverPoints.length; i++) {
      const startPoint = riverPoints[i - 1];
      const endPoint = riverPoints[i];
      
      // Calculate length and direction
      const direction = new THREE.Vector2(
        endPoint.x - startPoint.x,
        endPoint.z - startPoint.z
      );
      const length = direction.length();
      
      // Create river segment
      const segmentGeometry = new THREE.PlaneGeometry(this.riverWidth, length, 1, 1);
      segmentGeometry.rotateX(-Math.PI / 2); // Flat on XZ plane
      
      const segment = new THREE.Mesh(segmentGeometry, riverMaterial);
      
      // Position at midpoint
      segment.position.set(
        (startPoint.x + endPoint.x) / 2,
        0, // Slightly below ground to avoid z-fighting
        (startPoint.z + endPoint.z) / 2
      );
      
      // Rotate to align with direction
      segment.rotation.y = Math.atan2(direction.y, direction.x);
      
      // Add to scene
      this.mapContainer.add(segment);
      this.waterMeshes.push(segment);
      
      // Mark water tiles in map data
      this.markRiverTiles(startPoint, endPoint);
    }
    
    // Create animated water surface
    this.animateWater();
  }
  
  generateRiverPath() {
    // Generate a meandering river path
    const points = [];
    let x = -this.mapSize / 2;
    let z = (Math.random() - 0.5) * this.mapSize;
    
    // Add starting point
    points.push({ x, z });
    
    // Generate points across the map width
    while (x < this.mapSize / 2) {
      // Move forward
      x += 5 + Math.random() * 5;
      
      // Add some random variation to z (meandering)
      z += (Math.random() - 0.5) * 10;
      
      // Clamp to map bounds
      z = Math.max(-this.mapSize / 2, Math.min(this.mapSize / 2, z));
      
      // Add point
      points.push({ x, z });
    }
    
    return points;
  }
  
  markRiverTiles(start, end) {
    // Mark river tiles in the map data
    // Calculate distance manually since start and end are simple objects
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.ceil(distance / this.tileSize);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.floor((start.x * (1 - t) + end.x * t + this.mapSize / 2) / this.tileSize);
      const z = Math.floor((start.z * (1 - t) + end.z * t + this.mapSize / 2) / this.tileSize);
      
      // Ensure within map bounds
      if (x >= 0 && x < this.mapSize && z >= 0 && z < this.mapSize) {
        // Mark center and surrounding tiles as water
        for (let dx = -Math.floor(this.riverWidth / 2); dx <= Math.floor(this.riverWidth / 2); dx++) {
          for (let dz = -Math.floor(this.riverWidth / 2); dz <= Math.floor(this.riverWidth / 2); dz++) {
            const tx = x + dx;
            const tz = z + dz;
            
            if (tx >= 0 && tx < this.mapSize && tz >= 0 && tz < this.mapSize) {
              this.mapData[tx][tz].type = 'water';
            }
          }
        }
      }
    }
  }
  
  animateWater() {
    // Add wave animation to water
    for (const waterMesh of this.waterMeshes) {
      // Create animation function
      const animate = () => {
        // Simple wave effect
        const time = Date.now() * 0.001;
        waterMesh.material.opacity = 0.7 + Math.sin(time * 2) * 0.1;
        
        // Optional: Add ripple effect by manipulating geometry
        
        // Continue animation
        requestAnimationFrame(animate);
      };
      
      animate();
    }
  }
  
  generateBridges() {
    // Find good locations for bridges across the river
    const bridgeLocations = this.findBridgeLocations();
    
    // Create bridges
    for (const location of bridgeLocations) {
      this.createBridge(location);
    }
  }
  
  findBridgeLocations() {
    // Find suitable locations for bridges across rivers
    const locations = [];
    
    // Find water regions that cross a river
    for (let x = 0; x < this.mapSize; x++) {
      for (let z = 0; z < this.mapSize; z++) {
        if (this.mapData[x][z].type === 'water') {
          // Check if this is a good bridge location (narrow part, not already near a bridge)
          if (this.isGoodBridgeLocation(x, z)) {
            locations.push({ x, z, direction: this.getRiverDirection(x, z) });
            
            // Prevent bridges too close to each other
            x += 10;
            break;
          }
        }
      }
    }
    
    // Limit to the number of bridges we want
    return locations.slice(0, this.bridgeCount);
  }
  
  isGoodBridgeLocation(x, z) {
    // Check if this is a suitable bridge location
    
    // Don't place bridge near map edge
    const borderSize = 10;
    if (x < borderSize || x >= this.mapSize - borderSize || 
        z < borderSize || z >= this.mapSize - borderSize) {
      return false;
    }
    
    // Try to find narrow river parts
    const riverWidth = this.getRiverWidth(x, z);
    if (riverWidth > this.riverWidth * 1.5) {
      return false;
    }
    
    return true;
  }
  
  getRiverWidth(x, z) {
    // Determine river width at this point
    let width = 0;
    
    // Check in both directions
    for (let dx = -this.riverWidth * 2; dx <= this.riverWidth * 2; dx++) {
      const tx = x + dx;
      if (tx >= 0 && tx < this.mapSize && this.mapData[tx][z].type === 'water') {
        width++;
      }
    }
    
    return width;
  }
  
  getRiverDirection(x, z) {
    // Determine river direction at this point (for bridge orientation)
    
    // Check horizontal river
    let horizontalCount = 0;
    for (let dx = -2; dx <= 2; dx++) {
      const tx = x + dx;
      if (tx >= 0 && tx < this.mapSize && this.mapData[tx][z].type === 'water') {
        horizontalCount++;
      }
    }
    
    // Check vertical river
    let verticalCount = 0;
    for (let dz = -2; dz <= 2; dz++) {
      const tz = z + dz;
      if (tz >= 0 && tz < this.mapSize && this.mapData[x][tz].type === 'water') {
        verticalCount++;
      }
    }
    
    // Return orientation based on which direction has more water tiles
    return horizontalCount > verticalCount ? 'horizontal' : 'vertical';
  }
  
  createBridge(location) {
    // Create a wooden bridge across the river
    const bridgeWidth = 2;
    const bridgeLength = this.riverWidth * 1.5;
    
    // Create bridge geometry
    const bridgeGeometry = new THREE.BoxGeometry(
      location.direction === 'horizontal' ? bridgeLength : bridgeWidth,
      0.1,
      location.direction === 'horizontal' ? bridgeWidth : bridgeLength
    );
    
    const bridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown wood
      roughness: 0.9,
      metalness: 0.1
    });
    
    const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
    
    // Position bridge
    bridge.position.set(
      (location.x - this.mapSize / 2) * this.tileSize, 
      0.3, // Slightly above water level
      (location.z - this.mapSize / 2) * this.tileSize
    );
    
    // Add railings
    const railingHeight = 0.3;
    const railingThickness = 0.05;
    
    for (let side = -1; side <= 1; side += 2) {
      // Skip middle
      if (side === 0) continue;
      
      const railingGeometry = new THREE.BoxGeometry(
        location.direction === 'horizontal' ? bridgeLength : railingThickness,
        railingHeight,
        location.direction === 'horizontal' ? railingThickness : bridgeLength
      );
      
      const railing = new THREE.Mesh(railingGeometry, bridgeMaterial);
      
      railing.position.set(
        0,
        railingHeight / 2,
        side * (bridgeWidth / 2 - railingThickness / 2) * (location.direction === 'horizontal' ? 1 : 0)
      );
      
      if (location.direction === 'vertical') {
        railing.position.set(
          side * (bridgeWidth / 2 - railingThickness / 2),
          railingHeight / 2,
          0
        );
      }
      
      bridge.add(railing);
    }
    
    // Add to scene
    this.mapContainer.add(bridge);
    this.objectMeshes.push(bridge);
    
    // Mark tiles as bridge in map data
    const length = Math.ceil(bridgeLength / this.tileSize);
    const width = Math.ceil(bridgeWidth / this.tileSize);
    
    for (let dx = -length / 2; dx < length / 2; dx++) {
      for (let dz = -width / 2; dz < width / 2; dz++) {
        const tx = location.x + (location.direction === 'horizontal' ? dx : dz);
        const tz = location.z + (location.direction === 'horizontal' ? dz : dx);
        
        if (tx >= 0 && tx < this.mapSize && tz >= 0 && tz < this.mapSize) {
          this.mapData[tx][tz].object = 'bridge';
        }
      }
    }
  }
  
  generateVegetation() {
    // Add trees, bushes, and rocks to the map
    
    // Create instances for optimization
    this.createTrees();
    this.createBushes();
    this.createRocks();
  }
  
  createTrees() {
    // Create tree models
    const treeTrunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brown
    
    const treeLeafGeometry = new THREE.ConeGeometry(1, 2, 8);
    const treeLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x005500 }); // Dark green
    
    // Create tree template
    const treeTemplate = new THREE.Group();
    
    const trunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    treeTemplate.add(trunk);
    
    const leaves = new THREE.Mesh(treeLeafGeometry, treeLeafMaterial);
    leaves.position.y = 2.5;
    leaves.castShadow = true;
    treeTemplate.add(leaves);
    
    // Place trees
    for (let i = 0; i < this.treeCount; i++) {
      this.placeVegetation(treeTemplate.clone(), 'tree', 3);
    }
  }
  
  createBushes() {
    // Create bush models
    const bushGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x226622 }); // Green
    
    // Create bush template
    const bushTemplate = new THREE.Group();
    
    const bushBody = new THREE.Mesh(bushGeometry, bushMaterial);
    bushBody.position.y = 0.5;
    bushBody.scale.y = 0.7; // Slightly flattened
    bushBody.castShadow = true;
    bushTemplate.add(bushBody);
    
    // Place bushes
    for (let i = 0; i < this.bushCount; i++) {
      this.placeVegetation(bushTemplate.clone(), 'bush', 1);
    }
  }
  
  createRocks() {
    // Create rock models
    const rockGeometry = new THREE.DodecahedronGeometry(0.5, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      roughness: 0.8,
      metalness: 0.2
    });
    
    // Create rock template
    const rockTemplate = new THREE.Group();
    
    const rockBody = new THREE.Mesh(rockGeometry, rockMaterial);
    rockBody.position.y = 0.3;
    rockBody.castShadow = true;
    rockTemplate.add(rockBody);
    
    // Place rocks
    for (let i = 0; i < this.rockCount; i++) {
      this.placeVegetation(rockTemplate.clone(), 'rock', 0.8);
    }
  }
  
  placeVegetation(objectMesh, objectType, clearRadius) {
    // Try to find a suitable position for vegetation
    for (let attempts = 0; attempts < 20; attempts++) {
      // Random position on map
      const x = Math.floor(Math.random() * this.mapSize);
      const z = Math.floor(Math.random() * this.mapSize);
      
      // Check if the tile is suitable
      if (this.mapData[x][z].type === 'ground' && !this.mapData[x][z].object) {
        // Check for clearance (no water or other objects nearby)
        if (this.checkClearance(x, z, clearRadius, objectType)) {
          // Position mesh
          objectMesh.position.set(
            (x - this.mapSize / 2) * this.tileSize, 
            0, 
            (z - this.mapSize / 2) * this.tileSize
          );
          
          // Add some random rotation
          objectMesh.rotation.y = Math.random() * Math.PI * 2;
          
          // Add random scale variation
          const scale = 0.8 + Math.random() * 0.4;
          objectMesh.scale.set(scale, scale, scale);
          
          // Add to scene
          this.mapContainer.add(objectMesh);
          this.objectMeshes.push(objectMesh);
          
          // Mark in map data
          this.mapData[x][z].object = objectType;
          
          return true;
        }
      }
    }
    
    return false;
  }
  
  checkClearance(x, z, radius, objectType) {
    // Check if there's enough clearance for this object
    const radiusCeil = Math.ceil(radius);
    
    for (let dx = -radiusCeil; dx <= radiusCeil; dx++) {
      for (let dz = -radiusCeil; dz <= radiusCeil; dz++) {
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance <= radius) {
          const tx = x + dx;
          const tz = z + dz;
          
          // Check map bounds
          if (tx < 0 || tx >= this.mapSize || tz < 0 || tz >= this.mapSize) {
            return false;
          }
          
          // Check for water or other objects
          if (this.mapData[tx][tz].type === 'water') {
            return false;
          }
          
          // Trees need more space, bushes can be closer to objects
          if (objectType === 'tree' && this.mapData[tx][tz].object) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
  
  generateFog() {
    // Add fog effect to the scene (for atmosphere)
    const fogColor = 0x1a237e; // Dark blue for night/forest effect
    this.game.scene.fog = new THREE.FogExp2(fogColor, 0.02);
  }
} 
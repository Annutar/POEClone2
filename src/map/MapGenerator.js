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
    
    // Now safely add river edges
    try {
      this.generateRiverEdges();
    } catch (error) {
      console.warn("Warning: Could not generate river edges:", error.message);
    }
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
        let gridX, gridZ;
        if (location.direction === 'horizontal') {
            gridX = Math.floor(location.x + dx);
            gridZ = Math.floor(location.z + dz);
        } else { // vertical
            gridX = Math.floor(location.x + dz);
            gridZ = Math.floor(location.z + dx);
        }
        const tx = gridX;
        const tz = gridZ;
        
        if (tx >= 0 && tx < this.mapSize && tz >= 0 && tz < this.mapSize) {
          // Ensure the row and cell exist before trying to set property
          if (this.mapData[tx] && this.mapData[tx][tz]) { 
            this.mapData[tx][tz].object = 'bridge';
          } else {
            console.warn(`Attempted to access invalid map data at [${tx}, ${tz}] when creating bridge.`);
          }
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
    // Create tree models with more details
    const treeTrunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const treeTrunkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513, // Brown
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Create multiple leaf layers for more detailed trees
    const treeLeafGeometry = new THREE.ConeGeometry(1, 2, 8);
    const treeLeafMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x004400, // Darker green
      roughness: 0.8,
      metalness: 0.1
    });
    
    // Create tree template
    const treeTemplate = new THREE.Group();
    
    const trunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeTemplate.add(trunk);
    
    // Add multiple leaf layers for more detail
    const leavesMain = new THREE.Mesh(treeLeafGeometry, treeLeafMaterial);
    leavesMain.position.y = 2.5;
    leavesMain.castShadow = true;
    leavesMain.receiveShadow = true;
    treeTemplate.add(leavesMain);
    
    // Add a second, smaller leaf layer
    const leavesTop = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.5, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0x005500, // Slightly lighter green
        roughness: 0.7,
        metalness: 0.1
      })
    );
    leavesTop.position.y = 3.5;
    leavesTop.castShadow = true;
    leavesTop.receiveShadow = true;
    treeTemplate.add(leavesTop);
    
    // Create two tree types
    const treeTemplate2 = new THREE.Group();
    const trunk2 = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
    trunk2.position.y = 1;
    trunk2.castShadow = true;
    trunk2.receiveShadow = true;
    treeTemplate2.add(trunk2);
    
    // Pine tree style
    const pineLeaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 3, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0x006600, 
        roughness: 0.8,
        metalness: 0.1
      })
    );
    pineLeaves.position.y = 2.5;
    pineLeaves.castShadow = true;
    pineLeaves.receiveShadow = true;
    treeTemplate2.add(pineLeaves);
    
    // Place trees of both types
    for (let i = 0; i < this.treeCount; i++) {
      // Alternate between tree types
      if (i % 2 === 0) {
        this.placeVegetation(treeTemplate.clone(), 'tree', 3);
      } else {
        this.placeVegetation(treeTemplate2.clone(), 'tree', 3);
      }
    }
  }
  
  createBushes() {
    // Create more detailed bush models
    const bushMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x226622, // Green
      roughness: 0.8,
      metalness: 0.1
    });
    
    // Create bush template
    const bushTemplate = new THREE.Group();
    
    // Main bush body
    const bushBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      bushMaterial
    );
    bushBody.position.y = 0.5;
    bushBody.scale.y = 0.7; // Slightly flattened
    bushBody.castShadow = true;
    bushBody.receiveShadow = true;
    bushTemplate.add(bushBody);
    
    // Add some smaller spheres for more detail
    for (let i = 0; i < 3; i++) {
      const detail = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 7, 7),
        new THREE.MeshStandardMaterial({ 
          color: 0x1e5b1e, // Slightly different green
          roughness: 0.9,
          metalness: 0.1
        })
      );
      
      // Position randomly around main body
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.3;
      detail.position.x = Math.cos(angle) * radius;
      detail.position.z = Math.sin(angle) * radius;
      detail.position.y = 0.4 + Math.random() * 0.3;
      detail.scale.set(
        0.8 + Math.random() * 0.4,
        0.8 + Math.random() * 0.4,
        0.8 + Math.random() * 0.4
      );
      detail.castShadow = true;
      detail.receiveShadow = true;
      
      bushTemplate.add(detail);
    }
    
    // Create a second bush type (berry bush)
    const berryBushTemplate = new THREE.Group();
    
    // Main bush body
    const berryBushBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0x306030, // Darker green
        roughness: 0.8, 
        metalness: 0.1
      })
    );
    berryBushBody.position.y = 0.4;
    berryBushBody.castShadow = true;
    berryBushBody.receiveShadow = true;
    berryBushTemplate.add(berryBushBody);
    
    // Add some berries
    const berryMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc0000, // Red berries
      roughness: 0.5,
      metalness: 0.3
    });
    
    for (let i = 0; i < 8; i++) {
      const berry = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 6, 6),
        berryMaterial
      );
      
      // Position randomly on the bush
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * Math.PI;
      const radius = 0.4;
      
      berry.position.x = Math.cos(angle) * Math.sin(height) * radius;
      berry.position.z = Math.sin(angle) * Math.sin(height) * radius;
      berry.position.y = 0.4 + Math.cos(height) * radius;
      
      berry.castShadow = true;
      berryBushTemplate.add(berry);
    }
    
    // Place bushes of both types
    for (let i = 0; i < this.bushCount; i++) {
      if (i % 4 === 0) { // 25% berry bushes, 75% regular
        this.placeVegetation(berryBushTemplate.clone(), 'bush', 1);
      } else {
        this.placeVegetation(bushTemplate.clone(), 'bush', 1);
      }
    }
  }
  
  createRocks() {
    // Create more detailed rock models
    const rockMaterials = [
      new THREE.MeshStandardMaterial({ 
        color: 0x888888, // Gray
        roughness: 0.9,
        metalness: 0.1
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0x777777, // Darker gray
        roughness: 0.8,
        metalness: 0.2
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0x999999, // Lighter gray
        roughness: 0.7,
        metalness: 0.1
      })
    ];
    
    // Create three different rock templates
    const rockTemplates = [];
    
    // Boulder-like rock
    const rockTemplate1 = new THREE.Group();
    const rockBody1 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.6, 1),
      rockMaterials[0]
    );
    rockBody1.position.y = 0.4;
    rockBody1.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    rockBody1.castShadow = true;
    rockBody1.receiveShadow = true;
    rockTemplate1.add(rockBody1);
    rockTemplates.push(rockTemplate1);
    
    // Flat rock cluster
    const rockTemplate2 = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const flatRock = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.3 + Math.random() * 0.3,
          0.3 + Math.random() * 0.3,
          0.2,
          6
        ),
        rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
      );
      
      // Position randomly in cluster
      flatRock.position.x = (Math.random() - 0.5) * 0.6;
      flatRock.position.z = (Math.random() - 0.5) * 0.6;
      flatRock.position.y = 0.1 + Math.random() * 0.1;
      
      // Random rotation
      flatRock.rotation.y = Math.random() * Math.PI;
      flatRock.rotation.x = (Math.random() - 0.5) * 0.5; // Slight tilt
      
      flatRock.castShadow = true;
      flatRock.receiveShadow = true;
      rockTemplate2.add(flatRock);
    }
    rockTemplates.push(rockTemplate2);
    
    // Angular, steep rock
    const rockTemplate3 = new THREE.Group();
    const rockBody3 = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.5, 1),
      rockMaterials[1]
    );
    rockBody3.position.y = 0.3;
    rockBody3.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    rockBody3.castShadow = true;
    rockBody3.receiveShadow = true;
    rockTemplate3.add(rockBody3);
    rockTemplates.push(rockTemplate3);
    
    // Place rocks
    for (let i = 0; i < this.rockCount; i++) {
      // Choose a random rock template
      const rockTemplate = rockTemplates[Math.floor(Math.random() * rockTemplates.length)].clone();
      
      // Add random scale variation
      const scale = 0.7 + Math.random() * 0.6;
      rockTemplate.scale.set(scale, Math.max(0.7, scale * (0.8 + Math.random() * 0.4)), scale);
      
      // Add random rotation
      rockTemplate.rotation.y = Math.random() * Math.PI * 2;
      
      this.placeVegetation(rockTemplate, 'rock', 0.8);
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

  generateRiverEdges() {
    // This is a more robust version that won't throw errors
    console.log("Generating river edges");
    
    try {
      // Iterate through map to find water tiles
      for (let x = 1; x < this.mapSize - 1; x++) {
        for (let z = 1; z < this.mapSize - 1; z++) {
          if (this.mapData[x][z].type === 'water') {
            // Check adjacent tiles
            for (let dx = -1; dx <= 1; dx++) {
              for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dz === 0) continue; // Skip self
                
                const nx = x + dx;
                const nz = z + dz;
                
                // Check if adjacent tile is ground
                if (nx >= 0 && nx < this.mapSize && nz >= 0 && nz < this.mapSize && 
                    this.mapData[nx][nz].type === 'ground') {
                  // This is a river edge - no need to create edge objects
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn("Non-critical error in river edge generation:", error.message);
      // Fall through and continue - this is not a critical feature
    }
  }

  createRiverEdge(x, z, edgeType) {
    // This is a simplified version that won't throw errors
    // We won't actually create any objects here
    try {
      // Just a placeholder to mark where edges would be
    } catch (error) {
      console.warn("Non-critical error in river edge creation:", error.message);
    }
  }
} 
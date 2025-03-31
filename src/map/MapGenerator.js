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
  
  generateVegetation() {
    // Create regular trees, bushes, and rocks
    this.createTrees();
    this.createBushes();
    this.createRocks();

    // Create new environmental features
    this.createGnarledTreeMap();
    this.createOvergrownRoots();
    this.generateMurkyPonds();
    this.createFallenLogs();
    this.createDenseThickets();
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
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
        attempts++;
        const worldX = (Math.random() * this.mapSize - this.mapSize / 2) * this.tileSize;
        const worldZ = (Math.random() * this.mapSize - this.mapSize / 2) * this.tileSize;
        const gridX = Math.floor((worldX / this.tileSize) + this.mapSize / 2);
        const gridZ = Math.floor((worldZ / this.tileSize) + this.mapSize / 2);

        // Check if the target tile is valid ground and NOT a thicket tile
        if (gridX >= 0 && gridX < this.mapSize && gridZ >= 0 && gridZ < this.mapSize && 
            this.mapData[gridX]?.[gridZ]?.type === 'ground' &&
            this.mapData[gridX]?.[gridZ]?.object !== 'thicket_bush' && // Don't place general items inside thickets
            !this.mapData[gridX]?.[gridZ]?.impassable) { // Check impassable flag
            
            if (this.checkClearance(gridX, gridZ, clearRadius, objectType)) {
                // Set Y position based on object type
                let posY = 0.1; // Default slight elevation
                if(objectType === 'fallen_log') {
                  posY = objectMesh.geometry.parameters.radiusTop * 0.8; 
                } else if (objectType === 'gnarled_tree' || objectType === 'tree') {
                    posY = 0; // Trees start at base y=0
                } else if (objectType === 'bush' || objectType === 'berry_bush') {
                    posY = 0.1; // Bushes slightly elevated
                } else if (objectType === 'rock') {
                    // Fix: Rocks are groups. Place them near ground level.
                    posY = 0.1; // Simple small offset for rocks
                }
                objectMesh.position.set(worldX, posY, worldZ);

                this.mapContainer.add(objectMesh);
                this.objectMeshes.push(objectMesh);
                this.mapData[gridX][gridZ].object = objectType;
                placed = true;
            }
        }
    }

    if (!placed) {
        console.warn(`Could not place ${objectType} after ${maxAttempts} attempts.`);
        if (objectMesh.geometry) objectMesh.geometry.dispose();
        if (objectMesh.material) {
           if (Array.isArray(objectMesh.material)) {
                objectMesh.material.forEach(m => m.dispose());
            } else if (objectMesh.material.dispose) {
                objectMesh.material.dispose();
            }
        }
    }
  }
  
  checkClearance(x, z, radius, objectType) {
    const radiusSquared = radius * radius;
    const iRadius = Math.ceil(radius);

    for (let dx = -iRadius; dx <= iRadius; dx++) {
        for (let dz = -iRadius; dz <= iRadius; dz++) {
            if (dx * dx + dz * dz > radiusSquared) continue;
            const checkX = x + dx;
            const checkZ = z + dz;

            if (checkX < 0 || checkX >= this.mapSize || checkZ < 0 || checkZ >= this.mapSize) return false; 
            
            const tile = this.mapData[checkX]?.[checkZ];
            if (!tile) return false; 

            // Check for impassable tiles (thickets) or non-ground tiles
            if (tile.impassable || (tile.type !== 'ground' && tile.type !== 'bush')) { // Allow placing near bushes? Maybe not.
                 if (tile.type === 'water' || tile.type === 'pond_water') return false; // Definitely not in water/ponds
                 if (tile.object === 'thicket_bush') return false; // Don't place things overlapping thicket markers
                 // Allow roots to be near trees, even if tile isn't strictly ground?
                 if (objectType === 'root' && (tile.object === 'tree' || tile.object === 'gnarled_tree')) continue;
                 // Otherwise, if not ground, it's blocked.
                 if (tile.type !== 'ground') return false;
            }

            // Check for interfering objects (allow roots near trees)
            if (tile.object !== null) {
                 if (objectType === 'root' && (tile.object === 'tree' || tile.object === 'gnarled_tree')) continue;
                 // If the tile object is not null and not a tree we are placing a root near, block.
                 return false;
            }
        }
    }
    return true; // Area is clear
  }
  
  generateFog() {
    // Add fog effect to the scene (for atmosphere)
    const fogColor = 0x1a237e; // Dark blue for night/forest effect
    this.game.scene.fog = new THREE.FogExp2(fogColor, 0.02);
  }

  // ADDED Method: Gnarled Trees
  createGnarledTreeMap() {
    console.log("Creating gnarled trees");
    const gnarledTreeCount = Math.floor(this.treeCount * 0.15); // Approx 15% gnarled trees
    const gnarledTreeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x5C3A21, // Darker, browner wood
      roughness: 0.8, 
      metalness: 0.1 
    });
    const gnarledLeafMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2E4021, // Darker green
      roughness: 0.9,
      metalness: 0.0
    });

    for (let i = 0; i < gnarledTreeCount; i++) {
      const trunkHeight = Math.random() * 3 + 4; // Taller, more imposing
      const trunkRadius = Math.random() * 0.4 + 0.5; // Thicker trunk
      
      // More complex trunk geometry (using Cylinder with more segments for potential twisting later)
      const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 12, 3);
      // Simple twist (can be improved)
      for (let j = 0; j < trunkGeometry.attributes.position.count; j++) {
          const y = trunkGeometry.attributes.position.getY(j);
          const angle = (y / trunkHeight) * Math.PI * 0.5; // Twist more towards the top
          const x = trunkGeometry.attributes.position.getX(j);
          const z = trunkGeometry.attributes.position.getZ(j);
          trunkGeometry.attributes.position.setX(j, x * Math.cos(angle) - z * Math.sin(angle));
          trunkGeometry.attributes.position.setZ(j, x * Math.sin(angle) + z * Math.cos(angle));
      }
      trunkGeometry.computeVertexNormals(); // Recalculate normals after twisting

      const trunk = new THREE.Mesh(trunkGeometry, gnarledTreeMaterial);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      
      // Leaf geometry (larger, denser canopy)
      const leafRadius = trunkRadius * 3 + Math.random() * 1.5;
      const leafHeight = trunkHeight * 1.2 + Math.random();
      const leafGeometry = new THREE.ConeGeometry(leafRadius, leafHeight, 8); // Cone for simplicity
      const leaves = new THREE.Mesh(leafGeometry, gnarledLeafMaterial);
      leaves.position.y = trunkHeight / 2 + leafHeight / 3; // Position canopy
      leaves.castShadow = true;

      const gnarledTree = new THREE.Group();
      gnarledTree.add(trunk);
      gnarledTree.add(leaves);
      
      gnarledTree.userData = { type: 'gnarled_tree' }; // Identify object type

      // Place the gnarled tree on the map
      this.placeVegetation(gnarledTree, 'gnarled_tree', 2.5); // Use a slightly larger clear radius
    }
  }

  // ADDED Method: Overgrown Roots
  createOvergrownRoots() {
    console.log("Creating overgrown roots");
    const rootCount = Math.floor(this.treeCount * 0.5); // Roots near roughly half the trees
    const rootMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x6B4F3A, // Earthy root color
        roughness: 0.9,
        metalness: 0.05 
    });

    const potentialRootLocations = [];
    // Find locations near existing trees (both regular and gnarled)
    this.mapContainer.children.forEach(child => {
        if (child.userData && (child.userData.type === 'tree' || child.userData.type === 'gnarled_tree')) {
            potentialRootLocations.push(child.position.clone());
        }
    });

    for (let i = 0; i < rootCount; i++) {
        if (potentialRootLocations.length === 0) break;

        // Pick a random tree location
        const randomIndex = Math.floor(Math.random() * potentialRootLocations.length);
        const basePosition = potentialRootLocations[randomIndex];
        potentialRootLocations.splice(randomIndex, 1); // Remove to avoid placing multiple roots at the exact same tree

        const numRootsPerCluster = Math.floor(Math.random() * 4) + 2; // 2-5 roots per cluster

        for (let j = 0; j < numRootsPerCluster; j++) {
            const rootLength = Math.random() * 2 + 1; // Length of the root segment
            const rootRadius = Math.random() * 0.1 + 0.05; // Thickness

            // Using TubeGeometry for potentially smoother curves
            const curve = new THREE.LineCurve3(
                new THREE.Vector3(0, 0.1, 0), // Start slightly above ground
                new THREE.Vector3(
                    (Math.random() - 0.5) * rootLength * 2, 
                    Math.random() * 0.2 + 0.05, // Slight vertical variation
                    (Math.random() - 0.5) * rootLength * 2
                ) // End point relative to start
            );
            
            const rootGeometry = new THREE.TubeGeometry(curve, 8, rootRadius, 6, false);
            const rootMesh = new THREE.Mesh(rootGeometry, rootMaterial);
            rootMesh.castShadow = true;

            // Position the root cluster near the tree base
            rootMesh.position.copy(basePosition);
            // Add slight random offset from base position
            rootMesh.position.x += (Math.random() - 0.5) * 0.5; 
            rootMesh.position.z += (Math.random() - 0.5) * 0.5;
            // Random rotation for variety
            rootMesh.rotation.y = Math.random() * Math.PI * 2;

            rootMesh.userData = { type: 'root' }; // Identify object type
            this.mapContainer.add(rootMesh);
            this.objectMeshes.push(rootMesh); // Add to objects list for potential interactions
            
            // Mark map data (simplified: mark center of root cluster)
            // A more complex approach would mark the tiles the tube geometry covers
            const gridX = Math.floor((rootMesh.position.x / this.tileSize) + this.mapSize / 2);
            const gridZ = Math.floor((rootMesh.position.z / this.tileSize) + this.mapSize / 2);
            if (gridX >= 0 && gridX < this.mapSize && gridZ >= 0 && gridZ < this.mapSize) {
                if (this.mapData[gridX][gridZ].object === null) { // Don't overwrite other objects
                  this.mapData[gridX][gridZ].object = 'root';
                }
            }
        }
    }
  }

  // ADDED Method: Murky Ponds
  generateMurkyPonds() {
    console.log("Generating murky ponds");
    const pondCount = 10; // Number of ponds
    const maxPondRadius = 3.5; // Max radius in tiles
    const minPondRadius = 1.5; // Min radius in tiles
    const pondMaterial = new THREE.MeshStandardMaterial({
        color: 0x1A2F1A, // Dark, murky green/brown
        transparent: true,
        opacity: 0.85,
        roughness: 0.2,
        metalness: 0.1,
        side: THREE.DoubleSide // Render both sides in case player camera goes below
    });

    for (let i = 0; i < pondCount; i++) {
        let attempts = 0;
        const maxAttempts = 50;
        let placed = false;

        while (attempts < maxAttempts && !placed) {
            attempts++;
            const pondRadiusTiles = Math.random() * (maxPondRadius - minPondRadius) + minPondRadius;
            const pondRadiusWorld = pondRadiusTiles * this.tileSize;
            
            // Try random positions
            const x = Math.floor(Math.random() * this.mapSize);
            const z = Math.floor(Math.random() * this.mapSize);

            // Check if the center point is suitable (ground, not too near edge)
            if (this.mapData[x]?.[z]?.type === 'ground' && 
                x > pondRadiusTiles && x < this.mapSize - pondRadiusTiles &&
                z > pondRadiusTiles && z < this.mapSize - pondRadiusTiles) {

                // Check clearance in the area
                let clear = true;
                for (let dx = -Math.ceil(pondRadiusTiles); dx <= Math.ceil(pondRadiusTiles); dx++) {
                    for (let dz = -Math.ceil(pondRadiusTiles); dz <= Math.ceil(pondRadiusTiles); dz++) {
                        const checkX = x + dx;
                        const checkZ = z + dz;
                        if (Math.sqrt(dx*dx + dz*dz) <= pondRadiusTiles) { // Check within circle
                            if (this.mapData[checkX]?.[checkZ]?.type !== 'ground' || this.mapData[checkX]?.[checkZ]?.object !== null) {
                                clear = false;
                                break;
                            }
                        }
                    }
                    if (!clear) break;
                }

                if (clear) {
                    // Create pond geometry (simple circle)
                    const pondGeometry = new THREE.CircleGeometry(pondRadiusWorld, 32);
                    const pondMesh = new THREE.Mesh(pondGeometry, pondMaterial);
                    
                    // Position slightly below ground level to avoid z-fighting
                    const worldX = (x - this.mapSize / 2) * this.tileSize;
                    const worldZ = (z - this.mapSize / 2) * this.tileSize;
                    pondMesh.position.set(worldX, -0.05, worldZ); 
                    pondMesh.rotation.x = -Math.PI / 2; // Lay flat
                    pondMesh.receiveShadow = true;

                    this.mapContainer.add(pondMesh);
                    this.waterMeshes.push(pondMesh); // Add to water meshes (though not animated like river)
                    pondMesh.userData = { type: 'pond' };

                    // Mark map data
                    for (let dx = -Math.ceil(pondRadiusTiles); dx <= Math.ceil(pondRadiusTiles); dx++) {
                        for (let dz = -Math.ceil(pondRadiusTiles); dz <= Math.ceil(pondRadiusTiles); dz++) {
                            const markX = x + dx;
                            const markZ = z + dz;
                            if (Math.sqrt(dx*dx + dz*dz) <= pondRadiusTiles) {
                                if (this.mapData[markX]?.[markZ]) {
                                    this.mapData[markX][markZ].type = 'pond_water';
                                    // Optionally mark the central tile as object 'pond'
                                    if(dx === 0 && dz === 0) this.mapData[markX][markZ].object = 'pond'; 
                                }
                            }
                        }
                    }
                    placed = true;
                }
            }
        }
        if (!placed) {
          console.warn(`Could not place murky pond ${i+1} after ${maxAttempts} attempts.`);
        }
    }
  }

  // ADDED Method: Fallen Logs
  createFallenLogs() {
    console.log("Creating fallen logs");
    const logCount = 30; // Number of fallen logs
    const logMaterial = new THREE.MeshStandardMaterial({
        color: 0x6F5B3E, // Weathered wood color
        roughness: 0.9,
        metalness: 0.05,
        map: null // Consider adding a wood texture later
    });

    for (let i = 0; i < logCount; i++) {
        const logLength = Math.random() * 3 + 1.5; // Length 1.5 to 4.5
        const logRadius = Math.random() * 0.2 + 0.15; // Radius 0.15 to 0.35
        
        const logGeometry = new THREE.CylinderGeometry(logRadius, logRadius, logLength, 8); // Simple cylinder
        const logMesh = new THREE.Mesh(logGeometry, logMaterial);
        logMesh.castShadow = true;
        logMesh.receiveShadow = true;

        // Rotate to lay flat (around Z axis, then random Y rotation)
        logMesh.rotation.z = Math.PI / 2;
        logMesh.rotation.y = Math.random() * Math.PI * 2;

        logMesh.userData = { type: 'fallen_log' };

        // Place the log on the map using a similar logic to placeVegetation
        // Try to place it on 'ground' tiles, avoiding water/ponds/other objects
        this.placeVegetation(logMesh, 'fallen_log', logLength / (2 * this.tileSize)); // Use half length as radius approx
    }
  }

  // ADDED Method: Dense Thickets
  createDenseThickets() {
    console.log("Creating dense thickets");
    const thicketCount = 8; // Number of thicket patches
    const maxThicketRadius = 4; // Radius in tiles
    const minThicketRadius = 2;
    const bushDensityFactor = 1.5; // How much denser bushes are in thickets

    for (let i = 0; i < thicketCount; i++) {
        let attempts = 0;
        const maxAttempts = 50;
        let placed = false;

        while (attempts < maxAttempts && !placed) {
            attempts++;
            const thicketRadiusTiles = Math.random() * (maxThicketRadius - minThicketRadius) + minThicketRadius;
            
            // Find a potential center point
            const x = Math.floor(Math.random() * this.mapSize);
            const z = Math.floor(Math.random() * this.mapSize);

            // Check if center is suitable (ground, away from edge)
            if (this.mapData[x]?.[z]?.type === 'ground' && 
                x > thicketRadiusTiles && x < this.mapSize - thicketRadiusTiles &&
                z > thicketRadiusTiles && z < this.mapSize - thicketRadiusTiles) {

                // Check clearance for the whole patch (less strict, allows existing bushes maybe)
                let clearEnough = true;
                let groundTileCount = 0;
                for (let dx = -Math.ceil(thicketRadiusTiles); dx <= Math.ceil(thicketRadiusTiles); dx++) {
                    for (let dz = -Math.ceil(thicketRadiusTiles); dz <= Math.ceil(thicketRadiusTiles); dz++) {
                        const checkX = x + dx;
                        const checkZ = z + dz;
                        if (Math.sqrt(dx*dx + dz*dz) <= thicketRadiusTiles) {
                            const tile = this.mapData[checkX]?.[checkZ];
                            if (!tile || (tile.type !== 'ground' && tile.type !== 'bush')) { // Allow placing over existing ground/bushes
                                // Forbid placing over water, ponds, rocks, logs, trees
                                if (tile && (tile.type === 'water' || tile.type === 'pond_water' || tile.object === 'rock' || tile.object === 'fallen_log' || tile.object === 'tree' || tile.object === 'gnarled_tree')) {
                                   clearEnough = false;
                                   break;
                                }
                            }
                            if (tile && tile.type === 'ground') {
                                groundTileCount++;
                            }
                        }
                    }
                     if (!clearEnough) break;
                }

                // Ensure there's enough ground space to actually form a thicket
                if (clearEnough && groundTileCount > Math.PI * minThicketRadius * minThicketRadius * 0.5) { 
                    placed = true;
                    console.log(`Placing thicket ${i+1} centered at [${x}, ${z}]`);

                    // Mark tiles and add denser bushes
                    for (let dx = -Math.ceil(thicketRadiusTiles); dx <= Math.ceil(thicketRadiusTiles); dx++) {
                        for (let dz = -Math.ceil(thicketRadiusTiles); dz <= Math.ceil(thicketRadiusTiles); dz++) {
                            const markX = x + dx;
                            const markZ = z + dz;
                            if (Math.sqrt(dx*dx + dz*dz) <= thicketRadiusTiles) {
                                const tile = this.mapData[markX]?.[markZ];
                                if (tile && (tile.type === 'ground' || tile.object === 'bush')) { // Only affect ground/existing bush tiles
                                    tile.object = 'thicket_bush'; // Mark as part of a thicket (important for pathfinding later)
                                    tile.impassable = true; // Mark as impassable

                                    // Add extra bushes visually (optional, could be dense enough already)
                                    if (Math.random() < 0.4 * bushDensityFactor) { // Increase chance based on density
                                       // Re-use createBushes logic but place specifically here?
                                       // For simplicity, let's just rely on the 'impassable' flag for now
                                       // and assume existing bush generation might partially cover it.
                                       // We could add a specific `placeBushInThicket(markX, markZ)` call here.
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if (!placed) {
             console.warn(`Could not place thicket ${i+1} after ${maxAttempts} attempts.`);
        }
    }
    // Optional: After marking, could iterate again and place specific 'thicket bush' meshes if needed.
}
} 
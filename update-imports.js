// update-imports.js
const fs = require('fs');
const path = require('path');

const THREE_IMPORT = "import * as THREE from 'three';";
const THREE_IMPORT_NEW = "import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';";

const UUID_IMPORT = "import { v4 as uuidv4 } from 'uuid';";
const UUID_IMPORT_NEW = "import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.1/dist/esm-browser/index.js';";

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace imports
    let updated = content
      .replace(THREE_IMPORT, THREE_IMPORT_NEW)
      .replace(UUID_IMPORT, UUID_IMPORT_NEW);
    
    if (content !== updated) {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
}); 
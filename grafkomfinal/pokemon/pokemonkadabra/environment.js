// Enhanced Environment object generators for Pokemon scene

// Create Enhanced Ground Platform with grass texture and flowers
function createGroundPlane() {
    const width = 35;
    const height = 0.4;
    const depth = 35;

    const grassGreen = [0.25, 0.75, 0.25];
    const darkGreen = [0.18, 0.62, 0.18];
    const lightGreen = [0.32, 0.82, 0.32];
    const brown = [0.45, 0.32, 0.22];
    const darkBrown = [0.35, 0.25, 0.18];

    const vertices = [];
    const indices = [];

    const subdivisions = 15;
    const stepX = (width * 2) / subdivisions;
    const stepZ = (depth * 2) / subdivisions;

    let vertexIndex = 0;

    // Top face with varied grass pattern
    for (let i = 0; i <= subdivisions; i++) {
        for (let j = 0; j <= subdivisions; j++) {
            const x = -width + j * stepX;
            const z = -depth + i * stepZ;
            
            // Create natural grass variation
            const noise = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.15;
            const pattern = (i + j) % 3;
            let color;
            if (pattern === 0) color = grassGreen;
            else if (pattern === 1) color = darkGreen;
            else color = lightGreen;
            
            const y = noise * 0.1;
            vertices.push(x, y, z, ...color, 0, 1, 0);
        }
    }

    for (let i = 0; i < subdivisions; i++) {
        for (let j = 0; j < subdivisions; j++) {
            const topLeft = i * (subdivisions + 1) + j;
            const topRight = topLeft + 1;
            const bottomLeft = (i + 1) * (subdivisions + 1) + j;
            const bottomRight = bottomLeft + 1;

            indices.push(topLeft, bottomLeft, topRight);
            indices.push(topRight, bottomLeft, bottomRight);
        }
    }

    vertexIndex = vertices.length / 9;

    // Bottom face
    const bottomVerts = [
        [-width, -height, -depth],
        [width, -height, -depth],
        [width, -height, depth],
        [-width, -height, depth]
    ];
    for (const v of bottomVerts) {
        vertices.push(...v, ...darkBrown, 0, -1, 0);
    }
    indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 1);
    indices.push(vertexIndex, vertexIndex + 3, vertexIndex + 2);
    vertexIndex += 4;

    // Sides
    const frontVerts = [
        [-width, 0, depth], [width, 0, depth],
        [width, -height, depth], [-width, -height, depth]
    ];
    for (const v of frontVerts) {
        vertices.push(...v, ...brown, 0, 0, 1);
    }
    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
    indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 3);
    vertexIndex += 4;

    const backVerts = [
        [width, 0, -depth], [-width, 0, -depth],
        [-width, -height, -depth], [width, -height, -depth]
    ];
    for (const v of backVerts) {
        vertices.push(...v, ...brown, 0, 0, -1);
    }
    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
    indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 3);
    vertexIndex += 4;

    const leftVerts = [
        [-width, 0, -depth], [-width, 0, depth],
        [-width, -height, depth], [-width, -height, -depth]
    ];
    for (const v of leftVerts) {
        vertices.push(...v, ...darkBrown, -1, 0, 0);
    }
    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
    indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 3);
    vertexIndex += 4;

    const rightVerts = [
        [width, 0, depth], [width, 0, -depth],
        [width, -height, -depth], [width, -height, depth]
    ];
    for (const v of rightVerts) {
        vertices.push(...v, ...darkBrown, 1, 0, 0);
    }
    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
    indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 3);

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Create detailed 3D Tree with textured trunk and layered leaves
function createTree() {
    const vertices = [];
    const indices = [];

    const trunkBrown = [0.42, 0.28, 0.12];
    const darkTrunk = [0.35, 0.22, 0.10];
    const leafGreen = [0.15, 0.65, 0.15];
    const darkLeaf = [0.12, 0.55, 0.12];
    const lightLeaf = [0.20, 0.75, 0.20];

    let idx = 0;

    // Trunk with texture
    const tw = 0.18;
    const th = 1.4;
    const segments = 8;

    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const nextAngle = ((i + 1) / segments) * Math.PI * 2;
        
        const x1 = tw * Math.cos(angle);
        const z1 = tw * Math.sin(angle);
        const x2 = tw * Math.cos(nextAngle);
        const z2 = tw * Math.sin(nextAngle);

        const color = i % 2 === 0 ? trunkBrown : darkTrunk;
        
        const nx = Math.cos(angle);
        const nz = Math.sin(angle);
        
        vertices.push(x1, 0, z1, ...color, nx, 0, nz);
        vertices.push(x1, th, z1, ...color, nx, 0, nz);
        vertices.push(x2, th, z2, ...color, nx, 0, nz);
        vertices.push(x2, 0, z2, ...color, nx, 0, nz);

        indices.push(idx, idx + 1, idx + 2);
        indices.push(idx, idx + 2, idx + 3);
        idx += 4;
    }

    // Layered leaf crown (3 layers)
    const leafLayers = [
        { radius: 1.0, height: th + 0.2, color: darkLeaf },
        { radius: 0.85, height: th + 0.6, color: leafGreen },
        { radius: 0.65, height: th + 1.0, color: lightLeaf }
    ];

    leafLayers.forEach(layer => {
        const lw = layer.radius;
        const ly = layer.height;
        const lh = 0.6;
        const topY = ly + lh;

        const lb = [
            [-lw, ly, -lw], [lw, ly, -lw], 
            [lw, ly, lw], [-lw, ly, lw]
        ];

        // Front
        vertices.push(...lb[3], ...layer.color, 0, 0.7, 0.7);
        vertices.push(...lb[2], ...layer.color, 0, 0.7, 0.7);
        vertices.push(0, topY, 0, ...layer.color, 0, 0.7, 0.7);
        indices.push(idx, idx + 1, idx + 2);
        idx += 3;

        // Right
        vertices.push(...lb[2], ...layer.color, 0.7, 0.7, 0);
        vertices.push(...lb[1], ...layer.color, 0.7, 0.7, 0);
        vertices.push(0, topY, 0, ...layer.color, 0.7, 0.7, 0);
        indices.push(idx, idx + 1, idx + 2);
        idx += 3;

        // Back
        vertices.push(...lb[1], ...layer.color, 0, 0.7, -0.7);
        vertices.push(...lb[0], ...layer.color, 0, 0.7, -0.7);
        vertices.push(0, topY, 0, ...layer.color, 0, 0.7, -0.7);
        indices.push(idx, idx + 1, idx + 2);
        idx += 3;

        // Left
        vertices.push(...lb[0], ...layer.color, -0.7, 0.7, 0);
        vertices.push(...lb[3], ...layer.color, -0.7, 0.7, 0);
        vertices.push(0, topY, 0, ...layer.color, -0.7, 0.7, 0);
        indices.push(idx, idx + 1, idx + 2);
        idx += 3;
    });

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Create detailed Mountain range
function createMountain() {
    const vertices = [];
    const indices = [];

    const mountainGray = [0.52, 0.52, 0.54];
    const darkGray = [0.42, 0.42, 0.44];
    const snowWhite = [0.92, 0.92, 0.96];
    const rockGray = [0.48, 0.46, 0.45];

    const width = 9;
    const height = 7;
    const depth = 5;

    let idx = 0;

    const peak = [0, height, 0];
    const base = [
        [-width, 0, depth],
        [width, 0, depth],
        [width, 0, -depth],
        [-width, 0, -depth]
    ];

    // Front face with rock texture
    for (let i = 0; i < 3; i++) {
        const color = i % 2 === 0 ? mountainGray : rockGray;
        const midY = height * (i / 3);
        const nextY = height * ((i + 1) / 3);
        
        if (i === 2) {
            vertices.push(base[0][0], midY, base[0][2], ...color, 0, 0.6, 0.8);
            vertices.push(base[1][0], midY, base[1][2], ...color, 0, 0.6, 0.8);
            vertices.push(...peak, ...snowWhite, 0, 0.6, 0.8);
            indices.push(idx, idx + 1, idx + 2);
            idx += 3;
        }
    }

    // Right face
    vertices.push(...base[1], ...darkGray, 0.8, 0.6, 0);
    vertices.push(...base[2], ...darkGray, 0.8, 0.6, 0);
    vertices.push(...peak, ...snowWhite, 0.8, 0.6, 0);
    indices.push(idx, idx + 1, idx + 2);
    idx += 3;

    // Back face
    vertices.push(...base[2], ...mountainGray, 0, 0.6, -0.8);
    vertices.push(...base[3], ...mountainGray, 0, 0.6, -0.8);
    vertices.push(...peak, ...snowWhite, 0, 0.6, -0.8);
    indices.push(idx, idx + 1, idx + 2);
    idx += 3;

    // Left face
    vertices.push(...base[3], ...darkGray, -0.8, 0.6, 0);
    vertices.push(...base[0], ...darkGray, -0.8, 0.6, 0);
    vertices.push(...peak, ...snowWhite, -0.8, 0.6, 0);
    indices.push(idx, idx + 1, idx + 2);
    idx += 3;

    // Base
    vertices.push(...base[0], ...darkGray, 0, -1, 0);
    vertices.push(...base[1], ...darkGray, 0, -1, 0);
    vertices.push(...base[2], ...darkGray, 0, -1, 0);
    vertices.push(...base[3], ...darkGray, 0, -1, 0);
    indices.push(idx, idx + 2, idx + 1, idx, idx + 3, idx + 2);

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Create animated Bird
function createBird() {
    const birdBlack = [0.12, 0.12, 0.12];

    const vertices = [
        -0.25, 0, 0, ...birdBlack, 0, 0, 1,
         0.25, 0, 0, ...birdBlack, 0, 0, 1,
         0.25, 0.18, 0, ...birdBlack, 0, 0, 1,
        -0.25, 0.18, 0, ...birdBlack, 0, 0, 1
    ];

    const indices = [0, 1, 2, 0, 2, 3];

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Create Rocks scattered on ground
function createRock() {
    const vertices = [];
    const indices = [];
    
    const rockGray = [0.45, 0.43, 0.42];
    const darkRock = [0.38, 0.36, 0.35];
    
    const size = 0.3;
    let idx = 0;

    // Irregular rock shape (pyramid-like)
    const peak = [0, size * 0.8, 0];
    const base = [
        [-size, 0, size * 0.8],
        [size * 0.9, 0, size * 0.7],
        [size * 0.85, 0, -size * 0.9],
        [-size * 0.95, 0, -size * 0.8]
    ];

    // Faces
    const faces = [
        [base[0], base[1], peak, rockGray],
        [base[1], base[2], peak, darkRock],
        [base[2], base[3], peak, rockGray],
        [base[3], base[0], peak, darkRock]
    ];

    faces.forEach(face => {
        const [v1, v2, v3, color] = face;
        const nx = 0.5, ny = 0.7, nz = 0;
        
        vertices.push(...v1, ...color, nx, ny, nz);
        vertices.push(...v2, ...color, nx, ny, nz);
        vertices.push(...v3, ...color, nx, ny, nz);
        
        indices.push(idx, idx + 1, idx + 2);
        idx += 3;
    });

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Create Flowers
function createFlower() {
    const vertices = [];
    const indices = [];
    
    const petalColors = [
        [0.95, 0.25, 0.35], // Red
        [0.95, 0.75, 0.25], // Yellow
        [0.85, 0.35, 0.85], // Purple
        [0.95, 0.55, 0.75], // Pink
        [0.25, 0.55, 0.95], // Blue
        [0.95, 0.45, 0.25]  // Orange
    ];
    
    const stemGreen = [0.25, 0.65, 0.25];
    const centerYellow = [0.95, 0.85, 0.25];
    
    let idx = 0;
    const petalColor = petalColors[Math.floor(Math.random() * petalColors.length)];

    // Stem
    const stemVerts = [
        [-0.02, 0, 0], [0.02, 0, 0],
        [0.02, 0.15, 0], [-0.02, 0.15, 0]
    ];
    stemVerts.forEach(v => {
        vertices.push(...v, ...stemGreen, 0, 0, 1);
    });
    indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
    idx += 4;

    // Petals (5 petals in circle)
    const petalCount = 5;
    const flowerY = 0.15;
    const petalSize = 0.08;
    
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const x = Math.cos(angle) * petalSize;
        const z = Math.sin(angle) * petalSize;
        
        vertices.push(0, flowerY, 0, ...petalColor, 0, 1, 0);
        vertices.push(x, flowerY, z, ...petalColor, 0, 1, 0);
        
        const nextAngle = ((i + 1) / petalCount) * Math.PI * 2;
        const nextX = Math.cos(nextAngle) * petalSize;
        const nextZ = Math.sin(nextAngle) * petalSize;
        vertices.push(nextX, flowerY, nextZ, ...petalColor, 0, 1, 0);
        
        indices.push(idx, idx + 1, idx + 2);
        idx += 3;
    }

    // Center
    const centerSize = 0.03;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * centerSize;
        const z = Math.sin(angle) * centerSize;
        vertices.push(x, flowerY + 0.01, z, ...centerYellow, 0, 1, 0);
    }
    
    for (let i = 0; i < 4; i++) {
        indices.push(idx, idx + i + 1, idx + i + 2);
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Create Grass Blades
function createGrassBlade() {
    const vertices = [];
    const indices = [];
    
    const grassGreen = [0.25, 0.75, 0.25];
    const darkGreen = [0.18, 0.62, 0.18];
    
    const height = 0.15;
    const width = 0.03;
    
    // Simple blade
    vertices.push(-width, 0, 0, ...darkGreen, 0, 0, 1);
    vertices.push(width, 0, 0, ...darkGreen, 0, 0, 1);
    vertices.push(0, height, 0, ...grassGreen, 0, 0, 1);
    
    indices.push(0, 1, 2);

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Create Firefly (glowing particle)
function createFirefly() {
    const vertices = [];
    const indices = [];
    
    const glowYellow = [0.98, 0.95, 0.45];
    const size = 0.08;

    // Small quad for firefly
    vertices.push(-size, -size, 0, ...glowYellow, 0, 0, 1);
    vertices.push(size, -size, 0, ...glowYellow, 0, 0, 1);
    vertices.push(size, size, 0, ...glowYellow, 0, 0, 1);
    vertices.push(-size, size, 0, ...glowYellow, 0, 0, 1);

    indices.push(0, 1, 2, 0, 2, 3);

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Create Bush
function createBush() {
    const vertices = [];
    const indices = [];
    
    const bushGreen = [0.20, 0.65, 0.20];
    const darkBush = [0.15, 0.55, 0.15];
    
    let idx = 0;
    
    // Multiple spherical sections for bushy appearance
    const sections = [
        { x: 0, y: 0.2, z: 0, r: 0.35 },
        { x: -0.15, y: 0.15, z: 0.1, r: 0.28 },
        { x: 0.15, y: 0.18, z: -0.1, r: 0.30 }
    ];
    
    sections.forEach((section, sIdx) => {
        const color = sIdx % 2 === 0 ? bushGreen : darkBush;
        const segments = 8;
        
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 1) / segments) * Math.PI * 2;
            
            const x1 = section.x + Math.cos(angle1) * section.r;
            const z1 = section.z + Math.sin(angle1) * section.r;
            const x2 = section.x + Math.cos(angle2) * section.r;
            const z2 = section.z + Math.sin(angle2) * section.r;
            
            // Bottom
            vertices.push(section.x, 0, section.z, ...color, 0, -1, 0);
            vertices.push(x1, 0, z1, ...color, 0, -1, 0);
            vertices.push(x2, 0, z2, ...color, 0, -1, 0);
            indices.push(idx, idx + 1, idx + 2);
            idx += 3;
            
            // Top
            vertices.push(section.x, section.y + section.r * 0.6, section.z, ...color, 0, 1, 0);
            vertices.push(x1, section.y, z1, ...color, 0, 1, 0);
            vertices.push(x2, section.y, z2, ...color, 0, 1, 0);
            indices.push(idx, idx + 2, idx + 1);
            idx += 3;
        }
    });

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// NEW: Create Mushroom
function createMushroom() {
    const vertices = [];
    const indices = [];
    
    const capRed = [0.85, 0.25, 0.25];
    const capSpots = [0.95, 0.95, 0.95];
    const stemWhite = [0.92, 0.90, 0.88];
    
    let idx = 0;
    
    // Stem (cylinder)
    const stemRadius = 0.06;
    const stemHeight = 0.12;
    const segments = 8;
    
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const nextAngle = ((i + 1) / segments) * Math.PI * 2;
        
        const x1 = stemRadius * Math.cos(angle);
        const z1 = stemRadius * Math.sin(angle);
        const x2 = stemRadius * Math.cos(nextAngle);
        const z2 = stemRadius * Math.sin(nextAngle);
        
        vertices.push(x1, 0, z1, ...stemWhite, Math.cos(angle), 0, Math.sin(angle));
        vertices.push(x1, stemHeight, z1, ...stemWhite, Math.cos(angle), 0, Math.sin(angle));
        vertices.push(x2, stemHeight, z2, ...stemWhite, Math.cos(nextAngle), 0, Math.sin(nextAngle));
        vertices.push(x2, 0, z2, ...stemWhite, Math.cos(nextAngle), 0, Math.sin(nextAngle));
        
        indices.push(idx, idx + 1, idx + 2);
        indices.push(idx, idx + 2, idx + 3);
        idx += 4;
    }
    
    // Cap (cone-like)
    const capRadius = 0.15;
    const capHeight = stemHeight + 0.10;
    
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const nextAngle = ((i + 1) / segments) * Math.PI * 2;
        
        const x1 = capRadius * Math.cos(angle);
        const z1 = capRadius * Math.sin(angle);
        const x2 = capRadius * Math.cos(nextAngle);
        const z2 = capRadius * Math.sin(nextAngle);
        
        vertices.push(x1, stemHeight, z1, ...capRed, 0, 0.7, 0.7);
        vertices.push(x2, stemHeight, z2, ...capRed, 0, 0.7, 0.7);
        vertices.push(0, capHeight, 0, ...capRed, 0, 0.7, 0.7);
        
        indices.push(idx, idx + 1, idx + 2);
        idx += 3;
    }
    
    // White spots on cap
    const spotPositions = [
        [0.08, stemHeight + 0.04, 0],
        [-0.06, stemHeight + 0.05, 0.05],
        [0.04, stemHeight + 0.06, -0.08]
    ];
    
    spotPositions.forEach(pos => {
        const spotSize = 0.025;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = pos[0] + spotSize * Math.cos(angle);
            const z = pos[2] + spotSize * Math.sin(angle);
            vertices.push(x, pos[1], z, ...capSpots, 0, 1, 0);
        }
        
        for (let i = 0; i < 4; i++) {
            indices.push(idx, idx + i + 1, idx + i + 2);
        }
        idx += 6;
    });
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// NEW: Create Butterfly
function createButterfly() {
    const vertices = [];
    const indices = [];
    
    const butterflyColors = [
        [0.95, 0.75, 0.25], // Yellow
        [0.85, 0.35, 0.85], // Purple
        [0.25, 0.75, 0.95], // Blue
        [0.95, 0.45, 0.65]  // Pink
    ];
    
    const wingColor = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
    const bodyBlack = [0.15, 0.15, 0.15];
    
    let idx = 0;
    
    // Body (small vertical line)
    vertices.push(0, 0, 0, ...bodyBlack, 0, 0, 1);
    vertices.push(0, 0.12, 0, ...bodyBlack, 0, 0, 1);
    vertices.push(0.01, 0.12, 0, ...bodyBlack, 0, 0, 1);
    vertices.push(0.01, 0, 0, ...bodyBlack, 0, 0, 1);
    
    indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
    idx += 4;
    
    // Left wing (upper)
    vertices.push(0, 0.08, 0, ...wingColor, 0, 0, 1);
    vertices.push(-0.15, 0.12, 0, ...wingColor, 0, 0, 1);
    vertices.push(-0.12, 0.04, 0, ...wingColor, 0, 0, 1);
    
    indices.push(idx, idx + 1, idx + 2);
    idx += 3;
    
    // Right wing (upper)
    vertices.push(0.01, 0.08, 0, ...wingColor, 0, 0, 1);
    vertices.push(0.13, 0.04, 0, ...wingColor, 0, 0, 1);
    vertices.push(0.16, 0.12, 0, ...wingColor, 0, 0, 1);
    
    indices.push(idx, idx + 1, idx + 2);
    idx += 3;
    
    // Left wing (lower)
    vertices.push(0, 0.04, 0, ...wingColor, 0, 0, 1);
    vertices.push(-0.10, 0, 0, ...wingColor, 0, 0, 1);
    vertices.push(-0.08, 0.06, 0, ...wingColor, 0, 0, 1);
    
    indices.push(idx, idx + 1, idx + 2);
    idx += 3;
    
    // Right wing (lower)
    vertices.push(0.01, 0.04, 0, ...wingColor, 0, 0, 1);
    vertices.push(0.09, 0.06, 0, ...wingColor, 0, 0, 1);
    vertices.push(0.11, 0, 0, ...wingColor, 0, 0, 1);
    
    indices.push(idx, idx + 1, idx + 2);
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// NEW: Create Cloud
function createCloud() {
    const vertices = [];
    const indices = [];
    
    const cloudWhite = [0.95, 0.95, 0.98];
    
    let idx = 0;
    
    // Cloud made of multiple overlapping spherical sections
    const sections = [
        { x: 0, y: 0, z: 0, r: 0.5 },
        { x: -0.4, y: 0.1, z: 0, r: 0.4 },
        { x: 0.4, y: 0.05, z: 0, r: 0.45 },
        { x: 0.2, y: 0.2, z: 0, r: 0.35 },
        { x: -0.2, y: 0.15, z: 0, r: 0.38 }
    ];
    
    sections.forEach(section => {
        const segments = 8;
        
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 1) / segments) * Math.PI * 2;
            
            const x1 = section.x + Math.cos(angle1) * section.r;
            const y1 = section.y;
            const z1 = section.z + Math.sin(angle1) * section.r;
            
            const x2 = section.x + Math.cos(angle2) * section.r;
            const y2 = section.y;
            const z2 = section.z + Math.sin(angle2) * section.r;
            
            const topY = section.y + section.r * 0.4;
            
            // Front face
            vertices.push(section.x, topY, section.z, ...cloudWhite, 0, 0.7, 0.7);
            vertices.push(x1, y1, z1, ...cloudWhite, 0, 0.7, 0.7);
            vertices.push(x2, y2, z2, ...cloudWhite, 0, 0.7, 0.7);
            
            indices.push(idx, idx + 2, idx + 1);
            idx += 3;
        }
    });
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// NEW: Create Fern/Plant
function createFern() {
    const vertices = [];
    const indices = [];
    
    const fernGreen = [0.18, 0.68, 0.25];
    const darkFern = [0.12, 0.58, 0.18];
    
    let idx = 0;
    
    // Main stem
    vertices.push(0, 0, 0, ...darkFern, 0, 0, 1);
    vertices.push(0.01, 0, 0, ...darkFern, 0, 0, 1);
    vertices.push(0.01, 0.35, 0, ...darkFern, 0, 0, 1);
    vertices.push(0, 0.35, 0, ...darkFern, 0, 0, 1);
    
    indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
    idx += 4;
    
    // Leaves (fronds)
    const leafCount = 5;
    for (let i = 0; i < leafCount; i++) {
        const y = 0.08 + i * 0.06;
        const leafLength = 0.12 - i * 0.02;
        const side = i % 2 === 0 ? -1 : 1;
        
        // Left side of leaf
        vertices.push(0, y, 0, ...fernGreen, 0, 0.7, 0.7);
        vertices.push(side * leafLength, y + 0.04, 0, ...fernGreen, 0, 0.7, 0.7);
        vertices.push(side * leafLength * 0.7, y + 0.08, 0, ...darkFern, 0, 0.7, 0.7);
        
        indices.push(idx, idx + 1, idx + 2);
        idx += 3;
    }
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// NEW: Create Vine/Ivy on tree
function createVine() {
    const vertices = [];
    const indices = [];
    
    const vineGreen = [0.22, 0.62, 0.25];
    const leafGreen = [0.28, 0.68, 0.30];
    
    let idx = 0;
    
    // Vine stem (wavy line)
    const segments = 10;
    const vineHeight = 1.2;
    
    for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const y = t * vineHeight;
        const x = Math.sin(t * Math.PI * 3) * 0.08;
        const nextT = (i + 1) / segments;
        const nextY = nextT * vineHeight;
        const nextX = Math.sin(nextT * Math.PI * 3) * 0.08;
        
        vertices.push(x, y, 0, ...vineGreen, 0, 0, 1);
        vertices.push(x + 0.02, y, 0, ...vineGreen, 0, 0, 1);
        vertices.push(nextX + 0.02, nextY, 0, ...vineGreen, 0, 0, 1);
        vertices.push(nextX, nextY, 0, ...vineGreen, 0, 0, 1);
        
        indices.push(idx, idx + 1, idx + 2);
        indices.push(idx, idx + 2, idx + 3);
        idx += 4;
        
        // Add small leaves every other segment
        if (i % 2 === 0) {
            const leafX = x;
            const leafY = y;
            const leafSize = 0.06;
            
            vertices.push(leafX, leafY, 0, ...leafGreen, 0, 0, 1);
            vertices.push(leafX - leafSize, leafY + leafSize * 0.5, 0, ...leafGreen, 0, 0, 1);
            vertices.push(leafX - leafSize * 0.5, leafY + leafSize, 0, ...leafGreen, 0, 0, 1);
            
            indices.push(idx, idx + 1, idx + 2);
            idx += 3;
        }
    }
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}
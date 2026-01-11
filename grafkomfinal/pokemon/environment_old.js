// Enhanced Environment object generators for Pokemon scene

// Create Enhanced Ground Platform with grass texture and flowers
function createGroundPlane() {
    const width = 105;  // 3x lipat (35 * 3)
    const height = 0.4;
    const depth = 105;  // 3x lipat (35 * 3)

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

// ==================== EXACT COPY FROM pohon_cemara.html ====================
// Helper function to convert pohon_cemara format to Pokemon format
function convertGeometryToPokemonFormat(geom, barkColor, foliageColor) {
    const pokemonVertices = [];
    const vertexCount = geom.vertices.length / 3;

    for (let i = 0; i < vertexCount; i++) {
        const vIdx = i * 3;
        const nIdx = i * 3;
        const mIdx = i;

        // Position
        pokemonVertices.push(
            geom.vertices[vIdx],
            geom.vertices[vIdx + 1],
            geom.vertices[vIdx + 2]
        );

        // Color (based on materialType: 0=bark, 1=foliage)
        const materialType = geom.materialTypes[mIdx];
        if (materialType < 0.5) {
            // Bark
            pokemonVertices.push(...barkColor);
        } else {
            // Foliage
            pokemonVertices.push(...foliageColor);
        }

        // Normal
        pokemonVertices.push(
            geom.normals[nIdx],
            geom.normals[nIdx + 1],
            geom.normals[nIdx + 2]
        );
    }

    return {
        vertices: new Float32Array(pokemonVertices),
        indices: new Uint16Array(geom.indices)
    };
}

// EXACT COPY: GeometryBuilder.createTrunk
function createTrunk(height = 8, radiusBottom = 0.5, radiusTop = 0.3, segments = 12) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const windWeights = [];
    const materialTypes = [];
    const indices = [];

    // Generate vertices with more height segments for better detail
    const heightSegments = 8;
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        const u = i / segments;

        for (let j = 0; j <= heightSegments; j++) {
            const t = j / heightSegments;
            const y = t * height;
            const radius = radiusBottom + (radiusTop - radiusBottom) * t;

            // Add slight random variation for bark roughness
            const barkVariation = Math.sin(theta * 7.0 + t * 13.0) * 0.02;
            const r = radius + barkVariation;

            vertices.push(
                r * cosTheta,
                y,
                r * sinTheta
            );

            normals.push(cosTheta, 0, sinTheta);
            texCoords.push(u, t * 2.0);
            windWeights.push(t * t);
            materialTypes.push(0.0); // 0 = bark/trunk
        }
    }

    // Generate indices
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < heightSegments; j++) {
            const base = i * (heightSegments + 1) + j;
            const next = (i + 1) * (heightSegments + 1) + j;
            indices.push(
                base, base + 1, next,
                base + 1, next + 1, next
            );
        }
    }

    return { vertices, normals, texCoords, windWeights, materialTypes, indices };
}

// EXACT COPY: GeometryBuilder.createConeLayer
function createConeLayer(radius, height, yOffset, segments = 8) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const windWeights = [];
    const materialTypes = [];
    const indices = [];

    const baseIndex = 0;

    // Center top vertex
    vertices.push(0, yOffset + height, 0);
    normals.push(0, 1, 0);
    texCoords.push(0.5, 1);
    windWeights.push(1.0);
    materialTypes.push(1.0); // 1 = foliage

    // Bottom circle
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);

        vertices.push(x, yOffset, z);

        const nx = Math.cos(theta);
        const nz = Math.sin(theta);
        normals.push(nx, 0.5, nz);

        texCoords.push(i / segments, 0);
        windWeights.push(0.8);
        materialTypes.push(1.0); // 1 = foliage
    }

    // Generate triangles
    for (let i = 0; i < segments; i++) {
        indices.push(0, i + 2, i + 1);
    }

    return { vertices, normals, texCoords, windWeights, materialTypes, indices };
}

// EXACT COPY: GeometryBuilder.createNeedleCluster
function createNeedleCluster(size = 0.5) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const windWeights = [];
    const materialTypes = [];
    const indices = [];

    const needleCount = 8;
    const needleLength = size * 2;
    const needleWidth = size * 0.15;

    for (let i = 0; i < needleCount; i++) {
        const angle = (i / needleCount) * Math.PI * 2;
        const tilt = Math.random() * 0.3 + 0.5;

        const dx = Math.cos(angle) * tilt;
        const dz = Math.sin(angle) * tilt;

        const baseIdx = vertices.length / 3;

        const perpX = -Math.sin(angle) * needleWidth;
        const perpZ = Math.cos(angle) * needleWidth;

        vertices.push(
            perpX * 0.5, 0, perpZ * 0.5,
            -perpX * 0.5, 0, -perpZ * 0.5,
            dx * needleLength - perpX * 0.5, needleLength, dz * needleLength - perpZ * 0.5,
            dx * needleLength + perpX * 0.5, needleLength, dz * needleLength + perpZ * 0.5
        );

        const nx = Math.cos(angle);
        const nz = Math.sin(angle);
        for (let j = 0; j < 4; j++) {
            normals.push(nx, 0.3, nz);
            materialTypes.push(1.0);
        }

        texCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
        windWeights.push(0.2, 0.2, 1.0, 1.0);

        indices.push(
            baseIdx + 0, baseIdx + 1, baseIdx + 2,
            baseIdx + 0, baseIdx + 2, baseIdx + 3
        );
    }

    return { vertices, normals, texCoords, windWeights, materialTypes, indices };
}

// EXACT COPY: GeometryBuilder.combineGeometries
function combineGeometries(geometries) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const windWeights = [];
    const materialTypes = [];
    const indices = [];

    let vertexOffset = 0;

    for (const geom of geometries) {
        vertices.push(...geom.vertices);
        normals.push(...geom.normals);
        texCoords.push(...geom.texCoords);
        windWeights.push(...geom.windWeights);
        materialTypes.push(...geom.materialTypes);

        for (const idx of geom.indices) {
            indices.push(idx + vertexOffset);
        }

        vertexOffset += geom.vertices.length / 3;
    }

    return { vertices, normals, texCoords, windWeights, materialTypes, indices };
}

// EXACT COPY: PineTree.generate() with detail level 2 (medium)
function createPineTree() {
    const geoms = [];

    // Use medium detail level
    const trunkSegments = 12;
    const layerCount = 8;
    const layerSegments = 12;
    const clusterCount = 60;

    // Create trunk
    geoms.push(createTrunk(8, 0.5, 0.3, trunkSegments));

    // Create cone layers
    for (let i = 0; i < layerCount; i++) {
        const t = i / (layerCount - 1);
        const radius = 3.5 - t * 2.5;
        const height = 1.5 - t * 0.2;
        const yOffset = 2 + i * 0.7;
        geoms.push(createConeLayer(radius, height, yOffset, layerSegments));
    }

    // Add needle clusters - distributed in spiral pattern
    for (let i = 0; i < clusterCount; i++) {
        const t = i / clusterCount;
        const cluster = createNeedleCluster(0.25 + Math.random() * 0.15);

        // Spiral distribution
        const spiralTurns = 5;
        const angle = t * Math.PI * 2 * spiralTurns + Math.random() * 0.3;
        const heightFactor = Math.pow(t, 0.8);
        const yPos = 2 + heightFactor * (layerCount * 0.7);

        // Radius decreases with height
        const baseRadius = 3.0 - heightFactor * 2.2;
        const radius = baseRadius + (Math.random() - 0.5) * 0.6;

        // Offset cluster
        for (let j = 0; j < cluster.vertices.length; j += 3) {
            cluster.vertices[j] += Math.cos(angle) * radius;
            cluster.vertices[j + 1] += yPos;
            cluster.vertices[j + 2] += Math.sin(angle) * radius;
        }
        geoms.push(cluster);
    }

    const combinedGeom = combineGeometries(geoms);

    // Convert to Pokemon format
    const barkColor = [0.42, 0.28, 0.12];
    const pineGreen = [0.10, 0.35, 0.15];

    return convertGeometryToPokemonFormat(combinedGeom, barkColor, pineGreen);
}

// EXACT COPY: MapleTree.createBranch
function createMapleBranch(angle, yStart, radiusStart, radiusEnd) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const windWeights = [];
    const materialTypes = [];
    const indices = [];

    const segments = 6;
    const branchLength = 2.5 + Math.random() * 0.5;
    const upwardAngle = 0.3 + Math.random() * 0.3;

    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const radius = radiusStart + (radiusEnd - radiusStart) * t;

        const dist = t * branchLength;
        const x = dirX * dist;
        const y = yStart + dist * Math.tan(upwardAngle);
        const z = dirZ * dist;

        const ringSegments = 6;
        for (let j = 0; j <= ringSegments; j++) {
            const theta = (j / ringSegments) * Math.PI * 2;
            const cx = Math.cos(theta) * radius;
            const cy = Math.sin(theta) * radius;

            vertices.push(
                x + cx * Math.cos(angle) - cy * Math.sin(angle),
                y + cy,
                z + cx * Math.sin(angle) + cy * Math.cos(angle)
            );

            normals.push(Math.cos(theta), Math.sin(theta), 0);
            texCoords.push(j / ringSegments, t);
            windWeights.push(t * t);
            materialTypes.push(0.0);
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < 6; j++) {
            const base = i * 7 + j;
            const next = base + 7;
            indices.push(base, next, base + 1);
            indices.push(base + 1, next, next + 1);
        }
    }

    return { vertices, normals, texCoords, windWeights, materialTypes, indices };
}

// EXACT COPY: GeometryBuilder.createMapleLeafCluster - TRUE CROSS QUAD (X shape)
function createMapleLeafCluster(size = 0.5) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const windWeights = [];
    const materialTypes = [];
    const indices = [];

    const leafCount = 12;

    for (let i = 0; i < leafCount; i++) {
        const angle = (i / leafCount) * Math.PI * 2 + Math.random() * 0.8;
        const tilt = Math.random() * 0.6 + 0.4;
        const elevation = (Math.random() - 0.5) * 0.4;

        const leafWidth = size * (1.0 + Math.random() * 0.5);
        const leafHeight = size * (1.2 + Math.random() * 0.6);

        const dx = Math.cos(angle) * tilt * 0.4;
        const dy = elevation;
        const dz = Math.sin(angle) * tilt * 0.4;

        const rotAngle = Math.random() * Math.PI * 0.3;
        const cosRot = Math.cos(rotAngle);
        const sinRot = Math.sin(rotAngle);

        // Normal untuk quad pertama
        const nx = Math.cos(angle) * 0.3;
        const ny = 0.85;
        const nz = Math.sin(angle) * 0.3;
        const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz);
        const normalX = nx / nlen;
        const normalY = ny / nlen;
        const normalZ = nz / nlen;

        const corners = [
            [-leafWidth * 0.5, -leafHeight * 0.2],
            [leafWidth * 0.5, -leafHeight * 0.2],
            [leafWidth * 0.5, leafHeight * 0.8],
            [-leafWidth * 0.5, leafHeight * 0.8]
        ];

        const windWeight = 0.6 + Math.random() * 0.4;

        // ===== QUAD PERTAMA (plane di sumbu XY, normal ke Z) =====
        const baseIdx = vertices.length / 3;

        for (let c of corners) {
            const rx = c[0] * cosRot - c[1] * sinRot;
            const ry = c[0] * sinRot + c[1] * cosRot;
            vertices.push(dx + rx, dy + ry, dz);
        }

        for (let j = 0; j < 4; j++) {
            normals.push(normalX, normalY, normalZ);
            materialTypes.push(1.0);
        }

        texCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
        windWeights.push(windWeight * 0.5, windWeight * 0.5, windWeight, windWeight);

        indices.push(
            baseIdx, baseIdx + 1, baseIdx + 2,
            baseIdx, baseIdx + 2, baseIdx + 3
        );

        // ===== QUAD KEDUA (plane di sumbu YZ, normal ke X) - ROTASI 90° =====
        const crossBaseIdx = vertices.length / 3;

        // Untuk quad kedua, tukar X dengan Z coordinate
        for (let c of corners) {
            const rx = c[0] * cosRot - c[1] * sinRot;
            const ry = c[0] * sinRot + c[1] * cosRot;
            // SWAP: X menjadi Z, Z menjadi X (rotasi 90° around Y axis)
            vertices.push(dx + dz, dy + ry, dz + rx);  // Swap rx ke Z, dz ke offset X
        }

        // Normal juga dirotasi 90°
        for (let j = 0; j < 4; j++) {
            normals.push(-normalZ, normalY, normalX);  // Rotasi normal 90° around Y
            materialTypes.push(1.0);
        }

        texCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
        windWeights.push(windWeight * 0.5, windWeight * 0.5, windWeight, windWeight);

        indices.push(
            crossBaseIdx, crossBaseIdx + 1, crossBaseIdx + 2,
            crossBaseIdx, crossBaseIdx + 2, crossBaseIdx + 3
        );
    }

    return { vertices, normals, texCoords, windWeights, materialTypes, indices };
}

// EXACT COPY: MapleTree.generate() with detail level 2 (medium)
function createMapleTree(colorVariant = 'green') {
    const geoms = [];

    // Use medium detail level
    const trunkSegments = 12;
    const branchCount = 6;
    const leafClusters = 200;

    // Create trunk - taller and thinner than pine
    geoms.push(createTrunk(7, 0.4, 0.25, trunkSegments));

    // Create main branches spreading outward
    for (let i = 0; i < branchCount; i++) {
        const angle = (i / branchCount) * Math.PI * 2;
        const heightStart = 2 + Math.random() * 2;
        const branch = createMapleBranch(angle, heightStart, 0.2, 0.05);
        geoms.push(branch);
    }

    // Create spherical foliage clusters (maple crown is round/spreading)
    for (let i = 0; i < leafClusters; i++) {
        const cluster = createMapleLeafCluster(0.4 + Math.random() * 0.3);

        const t = i / leafClusters;

        // Use fibonacci sphere for better distribution
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const phi = Math.acos(1 - 2 * t);
        const theta = 2 * Math.PI * i / goldenRatio;

        // Crown center and size - larger crown
        const crownCenterY = 5.5;
        const crownRadius = 3.5 + Math.random() * 1.2;

        const noise = (Math.random() - 0.5) * 0.5;
        const r = crownRadius + noise;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = crownCenterY + r * Math.cos(phi) * 0.6;
        const z = r * Math.sin(phi) * Math.sin(theta);

        // Offset cluster
        for (let j = 0; j < cluster.vertices.length; j += 3) {
            cluster.vertices[j] += x;
            cluster.vertices[j + 1] += y;
            cluster.vertices[j + 2] += z;
        }
        geoms.push(cluster);
    }

    const combinedGeom = combineGeometries(geoms);

    // Convert to Pokemon format with color variant
    const barkColor = [0.42, 0.28, 0.12];
    let foliageColor;

    if (colorVariant === 'green') {
        foliageColor = [0.20, 0.60, 0.20]; // Summer green
    } else if (colorVariant === 'orange') {
        foliageColor = [0.90, 0.45, 0.12]; // Early autumn orange
    } else { // 'red'
        foliageColor = [0.65, 0.15, 0.12]; // Late autumn deep red
    }

    return convertGeometryToPokemonFormat(combinedGeom, barkColor, foliageColor);
}

// Keep old createTree for backward compatibility (now uses pine tree)
function createTree() {
    return createPineTree();
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
        [0.95, 0.55, 0.75]  // Pink
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

// Create Cliff Wall (Tebing) - Pokemon-style cliff with rock texture
function createCliffWall(width = 10, height = 15, depth = 2) {
    const vertices = [];
    const indices = [];

    // Rock colors - layered like real cliffs
    const rockBase = [0.45, 0.42, 0.40];      // Base gray-brown
    const rockMid = [0.52, 0.48, 0.45];       // Mid gray
    const rockDark = [0.38, 0.35, 0.33];      // Dark cracks
    const rockLight = [0.58, 0.55, 0.52];     // Light highlights
    const mossGreen = [0.28, 0.45, 0.25];     // Moss on cliff

    let idx = 0;

    // Front face - tall cliff wall with texture variation
    const segmentsX = 15;  // Horizontal segments for texture detail
    const segmentsY = 10;  // Vertical segments for height variation

    for (let i = 0; i < segmentsY; i++) {
        for (let j = 0; j < segmentsX; j++) {
            const x1 = -width / 2 + (j / segmentsX) * width;
            const x2 = -width / 2 + ((j + 1) / segmentsX) * width;
            const y1 = (i / segmentsY) * height;
            const y2 = ((i + 1) / segmentsY) * height;

            // Add variation to cliff surface (bumps and cracks)
            const noise1 = Math.sin(x1 * 0.8 + y1 * 0.5) * 0.15;
            const noise2 = Math.sin(x2 * 0.8 + y1 * 0.5) * 0.15;
            const noise3 = Math.sin(x2 * 0.8 + y2 * 0.5) * 0.15;
            const noise4 = Math.sin(x1 * 0.8 + y2 * 0.5) * 0.15;

            const z1 = noise1;
            const z2 = noise2;
            const z3 = noise3;
            const z4 = noise4;

            // Color variation based on height and position
            let color;
            const heightRatio = y1 / height;
            const randomVal = (Math.sin(x1 * 3.5 + y1 * 2.7) + 1) / 2;

            if (heightRatio > 0.8 && randomVal > 0.6) {
                color = mossGreen; // Moss at top
            } else if (randomVal < 0.3) {
                color = rockDark; // Dark cracks
            } else if (randomVal > 0.7) {
                color = rockLight; // Light highlights
            } else if (heightRatio < 0.3) {
                color = rockMid; // Mid tone at bottom
            } else {
                color = rockBase; // Base color
            }

            // Normal pointing outward
            const nx = 0;
            const ny = 0;
            const nz = 1;

            // Create quad
            vertices.push(x1, y1, z1, ...color, nx, ny, nz);
            vertices.push(x2, y1, z2, ...color, nx, ny, nz);
            vertices.push(x2, y2, z3, ...color, nx, ny, nz);
            vertices.push(x1, y2, z4, ...color, nx, ny, nz);

            indices.push(idx, idx + 1, idx + 2);
            indices.push(idx, idx + 2, idx + 3);
            idx += 4;
        }
    }

    // Top edge - flatten top
    const topColor = mossGreen;
    vertices.push(-width / 2, height, 0, ...topColor, 0, 1, 0);
    vertices.push(width / 2, height, 0, ...topColor, 0, 1, 0);
    vertices.push(width / 2, height, -depth, ...topColor, 0, 1, 0);
    vertices.push(-width / 2, height, -depth, ...topColor, 0, 1, 0);
    indices.push(idx, idx + 1, idx + 2);
    indices.push(idx, idx + 2, idx + 3);
    idx += 4;

    // Back face (darker)
    vertices.push(width / 2, 0, -depth, ...rockDark, 0, 0, -1);
    vertices.push(-width / 2, 0, -depth, ...rockDark, 0, 0, -1);
    vertices.push(-width / 2, height, -depth, ...rockDark, 0, 0, -1);
    vertices.push(width / 2, height, -depth, ...rockDark, 0, 0, -1);
    indices.push(idx, idx + 1, idx + 2);
    indices.push(idx, idx + 2, idx + 3);

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}
// Enhanced Environment object generators for Pokemon scene

// ==================== PERLIN NOISE IMPLEMENTATION ====================
// Perlin Noise for natural terrain height generation
class PerlinNoise {
    constructor(seed = 12345) {
        this.seed = seed;
        this.perm = this.generatePermutation();
    }

    generatePermutation() {
        const p = [];
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }
        // Fisher-Yates shuffle with seed
        let rand = this.seed;
        for (let i = 255; i > 0; i--) {
            rand = (rand * 9301 + 49297) % 233280;
            const j = Math.floor((rand / 233280) * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        // Duplicate to avoid overflow
        return [...p, ...p];
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        const u = this.fade(x);
        const v = this.fade(y);

        const a = this.perm[X] + Y;
        const aa = this.perm[a];
        const ab = this.perm[a + 1];
        const b = this.perm[X + 1] + Y;
        const ba = this.perm[b];
        const bb = this.perm[b + 1];

        return this.lerp(v,
            this.lerp(u, this.grad(this.perm[aa], x, y), this.grad(this.perm[ba], x - 1, y)),
            this.lerp(u, this.grad(this.perm[ab], x, y - 1), this.grad(this.perm[bb], x - 1, y - 1))
        );
    }

    // Octave noise for more natural terrain
    octaveNoise(x, y, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }
}

// Create 3D Terrain with Natural Irregularities using Perlin Noise
function createGroundPlane() {
    const width = 315;  // 3x lipat (105 * 3)
    const depth = 315;  // 3x lipat (105 * 3)
    const resolution = 128; // Grid resolution (128x128 vertices untuk detail tinggi)

    // Perlin noise generator
    const perlin = new PerlinNoise(42);

    // Terrain parameters
    const amplitude = 2.5;  // Height variation amplitude
    const frequency = 0.08; // Noise frequency (lower = smoother)

    // Colors - Gradasi cokelat untuk tanah, hijau untuk rumput
    const soilDark = [0.36, 0.25, 0.13];     // #5E3B20 - Dark brown soil
    const soilLight = [0.48, 0.31, 0.17];    // #7B4F2B - Light brown soil
    const grassGreen = [0.24, 0.62, 0.24];   // #3C9E3C - Grass green
    const grassDark = [0.18, 0.50, 0.18];    // Darker grass for variation

    const vertices = [];
    const indices = [];

    const stepX = width / resolution;
    const stepZ = depth / resolution;

    // Generate height map using Perlin noise
    const heightMap = [];
    for (let i = 0; i <= resolution; i++) {
        heightMap[i] = [];
        for (let j = 0; j <= resolution; j++) {
            const x = -width / 2 + j * stepX;
            const z = -depth / 2 + i * stepZ;

            // Generate height using octave Perlin noise
            const noiseValue = perlin.octaveNoise(x * frequency, z * frequency, 4, 0.5);
            const height = noiseValue * amplitude;

            heightMap[i][j] = height;
        }
    }

    // Generate vertices with smooth normals
    for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
            const x = -width / 2 + j * stepX;
            const z = -depth / 2 + i * stepZ;
            const y = heightMap[i][j];

            // Calculate smooth normal using surrounding heights
            let nx = 0, ny = 1, nz = 0;

            if (i > 0 && i < resolution && j > 0 && j < resolution) {
                // Central difference for smooth normals
                const hL = heightMap[i][j - 1];
                const hR = heightMap[i][j + 1];
                const hD = heightMap[i - 1][j];
                const hU = heightMap[i + 1][j];

                nx = (hL - hR) / (2 * stepX);
                nz = (hD - hU) / (2 * stepZ);
                ny = 1.0;

                // Normalize
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                nx /= len;
                ny /= len;
                nz /= len;
            }

            // Color blending based on height (smoothstep for grass layer)
            // Grass appears on higher elevations
            const heightRatio = (y + amplitude) / (amplitude * 2); // Normalize to 0-1
            const grassFactor = Math.max(0, Math.min(1, (heightRatio - 0.3) / 0.4)); // smoothstep(0.3, 0.7)
            const smoothGrass = grassFactor * grassFactor * (3 - 2 * grassFactor); // Smoothstep formula

            // Blend soil and grass colors
            let baseColor = soilLight;
            if (heightRatio < 0.4) {
                baseColor = soilDark; // Lower areas = darker soil
            }

            // Final color with grass overlay
            const finalColor = [
                baseColor[0] * (1 - smoothGrass) + grassGreen[0] * smoothGrass,
                baseColor[1] * (1 - smoothGrass) + grassGreen[1] * smoothGrass,
                baseColor[2] * (1 - smoothGrass) + grassGreen[2] * smoothGrass
            ];

            // Add subtle color variation
            const variation = (Math.sin(x * 0.5 + z * 0.3) + 1) * 0.5 * 0.1;
            finalColor[0] = Math.min(1, finalColor[0] + variation);
            finalColor[1] = Math.min(1, finalColor[1] + variation);
            finalColor[2] = Math.min(1, finalColor[2] + variation);

            // Push vertex: position (3) + color (3) + normal (3)
            vertices.push(
                x, y, z,           // Position
                ...finalColor,     // Color
                nx, ny, nz         // Normal
            );
        }
    }

    // Generate indices for triangles
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            const topLeft = i * (resolution + 1) + j;
            const topRight = topLeft + 1;
            const bottomLeft = (i + 1) * (resolution + 1) + j;
            const bottomRight = bottomLeft + 1;

            // Two triangles per quad
            indices.push(topLeft, bottomLeft, topRight);
            indices.push(topRight, bottomLeft, bottomRight);
        }
    }

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

// Create Cliff Wall (Tebing) - NATURAL TERRAIN-STYLE with 3D Perlin displacement (NOT Minecraft grid!)
function createCliffWall(width = 10, height = 15, depth = 2) {
    const vertices = [];
    const indices = [];

    // Pokemon-style cliff colors - vertical gradient (dark brown bottom → white/light middle → brown top)
    const darkBrown = [0.32, 0.22, 0.15];     // Dark brown bottom (shadows)
    const brownBase = [0.48, 0.35, 0.25];     // Base brown
    const lightBrown = [0.62, 0.52, 0.42];    // Light brown
    const rockWhite = [0.85, 0.82, 0.78];     // White/cream rock (middle highlight)
    const brownTop = [0.55, 0.42, 0.32];      // Brown top

    // Use Perlin noise for FULL 3D terrain-style displacement
    const perlin = new PerlinNoise(123);

    // High resolution for smooth terrain
    const resX = 60;  // High resolution
    const resY = 40;

    // STEP 1: Generate height map for ALL vertices (like terrain generation)
    const heightMap = [];
    for (let i = 0; i <= resY; i++) {
        heightMap[i] = [];
        for (let j = 0; j <= resX; j++) {
            const u = j / resX;
            const v = i / resY;

            // Base position
            const x = -width / 2 + u * width;
            const y = v * height;

            // MULTI-FREQUENCY PERLIN NOISE (like terrain)
            // Large features
            const largeFeat = perlin.octaveNoise(x * 0.02, y * 0.02, 2, 0.5) * 4.0;
            // Medium features
            const medFeat = perlin.octaveNoise(x * 0.08, y * 0.08, 3, 0.5) * 2.0;
            // Small details
            const smallFeat = perlin.octaveNoise(x * 0.2, y * 0.15, 2, 0.5) * 0.5;

            // Combine for natural rock surface
            const zDisplacement = largeFeat + medFeat + smallFeat;

            // ALSO add X and Y displacement for organic look (not just Z!)
            const xDisp = perlin.octaveNoise(x * 0.05, y * 0.05, 2, 0.5) * 1.5;
            const yDisp = perlin.octaveNoise(x * 0.05, y * 0.05 + 100, 2, 0.5) * 0.8;  // Less Y variation

            heightMap[i][j] = {
                x: x + xDisp,
                y: y + yDisp,
                z: zDisplacement,
                baseX: x,
                baseY: y
            };
        }
    }

    // STEP 2: Generate vertices with smooth normals (like terrain)
    for (let i = 0; i <= resY; i++) {
        for (let j = 0; j <= resX; j++) {
            const pos = heightMap[i][j];

            // Calculate smooth normal from neighbors (like terrain normal calculation)
            let nx = 0, ny = 0, nz = 1;

            if (i > 0 && i < resY && j > 0 && j < resX) {
                const left = heightMap[i][j - 1];
                const right = heightMap[i][j + 1];
                const down = heightMap[i - 1][j];
                const up = heightMap[i + 1][j];

                // Central difference for smooth normals
                nx = (left.z - right.z) * 0.3;
                ny = (down.z - up.z) * 0.3;
                nz = 1.0;

                // Normalize
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                nx /= len;
                ny /= len;
                nz /= len;
            }

            // Color based on height (Pokemon vertical gradient)
            const heightRatio = pos.baseY / height;
            let baseColor;

            if (heightRatio < 0.25) {
                const blend = heightRatio / 0.25;
                baseColor = [
                    darkBrown[0] * (1 - blend) + brownBase[0] * blend,
                    darkBrown[1] * (1 - blend) + brownBase[1] * blend,
                    darkBrown[2] * (1 - blend) + brownBase[2] * blend
                ];
            } else if (heightRatio < 0.5) {
                const blend = (heightRatio - 0.25) / 0.25;
                baseColor = [
                    brownBase[0] * (1 - blend) + rockWhite[0] * blend,
                    brownBase[1] * (1 - blend) + rockWhite[1] * blend,
                    brownBase[2] * (1 - blend) + rockWhite[2] * blend
                ];
            } else if (heightRatio < 0.75) {
                const blend = (heightRatio - 0.5) / 0.25;
                baseColor = [
                    rockWhite[0] * (1 - blend) + lightBrown[0] * blend,
                    rockWhite[1] * (1 - blend) + lightBrown[1] * blend,
                    rockWhite[2] * (1 - blend) + lightBrown[2] * blend
                ];
            } else {
                const blend = (heightRatio - 0.75) / 0.25;
                baseColor = [
                    lightBrown[0] * (1 - blend) + brownTop[0] * blend,
                    lightBrown[1] * (1 - blend) + brownTop[1] * blend,
                    lightBrown[2] * (1 - blend) + brownTop[2] * blend
                ];
            }

            // Add detail noise variation (strong variation for natural look)
            const detailNoise = perlin.octaveNoise(pos.baseX * 0.15, pos.baseY * 0.12, 2, 0.5);
            const variation = detailNoise * 0.25;  // 25% variation for organic look

            const finalColor = [
                Math.max(0, Math.min(1.0, baseColor[0] * (1 + variation))),
                Math.max(0, Math.min(1.0, baseColor[1] * (1 + variation))),
                Math.max(0, Math.min(1.0, baseColor[2] * (1 + variation)))
            ];

            // Push vertex: position (3) + color (3) + normal (3)
            vertices.push(
                pos.x, pos.y, pos.z,
                ...finalColor,
                nx, ny, nz
            );
        }
    }

    // STEP 3: Generate indices for triangles
    let idx = 0;
    for (let i = 0; i < resY; i++) {
        for (let j = 0; j < resX; j++) {
            const topLeft = i * (resX + 1) + j;
            const topRight = topLeft + 1;
            const bottomLeft = (i + 1) * (resX + 1) + j;
            const bottomRight = bottomLeft + 1;

            // Two triangles per quad
            indices.push(topLeft, bottomLeft, topRight);
            indices.push(topRight, bottomLeft, bottomRight);
        }
    }

    // Top edge - grass/brown top
    const topColor = [0.48, 0.62, 0.35]; // Grassy brown-green mix
    vertices.push(-width / 2, height, 0, ...topColor, 0, 1, 0);
    vertices.push(width / 2, height, 0, ...topColor, 0, 1, 0);
    vertices.push(width / 2, height, -depth, ...topColor, 0, 1, 0);
    vertices.push(-width / 2, height, -depth, ...topColor, 0, 1, 0);
    indices.push(idx, idx + 1, idx + 2);
    indices.push(idx, idx + 2, idx + 3);
    idx += 4;

    // Back face (darker with gradient)
    vertices.push(width / 2, 0, -depth, ...darkBrown, 0, 0, -1);
    vertices.push(-width / 2, 0, -depth, ...darkBrown, 0, 0, -1);
    vertices.push(-width / 2, height, -depth, ...brownTop, 0, 0, -1);
    vertices.push(width / 2, height, -depth, ...brownTop, 0, 0, -1);
    indices.push(idx, idx + 1, idx + 2);
    indices.push(idx, idx + 2, idx + 3);

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}
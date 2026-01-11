// Helper function to calculate normals for a vertex
function calculateNormal(x, y, z) {
    const length = Math.sqrt(x * x + y * y + z * z);
    if (length === 0) return [0, 1, 0];
    return [x / length, y / length, z / length];
}

// Generator untuk Ellipsoid dengan normals
function generateEllipsoid(rx = 1, ry = 1, rz = 1, stacks = 20, slices = 20, color = [1.0, 1.0, 1.0]) {
    let vertices = [];
    let indices = [];

    const rCol = color[0] ?? 1.0;
    const gCol = color[1] ?? 1.0;
    const bCol = color[2] ?? 1.0;

    // Generate vertices with normals
    for (let i = 0; i <= stacks; i++) {
        let theta = i * Math.PI / stacks;
        let sinTheta = Math.sin(theta);
        let cosTheta = Math.cos(theta);

        for (let j = 0; j <= slices; j++) {
            let phi = j * 2 * Math.PI / slices;
            let sinPhi = Math.sin(phi);
            let cosPhi = Math.cos(phi);

            // Position
            let x = rx * sinTheta * cosPhi;
            let y = ry * cosTheta;
            let z = rz * sinTheta * sinPhi;

            // Normal (for ellipsoid, normal is position normalized but adjusted for radii)
            let nx = sinTheta * cosPhi;
            let ny = cosTheta;
            let nz = sinTheta * sinPhi;
            let [normX, normY, normZ] = calculateNormal(nx, ny, nz);

            // Push: position (3) + color (3) + normal (3) = 9 floats per vertex
            vertices.push(x, y, z, rCol, gCol, bCol, normX, normY, normZ);
        }
    }

    // Generate indices
    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
            let first = i * (slices + 1) + j;
            let second = first + slices + 1;

            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Generator untuk Cylinder dengan normals
function generateCylinder(radiusTop, radiusBottom, height, radialSegments, heightSegments, color) {
    let vertices = [];
    let indices = [];

    for (let y = 0; y <= heightSegments; y++) {
        let v = y / heightSegments;
        let currRadius = radiusBottom + (radiusTop - radiusBottom) * v;
        let currY = v * height - height / 2;

        for (let i = 0; i <= radialSegments; i++) {
            let u = i / radialSegments;
            let theta = u * 2 * Math.PI;

            let x = Math.cos(theta) * currRadius;
            let z = Math.sin(theta) * currRadius;

            // Normal for cylinder side
            let nx = Math.cos(theta);
            let ny = 0;
            let nz = Math.sin(theta);
            let [normX, normY, normZ] = calculateNormal(nx, ny, nz);

            vertices.push(x, currY, z, color[0], color[1], color[2], normX, normY, normZ);
        }
    }

    for (let y = 0; y < heightSegments; y++) {
        for (let i = 0; i < radialSegments; i++) {
            let row1 = y * (radialSegments + 1);
            let row2 = (y + 1) * (radialSegments + 1);

            indices.push(row1 + i, row2 + i, row1 + i + 1);
            indices.push(row1 + i + 1, row2 + i, row2 + i + 1);
        }
    }

    return { 
        vertices: new Float32Array(vertices), 
        indices: new Uint16Array(indices) 
    };
}

// NEW: Generator untuk Wrist Band (sarung tangan)
function generateWristBand(radius = 0.12, height = 0.15, radialSegments = 16, color = [0.5, 0.35, 0.25]) {
    return generateCylinder(radius * 1.05, radius, height, radialSegments, 4, color);
}

// Generator untuk Curved Cylinder dengan normals
function generateCurvedCylinder(radiusStart = 0.2, radiusEnd = 0.1, length = 2.0, segments = 20, rings = 10, color = [1.0, 1.0, 1.0]) {
    let vertices = [];
    let indices = [];

    for (let i = 0; i <= segments; i++) {
        let t = i / segments;
        let r = radiusStart * (1 - t * 0.5) + radiusEnd * t * 0.5;
        let y = -Math.sin(t * Math.PI / 2.5) * length;
        let z = -Math.cos(t * Math.PI / 2.5) * length;

        // Tangent for normal calculation
        let dy = -Math.cos(t * Math.PI / 2.5) * length * Math.PI / 2.5;
        let dz = Math.sin(t * Math.PI / 2.5) * length * Math.PI / 2.5;

        for (let j = 0; j <= rings; j++) {
            let theta = (j / rings) * 2 * Math.PI;
            let x = r * Math.cos(theta);
            let zOffset = r * Math.sin(theta);

            // Calculate normal
            let nx = Math.cos(theta);
            let ny = -dz / Math.sqrt(dy * dy + dz * dz);
            let nz = Math.sin(theta);
            let [normX, normY, normZ] = calculateNormal(nx, ny, nz);

            vertices.push(x, y, z + zOffset, ...color, normX, normY, normZ);
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < rings; j++) {
            let a = i * (rings + 1) + j;
            let b = a + rings + 1;
            let c = b + 1;
            let d = a + 1;
            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    return { 
        vertices: new Float32Array(vertices), 
        indices: new Uint16Array(indices) 
    };
}

// Generator untuk Sharp Cone dengan normals
function generateSharpCone(baseRadius = 0.3, height = 1.5, radialSegments = 24, color = [1.0, 1.0, 1.0]) {
    let vertices = [];
    let indices = [];

    // Tip vertex
    let [tipNormX, tipNormY, tipNormZ] = calculateNormal(0, 1, 0);
    vertices.push(0, height, 0, ...color, tipNormX, tipNormY, tipNormZ);

    // Base circle
    for (let i = 0; i <= radialSegments; i++) {
        let theta = (i / radialSegments) * 2 * Math.PI;
        let x = baseRadius * Math.cos(theta);
        let z = baseRadius * Math.sin(theta);

        // Normal pointing outward and up
        let nx = Math.cos(theta);
        let ny = baseRadius / height;
        let nz = Math.sin(theta);
        let [normX, normY, normZ] = calculateNormal(nx, ny, nz);

        vertices.push(x, 0, z, ...color, normX, normY, normZ);
    }

    // Center of base
    vertices.push(0, 0, 0, ...color, 0, -1, 0);

    // Side triangles
    for (let i = 1; i <= radialSegments; i++) {
        let next = (i % radialSegments) + 1;
        indices.push(0, i, next);
    }

    // Base triangles
    let centerIdx = radialSegments + 2;
    for (let i = 1; i <= radialSegments; i++) {
        let next = (i % radialSegments) + 1;
        indices.push(centerIdx, next, i);
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Generator untuk Cone dengan normals
function generateCone(radius = 0.5, height = 1.0, radialSegments = 16, color = [1.0, 1.0, 1.0]) {
    return generateSharpCone(radius, height, radialSegments, color);
}

// Generator untuk Closed Eye dengan normals
function generateClosedEye(width = 0.3, height = 0.06, segments = 24, color = [0.0, 0.0, 0.0]) {
    let vertices = [];
    let indices = [];

    const thickness = height * 0.3;

    for (let i = 0; i <= segments; i++) {
        let t = i / segments;
        let x = (t - 0.5) * width;
        let y = Math.sin(t * Math.PI) * height * 0.8;
        let z = 0;
        
        // Normal pointing forward
        let [normX, normY, normZ] = calculateNormal(0, 0, 1);
        
        vertices.push(x, y + thickness, z, ...color, normX, normY, normZ);
        vertices.push(x, y - thickness, z, ...color, normX, normY, normZ);
    }

    for (let i = 0; i < segments; i++) {
        let base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Generator untuk Ear Inner
function generateEarInner(baseRadius = 0.2, height = 1.2, radialSegments = 16, color = [0.4, 0.3, 0.2]) {
    return generateSharpCone(baseRadius, height, radialSegments, color);
}

// Generator untuk Shoulder Pad
function generateShoulderPad(radius = 0.3, segments = 20, color = [0.5, 0.35, 0.25]) {
    return generateEllipsoid(radius * 1.1, radius * 0.5, radius * 0.9, segments, segments, color);
}

// Generator untuk Foot Toe
function generateFootToe(radius = 0.05, height = 0.11, segments = 12, color = [1.0, 1.0, 1.0]) {
    return generateCone(radius, height, segments, color);
}

// Generator untuk Nose
function generateNose(width = 0.08, height = 0.04, depth = 0.06, color = [0.9, 0.8, 0.3]) {
    return generateEllipsoid(width, height, depth, 12, 12, color);
}

// Generator untuk Mouth Line
function generateMouthLine(width = 0.15, height = 0.02, segments = 16, color = [0.3, 0.25, 0.2]) {
    let vertices = [];
    let indices = [];

    for (let i = 0; i <= segments; i++) {
        let t = i / segments;
        let x = (t - 0.5) * width;
        let y = -Math.abs(Math.sin(t * Math.PI)) * height * 0.5;
        let z = 0;
        
        let [normX, normY, normZ] = calculateNormal(0, 0, 1);
        
        vertices.push(x, y + height * 0.5, z, ...color, normX, normY, normZ);
        vertices.push(x, y - height * 0.5, z, ...color, normX, normY, normZ);
    }

    for (let i = 0; i < segments; i++) {
        let base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Generator untuk Chest Segment
function generateChestSegment(width = 0.4, height = 0.15, depth = 0.2, color = [0.48, 0.32, 0.22]) {
    return generateEllipsoid(width, height, depth, 16, 16, color);
}

// Generator untuk kepala berbentuk lancip (mirip rubah) namun ujungnya tumpul.
// pointiness: seberapa panjang moncong (0.0 = bulat, 1.0 = sangat lancip)
// bluntness: ukuran ujung tumpul (0.0 = tajam, 1.0 = sangat tumpul)
function generateFoxHead(rx = 1, ry = 1, rz = 1, stacks = 24, slices = 32, color = [1.0,1.0,1.0], pointiness = 0.6, bluntness = 0.35) {
    let vertices = [];
    let indices = [];

    const rCol = color[0] ?? 1.0;
    const gCol = color[1] ?? 1.0;
    const bCol = color[2] ?? 1.0;

    // Bangun ellipsoid dasar tetapi perpanjang ke depan agar seperti moncong.
    for (let i = 0; i <= stacks; i++) {
        let theta = i * Math.PI / stacks;
        let sinTheta = Math.sin(theta);
        let cosTheta = Math.cos(theta);

        for (let j = 0; j <= slices; j++) {
            let phi = j * 2 * Math.PI / slices;
            let sinPhi = Math.sin(phi);
            let cosPhi = Math.cos(phi);

            // Posisi dasar ellipsoid
            let x = rx * sinTheta * cosPhi;
            let y = ry * cosTheta;
            let z = rz * sinTheta * sinPhi;

            // Faktor bagian depan (semakin besar di area moncong)
            let frontFactor = Math.max(0.0, sinTheta) * Math.max(0.0, sinPhi);
            // Peregangan dan penyempitan
            let stretch = 1.0 + pointiness * frontFactor;
            let squeeze = 1.0 - (pointiness * 0.45 * frontFactor);

            // Ujung tumpul — mengurangi peregangan di bagian depan
            let tipFactor = Math.pow(Math.max(0.0, 1.0 - (Math.abs(theta - Math.PI*0.5) / (Math.PI*0.5))), 2.0);
            let blunt = 1.0 - bluntness * tipFactor;

            let nx_pos = x * squeeze;
            let ny_pos = y;
            let nz_pos = z * stretch * blunt;

            // Normal sederhana berdasarkan posisi
            let len = Math.sqrt(nx_pos*nx_pos + ny_pos*ny_pos + nz_pos*nz_pos);
            let normX = nx_pos / len;
            let normY = ny_pos / len;
            let normZ = nz_pos / len;

            vertices.push(nx_pos, ny_pos, nz_pos, rCol, gCol, bCol, normX, normY, normZ);
        }
    }

    // Buat indeks
    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
            let first = i * (slices + 1) + j;
            let second = first + slices + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return { vertices, indices };
}




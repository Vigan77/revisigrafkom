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

// MODIFIED: Generator untuk Curved Cylinder dengan normals - WITH SINGLE BROWN STRIPE
function generateCurvedCylinder(radiusStart = 0.2, radiusEnd = 0.1, length = 2.0, segments = 20, rings = 10, baseColor = [1.0, 1.0, 1.0]) {
    let vertices = [];
    let indices = [];

    // Brown stripe color for Kadabra tail
    const brownColor = [0.55, 0.35, 0.22];

    for (let i = 0; i <= segments; i++) {
        let t = i / segments;
        // Enhanced taper for pointed tip
        let r = radiusStart * (1 - t * 0.75) + radiusEnd * t * 0.25; // More aggressive taper
        
        // Curve downward more at the end for pointed tip
        let curveIntensity = 1.0 + t * 0.8; // Increase curve intensity toward tip
        let y = -Math.sin(t * Math.PI / 2.2) * length * curveIntensity;
        let z = -Math.cos(t * Math.PI / 2.2) * length * curveIntensity;

        // Tangent for normal calculation
        let dy = -Math.cos(t * Math.PI / 2.2) * length * Math.PI / 2.2;
        let dz = Math.sin(t * Math.PI / 2.2) * length * Math.PI / 2.2;

        for (let j = 0; j <= rings; j++) {
            let theta = (j / rings) * 2 * Math.PI;
            let x = r * Math.cos(theta);
            let zOffset = r * Math.sin(theta);

            // Determine color based on position - SINGLE brown stripe wrapping around tail
            let isStripe = false;
            
            // Single brown stripe positioned in the middle section of the tail
            if (t > 0.45 && t < 0.55) {
                isStripe = true;
            }
            
            let color = isStripe ? brownColor : baseColor;

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

// IMPROVED: Generator untuk jari tangan Kadabra - panjang, ramping, sedikit melengkung
function generateCone(radius = 0.05, height = 0.5, radialSegments = 12, color = [1.0, 1.0, 1.0]) {
    let vertices = [];
    let indices = [];
    
    // Jari tangan Kadabra: panjang, ramping, dengan sedikit lengkungan
    const heightSegments = 12;
    
    // Bagian utama jari dengan taper yang smooth
    for (let i = 0; i <= heightSegments; i++) {
        let t = i / heightSegments;
        
        // Lengkungan halus ke depan (seperti jari yang sedikit bengkok)
        let curveAmount = Math.sin(t * Math.PI * 0.5) * 0.08;
        let y = t * height;
        let z = curveAmount * height;
        
        // Taper yang smooth dari base ke tip - lebih ramping
        let radiusScale = Math.pow(1.0 - t, 1.8); // Exponential taper untuk bentuk yang lebih natural
        let currentRadius = radius * radiusScale;
        
        // Sedikit lebih lebar di base untuk transisi yang natural
        if (t < 0.15) {
            currentRadius *= (1.0 + (0.15 - t) * 1.2);
        }
        
        for (let j = 0; j <= radialSegments; j++) {
            let angle = (j / radialSegments) * Math.PI * 2;
            let x = Math.cos(angle) * currentRadius;
            let zOffset = Math.sin(angle) * currentRadius;
            
            // Normal calculation dengan mempertimbangkan curve
            let nx = Math.cos(angle);
            let ny = 0.3 + t * 0.4; // Normal pointing slightly upward
            let nz = Math.sin(angle);
            let [normX, normY, normZ] = calculateNormal(nx, ny, nz);
            
            vertices.push(x, y, z + zOffset, ...color, normX, normY, normZ);
        }
    }
    
    // Indices untuk body jari
    for (let i = 0; i < heightSegments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            let a = i * (radialSegments + 1) + j;
            let b = a + radialSegments + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }
    
    // Ujung jari yang runcing (pointed tip)
    const tipStartIdx = vertices.length / 9;
    const tipSegments = 6;
    
    for (let i = 0; i <= tipSegments; i++) {
        let t = i / tipSegments;
        let angle = t * Math.PI * 0.5; // 0 to 90 degrees untuk rounded tip
        
        let tipY = height + Math.sin(angle) * radius * 0.4;
        let tipZ = Math.sin(heightSegments / heightSegments * Math.PI * 0.5) * 0.08 * height;
        let tipRadius = Math.cos(angle) * radius * 0.15; // Ujung yang sangat kecil
        
        for (let j = 0; j <= radialSegments; j++) {
            let theta = (j / radialSegments) * Math.PI * 2;
            let x = Math.cos(theta) * tipRadius;
            let zOffset = Math.sin(theta) * tipRadius;
            
            let nx = Math.cos(theta) * Math.cos(angle);
            let ny = Math.sin(angle);
            let nz = Math.sin(theta) * Math.cos(angle);
            let [normX, normY, normZ] = calculateNormal(nx, ny, nz);
            
            vertices.push(x, tipY, tipZ + zOffset, ...color, normX, normY, normZ);
        }
    }
    
    // Indices untuk rounded tip
    for (let i = 0; i < tipSegments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            let a = tipStartIdx + i * (radialSegments + 1) + j;
            let b = a + radialSegments + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// NEW: Generator untuk Open Eye (Kadabra style - mata terbuka dan tajam)
function generateOpenEye(width = 0.25, height = 0.15, segments = 24, color = [0.0, 0.0, 0.0]) {
    let vertices = [];
    let indices = [];

    const thickness = 0.02;
    
    // Mata berbentuk fox-like, tajam
    for (let i = 0; i <= segments; i++) {
        let t = i / segments;
        let x = (t - 0.5) * width;
        
        // Bentuk mata yang lebih tajam dan terbuka
        let y = 0;
        if (t < 0.5) {
            y = Math.sin(t * Math.PI * 2) * height * 0.6;
        } else {
            y = Math.sin((1 - t) * Math.PI * 2) * height * 0.6;
        }
        
        let z = 0;
        
        let [normX, normY, normZ] = calculateNormal(0, 0, 1);
        
        vertices.push(x, y + thickness, z, ...color, normX, normY, normZ);
        vertices.push(x, y - thickness, z, ...color, normX, normY, normZ);
    }

    for (let i = 0; i < segments; i++) {
        let base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
    }

    // Tambahkan pupil (lingkaran kecil di tengah)
    const pupilSegments = 16;
    const pupilRadius = width * 0.15;
    const startIdx = vertices.length / 9;
    
    // Center pupil
    vertices.push(0, 0, 0.01, ...color, 0, 0, 1);
    
    for (let i = 0; i <= pupilSegments; i++) {
        let angle = (i / pupilSegments) * Math.PI * 2;
        let px = Math.cos(angle) * pupilRadius;
        let py = Math.sin(angle) * pupilRadius;
        vertices.push(px, py, 0.01, ...color, 0, 0, 1);
    }
    
    for (let i = 0; i < pupilSegments; i++) {
        indices.push(startIdx, startIdx + i + 1, startIdx + i + 2);
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// NEW: Generator untuk Whisker (kumis panjang Kadabra) - IMPROVED WITH CURVE
function generateWhisker(length = 1.2, thickness = 0.025, segments = 24, color = [0.85, 0.75, 0.35]) {
    let vertices = [];
    let indices = [];
    
    // Membuat kumis yang melengkung seperti Kadabra asli
    for (let i = 0; i <= segments; i++) {
        let t = i / segments;
        
        // Horizontal position (kumis memanjang)
        let x = t * length;
        
        // Vertical curve (melengkung ke bawah dengan bentuk yang lebih natural)
        // Menggunakan kombinasi fungsi untuk membuat kurva yang smooth
        let y = -Math.pow(t, 1.8) * length * 0.35; // Melengkung ke bawah
        
        // Slight outward curve (sedikit melengkung ke luar)
        let z = Math.sin(t * Math.PI * 0.5) * length * 0.08;
        
        // Thickness berkurang di ujung untuk tampilan lebih natural
        let currThickness = thickness * (1 - t * 0.6);
        
        // Create cross-section vertices (4 vertices per segment untuk volume)
        let [normX, normY, normZ] = calculateNormal(0, 0, 1);
        
        // Top vertex
        vertices.push(x, y + currThickness, z, ...color, 0, 1, 0);
        // Bottom vertex
        vertices.push(x, y - currThickness, z, ...color, 0, -1, 0);
        // Front vertex
        vertices.push(x, y, z + currThickness, ...color, 0, 0, 1);
        // Back vertex
        vertices.push(x, y, z - currThickness, ...color, 0, 0, -1);
    }
    
    // Create triangles to connect segments
    for (let i = 0; i < segments; i++) {
        let base = i * 4;
        let next = base + 4;
        
        // Top face
        indices.push(base, next, base + 2);
        indices.push(next, next + 2, base + 2);
        
        // Bottom face
        indices.push(base + 1, base + 3, next + 1);
        indices.push(next + 1, base + 3, next + 3);
        
        // Front face
        indices.push(base + 2, next + 2, base);
        indices.push(next + 2, next, base);
        
        // Back face
        indices.push(base + 3, base + 1, next + 3);
        indices.push(next + 3, base + 1, next + 1);
    }
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// IMPROVED: Generator untuk Spoon (sendok Kadabra) - More realistic proportions
function generateSpoon(handleLength = 0.8, handleRadius = 0.03, spoonWidth = 0.25, spoonHeight = 0.35, color = [0.75, 0.75, 0.80]) {
    let vertices = [];
    let indices = [];
    
    // PART 1: Handle (gagang sendok) - thinner and more elegant
    const handleSegments = 16;
    const handleSides = 12;
    
    for (let i = 0; i <= handleSegments; i++) {
        let t = i / handleSegments;
        let y = t * handleLength;
        
        // Slight taper toward the bowl end for realistic look
        let radiusScale = 1.0 - t * 0.15;
        let currentRadius = handleRadius * radiusScale;
        
        for (let j = 0; j <= handleSides; j++) {
            let angle = (j / handleSides) * Math.PI * 2;
            let x = Math.cos(angle) * currentRadius;
            let z = Math.sin(angle) * currentRadius;
            
            let [normX, normY, normZ] = calculateNormal(Math.cos(angle), 0, Math.sin(angle));
            vertices.push(x, y, z, ...color, normX, normY, normZ);
        }
    }
    
    // Handle indices
    for (let i = 0; i < handleSegments; i++) {
        for (let j = 0; j < handleSides; j++) {
            let a = i * (handleSides + 1) + j;
            let b = a + handleSides + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }
    
    // PART 2: Transition from handle to bowl
    const transitionStartIdx = vertices.length / 9;
    const transitionSegments = 8;
    
    for (let i = 0; i <= transitionSegments; i++) {
        let t = i / transitionSegments;
        let y = handleLength + t * 0.08;
        
        // Gradually widen from handle to bowl
        let widthScale = handleRadius * 0.85 + t * (spoonWidth * 0.6 - handleRadius * 0.85);
        let heightScale = handleRadius * 0.85 + t * (spoonHeight * 0.3 - handleRadius * 0.85);
        
        for (let j = 0; j <= handleSides; j++) {
            let angle = (j / handleSides) * Math.PI * 2;
            let x = Math.cos(angle) * widthScale;
            let z = Math.sin(angle) * heightScale;
            
            let [normX, normY, normZ] = calculateNormal(Math.cos(angle), 0.3, Math.sin(angle));
            vertices.push(x, y, z, ...color, normX, normY, normZ);
        }
    }
    
    // Transition indices
    for (let i = 0; i < transitionSegments; i++) {
        for (let j = 0; j < handleSides; j++) {
            let a = transitionStartIdx + i * (handleSides + 1) + j;
            let b = a + handleSides + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }
    
    // PART 3: Spoon bowl (kepala sendok) - realistic oval shape with depth
    const bowlStartIdx = vertices.length / 9;
    const bowlSegmentsU = 20; // Along the length
    const bowlSegmentsV = 16; // Around the width
    
    for (let i = 0; i <= bowlSegmentsU; i++) {
        let u = i / bowlSegmentsU;
        
        // Oval shape along length - more elongated
        let yPos = handleLength + 0.08 + u * spoonHeight * 0.85;
        
        for (let j = 0; j <= bowlSegmentsV; j++) {
            let v = (j / bowlSegmentsV) * Math.PI * 2;
            
            // Create oval cross-section
            let angle = v;
            let radiusU = 1.0 - Math.pow(u - 0.5, 2) * 2.5; // Wider in middle, narrower at ends
            radiusU = Math.max(0.1, radiusU);
            
            let xPos = Math.cos(angle) * spoonWidth * radiusU;
            let zBase = Math.sin(angle) * spoonHeight * 0.4 * radiusU;
            
            // Add depth/curvature to the bowl (concave shape)
            let depthFactor = 1.0 - Math.abs(Math.cos(angle)); // Deeper in center
            let lengthFactor = Math.sin(u * Math.PI); // Deeper in middle of length
            let depth = depthFactor * lengthFactor * 0.12;
            
            let zPos = zBase - depth;
            
            // Calculate proper normals for the curved bowl surface
            let normalAngle = angle;
            let normalDepth = depth * 2.0; // Exaggerate for better lighting
            
            let nx = Math.cos(normalAngle) * 0.3;
            let ny = 0.8 + normalDepth;
            let nz = Math.sin(normalAngle) * 0.3 - normalDepth;
            let [normX, normY, normZ] = calculateNormal(nx, ny, nz);
            
            vertices.push(xPos, yPos, zPos, ...color, normX, normY, normZ);
        }
    }
    
    // Bowl indices
    for (let i = 0; i < bowlSegmentsU; i++) {
        for (let j = 0; j < bowlSegmentsV; j++) {
            let a = bowlStartIdx + i * (bowlSegmentsV + 1) + j;
            let b = a + bowlSegmentsV + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }
    
    // PART 4: Bowl rim/edge - smooth rounded edge
    const rimStartIdx = vertices.length / 9;
    const rimSegments = bowlSegmentsV;
    
    for (let j = 0; j <= rimSegments; j++) {
        let angle = (j / rimSegments) * Math.PI * 2;
        
        // Position at the widest part of the bowl
        let u = 0.5; // Middle of bowl length
        let radiusU = 1.0 - Math.pow(u - 0.5, 2) * 2.5;
        radiusU = Math.max(0.1, radiusU);
        
        let xPos = Math.cos(angle) * spoonWidth * radiusU;
        let zPos = Math.sin(angle) * spoonHeight * 0.4 * radiusU;
        let yPos = handleLength + 0.08 + u * spoonHeight * 0.85;
        
        // Slight upward curve at rim
        let rimLift = 0.02;
        
        let [normX, normY, normZ] = calculateNormal(Math.cos(angle), 0.5, Math.sin(angle));
        vertices.push(xPos, yPos + rimLift, zPos, ...color, normX, normY, normZ);
    }
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// NEW: Generator untuk Star (bintang di dahi Kadabra)
function generateStar(outerRadius = 0.15, innerRadius = 0.06, thickness = 0.03, points = 5, color = [1.0, 0.4, 0.6]) {
    let vertices = [];
    let indices = [];
    
    const angleStep = (Math.PI * 2) / (points * 2);
    
    // Front face vertices
    const frontVertices = [];
    for (let i = 0; i < points * 2; i++) {
        let angle = i * angleStep - Math.PI / 2; // Start from top
        let radius = (i % 2 === 0) ? outerRadius : innerRadius;
        let x = Math.cos(angle) * radius;
        let y = Math.sin(angle) * radius;
        frontVertices.push([x, y, thickness / 2]);
    }
    
    // Center vertex for front
    const centerIdx = frontVertices.length;
    frontVertices.push([0, 0, thickness / 2]);
    
    // Add front vertices
    for (let i = 0; i < frontVertices.length; i++) {
        let [x, y, z] = frontVertices[i];
        vertices.push(x, y, z, ...color, 0, 0, 1);
    }
    
    // Front face triangles
    for (let i = 0; i < points * 2; i++) {
        let next = (i + 1) % (points * 2);
        indices.push(centerIdx, i, next);
    }
    
    // Back face vertices
    const backStartIdx = vertices.length / 9;
    for (let i = 0; i < frontVertices.length; i++) {
        let [x, y, z] = frontVertices[i];
        vertices.push(x, y, -thickness / 2, ...color, 0, 0, -1);
    }
    
    // Back face triangles
    for (let i = 0; i < points * 2; i++) {
        let next = (i + 1) % (points * 2);
        indices.push(backStartIdx + centerIdx, backStartIdx + next, backStartIdx + i);
    }
    
    // Side faces
    for (let i = 0; i < points * 2; i++) {
        let next = (i + 1) % (points * 2);
        
        // Calculate normal for side face
        let [x1, y1] = frontVertices[i];
        let [x2, y2] = frontVertices[next];
        let dx = x2 - x1;
        let dy = y2 - y1;
        let [normX, normY, normZ] = calculateNormal(dy, -dx, 0);
        
        // Add side vertices with proper normals
        const sideStartIdx = vertices.length / 9;
        vertices.push(x1, y1, thickness / 2, ...color, normX, normY, normZ);
        vertices.push(x1, y1, -thickness / 2, ...color, normX, normY, normZ);
        vertices.push(x2, y2, thickness / 2, ...color, normX, normY, normZ);
        vertices.push(x2, y2, -thickness / 2, ...color, normX, normY, normZ);
        
        // Side triangles
        indices.push(sideStartIdx, sideStartIdx + 1, sideStartIdx + 2);
        indices.push(sideStartIdx + 1, sideStartIdx + 3, sideStartIdx + 2);
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

// IMPROVED: Generator untuk Jari Kaki Kadabra - 2 jari besar seperti cakar, tebal dan bulat
function generateFootToe(radius = 0.11, height = 0.35, segments = 14, color = [1.0, 1.0, 1.0]) {
    let vertices = [];
    let indices = [];
    
    // Jari kaki Kadabra: tebal, bulat, pendek seperti cakar
    const heightSegments = 10;
    
    // Bagian utama jari (cylinder yang tebal dengan sedikit taper)
    for (let i = 0; i <= heightSegments; i++) {
        let t = i / heightSegments;
        
        // Sedikit melengkung ke depan
        let curveAmount = Math.sin(t * Math.PI * 0.6) * 0.06;
        let y = t * height * 0.65; // 65% adalah bagian cylinder
        let z = curveAmount * height;
        
        // Taper yang sangat minimal - jari kaki tetap tebal
        let radiusScale = 1.0 - t * 0.2; // Hanya mengecil 20%
        let currentRadius = radius * radiusScale;
        
        // Base sedikit lebih lebar untuk transisi yang natural
        if (t < 0.2) {
            currentRadius *= (1.0 + (0.2 - t) * 0.8);
        }
        
        for (let j = 0; j <= segments; j++) {
            let angle = (j / segments) * Math.PI * 2;
            let x = Math.cos(angle) * currentRadius;
            let zOffset = Math.sin(angle) * currentRadius;
            
            let nx = Math.cos(angle);
            let ny = 0.1; // Mostly horizontal normal
            let nz = Math.sin(angle);
            let [normX, normY, normZ] = calculateNormal(nx, ny, nz);
            
            vertices.push(x, y, z + zOffset, ...color, normX, normY, normZ);
        }
    }
    
    // Indices untuk cylinder
    for (let i = 0; i < heightSegments; i++) {
        for (let j = 0; j < segments; j++) {
            let a = i * (segments + 1) + j;
            let b = a + segments + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }
    
    // Bagian ujung bulat (rounded tip) - lebih besar dan bulat
    const tipStartIdx = vertices.length / 9;
    const tipSegments = 10;
    
    for (let i = 0; i <= tipSegments; i++) {
        let t = i / tipSegments;
        let angle = t * Math.PI * 0.5; // 0 to 90 degrees untuk hemisphere
        
        let baseY = height * 0.65;
        let baseZ = Math.sin((heightSegments / heightSegments) * Math.PI * 0.6) * 0.06 * height;
        
        let tipY = baseY + Math.sin(angle) * radius * 0.85; // Ujung yang besar dan bulat
        let tipZ = baseZ + Math.sin(angle) * radius * 0.3; // Sedikit maju
        let tipRadius = Math.cos(angle) * radius * 0.8; // Tetap besar
        
        for (let j = 0; j <= segments; j++) {
            let theta = (j / segments) * Math.PI * 2;
            let x = Math.cos(theta) * tipRadius;
            let zOffset = Math.sin(theta) * tipRadius;
            
            let nx = Math.cos(theta) * Math.cos(angle);
            let ny = Math.sin(angle);
            let nz = Math.sin(theta) * Math.cos(angle);
            let [normX, normY, normZ] = calculateNormal(nx, ny, nz);
            
            vertices.push(x, tipY, tipZ + zOffset, ...color, normX, normY, normZ);
        }
    }
    
    // Indices untuk rounded tip
    for (let i = 0; i < tipSegments; i++) {
        for (let j = 0; j < segments; j++) {
            let a = tipStartIdx + i * (segments + 1) + j;
            let b = a + segments + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
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

// MODIFIED: Generator untuk kepala berbentuk lancip (mirip rubah) dengan dagu yang lebih tajam
function generateFoxHead(rx = 1, ry = 1, rz = 1, stacks = 24, slices = 32, color = [1.0,1.0,1.0], pointiness = 0.8, bluntness = 0.15) {
    let vertices = [];
    let indices = [];

    const rCol = color[0] ?? 1.0;
    const gCol = color[1] ?? 1.0;
    const bCol = color[2] ?? 1.0;

    for (let i = 0; i <= stacks; i++) {
        let theta = i * Math.PI / stacks;
        let sinTheta = Math.sin(theta);
        let cosTheta = Math.cos(theta);

        for (let j = 0; j <= slices; j++) {
            let phi = j * 2 * Math.PI / slices;
            let sinPhi = Math.sin(phi);
            let cosPhi = Math.cos(phi);

            let x = rx * sinTheta * cosPhi;
            let y = ry * cosTheta;
            let z = rz * sinTheta * sinPhi;

            // Enhanced chin sharpening - make the lower front area more pointed bagian dagu yang tajam
            let frontFactor = Math.max(0.0, sinTheta) * Math.max(0.0, sinPhi);
            let lowerFactor = Math.max(0.0, 0.7 - cosTheta); // More effect on lower part
            let chinSharpening = frontFactor * lowerFactor * 1.6; // Increased sharpening
            
            let stretch = 1.0 + pointiness * chinSharpening;
            let squeeze = 1.0 - (pointiness * 0.4 * chinSharpening); // More aggressive squeeze

            // Make the tip less blunt for sharper appearance
            let tipFactor = Math.pow(Math.max(0.0, 1.0 - (Math.abs(theta - Math.PI*0.5) / (Math.PI*0.5))), 3.0);
            let blunt = 1.0 - bluntness * tipFactor;

            let nx_pos = x * squeeze;
            let ny_pos = y;
            let nz_pos = z * stretch * blunt;

            let len = Math.sqrt(nx_pos*nx_pos + ny_pos*ny_pos + nz_pos*nz_pos);
            let normX = nx_pos / len;
            let normY = ny_pos / len;
            let normZ = nz_pos / len;

            vertices.push(nx_pos, ny_pos, nz_pos, rCol, gCol, bCol, normX, normY, normZ);
        }
    }

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
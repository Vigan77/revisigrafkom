// Geometry helper functions for creating 3D shapes

function createSphere(radius, latBands, longBands) {
    const positions = [], normals = [], texCoords = [], indices = [];

    for (let lat = 0; lat <= latBands; lat++) {
        const theta = lat * Math.PI / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let long = 0; long <= longBands; long++) {
            const phi = long * 2 * Math.PI / longBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            normals.push(x, y, z);
            positions.push(radius * x, radius * y, radius * z);
            texCoords.push(long / longBands, lat / latBands);
        }
    }

    for (let lat = 0; lat < latBands; lat++) {
        for (let long = 0; long < longBands; long++) {
            const first = lat * (longBands + 1) + long;
            const second = first + longBands + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return { positions, normals, texCoords, indices };
}

function createEllipsoid(rx, ry, rz, latBands, longBands) {
    const positions = [], normals = [], texCoords = [], indices = [];

    for (let lat = 0; lat <= latBands; lat++) {
        const theta = lat * Math.PI / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let long = 0; long <= longBands; long++) {
            const phi = long * 2 * Math.PI / longBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            normals.push(x, y, z);
            positions.push(rx * x, ry * y, rz * z);
            texCoords.push(long / longBands, lat / latBands);
        }
    }

    for (let lat = 0; lat < latBands; lat++) {
        for (let long = 0; long < longBands; long++) {
            const first = lat * (longBands + 1) + long;
            const second = first + longBands + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return { positions, normals, texCoords, indices };
}

function createCylinder(radiusTop, radiusBottom, height, segments, heightSegments = 1) {
    const positions = [], normals = [], texCoords = [], indices = [];

    for (let y = 0; y <= heightSegments; y++) {
        const v = y / heightSegments;
        const yPos = (v - 0.5) * height;
        const radius = radiusBottom + (radiusTop - radiusBottom) * v;

        for (let i = 0; i <= segments; i++) {
            const u = i / segments;
            const angle = u * Math.PI * 2;
            const x = Math.cos(angle);
            const z = Math.sin(angle);

            positions.push(radius * x, yPos, radius * z);
            normals.push(x, 0, z);
            texCoords.push(u, v);
        }
    }

    for (let y = 0; y < heightSegments; y++) {
        for (let i = 0; i < segments; i++) {
            const i0 = y * (segments + 1) + i;
            const i1 = i0 + 1;
            const i2 = i0 + segments + 1;
            const i3 = i2 + 1;

            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    return { positions, normals, texCoords, indices };
}

function createCone(radius, height, segments) {
    const positions = [], normals = [], texCoords = [], indices = [];

    // Tip
    positions.push(0, height / 2, 0);
    normals.push(0, 1, 0);
    texCoords.push(0.5, 0);

    // Base circle
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        positions.push(x, -height / 2, z);

        const nx = x / radius;
        const nz = z / radius;
        const len = Math.sqrt(nx * nx + 0.5 * 0.5 + nz * nz);
        normals.push(nx / len, 0.5 / len, nz / len);
        texCoords.push(i / segments, 1);
    }

    // Indices for cone sides
    for (let i = 0; i < segments; i++) {
        indices.push(0, i + 1, i + 2);
    }

    // Base cap
    const baseCenter = positions.length / 3;
    positions.push(0, -height / 2, 0);
    normals.push(0, -1, 0);
    texCoords.push(0.5, 0.5);

    for (let i = 0; i < segments; i++) {
        indices.push(baseCenter, i + 2, i + 1);
    }

    return { positions, normals, texCoords, indices };
}

function createRoundedCone(radius, height, segments, tipRoundness = 0.15) {
    const positions = [], normals = [], texCoords = [], indices = [];

    const tipRadius = radius * tipRoundness;
    const heightSegments = 10;

    for (let y = 0; y <= heightSegments; y++) {
        const v = y / heightSegments;
        const yPos = (v - 0.5) * height;

        let currentRadius;
        if (v < 0.85) {
            currentRadius = radius * (1 - v);
        } else {
            const roundFactor = (v - 0.85) / 0.15;
            const taper = 1 - 0.85;
            currentRadius = radius * (taper - taper * Math.sin(roundFactor * Math.PI / 2)) + tipRadius;
        }

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * currentRadius;
            const z = Math.sin(angle) * currentRadius;

            positions.push(x, yPos, z);

            const nx = Math.cos(angle);
            const nz = Math.sin(angle);
            const ny = currentRadius / height;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            normals.push(nx / len, ny / len, nz / len);

            texCoords.push(i / segments, v);
        }
    }

    for (let y = 0; y < heightSegments; y++) {
        for (let i = 0; i < segments; i++) {
            const i0 = y * (segments + 1) + i;
            const i1 = i0 + 1;
            const i2 = i0 + segments + 1;
            const i3 = i2 + 1;

            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    // Base cap
    const baseCenter = positions.length / 3;
    positions.push(0, -height / 2, 0);
    normals.push(0, -1, 0);
    texCoords.push(0.5, 0.5);

    const baseStart = 0;
    for (let i = 0; i < segments; i++) {
        indices.push(baseCenter, baseStart + i, baseStart + i + 1);
    }

    // Tip cap
    const tipCenter = positions.length / 3;
    positions.push(0, height / 2, 0);
    normals.push(0, 1, 0);
    texCoords.push(0.5, 0.5);

    const tipStart = heightSegments * (segments + 1);
    for (let i = 0; i < segments; i++) {
        indices.push(tipCenter, tipStart + i + 1, tipStart + i);
    }

    return { positions, normals, texCoords, indices };
}

function createTrapezoidTorso(topWidth, topDepth, bottomWidth, bottomDepth, height, segments) {
    const positions = [], normals = [], texCoords = [], indices = [];
    const heightSegments = 8;

    for (let y = 0; y <= heightSegments; y++) {
        const v = y / heightSegments;
        const yPos = (v - 0.5) * height;

        const currentWidth = bottomWidth + (topWidth - bottomWidth) * v;
        const currentDepth = bottomDepth + (topDepth - bottomDepth) * v;

        for (let i = 0; i <= segments; i++) {
            const u = i / segments;

            let x, z, nx, nz;

            if (i < segments / 4) {
                const t = (i / (segments / 4));
                x = (t - 0.5) * currentWidth;
                z = currentDepth / 2;
                nx = 0;
                nz = 1;
            } else if (i < segments / 2) {
                const t = ((i - segments / 4) / (segments / 4));
                x = currentWidth / 2;
                z = (0.5 - t) * currentDepth;
                nx = 1;
                nz = 0;
            } else if (i < segments * 3 / 4) {
                const t = ((i - segments / 2) / (segments / 4));
                x = (0.5 - t) * currentWidth;
                z = -currentDepth / 2;
                nx = 0;
                nz = -1;
            } else {
                const t = ((i - segments * 3 / 4) / (segments / 4));
                x = -currentWidth / 2;
                z = (-0.5 + t) * currentDepth;
                nx = -1;
                nz = 0;
            }

            positions.push(x, yPos, z);

            const taperAngleX = (topWidth - bottomWidth) / height;
            const taperAngleZ = (topDepth - bottomDepth) / height;
            const adjustedNx = nx - taperAngleX * Math.abs(nz);
            const adjustedNz = nz - taperAngleZ * Math.abs(nx);
            const len = Math.sqrt(adjustedNx * adjustedNx + adjustedNz * adjustedNz + 0.1);
            normals.push(adjustedNx / len, 0.1 / len, adjustedNz / len);

            texCoords.push(u, v);
        }
    }

    for (let y = 0; y < heightSegments; y++) {
        for (let i = 0; i < segments; i++) {
            const i0 = y * (segments + 1) + i;
            const i1 = i0 + 1;
            const i2 = i0 + segments + 1;
            const i3 = i2 + 1;

            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    // Bottom cap
    const bottomCenter = positions.length / 3;
    positions.push(0, -height / 2, 0);
    normals.push(0, -1, 0);
    texCoords.push(0.5, 0.5);

    const bottomStart = 0;
    for (let i = 0; i < segments; i++) {
        indices.push(bottomCenter, bottomStart + i, bottomStart + i + 1);
    }

    // Top cap
    const topCenter = positions.length / 3;
    positions.push(0, height / 2, 0);
    normals.push(0, 1, 0);
    texCoords.push(0.5, 0.5);

    const topStart = heightSegments * (segments + 1);
    for (let i = 0; i < segments; i++) {
        indices.push(topCenter, topStart + i + 1, topStart + i);
    }

    return { positions, normals, texCoords, indices };
}

function createTorus(majorRadius, minorRadius, majorSegments, minorSegments) {
    const positions = [], normals = [], texCoords = [], indices = [];

    for (let i = 0; i <= majorSegments; i++) {
        const u = i / majorSegments * Math.PI * 2;
        const cu = Math.cos(u);
        const su = Math.sin(u);

        for (let j = 0; j <= minorSegments; j++) {
            const v = j / minorSegments * Math.PI * 2;
            const cv = Math.cos(v);
            const sv = Math.sin(v);

            const x = (majorRadius + minorRadius * cv) * cu;
            const y = minorRadius * sv;
            const z = (majorRadius + minorRadius * cv) * su;

            positions.push(x, y, z);

            const nx = cv * cu;
            const ny = sv;
            const nz = cv * su;
            normals.push(nx, ny, nz);
            texCoords.push(i / majorSegments, j / minorSegments);
        }
    }

    for (let i = 0; i < majorSegments; i++) {
        for (let j = 0; j < minorSegments; j++) {
            const a = i * (minorSegments + 1) + j;
            const b = a + minorSegments + 1;

            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }

    return { positions, normals, texCoords, indices };
}

function createTriangularEye() {
    const positions = [], normals = [], texCoords = [], indices = [];
    const depth = 0.2;

    const v0 = [-0.4, -0.5, depth];
    const v1 = [0.4, -0.5, depth];
    const v2 = [0.4, 0.5, depth];

    const v3 = [-0.4, -0.5, -depth];
    const v4 = [0.4, -0.5, -depth];
    const v5 = [0.4, 0.5, -depth];

    // Front face
    positions.push(...v0, ...v1, ...v2);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    texCoords.push(0, 0, 1, 0, 1, 1);
    indices.push(0, 1, 2);

    // Back face
    positions.push(...v3, ...v4, ...v5);
    normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
    texCoords.push(0, 0, 1, 0, 1, 1);
    indices.push(3, 5, 4);

    // Bottom edge
    const baseIdx = positions.length / 3;
    positions.push(...v0, ...v1, ...v4, ...v3);
    normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
    texCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    indices.push(baseIdx, baseIdx + 2, baseIdx + 3);

    // Right edge
    const rightIdx = positions.length / 3;
    positions.push(...v1, ...v2, ...v5, ...v4);
    normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
    texCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(rightIdx, rightIdx + 1, rightIdx + 2);
    indices.push(rightIdx, rightIdx + 2, rightIdx + 3);

    // Diagonal edge
    const diagIdx = positions.length / 3;
    positions.push(...v2, ...v0, ...v3, ...v5);
    const nx = 0.6, ny = 0.8;
    normals.push(-nx, ny, 0, -nx, ny, 0, -nx, ny, 0, -nx, ny, 0);
    texCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(diagIdx, diagIdx + 1, diagIdx + 2);
    indices.push(diagIdx, diagIdx + 2, diagIdx + 3);

    return { positions, normals, texCoords, indices };
}

function createFoxSnout(sharpness = 1.5, tipRadius = 0.05) {
    const positions = [], normals = [], texCoords = [], indices = [];
    const lengthSegments = 15;
    const radialSegments = 12;
    const snoutLength = 0.6;

    for (let i = 0; i <= lengthSegments; i++) {
        const t = i / lengthSegments;
        const z = t * snoutLength;

        const radiusFactor = Math.pow(1 - t, sharpness);

        const radiusX = (0.35 * radiusFactor) + (tipRadius * t);
        const radiusY = (0.25 * radiusFactor) + (tipRadius * 0.7 * t);

        for (let j = 0; j <= radialSegments; j++) {
            const angle = (j / radialSegments) * Math.PI * 2;
            let x = Math.cos(angle) * radiusX;
            let y = Math.sin(angle) * radiusY;

            if (angle > Math.PI) {
                const bottomFactor = Math.abs(angle - Math.PI * 1.5) / (Math.PI * 0.5);
                y *= (0.6 + bottomFactor * 0.4);
            } else {
                y *= 0.9;
            }

            positions.push(x, y, z);

            const nx = x / (radiusX + 0.01);
            const ny = y / (radiusY + 0.01);
            const nz = t * 0.3;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            normals.push(nx / len, ny / len, nz / len);

            texCoords.push(j / radialSegments, t);
        }
    }

    for (let i = 0; i < lengthSegments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const a = i * (radialSegments + 1) + j;
            const b = a + radialSegments + 1;
            const c = a + 1;
            const d = b + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    const tipCenter = positions.length / 3;
    positions.push(0, 0, snoutLength);
    normals.push(0, 0, 1);
    texCoords.push(0.5, 1);

    const lastRingStart = lengthSegments * (radialSegments + 1);
    for (let j = 0; j < radialSegments; j++) {
        const a = lastRingStart + j;
        const b = lastRingStart + j + 1;
        indices.push(a, tipCenter, b);
    }

    return { positions, normals, texCoords, indices };
}

function createCurvedMustache(direction = 1) {
    const positions = [], normals = [], texCoords = [], indices = [];
    const segments = 30;
    const radialSegments = 8;
    const thickness = 0.06;

    function getPathPoint(t) {
        const mustacheLength = 2;
        const x = direction * t * mustacheLength;
        const waveFrequency = 3;
        const waveAmplitude = 0.12;
        const y = Math.sin(t * Math.PI * waveFrequency) * waveAmplitude;
        const z = t * 0.15 + Math.cos(t * Math.PI * waveFrequency) * 0.05;
        const upwardCurve = t * t * 0.15;

        return [x, y + upwardCurve, z];
    }

    function getPathTangent(t) {
        const dt = 0.01;
        const p1 = getPathPoint(Math.max(0, t - dt));
        const p2 = getPathPoint(Math.min(1, t + dt));
        return [
            p2[0] - p1[0],
            p2[1] - p1[1],
            p2[2] - p1[2]
        ];
    }

    function normalize(v) {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 1, 0];
    }

    function cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = getPathPoint(t);
        const tangent = normalize(getPathTangent(t));

        const up = [0, 1, 0];
        const right = normalize(cross(tangent, up));
        const actualUp = normalize(cross(right, tangent));

        const radiusScale = 1.0 - t * 0.3;
        const currentThickness = thickness * radiusScale;

        for (let j = 0; j <= radialSegments; j++) {
            const angle = (j / radialSegments) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const scaleX = 5.0;
            const scaleY = 0.35;
            const scaleZ = 5.5;

            const nx = right[0] * cos * scaleX + actualUp[0] * sin * scaleY;
            const ny = right[1] * cos * scaleX + actualUp[1] * sin * scaleY;
            const nz = right[2] * cos * scaleX + actualUp[2] * sin * scaleY;

            const normalLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
            const normNx = normalLen > 0 ? nx / normalLen : 0;
            const normNy = normalLen > 0 ? ny / normalLen : 1;
            const normNz = normalLen > 0 ? nz / normalLen : 0;

            const offsetX = right[0] * cos * currentThickness * scaleX + actualUp[0] * sin * currentThickness * scaleY;
            const offsetY = right[1] * cos * currentThickness * scaleX + actualUp[1] * sin * currentThickness * scaleY;
            const offsetZ = right[2] * cos * currentThickness * scaleX + actualUp[2] * sin * currentThickness * scaleZ;

            positions.push(
                point[0] + offsetX,
                point[1] + offsetY,
                point[2] + offsetZ
            );

            normals.push(normNx, normNy, normNz);
            texCoords.push(j / radialSegments, t);
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const a = i * (radialSegments + 1) + j;
            const b = a + radialSegments + 1;
            const c = a + 1;
            const d = b + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    return { positions, normals, texCoords, indices };
}

function createFlameMustache() {
    const positions = [], normals = [], texCoords = [], indices = [];
    const segments = 40;
    const radialSegments = 12;
    const flameLength = 0.8;

    function getFlamePoint(t) {
        const widthProfile = Math.pow(1 - t, 1.5) * 0.3 + 0.02;
        const flicker1 = Math.sin(t * Math.PI * 4) * widthProfile * 0.3;
        const flicker2 = Math.sin(t * Math.PI * 7 + 1) * widthProfile * 0.2;

        return {
            x: flicker1 + flicker2,
            y: -t * flameLength,
            z: Math.abs(Math.sin(t * Math.PI * 3)) * 0.08,
            width: widthProfile
        };
    }

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const flame = getFlamePoint(t);

        const nextT = Math.min(t + 0.01, 1);
        const nextFlame = getFlamePoint(nextT);
        const tangent = [
            nextFlame.x - flame.x,
            nextFlame.y - flame.y,
            nextFlame.z - flame.z
        ];
        const tLen = Math.sqrt(tangent[0]**2 + tangent[1]**2 + tangent[2]**2);
        tangent[0] /= tLen; tangent[1] /= tLen; tangent[2] /= tLen;

        for (let j = 0; j <= radialSegments; j++) {
            const angle = (j / radialSegments) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const scaleX = 2.0;
            const scaleZ = 1.0;

            const x = flame.x + cos * flame.width * scaleX;
            const y = flame.y;
            const z = flame.z + sin * flame.width * scaleZ;

            positions.push(x, y, z);

            const nx = cos * scaleX;
            const nz = sin * scaleZ;
            const nLen = Math.sqrt(nx * nx + 0.1 * 0.1 + nz * nz);
            normals.push(nx / nLen, 0.1 / nLen, nz / nLen);

            texCoords.push(j / radialSegments, t);
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const i0 = i * (radialSegments + 1) + j;
            const i1 = i0 + 1;
            const i2 = i0 + radialSegments + 1;
            const i3 = i2 + 1;

            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    // Top cap
    const topCenter = positions.length / 3;
    positions.push(0, 0, 0);
    normals.push(0, 1, 0);
    texCoords.push(0.5, 0.5);

    for (let j = 0; j < radialSegments; j++) {
        indices.push(topCenter, j + 1, j);
    }

    // Bottom cap
    const bottomCenter = positions.length / 3;
    const flame = getFlamePoint(1);
    positions.push(flame.x, flame.y, flame.z);
    normals.push(0, -1, 0);
    texCoords.push(0.5, 0.5);

    const lastRingStart = segments * (radialSegments + 1);
    for (let j = 0; j < radialSegments; j++) {
        indices.push(bottomCenter, lastRingStart + j, lastRingStart + j + 1);
    }

    return { positions, normals, texCoords, indices };
}

/**
 * Create a hyperboloid shape - hourglass/waist shape for organic limbs
 * Mathematical form: x²/a² + z²/b² - y²/c² = 1 (one-sheet hyperboloid)
 *
 * @param {number} radiusTop - Radius at top
 * @param {number} radiusBottom - Radius at bottom
 * @param {number} radiusWaist - Radius at narrowest point (waist)
 * @param {number} height - Total height
 * @param {number} waistPosition - Position of waist (0-1, where 0.5 is middle)
 * @param {number} segments - Radial segments
 * @param {number} heightSegments - Vertical segments
 */
function createHyperboloid(
    radiusTop = 0.3,
    radiusBottom = 0.25,
    radiusWaist = 0.18,
    height = 2.0,
    waistPosition = 0.5,
    segments = 16,
    heightSegments = 20
) {
    const positions = [], normals = [], texCoords = [], indices = [];

    // Generate vertices
    for (let y = 0; y <= heightSegments; y++) {
        const v = y / heightSegments;
        const yPos = (v - 0.5) * height;

        // Smooth radius interpolation using cosine curve for organic shape
        let radius;

        if (v < waistPosition) {
            // Top to waist: smooth curve
            const t = v / waistPosition; // 0 to 1
            const curve = Math.cos((1 - t) * Math.PI * 0.5); // Smooth ease
            radius = radiusTop + (radiusWaist - radiusTop) * curve;
        } else {
            // Waist to bottom: smooth curve
            const t = (v - waistPosition) / (1 - waistPosition); // 0 to 1
            const curve = Math.cos(t * Math.PI * 0.5); // Smooth ease
            radius = radiusWaist + (radiusBottom - radiusWaist) * (1 - curve);
        }

        // Create circle of vertices at this height
        for (let i = 0; i <= segments; i++) {
            const u = i / segments;
            const angle = u * Math.PI * 2;
            const x = Math.cos(angle);
            const z = Math.sin(angle);

            positions.push(radius * x, yPos, radius * z);

            // Calculate normal (perpendicular to surface)
            // For hyperboloid, normal includes slope component
            const nextV = Math.min(v + 0.01, 1);
            const nextYPos = (nextV - 0.5) * height;

            let nextRadius;
            if (nextV < waistPosition) {
                const t = nextV / waistPosition;
                const curve = Math.cos((1 - t) * Math.PI * 0.5);
                nextRadius = radiusTop + (radiusWaist - radiusTop) * curve;
            } else {
                const t = (nextV - waistPosition) / (1 - waistPosition);
                const curve = Math.cos(t * Math.PI * 0.5);
                nextRadius = radiusWaist + (radiusBottom - radiusWaist) * (1 - curve);
            }

            const slope = (nextRadius - radius) / (nextYPos - yPos);
            const nx = x;
            const ny = slope; // Slope determines Y component of normal
            const nz = z;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

            normals.push(nx / len, ny / len, nz / len);
            texCoords.push(u, v);
        }
    }

    // Generate indices
    for (let y = 0; y < heightSegments; y++) {
        for (let i = 0; i < segments; i++) {
            const i0 = y * (segments + 1) + i;
            const i1 = i0 + 1;
            const i2 = i0 + segments + 1;
            const i3 = i2 + 1;

            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    // Top cap
    const topCenter = positions.length / 3;
    positions.push(0, height / 2, 0);
    normals.push(0, 1, 0);
    texCoords.push(0.5, 0.5);

    const topStart = heightSegments * (segments + 1);
    for (let i = 0; i < segments; i++) {
        indices.push(topCenter, topStart + i + 1, topStart + i);
    }

    // Bottom cap
    const bottomCenter = positions.length / 3;
    positions.push(0, -height / 2, 0);
    normals.push(0, -1, 0);
    texCoords.push(0.5, 0.5);

    const bottomStart = 0;
    for (let i = 0; i < segments; i++) {
        indices.push(bottomCenter, bottomStart + i, bottomStart + i + 1);
    }

    return { positions, normals, texCoords, indices };
}

function createSpoon(
    handleRadiusX = 0.05,
    handleRadiusZ = 0.01,
    handleLength = 0.8,
    bowlWidth = 0.5,
    bowlLength = 0.7,
    bowlThickness = 0.05,
    bowlRotationX = 0,     // Rotasi bowl X-axis (tilt depan/belakang)
    bowlRotationY = 0,     // Rotasi bowl Y-axis (putar kiri/kanan)
    bowlRotationZ = 0,     // Rotasi bowl Z-axis (roll samping)
    bowlOffsetX = 0,       // Translasi bowl X (kiri/kanan)
    bowlOffsetY = 0,       // Translasi bowl Y (atas/bawah)
    bowlOffsetZ = 0        // Translasi bowl Z (depan/belakang)
) {
    const positions = [], normals = [], texCoords = [], indices = [];

    const handleSegments = 11;
    const handleRings = 1;

    let vertexOffset = 0;

    // Handle vertices
    for (let i = 0; i <= handleRings; i++) {
        const y = (i / handleRings) * handleLength;

        for (let j = 0; j <= handleSegments; j++) {
            const angle = (j / handleSegments) * Math.PI * 2;
            const x = Math.cos(angle) * handleRadiusX;
            const z = Math.sin(angle) * handleRadiusZ;

            positions.push(x, y, z);
            normals.push(Math.cos(angle), 0, Math.sin(angle));
            texCoords.push(j / handleSegments, i / handleRings);
        }
    }

    // Handle indices
    for (let i = 0; i < handleRings; i++) {
        for (let j = 0; j < handleSegments; j++) {
            const i0 = i * (handleSegments + 1) + j;
            const i1 = i0 + 1;
            const i2 = i0 + handleSegments + 1;
            const i3 = i2 + 1;

            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    vertexOffset = positions.length / 3;

    const bowlSegments = 16;
    const bowlRings = 12;
    const bowlStartY = handleLength;

    // Bowl vertices - ELLIPSOID 3D dengan 3 radius berbeda (X, Y, Z)
    const bowlRadiusX = bowlWidth;      // Lebar horizontal (kiri-kanan)
    const bowlRadiusY = bowlThickness;  // Tinggi vertikal (atas-bawah) - KECIL = GEPENG
    const bowlRadiusZ = bowlLength;     // Panjang depth (depan-belakang)

    // Posisi tengah ellipsoid dengan offset custom
    const bowlCenter = [
        0 + bowlOffsetX,                    // X: kiri(-)/kanan(+)
        bowlStartY + bowlOffsetY,           // Y: bawah(-)/atas(+)
        bowlLength * 0.5 + bowlOffsetZ      // Z: belakang(-)/depan(+)
    ];

    // Helper: Rotate point around origin
    function rotatePoint(px, py, pz, rx, ry, rz) {
        let x = px, y = py, z = pz;

        // Rotate X-axis
        if (rx !== 0) {
            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const y1 = y * cosX - z * sinX;
            const z1 = y * sinX + z * cosX;
            y = y1; z = z1;
        }

        // Rotate Y-axis
        if (ry !== 0) {
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const x1 = x * cosY + z * sinY;
            const z1 = -x * sinY + z * cosY;
            x = x1; z = z1;
        }

        // Rotate Z-axis
        if (rz !== 0) {
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);
            const x1 = x * cosZ - y * sinZ;
            const y1 = x * sinZ + y * cosZ;
            x = x1; y = y1;
        }

        return [x, y, z];
    }

    for (let lat = 0; lat <= bowlRings; lat++) {
        const theta = lat * Math.PI / bowlRings; // 0 to PI (top to bottom)
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let lon = 0; lon <= bowlSegments; lon++) {
            const phi = lon * 2 * Math.PI / bowlSegments; // 0 to 2PI (around)
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            // Spherical coordinates to Cartesian
            const sx = cosPhi * sinTheta;
            const sy = cosTheta;
            const sz = sinPhi * sinTheta;

            // Scale by radius (ELLIPSOID!)
            const localX = bowlRadiusX * sx;
            const localY = bowlRadiusY * sy;
            const localZ = bowlRadiusZ * sz;

            // APPLY ROTATION around origin (bowl local space)
            const rotated = rotatePoint(localX, localY, localZ, bowlRotationX, bowlRotationY, bowlRotationZ);

            // Translate ke posisi final (world space)
            positions.push(
                bowlCenter[0] + rotated[0],
                bowlCenter[1] + rotated[1],
                bowlCenter[2] + rotated[2]
            );

            // Rotate normal juga
            const rotatedNormal = rotatePoint(sx, sy, sz, bowlRotationX, bowlRotationY, bowlRotationZ);
            normals.push(rotatedNormal[0], rotatedNormal[1], rotatedNormal[2]);

            // Texture coordinates
            texCoords.push(lon / bowlSegments, lat / bowlRings);
        }
    }

    // Bowl indices
    for (let i = 0; i < bowlRings; i++) {
        for (let j = 0; j < bowlSegments; j++) {
            const i0 = vertexOffset + i * (bowlSegments + 1) + j;
            const i1 = i0 + 1;
            const i2 = i0 + bowlSegments + 1;
            const i3 = i2 + 1;

            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    // Handle bottom cap
    const handleBottomCenter = positions.length / 3;
    positions.push(0, 0, 0);
    normals.push(0, -1, 0);
    texCoords.push(0.5, 0.5);

    for (let j = 0; j < handleSegments; j++) {
        indices.push(handleBottomCenter, j, j + 1);
    }

    // Bowl is now a complete SPHERE - no need for extra caps or tips!

    return { positions, normals, texCoords, indices };
}

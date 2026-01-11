/**
 * BezierHand.js
 *
 * Bezier-Based Hand Modelling in Pure WebGL (Alakazam Style)
 * Creates organic 3D hand structure using Cubic Bezier curves and Frenet frames
 *
 * Mathematical Foundation:
 * - Cubic Bezier curve: C(u) = (1-u)³P₀ + 3(1-u)²uP₁ + 3(1-u)u²P₂ + u³P₃
 * - Tubular surface: P(u,v) = C(u) + r(u)[n(u)cos(v) + b(u)sin(v)]
 * - Frenet frame: t = dC/du, n = (dt/du)/||dt/du||, b = t × n
 */

class BezierCurve {
    /**
     * Cubic Bezier curve with 4 control points
     * @param {Array} P0 - Start point [x, y, z]
     * @param {Array} P1 - First control point
     * @param {Array} P2 - Second control point
     * @param {Array} P3 - End point
     */
    constructor(P0, P1, P2, P3) {
        this.P0 = P0;
        this.P1 = P1;
        this.P2 = P2;
        this.P3 = P3;
    }

    /**
     * Evaluate Bezier curve at parameter u ∈ [0,1]
     * C(u) = (1-u)³P₀ + 3(1-u)²uP₁ + 3(1-u)u²P₂ + u³P₃
     */
    point(u) {
        const u2 = u * u;
        const u3 = u2 * u;
        const inv = 1 - u;
        const inv2 = inv * inv;
        const inv3 = inv2 * inv;

        return [
            inv3 * this.P0[0] + 3 * inv2 * u * this.P1[0] + 3 * inv * u2 * this.P2[0] + u3 * this.P3[0],
            inv3 * this.P0[1] + 3 * inv2 * u * this.P1[1] + 3 * inv * u2 * this.P2[1] + u3 * this.P3[1],
            inv3 * this.P0[2] + 3 * inv2 * u * this.P1[2] + 3 * inv * u2 * this.P2[2] + u3 * this.P3[2]
        ];
    }

    /**
     * Evaluate Bezier curve tangent (first derivative) at u
     * C'(u) = 3(1-u)²(P₁-P₀) + 6(1-u)u(P₂-P₁) + 3u²(P₃-P₂)
     */
    tangent(u) {
        const u2 = u * u;
        const inv = 1 - u;
        const inv2 = inv * inv;

        return [
            3 * inv2 * (this.P1[0] - this.P0[0]) + 6 * inv * u * (this.P2[0] - this.P1[0]) + 3 * u2 * (this.P3[0] - this.P2[0]),
            3 * inv2 * (this.P1[1] - this.P0[1]) + 6 * inv * u * (this.P2[1] - this.P1[1]) + 3 * u2 * (this.P3[1] - this.P2[1]),
            3 * inv2 * (this.P1[2] - this.P0[2]) + 6 * inv * u * (this.P2[2] - this.P1[2]) + 3 * u2 * (this.P3[2] - this.P2[2])
        ];
    }
}

/**
 * Vector math utilities for Frenet frame computation
 */
const Vec3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (v, s) => [v[0] * s, v[1] * s, v[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ],
    length: (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]),
    normalize: (v) => {
        const len = Vec3.length(v);
        return len > 0.00001 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 1];
    }
};

/**
 * Tubular mesh generator from Bezier curve
 * Generates smooth cylindrical mesh using Frenet frames
 */
class TubularMesh {
    /**
     * @param {BezierCurve} curve - Path to follow
     * @param {number} segments - Number of segments along curve (u samples)
     * @param {number} radialSegments - Number of radial segments (v samples)
     * @param {Function} radiusFunc - Function(u) -> radius at u
     */
    constructor(curve, segments = 16, radialSegments = 8, radiusFunc = null) {
        this.curve = curve;
        this.segments = segments;
        this.radialSegments = radialSegments;
        this.radiusFunc = radiusFunc || ((u) => 0.1 * (1 - u * 0.3)); // Taper from base to tip
    }

    /**
     * Compute Frenet frame at point u
     * Returns [normal, binormal] perpendicular to tangent
     */
    computeFrenetFrame(u, prevNormal = null) {
        // Get tangent vector
        let tangent = Vec3.normalize(this.curve.tangent(u));

        // Initialize normal if first frame
        if (!prevNormal) {
            // Find perpendicular vector to tangent
            const arbitrary = Math.abs(tangent[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
            prevNormal = Vec3.normalize(Vec3.cross(tangent, arbitrary));
        }

        // Gram-Schmidt orthogonalization to maintain smoothness
        const dotProduct = Vec3.dot(prevNormal, tangent);
        const normal = Vec3.normalize(Vec3.sub(prevNormal, Vec3.scale(tangent, dotProduct)));

        // Binormal perpendicular to both
        const binormal = Vec3.normalize(Vec3.cross(tangent, normal));

        return [normal, binormal];
    }

    /**
     * Generate tubular mesh geometry
     * Returns {positions, normals, indices}
     */
    generate() {
        const positions = [];
        const normals = [];
        const indices = [];

        let prevNormal = null;

        // Generate vertices along curve
        for (let i = 0; i <= this.segments; i++) {
            const u = i / this.segments;
            const center = this.curve.point(u);
            const radius = this.radiusFunc(u);

            const [normal, binormal] = this.computeFrenetFrame(u, prevNormal);
            prevNormal = normal;

            // Generate ring of vertices around center
            for (let j = 0; j <= this.radialSegments; j++) {
                const v = (j / this.radialSegments) * Math.PI * 2;
                const cos = Math.cos(v);
                const sin = Math.sin(v);

                // P(u,v) = C(u) + r(u)[n(u)cos(v) + b(u)sin(v)]
                const offset = Vec3.add(
                    Vec3.scale(normal, cos * radius),
                    Vec3.scale(binormal, sin * radius)
                );
                const position = Vec3.add(center, offset);

                positions.push(...position);

                // Normal for lighting (points outward from tube surface)
                const normalVec = Vec3.normalize(Vec3.add(
                    Vec3.scale(normal, cos),
                    Vec3.scale(binormal, sin)
                ));
                normals.push(...normalVec);
            }
        }

        // Generate indices for triangle strip
        for (let i = 0; i < this.segments; i++) {
            for (let j = 0; j < this.radialSegments; j++) {
                const a = i * (this.radialSegments + 1) + j;
                const b = a + this.radialSegments + 1;

                // Two triangles per quad
                indices.push(a, b, a + 1);
                indices.push(b, b + 1, a + 1);
            }
        }

        return { positions, normals, indices };
    }
}

/**
 * Chicken-foot style hand generator (Mega Alakazam)
 * Creates 3 curved fingers in claw-like arrangement
 */
class ChickenFootHand {
    /**
     * @param {Object} params - Configuration parameters
     * @param {Array} params.wristScale - Wrist scale [X, Y, Z], default [1, 1, 1]
     * @param {Array} params.centerFingerScale - Center finger scale [X, Y, Z], default [1, 1, 1]
     * @param {Array} params.leftFingerScale - Left finger scale [X, Y, Z], default [1, 1, 1]
     * @param {Array} params.rightFingerScale - Right finger scale [X, Y, Z], default [1, 1, 1]
     */
    constructor(params = {}) {
        this.wristScale = params.wristScale || [1, 1, 1];
        this.centerFingerScale = params.centerFingerScale || [1, 1, 1];
        this.leftFingerScale = params.leftFingerScale || [1, 1, 1];
        this.rightFingerScale = params.rightFingerScale || [1, 1, 1];
    }

    /**
     * Create wrist (short thick cylinder connecting to arm)
     */
    createWrist() {
        const [scaleX, scaleY, scaleZ] = this.wristScale;

        const wristCurve = new BezierCurve(
            [0 * scaleX, 0 * scaleY, 0 * scaleZ],
            [0 * scaleX, -0.15 * scaleY, 0 * scaleZ],
            [0 * scaleX, -0.25 * scaleY, 0 * scaleZ],
            [0 * scaleX, -0.35 * scaleY, 0 * scaleZ]
        );

        const mesh = new TubularMesh(
            wristCurve,
            6,  // segments
            12, // radial segments
            (u) => 0.18 * (1 - u * 0.2) * Math.max(scaleX, scaleZ) // Radius scale
        );

        return mesh.generate();
    }

    /**
     * Create center finger (longest, points forward)
     */
    createCenterFinger() {
        const [scaleX, scaleY, scaleZ] = this.centerFingerScale;

        const fingerCurve = new BezierCurve(
            [0 * scaleX, -0.35 * scaleY, 0 * scaleZ],                    // Start at wrist end
            [0 * scaleX, -0.5 * scaleY, 0.3 * scaleZ],                   // Curve forward
            [0 * scaleX, -0.6 * scaleY, 0.6 * scaleZ],                   // Continue curve
            [0 * scaleX, -0.55 * scaleY, 0.9 * scaleZ]                   // End pointing slightly up (claw)
        );

        const mesh = new TubularMesh(
            fingerCurve,
            20, // More segments for smooth curve
            8,
            (u) => (0.12 - u * 0.08) * Math.max(scaleX, scaleZ) // Taper to point
        );

        return mesh.generate();
    }

    /**
     * Create left finger (curves left and outward)
     */
    createLeftFinger() {
        const [scaleX, scaleY, scaleZ] = this.leftFingerScale;

        const fingerCurve = new BezierCurve(
            [-0.08 * scaleX, -0.37 * scaleY, 0 * scaleZ],                // Start slightly left of wrist
            [-0.25 * scaleX, -0.48 * scaleY, 0.25 * scaleZ],             // Curve left and forward
            [-0.4 * scaleX, -0.55 * scaleY, 0.5 * scaleZ],               // Continue curve
            [-0.5 * scaleX, -0.5 * scaleY, 0.7 * scaleZ]                 // End pointing outward
        );

        const mesh = new TubularMesh(
            fingerCurve,
            18,
            8,
            (u) => (0.11 - u * 0.075) * Math.max(scaleX, scaleZ)
        );

        return mesh.generate();
    }

    /**
     * Create right finger (curves right and outward)
     */
    createRightFinger() {
        const [scaleX, scaleY, scaleZ] = this.rightFingerScale;

        const fingerCurve = new BezierCurve(
            [0.08 * scaleX, -0.37 * scaleY, 0 * scaleZ],                 // Start slightly right of wrist
            [0.25 * scaleX, -0.48 * scaleY, 0.25 * scaleZ],              // Curve right and forward
            [0.4 * scaleX, -0.55 * scaleY, 0.5 * scaleZ],                // Continue curve
            [0.5 * scaleX, -0.5 * scaleY, 0.7 * scaleZ]                  // End pointing outward
        );

        const mesh = new TubularMesh(
            fingerCurve,
            18,
            8,
            (u) => (0.11 - u * 0.075) * Math.max(scaleX, scaleZ)
        );

        return mesh.generate();
    }

    /**
     * Create fingertip claw (sharp point at end of finger)
     */
    createClaw(baseRadius) {
        const clawCurve = new BezierCurve(
            [0, 0, 0],
            [0, -0.05, 0.08],
            [0, -0.08, 0.15],
            [0, -0.1, 0.22]
        );

        const mesh = new TubularMesh(
            clawCurve,
            8,
            6,
            (u) => baseRadius * (1 - u * 0.95) * this.scale // Sharp taper to point
        );

        return mesh.generate();
    }

    /**
     * Get individual toe geometries for separate BodyParts
     * Returns object with wrist, centerToe, leftToe, rightToe
     */
    getSeparateToeGeometries() {
        return {
            wrist: this.createWrist(),
            centerToe: this.createCenterFinger(),
            leftToe: this.createLeftFinger(),
            rightToe: this.createRightFinger()
        };
    }

    /**
     * Combine all parts into single geometry
     */
    generateFullHand() {
        const parts = [
            this.createWrist(),
            this.createCenterFinger(),
            this.createLeftFinger(),
            this.createRightFinger()
        ];

        // Merge all geometries
        const positions = [];
        const normals = [];
        const indices = [];
        let indexOffset = 0;

        for (const part of parts) {
            positions.push(...part.positions);
            normals.push(...part.normals);

            // Offset indices for merged geometry
            for (const idx of part.indices) {
                indices.push(idx + indexOffset);
            }

            indexOffset += part.positions.length / 3;
        }

        return { positions, normals, indices };
    }

    /**
     * Get geometry in format compatible with alakazam
     */
    getGeometryForAlakazam() {
        const geometry = this.generateFullHand();

        // Add texture coordinates (simple cylindrical mapping)
        const texCoords = [];
        const numVerts = geometry.positions.length / 3;
        for (let i = 0; i < numVerts; i++) {
            texCoords.push(0.5, 0.5); // Placeholder
        }

        return {
            positions: geometry.positions,
            normals: geometry.normals,
            texCoords: texCoords,
            indices: geometry.indices
        };
    }
}

/**
 * ChickenFootLeg - Extended class for LEGS with customizable Bezier curve parameters
 * Allows editing toe curves independently from hand fingers
 */
class ChickenFootLeg extends ChickenFootHand {
    /**
     * @param {Object} params - Configuration parameters
     * @param {Array} params.wristScale - Ankle scale [X, Y, Z]
     * @param {Array} params.centerToeScale - Center toe scale
     * @param {Array} params.leftToeScale - Left toe scale
     * @param {Array} params.rightToeScale - Right toe scale
     * @param {Array} params.centerToeCurve - Center toe Bezier control points [[P0], [P1], [P2], [P3]]
     * @param {Array} params.leftToeCurve - Left toe Bezier control points
     * @param {Array} params.rightToeCurve - Right toe Bezier control points
     */
    constructor(params = {}) {
        super({
            wristScale: params.wristScale || [1, 1, 1],
            centerFingerScale: params.centerToeScale || [1, 1, 1],
            leftFingerScale: params.leftToeScale || [1, 1, 1],
            rightFingerScale: params.rightToeScale || [1, 1, 1]
        });

        // Custom Bezier curves for toes (if provided)
        this.centerToeCurve = params.centerToeCurve;
        this.leftToeCurve = params.leftToeCurve;
        this.rightToeCurve = params.rightToeCurve;
    }

    /**
     * Create center toe with custom Bezier curve
     */
    createCenterFinger() {
        const [scaleX, scaleY, scaleZ] = this.centerFingerScale;

        // Use custom curve if provided, otherwise use default toe curve
        const defaultCurve = [
            [0, -0.35, 0],      // P0: Start at ankle
            [0, -0.45, 0.4],    // P1: Curve forward more
            [0, -0.5, 0.7],     // P2: Continue forward
            [0, -0.45, 1.0]     // P3: End pointing forward (toe)
        ];

        const curve = this.centerToeCurve || defaultCurve;

        const fingerCurve = new BezierCurve(
            [curve[0][0] * scaleX, curve[0][1] * scaleY, curve[0][2] * scaleZ],
            [curve[1][0] * scaleX, curve[1][1] * scaleY, curve[1][2] * scaleZ],
            [curve[2][0] * scaleX, curve[2][1] * scaleY, curve[2][2] * scaleZ],
            [curve[3][0] * scaleX, curve[3][1] * scaleY, curve[3][2] * scaleZ]
        );

        const mesh = new TubularMesh(
            fingerCurve,
            20,
            8,
            (u) => (0.12 - u * 0.08) * Math.max(scaleX, scaleZ)
        );

        return mesh.generate();
    }

    /**
     * Create left toe with custom Bezier curve
     */
    createLeftFinger() {
        const [scaleX, scaleY, scaleZ] = this.leftFingerScale;

        const defaultCurve = [
            [-0.08, -0.37, 0],      // P0: Start slightly left
            [-0.3, -0.48, 0.3],     // P1: Curve left and forward
            [-0.45, -0.5, 0.6],     // P2: Continue curve
            [-0.55, -0.45, 0.85]    // P3: End pointing outward
        ];

        const curve = this.leftToeCurve || defaultCurve;

        const fingerCurve = new BezierCurve(
            [curve[0][0] * scaleX, curve[0][1] * scaleY, curve[0][2] * scaleZ],
            [curve[1][0] * scaleX, curve[1][1] * scaleY, curve[1][2] * scaleZ],
            [curve[2][0] * scaleX, curve[2][1] * scaleY, curve[2][2] * scaleZ],
            [curve[3][0] * scaleX, curve[3][1] * scaleY, curve[3][2] * scaleZ]
        );

        const mesh = new TubularMesh(
            fingerCurve,
            18,
            8,
            (u) => (0.11 - u * 0.075) * Math.max(scaleX, scaleZ)
        );

        return mesh.generate();
    }

    /**
     * Create right toe with custom Bezier curve
     */
    createRightFinger() {
        const [scaleX, scaleY, scaleZ] = this.rightFingerScale;

        const defaultCurve = [
            [0.08, -0.37, 0],       // P0: Start slightly right
            [0.3, -0.48, 0.3],      // P1: Curve right and forward
            [0.45, -0.5, 0.6],      // P2: Continue curve
            [0.55, -0.45, 0.85]     // P3: End pointing outward
        ];

        const curve = this.rightToeCurve || defaultCurve;

        const fingerCurve = new BezierCurve(
            [curve[0][0] * scaleX, curve[0][1] * scaleY, curve[0][2] * scaleZ],
            [curve[1][0] * scaleX, curve[1][1] * scaleY, curve[1][2] * scaleZ],
            [curve[2][0] * scaleX, curve[2][1] * scaleY, curve[2][2] * scaleZ],
            [curve[3][0] * scaleX, curve[3][1] * scaleY, curve[3][2] * scaleZ]
        );

        const mesh = new TubularMesh(
            fingerCurve,
            18,
            8,
            (u) => (0.11 - u * 0.075) * Math.max(scaleX, scaleZ)
        );

        return mesh.generate();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BezierCurve, TubularMesh, ChickenFootHand, ChickenFootLeg, Vec3 };
}

/**
 * RoundedIsoscelesTriangle.js
 *
 * Class for creating Rounded Isosceles Triangle (Isosceles triangular pyramid with smoothed tip)
 * Based on RoundedTriangleObject.js with modifications for isosceles shape
 *
 * Uses Loop Subdivision algorithm to create rounded/blunt tip:
 * - Starts from isosceles triangular pyramid
 * - Applies Loop subdivision multiple times for smoothing
 * - Results in rounded isosceles triangle with smooth normals
 */

class RoundedIsoscelesTriangle {
    /**
     * Create rounded isosceles triangle with Loop Subdivision
     * @param {number} subdivisionLevel - Subdivision level (higher = smoother), default 4
     * @param {number} height - Height of pyramid (Y axis), default 2.0
     * @param {number} baseWidth - Width of base (X axis), default 1.5
     * @param {number} baseDepth - Depth of base (Z axis), default 1.0 (smaller for isosceles)
     */
    constructor(subdivisionLevel = 4, height = 2.0, baseWidth = 1.5, baseDepth = 1.0) {
        this.geometry = null;
        this.subdivisionLevel = subdivisionLevel;
        this.height = height;        // Height of pyramid (Y axis)
        this.baseWidth = baseWidth;  // Width of base (X axis) - longer side
        this.baseDepth = baseDepth;  // Depth of base (Z axis) - shorter side for isosceles
    }

    /**
     * Generate rounded isosceles triangle geometry
     */
    generate() {
        // Step 1: Create base isosceles triangular pyramid
        let mesh = this.createIsoscelesPyramid();

        // Step 2: Apply Loop subdivision
        for (let i = 0; i < this.subdivisionLevel; i++) {
            mesh = this.loopSubdivide(mesh);
        }

        // Step 3: Calculate smooth normals
        this.calculateSmoothNormals(mesh);

        this.geometry = mesh;
        return this.geometry;
    }

    /**
     * Create base isosceles triangular pyramid
     * Isosceles triangle has two equal sides and one different (base is wider than depth)
     */
    createIsoscelesPyramid() {
        const h = this.height;   // Height (Y axis)
        const w = this.baseWidth;  // Base width (X axis) - longer dimension
        const d = this.baseDepth;  // Base depth (Z axis) - shorter dimension for isosceles

        // 4 vertices - apex at top, triangular base at bottom
        // For isosceles: make it wider in X direction, narrower in Z direction
        const positions = [
            0, h, 0,                    // 0: apex/tip (top)
            w/2, 0, 0,                  // 1: base front (center front)
            -w/2, 0, d/2,              // 2: base left back
            -w/2, 0, -d/2              // 3: base right back
        ];

        // 4 triangular faces (CCW winding)
        const indices = [
            0, 1, 2,  // Front-left face
            0, 2, 3,  // Back face
            0, 3, 1,  // Front-right face
            1, 3, 2   // Base (bottom)
        ];

        return {
            positions: positions,
            indices: indices
        };
    }

    /**
     * Loop Subdivision algorithm
     * Same as RoundedTriangleObject - creates smooth rounded surfaces
     */
    loopSubdivide(mesh) {
        const oldPos = mesh.positions;
        const oldIndices = mesh.indices;
        const numOldVerts = oldPos.length / 3;

        // Build adjacency information
        const edges = new Map();      // edge -> [v1, v2, opposite1, opposite2]
        const vertexEdges = new Map(); // vertex -> [neighboring vertex indices]

        // Build edges and adjacency
        for (let i = 0; i < oldIndices.length; i += 3) {
            const i0 = oldIndices[i];
            const i1 = oldIndices[i + 1];
            const i2 = oldIndices[i + 2];

            // Add all 3 edges of this triangle
            this.addEdge(edges, i0, i1, i2);
            this.addEdge(edges, i1, i2, i0);
            this.addEdge(edges, i2, i0, i1);

            // Build vertex adjacency
            this.addVertexNeighbor(vertexEdges, i0, i1);
            this.addVertexNeighbor(vertexEdges, i0, i2);
            this.addVertexNeighbor(vertexEdges, i1, i0);
            this.addVertexNeighbor(vertexEdges, i1, i2);
            this.addVertexNeighbor(vertexEdges, i2, i0);
            this.addVertexNeighbor(vertexEdges, i2, i1);
        }

        const newPositions = [];
        const newIndices = [];

        // Step 1: Update OLD vertex positions (even vertices)
        for (let i = 0; i < numOldVerts; i++) {
            const neighbors = vertexEdges.get(i) || [];
            const n = neighbors.length;

            if (n === 0) {
                // Isolated vertex
                newPositions.push(oldPos[i*3], oldPos[i*3+1], oldPos[i*3+2]);
                continue;
            }

            // Loop subdivision weight formula
            const cosVal = Math.cos(2.0 * Math.PI / n);
            const beta = (1.0 / n) * (5.0/8.0 - Math.pow(3.0/8.0 + cosVal/4.0, 2));
            const alpha = 1.0 - n * beta;

            // Weighted average: alpha * originalPos + beta * sum(neighborPos)
            let x = alpha * oldPos[i*3];
            let y = alpha * oldPos[i*3 + 1];
            let z = alpha * oldPos[i*3 + 2];

            for (const nIdx of neighbors) {
                x += beta * oldPos[nIdx*3];
                y += beta * oldPos[nIdx*3 + 1];
                z += beta * oldPos[nIdx*3 + 2];
            }

            newPositions.push(x, y, z);
        }

        // Step 2: Create NEW edge vertices (odd vertices)
        const edgeVertexMap = new Map(); // edge key -> new vertex index

        for (const [edgeKey, edgeData] of edges) {
            const [v1, v2, opp1, opp2] = edgeData;

            const A = [oldPos[v1*3], oldPos[v1*3+1], oldPos[v1*3+2]];
            const B = [oldPos[v2*3], oldPos[v2*3+1], oldPos[v2*3+2]];

            let x, y, z;

            if (opp2 !== -1) {
                // Interior edge: 3/8 * (A + B) + 1/8 * (C + D)
                const C = [oldPos[opp1*3], oldPos[opp1*3+1], oldPos[opp1*3+2]];
                const D = [oldPos[opp2*3], oldPos[opp2*3+1], oldPos[opp2*3+2]];

                x = 0.375 * (A[0] + B[0]) + 0.125 * (C[0] + D[0]);
                y = 0.375 * (A[1] + B[1]) + 0.125 * (C[1] + D[1]);
                z = 0.375 * (A[2] + B[2]) + 0.125 * (C[2] + D[2]);
            } else {
                // Boundary edge: simple midpoint
                x = 0.5 * (A[0] + B[0]);
                y = 0.5 * (A[1] + B[1]);
                z = 0.5 * (A[2] + B[2]);
            }

            const newIdx = numOldVerts + edgeVertexMap.size;
            edgeVertexMap.set(edgeKey, newIdx);
            newPositions.push(x, y, z);
        }

        // Step 3: Build new topology (4 triangles per old triangle)
        for (let i = 0; i < oldIndices.length; i += 3) {
            const v0 = oldIndices[i];
            const v1 = oldIndices[i + 1];
            const v2 = oldIndices[i + 2];

            // Get edge midpoint indices
            const e01 = edgeVertexMap.get(this.edgeKey(v0, v1));
            const e12 = edgeVertexMap.get(this.edgeKey(v1, v2));
            const e20 = edgeVertexMap.get(this.edgeKey(v2, v0));

            // 4 new triangles
            newIndices.push(
                v0, e01, e20,    // corner triangle 0
                v1, e12, e01,    // corner triangle 1
                v2, e20, e12,    // corner triangle 2
                e01, e12, e20    // center triangle
            );
        }

        return {
            positions: newPositions,
            indices: newIndices
        };
    }

    /**
     * Generate edge key for Map
     */
    edgeKey(v1, v2) {
        return v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;
    }

    /**
     * Add edge to Map
     */
    addEdge(edges, v1, v2, opposite) {
        const key = this.edgeKey(v1, v2);
        if (!edges.has(key)) {
            edges.set(key, [v1, v2, opposite, -1]);
        } else {
            edges.get(key)[3] = opposite; // second opposite vertex
        }
    }

    /**
     * Add vertex neighbor
     */
    addVertexNeighbor(vertexEdges, v, neighbor) {
        if (!vertexEdges.has(v)) {
            vertexEdges.set(v, []);
        }
        const neighbors = vertexEdges.get(v);
        if (!neighbors.includes(neighbor)) {
            neighbors.push(neighbor);
        }
    }

    /**
     * Calculate smooth normals for mesh
     */
    calculateSmoothNormals(mesh) {
        const pos = mesh.positions;
        const indices = mesh.indices;
        const numVerts = pos.length / 3;

        // Initialize normals
        const normals = new Array(pos.length).fill(0);

        // Accumulate face normals
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i];
            const i1 = indices[i + 1];
            const i2 = indices[i + 2];

            // Get positions
            const v0 = [pos[i0*3], pos[i0*3+1], pos[i0*3+2]];
            const v1 = [pos[i1*3], pos[i1*3+1], pos[i1*3+2]];
            const v2 = [pos[i2*3], pos[i2*3+1], pos[i2*3+2]];

            // Compute face normal
            const e1 = [v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2]];
            const e2 = [v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2]];

            const nx = e1[1]*e2[2] - e1[2]*e2[1];
            const ny = e1[2]*e2[0] - e1[0]*e2[2];
            const nz = e1[0]*e2[1] - e1[1]*e2[0];

            // Add to each vertex
            normals[i0*3] += nx; normals[i0*3+1] += ny; normals[i0*3+2] += nz;
            normals[i1*3] += nx; normals[i1*3+1] += ny; normals[i1*3+2] += nz;
            normals[i2*3] += nx; normals[i2*3+1] += ny; normals[i2*3+2] += nz;
        }

        // Normalize
        for (let i = 0; i < numVerts; i++) {
            const x = normals[i*3];
            const y = normals[i*3+1];
            const z = normals[i*3+2];
            const len = Math.sqrt(x*x + y*y + z*z);

            if (len > 0.00001) {
                normals[i*3] = x / len;
                normals[i*3+1] = y / len;
                normals[i*3+2] = z / len;
            }
        }

        // Add to mesh with additional attributes for rendering
        mesh.normals = normals;
        mesh.texCoords = new Array(numVerts * 2).fill(0.5);

        // Convert to expected format (vertices instead of positions)
        mesh.vertices = mesh.positions;
        delete mesh.positions;
    }

    /**
     * Get geometry in format for alakazam
     * Convert from internal format to alakazam format
     */
    getGeometryForAlakazam() {
        if (!this.geometry) {
            this.generate();
        }

        return {
            positions: this.geometry.vertices,
            normals: this.geometry.normals,
            texCoords: this.geometry.texCoords,
            indices: this.geometry.indices
        };
    }

    /**
     * Get already generated geometry
     */
    getGeometry() {
        if (!this.geometry) {
            this.generate();
        }
        return this.geometry;
    }

    /**
     * Static factory methods for various presets
     */
    static createSmooth() {
        return new RoundedIsoscelesTriangle(4, 2.0, 1.5, 1.0);
    }

    static createVerySmooth() {
        return new RoundedIsoscelesTriangle(5, 2.0, 1.5, 1.0);
    }

    static createLowPoly() {
        return new RoundedIsoscelesTriangle(2, 2.0, 1.5, 1.0);
    }

    static createTall() {
        return new RoundedIsoscelesTriangle(4, 3.0, 1.2, 0.8);
    }

    static createWide() {
        return new RoundedIsoscelesTriangle(4, 1.5, 2.5, 1.2);
    }

    static createElbowShape() {
        // Optimized for elbow joint - small and rounded
        return new RoundedIsoscelesTriangle(4, 0.4, 0.3, 0.25);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoundedIsoscelesTriangle;
}

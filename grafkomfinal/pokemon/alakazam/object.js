// WebGL initialization and helper functions

// Modified: Accept GL context from Abra instead of creating new one
function initWebGL(existingGL = null) {
    if (existingGL) {
        // Use existing GL context from Abra
        console.log("🌉 Alakazam using shared GL context from Abra");
        return existingGL;
    }

    // Fallback: create own context (original behavior)
    const canvas = document.getElementById('glCanvas') || document.getElementById('myCanvas');
    if (!canvas) {
        console.error('Canvas not found');
        return null;
    }

    const gl = canvas.getContext('webgl', {
        antialias: true,
        alpha: false
    });

    if (!gl) {
        alert('WebGL not supported');
        return null;
    }

    return gl;
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram(gl, vsSource, fsSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

function createBuffer(gl, data, type = gl.ARRAY_BUFFER) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    return buffer;
}

// Enhanced BodyPart class for hierarchical modeling
class BodyPart {
    constructor(geometry, color, secondaryColor = null, parent = null, materialType = 0) {
        this.geometry = geometry;
        this.color = color;
        this.secondaryColor = secondaryColor || color;
        this.parent = parent;
        this.children = [];
        this.localMatrix = mat4.create();
        this.worldMatrix = mat4.create();
        this.translation = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.scale = [1, 1, 1];
        this.shininess = 32.0;
        this.metallic = 0.5;
        this.materialType = materialType; // 0: normal, 1: metallic, 2: striped, 3: glowing

        if (parent) {
            parent.children.push(this);
        }
    }

    updateLocalMatrix() {
        const m = mat4.create();
        mat4.translate(m, m, this.translation);

        // ========== FITUR PARAMETRIK: ARBITRARY AXIS ROTATION ==========
        // Support rotasi pada axis custom (tangent curve untuk tail, dll)
        if (this.arbitraryAxis && this.arbitraryAngle) {
            // Normalize axis vector
            const axis = this.arbitraryAxis;
            const len = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
            const normalizedAxis = [axis[0]/len, axis[1]/len, axis[2]/len];

            // Apply arbitrary axis rotation
            mat4.rotate(m, m, this.arbitraryAngle, normalizedAxis);
        }
        // ================================================================

        // Standard XYZ axis rotations
        mat4.rotate(m, m, this.rotation[0], [1, 0, 0]);
        mat4.rotate(m, m, this.rotation[1], [0, 1, 0]);
        mat4.rotate(m, m, this.rotation[2], [0, 0, 1]);

        mat4.scale(m, m, this.scale);
        this.localMatrix = m;
    }

    updateWorldMatrix(parentWorldMatrix = null) {
        if (parentWorldMatrix) {
            mat4.multiply(this.worldMatrix, parentWorldMatrix, this.localMatrix);
        } else {
            mat4.copy(this.worldMatrix, this.localMatrix);
        }

        for (const child of this.children) {
            child.updateWorldMatrix(this.worldMatrix);
        }
    }
}

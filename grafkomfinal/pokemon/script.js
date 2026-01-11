function main() {
    var CANVAS = document.getElementById('myCanvas');
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    var THETA = 0, PHI = 0;
    var drag = false;
    var x_prev, y_prev;
    var FRICTION = 0.05;
    var dX = 0, dY = 0;
    var SPEED = 0.45;  // 3x speed lagi untuk world 315x315 (0.15 * 3)
    var zoom = -63;    // 3x zoom out lagi (-21 * 3) untuk melihat world 315x315

    // Mouse controls
    var mouseDown = function (e) {
        drag = true;
        x_prev = e.clientX;
        y_prev = e.clientY;
        e.preventDefault();
        return false;
    };

    var mouseUp = function (e) {
        drag = false;
    };

    var mouseMove = function (e) {
        if (!drag) return false;
        dX = (e.clientX - x_prev) * 2 * Math.PI / CANVAS.width;
        dY = (e.clientY - y_prev) * 2 * Math.PI / CANVAS.height;
        THETA += dX;
        PHI += dY;
        x_prev = e.clientX;
        y_prev = e.clientY;
        e.preventDefault();
    };

    // Keyboard controls
    var keyDown = function (e) {
        if (e.key === 'w') {
            dY -= SPEED;
        }
        else if (e.key === 'a') {
            dX -= SPEED;
        }
        else if (e.key === 's') {
            dY += SPEED;
        }
        else if (e.key === 'd') {
            dX += SPEED;
        }
    };

    // Scroll zoom - faster speed
    var scroll = (e) => {
        if (e.deltaY < 0) {
            zoom += 1.0;
        } else {
            zoom -= 1.0;
        }
        e.preventDefault();
    };

    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);
    window.addEventListener("keydown", keyDown, false);
    CANVAS.addEventListener("wheel", scroll, false);

    // WebGL setup
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    // Enhanced Phong Lighting Shaders with atmospheric effects
    var shader_vertex_source = `
        attribute vec3 position;
        attribute vec3 color;
        attribute vec3 normal;
        
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        uniform mat4 Nmatrix;
        
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDepth;
        
        void main() {
            vec4 worldPosition = Mmatrix * vec4(position, 1.0);
            gl_Position = Pmatrix * Vmatrix * worldPosition;
            
            vColor = color;
            vNormal = normalize((Nmatrix * vec4(normal, 0.0)).xyz);
            vPosition = worldPosition.xyz;
            vDepth = gl_Position.z / gl_Position.w;
        }
    `;

    var shader_fragment_source = `
        precision mediump float;
        
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDepth;
        
        uniform vec3 uLightPosition;
        uniform vec3 uLightColor;
        uniform vec3 uAmbientLight;
        
        uniform vec3 uPointLight1Pos;
        uniform vec3 uPointLight1Color;
        
        uniform vec3 uPointLight2Pos;
        uniform vec3 uPointLight2Color;
        
        uniform vec3 uCameraPosition;
        uniform float uShininess;
        uniform float uSpecularStrength;
        uniform float uTime;
        
        void main(void) {
            vec3 normal = normalize(vNormal);
            
            // Enhanced ambient with atmospheric color
            vec3 skyColor = vec3(0.6, 0.75, 0.95);
            vec3 ambient = mix(uAmbientLight, skyColor, 0.4) * vColor;
            
            // Main directional light (sun)
            vec3 lightDir = normalize(uLightPosition - vPosition);
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * uLightColor * vColor;
            
            // Specular
            vec3 viewDir = normalize(uCameraPosition - vPosition);
            vec3 reflectDir = reflect(-lightDir, normal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
            vec3 specular = uSpecularStrength * spec * uLightColor;
            
            // Point Light 1 (warm glow)
            vec3 pointLight1Dir = normalize(uPointLight1Pos - vPosition);
            float pointLight1Dist = length(uPointLight1Pos - vPosition);
            float pointLight1Attenuation = 1.0 / (1.0 + 0.09 * pointLight1Dist + 0.032 * pointLight1Dist * pointLight1Dist);
            
            float pointLight1Diff = max(dot(normal, pointLight1Dir), 0.0);
            vec3 pointLight1Diffuse = pointLight1Diff * uPointLight1Color * vColor * pointLight1Attenuation;
            
            vec3 pointLight1ReflectDir = reflect(-pointLight1Dir, normal);
            float pointLight1Spec = pow(max(dot(viewDir, pointLight1ReflectDir), 0.0), uShininess);
            vec3 pointLight1Specular = uSpecularStrength * 0.5 * pointLight1Spec * uPointLight1Color * pointLight1Attenuation;
            
            // Point Light 2 (cool glow)
            vec3 pointLight2Dir = normalize(uPointLight2Pos - vPosition);
            float pointLight2Dist = length(uPointLight2Pos - vPosition);
            float pointLight2Attenuation = 1.0 / (1.0 + 0.09 * pointLight2Dist + 0.032 * pointLight2Dist * pointLight2Dist);
            
            float pointLight2Diff = max(dot(normal, pointLight2Dir), 0.0);
            vec3 pointLight2Diffuse = pointLight2Diff * uPointLight2Color * vColor * pointLight2Attenuation;
            
            vec3 pointLight2ReflectDir = reflect(-pointLight2Dir, normal);
            float pointLight2Spec = pow(max(dot(viewDir, pointLight2ReflectDir), 0.0), uShininess);
            vec3 pointLight2Specular = uSpecularStrength * 0.5 * pointLight2Spec * uPointLight2Color * pointLight2Attenuation;
            
            // Atmospheric fog effect - REDUCED untuk view distance maksimal
            float fogDensity = 0.002;  // Dikurangi dari 0.015 untuk fog lebih tipis
            float fogAmount = 1.0 - exp(-fogDensity * abs(vDepth) * abs(vDepth));
            vec3 fogColor = vec3(0.75, 0.85, 0.95);

            // Combine all lighting
            vec3 result = ambient + diffuse + specular +
                         pointLight1Diffuse + pointLight1Specular +
                         pointLight2Diffuse + pointLight2Specular;

            // Apply fog - REDUCED untuk view distance maksimal
            result = mix(result, fogColor, fogAmount * 0.1);  // Dikurangi dari 0.4 ke 0.1
            
            gl_FragColor = vec4(result, 1.0);
        }
    `;

    var compile_shader = function (source, type, typeString) {
        var shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };

    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);
    GL.linkProgram(SHADER_PROGRAM);

    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    var _normal = GL.getAttribLocation(SHADER_PROGRAM, "normal");
    
    GL.enableVertexAttribArray(_position);
    GL.enableVertexAttribArray(_color);
    GL.enableVertexAttribArray(_normal);

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");
    var _Nmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Nmatrix");
    
    var _uLightPosition = GL.getUniformLocation(SHADER_PROGRAM, "uLightPosition");
    var _uLightColor = GL.getUniformLocation(SHADER_PROGRAM, "uLightColor");
    var _uAmbientLight = GL.getUniformLocation(SHADER_PROGRAM, "uAmbientLight");
    var _uPointLight1Pos = GL.getUniformLocation(SHADER_PROGRAM, "uPointLight1Pos");
    var _uPointLight1Color = GL.getUniformLocation(SHADER_PROGRAM, "uPointLight1Color");
    var _uPointLight2Pos = GL.getUniformLocation(SHADER_PROGRAM, "uPointLight2Pos");
    var _uPointLight2Color = GL.getUniformLocation(SHADER_PROGRAM, "uPointLight2Color");
    var _uCameraPosition = GL.getUniformLocation(SHADER_PROGRAM, "uCameraPosition");
    var _uShininess = GL.getUniformLocation(SHADER_PROGRAM, "uShininess");
    var _uSpecularStrength = GL.getUniformLocation(SHADER_PROGRAM, "uSpecularStrength");
    var _uTime = GL.getUniformLocation(SHADER_PROGRAM, "uTime");

    GL.useProgram(SHADER_PROGRAM);

    var PROJMATRIX = LIBS.get_projection(60, CANVAS.width / CANVAS.height, 1, 1000);  // Far plane: 100 -> 1000 untuk view distance maksimal
    var VIEWMATRIX = LIBS.get_I4();

    // Abra colors
    const yellowColor = [1.0, 0.92, 0.35];
    const brownColor = [0.55, 0.38, 0.28];
    const darkBrownColor = [0.45, 0.32, 0.24];
    const earInnerColor = [0.48, 0.35, 0.26];
    const blackColor = [0.18, 0.18, 0.18];
    const noseColor = [0.95, 0.85, 0.38];
    const mouthColor = [0.38, 0.30, 0.24];

    // Create Abra objects
    const { vertices: body_vertices, indices: body_indices } = generateEllipsoid(0.55, 1.1, 0.48, 32, 32, yellowColor);
    const abraBody = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, body_vertices, body_indices, GL.TRIANGLES);

    const { vertices: head_vertices, indices: head_indices } = generateFoxHead(0.85, 0.60, 0.68, 36, 10, yellowColor, 0.98, 0.10);
    const abraHead = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, head_vertices, head_indices, GL.TRIANGLES);

    const { vertices: eye_vertices, indices: eye_indices } = generateClosedEye(0.52, 0.06, 24, blackColor);
    const abraLeftEye = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, eye_vertices, eye_indices, GL.TRIANGLES);
    const abraRightEye = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, eye_vertices, eye_indices, GL.TRIANGLES);

    const { vertices: nose_vertices, indices: nose_indices } = generateNose(0.15, 0.10, 0.06, noseColor);
    const abraNose = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, nose_vertices, nose_indices, GL.TRIANGLES);

    const { vertices: mouth_vertices, indices: mouth_indices } = generateMouthLine(0.18, 0.02, 16, mouthColor);
    const abraMouth = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, mouth_vertices, mouth_indices, GL.TRIANGLES);

    // Telinga
    const { vertices: ear_vertices, indices: ear_indices } = generateSharpCone(0.35, 0.8, 28, yellowColor);
    const abraLeftEar = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ear_vertices, ear_indices, GL.TRIANGLES);
    const abraRightEar = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ear_vertices, ear_indices, GL.TRIANGLES);

    // Ear inner
    const { vertices: ear_inner_vertices, indices: ear_inner_indices } = generateEarInner(0.28, 0.67, 18, earInnerColor);
    const abraLeftEarInner = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ear_inner_vertices, ear_inner_indices, GL.TRIANGLES);
    const abraRightEarInner = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ear_inner_vertices, ear_inner_indices, GL.TRIANGLES);

    // Upper arm (lengan atas)
    const { vertices: upperarm_vertices, indices: upperarm_indices } = generateCylinder(0.18, 0.16, 0.65, 14, 8, yellowColor);
    const abraLeftUpperArm = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, upperarm_vertices, upperarm_indices, GL.TRIANGLES);
    const abraRightUpperArm = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, upperarm_vertices, upperarm_indices, GL.TRIANGLES);

    // Elbow joint (siku tangan)
    const { vertices: elbow_vertices, indices: elbow_indices } = generateEllipsoid(0.17, 0.17, 0.17, 16, 16, yellowColor);
    const abraLeftElbow = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, elbow_vertices, elbow_indices, GL.TRIANGLES);
    const abraRightElbow = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, elbow_vertices, elbow_indices, GL.TRIANGLES);

    // Forearm (lengan bawah)
    const { vertices: forearm_vertices, indices: forearm_indices } = generateCylinder(0.25, 0.14, 0.65, 14, 8, yellowColor);
    const abraLeftForearm = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, forearm_vertices, forearm_indices, GL.TRIANGLES);
    const abraRightForearm = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, forearm_vertices, forearm_indices, GL.TRIANGLES);

    // Pergelangan tangan
    const { vertices: wristband_vertices, indices: wristband_indices } = generateWristBand(0.10, 0.20, 16, brownColor);
    const abraLeftWristBand = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, wristband_vertices, wristband_indices, GL.TRIANGLES);
    const abraRightWristBand = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, wristband_vertices, wristband_indices, GL.TRIANGLES);

    // Telapak tangan
    const { vertices: hand_vertices, indices: hand_indices } = generateEllipsoid(0.28, 0.24, 0.22, 20, 20, yellowColor);
    const abraLeftHand = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, hand_vertices, hand_indices, GL.TRIANGLES);
    const abraRightHand = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, hand_vertices, hand_indices, GL.TRIANGLES);

    // Jari-jari tangan
    const { vertices: finger_vertices, indices: finger_indices } = generateCone(0.065, 0.55, 14, yellowColor);
    
    const abraLeftFinger1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    const abraLeftFinger2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    const abraLeftFinger3 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    
    const abraRightFinger1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    const abraRightFinger2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    const abraRightFinger3 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);

    // === MODIFIED LEG STRUCTURE WITH KNEE JOINT ===
    // Upper leg (thigh) - paha atas, lebih pendek untuk memberi ruang pada lower leg
    const { vertices: upperleg_vertices, indices: upperleg_indices } = generateCylinder(0.20, 0.15, 0.90, 18, 8, yellowColor);
    const abraLeftUpperLeg = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, upperleg_vertices, upperleg_indices, GL.TRIANGLES);
    const abraRightUpperLeg = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, upperleg_vertices, upperleg_indices, GL.TRIANGLES);

    // Knee joint (lutut) - untuk membuat lekukan seperti siku
    const { vertices: knee_vertices, indices: knee_indices } = generateEllipsoid(0.27, 0.60, 0.20, 16, 16, yellowColor);
    const abraLeftKnee = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, knee_vertices, knee_indices, GL.TRIANGLES);
    const abraRightKnee = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, knee_vertices, knee_indices, GL.TRIANGLES);

    // Lower leg (shin) - betis, dari lutut ke pergelangan kaki
    const { vertices: lowerleg_vertices, indices: lowerleg_indices } = generateCylinder(0, 0, 0.55, 18, 8, yellowColor);
    const abraLeftLowerLeg = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, lowerleg_vertices, lowerleg_indices, GL.TRIANGLES);
    const abraRightLowerLeg = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, lowerleg_vertices, lowerleg_indices, GL.TRIANGLES);

    // Telapak kaki - LEBIH BESAR dan LEBIH BULAT
    const { vertices: foot_vertices, indices: foot_indices } = generateEllipsoid(0.25, 0.16, 0.48, 20, 20, yellowColor);
    const abraLeftFoot = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, foot_vertices, foot_indices, GL.TRIANGLES);
    const abraRightFoot = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, foot_vertices, foot_indices, GL.TRIANGLES);

    // Kuku kaki - LEBIH BESAR DAN LEBIH PANJANG (3 jari per kaki seperti di gambar)
    const { vertices: toe_vertices, indices: toe_indices } = generateFootToe(0.1, 0.50, 10, yellowColor);
    
    const abraLeftToe1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
    const abraLeftToe2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
    const abraLeftToe3 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
    
    const abraRightToe1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
    const abraRightToe2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
    const abraRightToe3 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);

    const { vertices: tail_vertices, indices: tail_indices } = generateCurvedCylinder(0.22, -0.15, 1.0, 26, 14, yellowColor);
    const abraTail = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, tail_vertices, tail_indices, GL.TRIANGLES);

    const { vertices: armor_vertices, indices: armor_indices } = generateEllipsoid(0.56, 1.1, 0.48, 32, 32, brownColor);
    const abraArmor = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, armor_vertices, armor_indices, GL.TRIANGLES);

    const { vertices: segment1_vertices, indices: segment1_indices } = generateChestSegment(0.38, 0.12, 0.20, darkBrownColor);
    const abraArmorSegment1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, segment1_vertices, segment1_indices, GL.TRIANGLES);
    
    const { vertices: segment2_vertices, indices: segment2_indices } = generateChestSegment(0.36, 0.11, 0.19, darkBrownColor);
    const abraArmorSegment2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, segment2_vertices, segment2_indices, GL.TRIANGLES);

    const { vertices: shoulder_vertices, indices: shoulder_indices } = generateShoulderPad(0.40, 12, darkBrownColor);
    const abraLeftShoulder = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, shoulder_vertices, shoulder_indices, GL.TRIANGLES);
    const abraRightShoulder = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, shoulder_vertices, shoulder_indices, GL.TRIANGLES);

    // ===== ENHANCED ENVIRONMENT =====
    const GROUND_HEIGHT_OFFSET = -2.6;
    
    // Ground
    const { vertices: ground_vertices, indices: ground_indices } = createGroundPlane();
    const groundPlane = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ground_vertices, ground_indices, GL.TRIANGLES);
    LIBS.translateY(groundPlane.MOVE_MATRIX, GROUND_HEIGHT_OFFSET);
    groundPlane.setup();

    // Trees - Mix of Pine and Maple with varied colors
    // Generate many trees with random positions, creating boundary around Abra & Alakazam
    const trees = [];
    const treeCount = 150; // Tetap 150 pohon, tapi 3x lebih besar

    // ===== CONFIGURABLE BOUNDARY PARAMETERS (XYZ) =====
    // Adjust these values to control tree placement area (for 315x315 map)
    const treeBoundary = {
        // Ground plane boundaries (where trees can be placed) - untuk map 315x315
        minX: -150,  // 3x lipat untuk map 315 (157.5 adalah ujung)
        maxX: 150,
        minZ: -150,
        maxZ: 150,

        // Clear zone (no trees) - area for Abra & Alakazam
        clearZone: {
            centerX: 0,      // Center of clear zone X
            centerZ: 0,      // Center of clear zone Z
            radiusX: 20,     // Sedikit lebih besar untuk map yang lebih luas
            radiusZ: 20
        }
    };

    for (let i = 0; i < treeCount; i++) {
        // Decide tree type (60% pine, 40% maple for variety)
        const isPine = Math.random() < 0.6;

        let treeGeometry;
        if (isPine) {
            // Pine tree (Pohon Cemara)
            treeGeometry = createPineTree();
        } else {
            // Maple tree with 3 color variations
            const colorRand = Math.random();
            let colorVariant;
            if (colorRand < 0.33) {
                colorVariant = 'green'; // Summer maple
            } else if (colorRand < 0.66) {
                colorVariant = 'orange'; // Early autumn maple
            } else {
                colorVariant = 'red'; // Late autumn maple (deep red)
            }
            treeGeometry = createMapleTree(colorVariant);
        }

        const { vertices: tree_vertices, indices: tree_indices } = treeGeometry;
        const tree = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, tree_vertices, tree_indices, GL.TRIANGLES);

        // Generate random position within boundaries, avoiding clear zone
        let x, z;
        let attempts = 0;
        const maxAttempts = 100;
        let validPosition = false;

        do {
            // Random position within ground boundaries
            x = treeBoundary.minX + Math.random() * (treeBoundary.maxX - treeBoundary.minX);
            z = treeBoundary.minZ + Math.random() * (treeBoundary.maxZ - treeBoundary.minZ);

            // Check if position is outside clear zone (using elliptical boundary)
            const dx = x - treeBoundary.clearZone.centerX;
            const dz = z - treeBoundary.clearZone.centerZ;
            const normalizedDist = Math.pow(dx / treeBoundary.clearZone.radiusX, 2) +
                                   Math.pow(dz / treeBoundary.clearZone.radiusZ, 2);

            // Position is valid if it's outside the clear zone (normalized distance > 1)
            validPosition = normalizedDist > 1.0;

            attempts++;
        } while (!validPosition && attempts < maxAttempts);

        // Fallback: if no valid position found, place at edge of clear zone
        if (!validPosition) {
            const angle = Math.random() * Math.PI * 2;
            x = treeBoundary.clearZone.centerX + Math.cos(angle) * treeBoundary.clearZone.radiusX * 1.2;
            z = treeBoundary.clearZone.centerZ + Math.sin(angle) * treeBoundary.clearZone.radiusZ * 1.2;
        }

        // Set tree position
        LIBS.translateX(tree.MOVE_MATRIX, x);
        LIBS.translateY(tree.MOVE_MATRIX, GROUND_HEIGHT_OFFSET);
        LIBS.translateZ(tree.MOVE_MATRIX, z);

        // Random rotation for variety
        LIBS.rotateY(tree.MOVE_MATRIX, Math.random() * Math.PI * 2);

        // Varied scale - 3x BIGGER (pine trees slightly taller on average)
        const baseScale = isPine ? (0.7 + Math.random() * 0.4) : (0.6 + Math.random() * 0.4);
        const scale = baseScale * 3;  // 3x scale untuk map yang lebih besar
        LIBS.scaleX(tree.MOVE_MATRIX, scale);
        LIBS.scaleY(tree.MOVE_MATRIX, scale);
        LIBS.scaleZ(tree.MOVE_MATRIX, scale);

        tree.setup();
        trees.push(tree);
    }

    // Mountains - 3x lebih jauh dan 3x lebih besar (untuk map 315x315)
    const { vertices: mountain_vertices, indices: mountain_indices } = createMountain();
    const mountainPositions = [
        // Original positions * 9 (3x dari sebelumnya yang sudah 3x)
        [-144, GROUND_HEIGHT_OFFSET, -198],   // -16*9, -22*9
        [126, GROUND_HEIGHT_OFFSET, -216],    // 14*9, -24*9
        [0, GROUND_HEIGHT_OFFSET, -243],      // 0*9, -27*9
        [-180, GROUND_HEIGHT_OFFSET, -162],   // -20*9, -18*9
        [162, GROUND_HEIGHT_OFFSET, -180],    // 18*9, -20*9

        // Additional mountains for 3x scale
        [-90, GROUND_HEIGHT_OFFSET, -225],
        [90, GROUND_HEIGHT_OFFSET, -234],
        [-135, GROUND_HEIGHT_OFFSET, -180],
        [135, GROUND_HEIGHT_OFFSET, -198],
        [45, GROUND_HEIGHT_OFFSET, -210],
        [-45, GROUND_HEIGHT_OFFSET, -204],
        [180, GROUND_HEIGHT_OFFSET, -225],
        [-195, GROUND_HEIGHT_OFFSET, -210],
        [75, GROUND_HEIGHT_OFFSET, -255],
        [-105, GROUND_HEIGHT_OFFSET, -246]
    ];
    const mountains = mountainPositions.map(pos => {
        const mountain = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, mountain_vertices, mountain_indices, GL.TRIANGLES);
        LIBS.translateX(mountain.MOVE_MATRIX, pos[0]);
        LIBS.translateY(mountain.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(mountain.MOVE_MATRIX, pos[2]);
        const scale = 9.0 + Math.random() * 4.5;  // 3x scale lagi (3.0*3 + 1.5*3)
        LIBS.scaleX(mountain.MOVE_MATRIX, scale);
        LIBS.scaleY(mountain.MOVE_MATRIX, scale);
        LIBS.scaleZ(mountain.MOVE_MATRIX, scale);
        mountain.setup();
        return mountain;
    });

    // Cliff Walls - Pokemon-style plateau cliffs at plane edges (315x315 map)
    const { vertices: cliff_vertices, indices: cliff_indices } = createCliffWall(315, 30, 5);  // 3x bigger cliff
    const cliffWalls = [];

    // North wall (back, -Z)
    const northWall = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, cliff_vertices, cliff_indices, GL.TRIANGLES);
    LIBS.translateZ(northWall.MOVE_MATRIX, -157.5);  // Edge of 315 plane (315/2)
    LIBS.translateY(northWall.MOVE_MATRIX, GROUND_HEIGHT_OFFSET);
    northWall.setup();
    cliffWalls.push(northWall);

    // South wall (front, +Z)
    const southWall = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, cliff_vertices, cliff_indices, GL.TRIANGLES);
    LIBS.translateZ(southWall.MOVE_MATRIX, 157.5);   // Edge of 315 plane
    LIBS.translateY(southWall.MOVE_MATRIX, GROUND_HEIGHT_OFFSET);
    LIBS.rotateY(southWall.MOVE_MATRIX, Math.PI);  // Rotate 180 degrees to face inward
    southWall.setup();
    cliffWalls.push(southWall);

    // East wall (right, +X) - rotated 90 degrees
    const eastWall = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, cliff_vertices, cliff_indices, GL.TRIANGLES);
    LIBS.translateX(eastWall.MOVE_MATRIX, 157.5);    // Edge of 315 plane
    LIBS.translateY(eastWall.MOVE_MATRIX, GROUND_HEIGHT_OFFSET);
    LIBS.rotateY(eastWall.MOVE_MATRIX, -Math.PI / 2);  // Rotate -90 degrees
    eastWall.setup();
    cliffWalls.push(eastWall);

    // West wall (left, -X) - rotated -90 degrees
    const westWall = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, cliff_vertices, cliff_indices, GL.TRIANGLES);
    LIBS.translateX(westWall.MOVE_MATRIX, -157.5);   // Edge of 315 plane
    LIBS.translateY(westWall.MOVE_MATRIX, GROUND_HEIGHT_OFFSET);
    LIBS.rotateY(westWall.MOVE_MATRIX, Math.PI / 2);   // Rotate 90 degrees
    westWall.setup();
    cliffWalls.push(westWall);

    // Rocks - area untuk map 315x315, scale 3x lagi
    const { vertices: rock_vertices, indices: rock_indices } = createRock();
    const rockPositions = [];
    for (let i = 0; i < 18; i++) {
        rockPositions.push([
            (Math.random() - 0.5) * 180,  // 3x area spread untuk map 315 (60 * 3)
            GROUND_HEIGHT_OFFSET,
            (Math.random() - 0.5) * 180
        ]);
    }
    const rocks = rockPositions.map(pos => {
        const rock = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, rock_vertices, rock_indices, GL.TRIANGLES);
        LIBS.translateX(rock.MOVE_MATRIX, pos[0]);
        LIBS.translateY(rock.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(rock.MOVE_MATRIX, pos[2]);
        LIBS.rotateY(rock.MOVE_MATRIX, Math.random() * Math.PI * 2);
        const scale = 7.2 + Math.random() * 5.4;  // 3x scale lagi (2.4*3 + 1.8*3)
        LIBS.scaleX(rock.MOVE_MATRIX, scale);
        LIBS.scaleY(rock.MOVE_MATRIX, scale);
        LIBS.scaleZ(rock.MOVE_MATRIX, scale);
        rock.setup();
        return rock;
    });

    // Bushes - area untuk map 315x315, scale 3x lagi
    const { vertices: bush_vertices, indices: bush_indices } = createBush();
    const bushPositions = [];
    for (let i = 0; i < 12; i++) {
        bushPositions.push([
            (Math.random() - 0.5) * 210,  // 3x area spread untuk map 315 (70 * 3)
            GROUND_HEIGHT_OFFSET,
            (Math.random() - 0.5) * 210
        ]);
    }
    const bushes = bushPositions.map(pos => {
        const bush = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, bush_vertices, bush_indices, GL.TRIANGLES);
        LIBS.translateX(bush.MOVE_MATRIX, pos[0]);
        LIBS.translateY(bush.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(bush.MOVE_MATRIX, pos[2]);
        const scale = 9.0;  // 3x scale lagi (3.0 * 3)
        LIBS.scaleX(bush.MOVE_MATRIX, scale);
        LIBS.scaleY(bush.MOVE_MATRIX, scale);
        LIBS.scaleZ(bush.MOVE_MATRIX, scale);
        bush.setup();
        return bush;
    });

    // Flowers - area untuk map 315x315, scale 3x lagi
    const { vertices: flower_vertices, indices: flower_indices } = createFlower();
    const flowerPositions = [];
    for (let i = 0; i < 60; i++) {
        flowerPositions.push([
            (Math.random() - 0.5) * 180,  // 3x area spread untuk map 315 (60 * 3)
            GROUND_HEIGHT_OFFSET,
            (Math.random() - 0.5) * 180
        ]);
    }
    const flowers = flowerPositions.map(pos => {
        const flower = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, flower_vertices, flower_indices, GL.TRIANGLES);
        LIBS.translateX(flower.MOVE_MATRIX, pos[0]);
        LIBS.translateY(flower.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(flower.MOVE_MATRIX, pos[2]);
        LIBS.rotateY(flower.MOVE_MATRIX, Math.random() * Math.PI * 2);
        const scale = 9.0;  // 3x scale lagi (3.0 * 3)
        LIBS.scaleX(flower.MOVE_MATRIX, scale);
        LIBS.scaleY(flower.MOVE_MATRIX, scale);
        LIBS.scaleZ(flower.MOVE_MATRIX, scale);
        flower.setup();
        return flower;
    });

    // Grass blades - area untuk map 315x315, scale 3x lagi
    const { vertices: grass_vertices, indices: grass_indices } = createGrassBlade();
    const grassPositions = [];
    for (let i = 0; i < 120; i++) {
        grassPositions.push([
            (Math.random() - 0.5) * 225,  // 3x area spread untuk map 315 (75 * 3)
            GROUND_HEIGHT_OFFSET,
            (Math.random() - 0.5) * 225
        ]);
    }
    const grassBlades = grassPositions.map(pos => {
        const grass = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, grass_vertices, grass_indices, GL.TRIANGLES);
        LIBS.translateX(grass.MOVE_MATRIX, pos[0]);
        LIBS.translateY(grass.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(grass.MOVE_MATRIX, pos[2]);
        LIBS.rotateY(grass.MOVE_MATRIX, Math.random() * Math.PI * 2);
        const scale = 9.0;  // 3x scale lagi (3.0 * 3)
        LIBS.scaleX(grass.MOVE_MATRIX, scale);
        LIBS.scaleY(grass.MOVE_MATRIX, scale);
        LIBS.scaleZ(grass.MOVE_MATRIX, scale);
        grass.setup();
        return grass;
    });

    // Birds
    const { vertices: bird_vertices, indices: bird_indices } = createBird();
    const birds = [
        { x: -6, y: 5, z: 0, speedX: 1.8, speedY: 0.35, offset: 0 },
        { x: 4, y: 6, z: -3, speedX: -1.5, speedY: 0.28, offset: Math.PI },
        { x: 0, y: 7, z: 3, speedX: 2.0, speedY: 0.40, offset: Math.PI/2 },
        { x: -8, y: 5.5, z: 5, speedX: 1.3, speedY: 0.32, offset: Math.PI * 1.5 }
    ].map(birdData => {
        const bird = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, bird_vertices, bird_indices, GL.TRIANGLES);
        bird.data = birdData;
        bird.setup();
        return bird;
    });

    // Fireflies
    const { vertices: firefly_vertices, indices: firefly_indices } = createFirefly();
    const fireflies = [];
    for (let i = 0; i < 15; i++) {
        const firefly = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, firefly_vertices, firefly_indices, GL.TRIANGLES);
        firefly.data = {
            x: (Math.random() - 0.5) * 15,
            y: 1 + Math.random() * 3,
            z: (Math.random() - 0.5) * 15,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.3,
            speedZ: (Math.random() - 0.5) * 0.5,
            offset: Math.random() * Math.PI * 2
        };
        firefly.setup();
        fireflies.push(firefly);
    }

    // Abra transformations
    LIBS.translateY(abraHead.MOVE_MATRIX, 1.05);
    LIBS.translateZ(abraHead.MOVE_MATRIX, 0.1);
    LIBS.rotateX(abraHead.MOVE_MATRIX, LIBS.degToRad(40));

    LIBS.translateX(abraLeftEye.MOVE_MATRIX, -0.35);
    LIBS.translateY(abraLeftEye.MOVE_MATRIX, 0.29);
    LIBS.translateZ(abraLeftEye.MOVE_MATRIX, 0.68);
    LIBS.rotateY(abraLeftEye.MOVE_MATRIX, LIBS.degToRad(-60));
    LIBS.rotateX(abraLeftEye.MOVE_MATRIX, LIBS.degToRad(5));

    LIBS.translateX(abraRightEye.MOVE_MATRIX, 0.35);
    LIBS.translateY(abraRightEye.MOVE_MATRIX, 0.29);
    LIBS.translateZ(abraRightEye.MOVE_MATRIX, 0.68);
    LIBS.rotateY(abraRightEye.MOVE_MATRIX, LIBS.degToRad(60));
    LIBS.rotateX(abraRightEye.MOVE_MATRIX, LIBS.degToRad(5));

    LIBS.translateY(abraNose.MOVE_MATRIX, 0.05);
    LIBS.translateZ(abraNose.MOVE_MATRIX, 1.13);

    LIBS.translateY(abraMouth.MOVE_MATRIX, -0.08);
    LIBS.translateZ(abraMouth.MOVE_MATRIX, 0.75);

    // Posisi Telinga 
    LIBS.translateX(abraLeftEar.MOVE_MATRIX, -0.48);
    LIBS.translateY(abraLeftEar.MOVE_MATRIX, 0.25);
    LIBS.translateZ(abraLeftEar.MOVE_MATRIX, -0.22);
    LIBS.rotateZ(abraLeftEar.MOVE_MATRIX, LIBS.degToRad(35));
    LIBS.rotateY(abraLeftEar.MOVE_MATRIX, LIBS.degToRad(-20));

    LIBS.translateX(abraRightEar.MOVE_MATRIX, 0.48);
    LIBS.translateY(abraRightEar.MOVE_MATRIX, 0.25);
    LIBS.translateZ(abraRightEar.MOVE_MATRIX, -0.22);
    LIBS.rotateZ(abraRightEar.MOVE_MATRIX, LIBS.degToRad(-35));
    LIBS.rotateY(abraRightEar.MOVE_MATRIX, LIBS.degToRad(20));

    // Posisi Telinga Dalam
    LIBS.rotateY(abraLeftEarInner.MOVE_MATRIX, LIBS.degToRad(-60));
    LIBS.translateZ(abraLeftEarInner.MOVE_MATRIX, 0);
    LIBS.translateX(abraLeftEarInner.MOVE_MATRIX, 0.10);

    LIBS.rotateY(abraRightEarInner.MOVE_MATRIX, LIBS.degToRad(60));
    LIBS.translateZ(abraRightEarInner.MOVE_MATRIX, 0);
    LIBS.translateX(abraRightEarInner.MOVE_MATRIX, -0.10);

    // Posisi upper arm (lengan atas)
    LIBS.translateX(abraLeftUpperArm.MOVE_MATRIX, -0.68);
    LIBS.translateY(abraLeftUpperArm.MOVE_MATRIX, 0.15);
    LIBS.translateZ(abraLeftUpperArm.MOVE_MATRIX, -0.1);
    LIBS.rotateZ(abraLeftUpperArm.MOVE_MATRIX, LIBS.degToRad(-22));
    LIBS.rotateX(abraLeftUpperArm.MOVE_MATRIX, LIBS.degToRad(5));

    LIBS.translateX(abraRightUpperArm.MOVE_MATRIX, 0.68);
    LIBS.translateY(abraRightUpperArm.MOVE_MATRIX, 0.15);
    LIBS.translateZ(abraRightUpperArm.MOVE_MATRIX, -0.1);
    LIBS.rotateZ(abraRightUpperArm.MOVE_MATRIX, LIBS.degToRad(22));
    LIBS.rotateX(abraRightUpperArm.MOVE_MATRIX, LIBS.degToRad(5));

    // Posisi elbow (siku tangan) - di ujung upper arm
    LIBS.translateY(abraLeftElbow.MOVE_MATRIX, -0.32);
    LIBS.rotateX(abraLeftElbow.MOVE_MATRIX, -0.52);

    LIBS.translateY(abraRightElbow.MOVE_MATRIX, -0.32);
    LIBS.rotateX(abraRightElbow.MOVE_MATRIX, -0.52);

    // Posisi forearm (lengan bawah) - dari siku ke pergelangan
    LIBS.translateY(abraLeftForearm.MOVE_MATRIX, -0.32);

    LIBS.translateY(abraRightForearm.MOVE_MATRIX, -0.32);

    // Posisi wristband - di ujung forearm
    LIBS.translateY(abraLeftWristBand.MOVE_MATRIX, -0.42);
    LIBS.translateY(abraRightWristBand.MOVE_MATRIX, -0.42);

    // Posisi tangan - setelah wristband
    LIBS.translateY(abraLeftHand.MOVE_MATRIX, -0.52);
    LIBS.translateY(abraRightHand.MOVE_MATRIX, -0.52);

    // Posisi jari-jari tangan
    LIBS.translateX(abraLeftFinger1.MOVE_MATRIX, -0.18);
    LIBS.translateY(abraLeftFinger1.MOVE_MATRIX, -0.02);
    LIBS.translateZ(abraLeftFinger1.MOVE_MATRIX, 0.04);
    LIBS.rotateZ(abraLeftFinger1.MOVE_MATRIX, LIBS.degToRad(-12));
    LIBS.rotateX(abraLeftFinger1.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateY(abraLeftFinger2.MOVE_MATRIX, -0.02);
    LIBS.translateZ(abraLeftFinger2.MOVE_MATRIX, 0.15);
    LIBS.rotateX(abraLeftFinger2.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateX(abraLeftFinger3.MOVE_MATRIX, 0.18);
    LIBS.translateY(abraLeftFinger3.MOVE_MATRIX, -0.02);
    LIBS.translateZ(abraLeftFinger3.MOVE_MATRIX, 0.04);
    LIBS.rotateZ(abraLeftFinger3.MOVE_MATRIX, LIBS.degToRad(12));
    LIBS.rotateX(abraLeftFinger3.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateX(abraRightFinger1.MOVE_MATRIX, -0.18);
    LIBS.translateY(abraRightFinger1.MOVE_MATRIX, -0.02);
    LIBS.translateZ(abraRightFinger1.MOVE_MATRIX, 0.04);
    LIBS.rotateZ(abraRightFinger1.MOVE_MATRIX, LIBS.degToRad(-12));
    LIBS.rotateX(abraRightFinger1.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateY(abraRightFinger2.MOVE_MATRIX, -0.02);
    LIBS.translateZ(abraRightFinger2.MOVE_MATRIX, 0.15);
    LIBS.rotateX(abraRightFinger2.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateX(abraRightFinger3.MOVE_MATRIX, 0.18);
    LIBS.translateY(abraRightFinger3.MOVE_MATRIX, -0.02);
    LIBS.translateZ(abraRightFinger3.MOVE_MATRIX, 0.04);
    LIBS.rotateZ(abraRightFinger3.MOVE_MATRIX, LIBS.degToRad(12));
    LIBS.rotateX(abraRightFinger3.MOVE_MATRIX, LIBS.degToRad(200));

    // === MODIFIED LEG POSITIONING WITH KNEE JOINT (SITTING POSE) ===
    // Posisi upper leg (paha) - dalam posisi duduk/jongkok
    LIBS.translateX(abraLeftUpperLeg.MOVE_MATRIX, -0.36);
    LIBS.translateY(abraLeftUpperLeg.MOVE_MATRIX, -0.95);
    LIBS.translateZ(abraLeftUpperLeg.MOVE_MATRIX, 0.05);
    LIBS.rotateZ(abraLeftUpperLeg.MOVE_MATRIX, LIBS.degToRad(-10)); // Ditekuk ke depan

    LIBS.translateX(abraRightUpperLeg.MOVE_MATRIX, 0.36);
    LIBS.translateY(abraRightUpperLeg.MOVE_MATRIX, -0.95);
    LIBS.translateZ(abraRightUpperLeg.MOVE_MATRIX, 0.05);
    LIBS.rotateZ(abraRightUpperLeg.MOVE_MATRIX, LIBS.degToRad(10)); // Ditekuk ke depan

    // Posisi knee (lutut) - di ujung upper leg
    LIBS.translateY(abraLeftKnee.MOVE_MATRIX, -0.85);
    LIBS.translateZ(abraLeftKnee.MOVE_MATRIX, -0.15);
    LIBS.rotateX(abraLeftKnee.MOVE_MATRIX, 0.35);

    LIBS.translateY(abraRightKnee.MOVE_MATRIX, -0.85);
    LIBS.translateZ(abraRightKnee.MOVE_MATRIX, -0.15);
    LIBS.rotateX(abraRightKnee.MOVE_MATRIX, 0.35);

    // Posisi lower leg (betis) - dari lutut ke pergelangan kaki, ditekuk
    LIBS.translateY(abraLeftLowerLeg.MOVE_MATRIX, -0.28);
    LIBS.translateZ(abraLeftLowerLeg.MOVE_MATRIX, 0.10);
    LIBS.rotateX(abraLeftLowerLeg.MOVE_MATRIX, LIBS.degToRad(-55)); // Ditekuk ke belakang

    LIBS.translateY(abraRightLowerLeg.MOVE_MATRIX, -0.28);
    LIBS.rotateX(abraRightLowerLeg.MOVE_MATRIX, LIBS.degToRad(-55)); // Ditekuk ke belakang

    // Posisi telapak kaki - setelah lower leg, mengarah ke depan
    LIBS.translateY(abraLeftFoot.MOVE_MATRIX, -0.20);
    LIBS.translateZ(abraLeftFoot.MOVE_MATRIX, -0.15);
    LIBS.rotateX(abraLeftFoot.MOVE_MATRIX, LIBS.degToRad(55));
    
    // Sedikit miring ke atas
    LIBS.translateY(abraRightFoot.MOVE_MATRIX, -0.20);
    LIBS.translateZ(abraRightFoot.MOVE_MATRIX, -0.15);
    LIBS.rotateX(abraRightFoot.MOVE_MATRIX, LIBS.degToRad(55)); // Sedikit miring ke atas

    // Kuku kaki - 3 jari per kaki, lebih besar dan menonjol
    // Left foot toes
    LIBS.translateX(abraLeftToe1.MOVE_MATRIX, -0.18);
    LIBS.translateY(abraLeftToe1.MOVE_MATRIX, 0.02); 
    LIBS.translateZ(abraLeftToe1.MOVE_MATRIX, 0.28);
    LIBS.rotateX(abraLeftToe1.MOVE_MATRIX, LIBS.degToRad(70));
    LIBS.rotateZ(abraLeftToe1.MOVE_MATRIX, LIBS.degToRad(-15));

    LIBS.translateY(abraLeftToe2.MOVE_MATRIX, 0.02);
    LIBS.translateZ(abraLeftToe2.MOVE_MATRIX, 0.32);
    LIBS.rotateX(abraLeftToe2.MOVE_MATRIX, LIBS.degToRad(70));

    LIBS.translateX(abraLeftToe3.MOVE_MATRIX, 0.18);
    LIBS.translateY(abraLeftToe3.MOVE_MATRIX, 0.02);
    LIBS.translateZ(abraLeftToe3.MOVE_MATRIX, 0.28);
    LIBS.rotateX(abraLeftToe3.MOVE_MATRIX, LIBS.degToRad(70));
    LIBS.rotateZ(abraLeftToe3.MOVE_MATRIX, LIBS.degToRad(15));

    // Right foot toes
    LIBS.translateX(abraRightToe1.MOVE_MATRIX, -0.18);
    LIBS.translateY(abraRightToe1.MOVE_MATRIX, 0.02);
    LIBS.translateZ(abraRightToe1.MOVE_MATRIX, 0.28);
    LIBS.rotateX(abraRightToe1.MOVE_MATRIX, LIBS.degToRad(70));
    LIBS.rotateZ(abraRightToe1.MOVE_MATRIX, LIBS.degToRad(-15));

    LIBS.translateY(abraRightToe2.MOVE_MATRIX, 0.02);
    LIBS.translateZ(abraRightToe2.MOVE_MATRIX, 0.32);
    LIBS.rotateX(abraRightToe2.MOVE_MATRIX, LIBS.degToRad(70));

    LIBS.translateX(abraRightToe3.MOVE_MATRIX, 0.18);
    LIBS.translateY(abraRightToe3.MOVE_MATRIX, 0.02);
    LIBS.translateZ(abraRightToe3.MOVE_MATRIX, 0.28);
    LIBS.rotateX(abraRightToe3.MOVE_MATRIX, LIBS.degToRad(70));
    LIBS.rotateZ(abraRightToe3.MOVE_MATRIX, LIBS.degToRad(15));

    // Posisi Ekor
    LIBS.translateY(abraTail.MOVE_MATRIX, 0.45);
    LIBS.translateZ(abraTail.MOVE_MATRIX, -0.70);
    LIBS.rotateX(abraTail.MOVE_MATRIX, LIBS.degToRad(120));
    LIBS.rotateZ(abraTail.MOVE_MATRIX, LIBS.degToRad(-180));

    LIBS.translateY(abraArmor.MOVE_MATRIX, 0.11);
    LIBS.translateZ(abraArmor.MOVE_MATRIX, 0.01);

    LIBS.translateY(abraArmorSegment1.MOVE_MATRIX, 0.32);
    LIBS.translateZ(abraArmorSegment1.MOVE_MATRIX, 0.28);

    LIBS.translateY(abraArmorSegment2.MOVE_MATRIX, -0.05);
    LIBS.translateZ(abraArmorSegment2.MOVE_MATRIX, 0.27);

    LIBS.translateX(abraLeftShoulder.MOVE_MATRIX, -0.56);
    LIBS.translateY(abraLeftShoulder.MOVE_MATRIX, 0.57);
    LIBS.translateZ(abraLeftShoulder.MOVE_MATRIX, -0.1);

    LIBS.translateX(abraRightShoulder.MOVE_MATRIX, 0.56);
    LIBS.translateY(abraRightShoulder.MOVE_MATRIX, 0.57);
    LIBS.translateZ(abraRightShoulder.MOVE_MATRIX, -0.1);

    // Hierarchy - MODIFIED untuk leg structure dengan knee joint
    abraBody.addChild(abraHead);
    abraBody.addChild(abraLeftUpperArm);
    abraBody.addChild(abraRightUpperArm);
    abraBody.addChild(abraLeftUpperLeg);  // Changed from abraLeftLeg
    abraBody.addChild(abraRightUpperLeg); // Changed from abraRightLeg
    abraBody.addChild(abraTail);
    abraBody.addChild(abraArmor);
    abraBody.addChild(abraLeftShoulder);
    abraBody.addChild(abraRightShoulder);

    abraHead.addChild(abraLeftEye);
    abraHead.addChild(abraRightEye);
    abraHead.addChild(abraNose);
    abraHead.addChild(abraMouth);
    abraHead.addChild(abraLeftEar);
    abraHead.addChild(abraRightEar);

    abraLeftEar.addChild(abraLeftEarInner);
    abraRightEar.addChild(abraRightEarInner);

   // Upper arm -> Elbow -> Forearm -> Wristband -> Hand -> Fingers
    abraLeftUpperArm.addChild(abraLeftElbow);
    abraLeftElbow.addChild(abraLeftForearm);
    abraLeftForearm.addChild(abraLeftWristBand);
    abraLeftForearm.addChild(abraLeftHand);

    abraRightUpperArm.addChild(abraRightElbow);
    abraRightElbow.addChild(abraRightForearm);
    abraRightForearm.addChild(abraRightWristBand);
    abraRightForearm.addChild(abraRightHand);

    abraLeftHand.addChild(abraLeftFinger1);
    abraLeftHand.addChild(abraLeftFinger2);
    abraLeftHand.addChild(abraLeftFinger3);

    abraRightHand.addChild(abraRightFinger1);
    abraRightHand.addChild(abraRightFinger2);
    abraRightHand.addChild(abraRightFinger3);

    // Upper leg -> Knee -> Lower leg -> Foot -> Toes (3 toes per foot)
    abraLeftUpperLeg.addChild(abraLeftKnee);
    abraLeftKnee.addChild(abraLeftLowerLeg);
    abraLeftLowerLeg.addChild(abraLeftFoot);

    abraRightUpperLeg.addChild(abraRightKnee);
    abraRightKnee.addChild(abraRightLowerLeg);
    abraRightLowerLeg.addChild(abraRightFoot);

    abraLeftFoot.addChild(abraLeftToe1);
    abraLeftFoot.addChild(abraLeftToe2);
    abraLeftFoot.addChild(abraLeftToe3);

    abraRightFoot.addChild(abraRightToe1);
    abraRightFoot.addChild(abraRightToe2);
    abraRightFoot.addChild(abraRightToe3);

    abraBody.setup();

    // ========== INJECT ALAKAZAM INTO ABRA'S WORLD ==========
    console.log("🔮 Initializing Alakazam in Abra's world...");

    // Create Alakazam instance with shared GL context, no auto-render
    const alakazam = new AlakazamApp(GL, false);
    console.log("✅ Alakazam loaded:", alakazam);

    // ========== INJECT KADABRA INTO ABRA'S WORLD ==========
    console.log("🥄 Initializing Kadabra in Abra's world...");

    // Create Kadabra instance with shared GL context, no auto-render
    const kadabra = new KadabraApp(GL, false);
    console.log("✅ Kadabra loaded:", kadabra);

    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.75, 0.85, 0.95, 1.0);
    GL.clearDepth(1.0);

    var time = 0;
    var walkCycle = 0;
    var waveCycle = 0;

    const baseTransforms = {
        head: LIBS.copy_matrix(abraHead.MOVE_MATRIX),
        leftEye: LIBS.copy_matrix(abraLeftEye.MOVE_MATRIX),
        rightEye: LIBS.copy_matrix(abraRightEye.MOVE_MATRIX),
        nose: LIBS.copy_matrix(abraNose.MOVE_MATRIX),
        mouth: LIBS.copy_matrix(abraMouth.MOVE_MATRIX),
        leftEar: LIBS.copy_matrix(abraLeftEar.MOVE_MATRIX),
        rightEar: LIBS.copy_matrix(abraRightEar.MOVE_MATRIX),
        leftEarInner: LIBS.copy_matrix(abraLeftEarInner.MOVE_MATRIX),
        rightEarInner: LIBS.copy_matrix(abraRightEarInner.MOVE_MATRIX),
        leftUpperArm: LIBS.copy_matrix(abraLeftUpperArm.MOVE_MATRIX),
        rightUpperArm: LIBS.copy_matrix(abraRightUpperArm.MOVE_MATRIX),
        leftElbow: LIBS.copy_matrix(abraLeftElbow.MOVE_MATRIX),
        rightElbow: LIBS.copy_matrix(abraRightElbow.MOVE_MATRIX),
        leftForearm: LIBS.copy_matrix(abraLeftForearm.MOVE_MATRIX),
        rightForearm: LIBS.copy_matrix(abraRightForearm.MOVE_MATRIX),
        leftWristBand: LIBS.copy_matrix(abraLeftWristBand.MOVE_MATRIX),
        rightWristBand: LIBS.copy_matrix(abraRightWristBand.MOVE_MATRIX),
        leftHand: LIBS.copy_matrix(abraLeftHand.MOVE_MATRIX),
        rightHand: LIBS.copy_matrix(abraRightHand.MOVE_MATRIX),
        leftFinger1: LIBS.copy_matrix(abraLeftFinger1.MOVE_MATRIX),
        leftFinger2: LIBS.copy_matrix(abraLeftFinger2.MOVE_MATRIX),
        leftFinger3: LIBS.copy_matrix(abraLeftFinger3.MOVE_MATRIX),
        rightFinger1: LIBS.copy_matrix(abraRightFinger1.MOVE_MATRIX),
        rightFinger2: LIBS.copy_matrix(abraRightFinger2.MOVE_MATRIX),
        rightFinger3: LIBS.copy_matrix(abraRightFinger3.MOVE_MATRIX),
        leftUpperLeg: LIBS.copy_matrix(abraLeftUpperLeg.MOVE_MATRIX),
        rightUpperLeg: LIBS.copy_matrix(abraRightUpperLeg.MOVE_MATRIX),
        leftKnee: LIBS.copy_matrix(abraLeftKnee.MOVE_MATRIX),
        rightKnee: LIBS.copy_matrix(abraRightKnee.MOVE_MATRIX),
        leftLowerLeg: LIBS.copy_matrix(abraLeftLowerLeg.MOVE_MATRIX),
        rightLowerLeg: LIBS.copy_matrix(abraRightLowerLeg.MOVE_MATRIX),
        leftFoot: LIBS.copy_matrix(abraLeftFoot.MOVE_MATRIX),
        rightFoot: LIBS.copy_matrix(abraRightFoot.MOVE_MATRIX),
        leftToe1: LIBS.copy_matrix(abraLeftToe1.MOVE_MATRIX),
        leftToe2: LIBS.copy_matrix(abraLeftToe2.MOVE_MATRIX),
        leftToe3: LIBS.copy_matrix(abraLeftToe3.MOVE_MATRIX),
        rightToe1: LIBS.copy_matrix(abraRightToe1.MOVE_MATRIX),
        rightToe2: LIBS.copy_matrix(abraRightToe2.MOVE_MATRIX),
        rightToe3: LIBS.copy_matrix(abraRightToe3.MOVE_MATRIX),
        tail: LIBS.copy_matrix(abraTail.MOVE_MATRIX),
        armor: LIBS.copy_matrix(abraArmor.MOVE_MATRIX),
        armorSegment1: LIBS.copy_matrix(abraArmorSegment1.MOVE_MATRIX),
        armorSegment2: LIBS.copy_matrix(abraArmorSegment2.MOVE_MATRIX),
        leftShoulder: LIBS.copy_matrix(abraLeftShoulder.MOVE_MATRIX),
        rightShoulder: LIBS.copy_matrix(abraRightShoulder.MOVE_MATRIX)
    };

    var animate = function () {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        if (!drag) {
            dX *= (1 - FRICTION);
            dY *= (1 - FRICTION);
            THETA += dX;
            PHI += dY;
        }

        var MODELMATRIX = LIBS.get_I4();
        var VIEWMATRIX_dynamic = LIBS.get_I4();

        LIBS.translateZ(VIEWMATRIX_dynamic, zoom);
        LIBS.rotateY(VIEWMATRIX_dynamic, THETA);
        LIBS.rotateX(VIEWMATRIX_dynamic, PHI);

        LIBS.multiply(VIEWMATRIX_dynamic, VIEWMATRIX, VIEWMATRIX_dynamic);

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX_dynamic);
        GL.uniformMatrix4fv(_Mmatrix, false, MODELMATRIX);

        // Directional light - positioned very high and far for even coverage
        const lightPosition = [50.0, 100.0, 80.0];
        const sunColor = [1.0, 0.98, 0.95];
        const ambientLight = [0.55, 0.58, 0.62];

        GL.uniform3fv(_uLightPosition, lightPosition);
        GL.uniform3fv(_uLightColor, sunColor);
        GL.uniform3fv(_uAmbientLight, ambientLight);

        // Point lights disabled
        GL.uniform3f(_uPointLight1Pos, 0, 0, 0);
        GL.uniform3f(_uPointLight1Color, 0, 0, 0);
        GL.uniform3f(_uPointLight2Pos, 0, 0, 0);
        GL.uniform3f(_uPointLight2Color, 0, 0, 0);

        var cameraPos = [
            -Math.sin(THETA) * zoom,
            Math.sin(PHI) * zoom,
            -Math.cos(THETA) * zoom
        ];
        GL.uniform3fv(_uCameraPosition, cameraPos);
        
        GL.uniform1f(_uShininess, 32.0);
        GL.uniform1f(_uSpecularStrength, 0.7);
        GL.uniform1f(_uTime, time);

        time += 0.016;
        walkCycle += 0.020;
        waveCycle += 0.028;

        // Render environment
        groundPlane.render(MODELMATRIX);
        cliffWalls.forEach(wall => wall.render(MODELMATRIX));  // Render cliff walls
        mountains.forEach(mountain => mountain.render(MODELMATRIX));
        trees.forEach(tree => tree.render(MODELMATRIX));
        rocks.forEach(rock => rock.render(MODELMATRIX));
        bushes.forEach(bush => bush.render(MODELMATRIX));
        flowers.forEach(flower => flower.render(MODELMATRIX));
        grassBlades.forEach(grass => grass.render(MODELMATRIX));

        birds.forEach(bird => {
            const data = bird.data;
            data.x += data.speedX * 0.016;
            data.y = 5 + Math.sin(time * 2 + data.offset) * data.speedY;

            if (data.x > 18) data.x = -18;
            if (data.x < -18) data.x = 18;

            bird.MOVE_MATRIX = LIBS.get_I4();
            LIBS.translateX(bird.MOVE_MATRIX, data.x);
            LIBS.translateY(bird.MOVE_MATRIX, data.y);
            LIBS.translateZ(bird.MOVE_MATRIX, data.z);
            
            if (data.speedX > 0) {
                LIBS.rotateY(bird.MOVE_MATRIX, Math.PI / 2);
            } else {
                LIBS.rotateY(bird.MOVE_MATRIX, -Math.PI / 2);
            }
            LIBS.rotateZ(bird.MOVE_MATRIX, Math.sin(time * 8 + data.offset) * 0.2);

            bird.render(MODELMATRIX);
        });

        fireflies.forEach(firefly => {
            const data = firefly.data;
            data.x += data.speedX * 0.016;
            data.y += Math.sin(time * 3 + data.offset) * 0.01;
            data.z += data.speedZ * 0.016;

            if (data.x > 12) data.x = -12;
            if (data.x < -12) data.x = 12;
            if (data.z > 12) data.z = -12;
            if (data.z < -12) data.z = 12;
            if (data.y > 4) data.y = 1;
            if (data.y < 1) data.y = 4;

            firefly.MOVE_MATRIX = LIBS.get_I4();
            LIBS.translateX(firefly.MOVE_MATRIX, data.x);
            LIBS.translateY(firefly.MOVE_MATRIX, data.y);
            LIBS.translateZ(firefly.MOVE_MATRIX, data.z);
            
            const pulse = Math.sin(time * 5 + data.offset) * 0.5 + 0.5;
            LIBS.scaleX(firefly.MOVE_MATRIX, 0.5 + pulse * 0.5);
            LIBS.scaleY(firefly.MOVE_MATRIX, 0.5 + pulse * 0.5);

            firefly.render(MODELMATRIX);
        });

        // Render Abra with animations
        const floatY = Math.sin(time * 1.0) * 0.15;
        const breathScale = 1.0 + Math.sin(time * 1.5) * 0.010;
        
        abraBody.MOVE_MATRIX = LIBS.get_I4();
        LIBS.translateY(abraBody.MOVE_MATRIX, floatY);
        LIBS.scaleX(abraBody.MOVE_MATRIX, breathScale);
        LIBS.scaleZ(abraBody.MOVE_MATRIX, breathScale);

        const headBob = Math.sin(walkCycle * 1.3) * 0.035;
        abraHead.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.head);
        LIBS.translateY(abraHead.MOVE_MATRIX, headBob);
        LIBS.rotateZ(abraHead.MOVE_MATRIX, Math.sin(walkCycle * 0.6) * 0.020);

        const earWiggle = Math.sin(walkCycle * 1.5) * 0.06;
        
        abraLeftEar.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftEar);
        LIBS.rotateZ(abraLeftEar.MOVE_MATRIX, earWiggle);
        
        abraRightEar.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightEar);
        LIBS.rotateZ(abraRightEar.MOVE_MATRIX, -earWiggle);

        // Arm animations
        const rightArmSwing = Math.sin(waveCycle * 0.8) * 0.08;
        const rightArmRotation = Math.sin(waveCycle * 1.2) * 0.06;
        
        abraRightUpperArm.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightUpperArm);
        LIBS.rotateZ(abraRightUpperArm.MOVE_MATRIX, rightArmSwing);
        LIBS.rotateX(abraRightUpperArm.MOVE_MATRIX, rightArmRotation);

        abraRightElbow.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightElbow);
        LIBS.rotateX(abraRightElbow.MOVE_MATRIX, Math.sin(waveCycle * 1.5) * 0.15);

        const leftArmSwing = Math.sin(walkCycle * 0.7) * 0.06;
        abraLeftUpperArm.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftUpperArm);
        LIBS.rotateZ(abraLeftUpperArm.MOVE_MATRIX, leftArmSwing);
        LIBS.rotateX(abraLeftUpperArm.MOVE_MATRIX, Math.sin(walkCycle * 0.9) * 0.04);

        abraLeftElbow.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftElbow);
        LIBS.rotateX(abraLeftElbow.MOVE_MATRIX, Math.sin(walkCycle * 1.3) * 0.12);

        abraRightHand.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightHand);
        LIBS.rotateZ(abraRightHand.MOVE_MATRIX, Math.sin(waveCycle * 1.6) * 0.05);
        
        abraLeftHand.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftHand);
        LIBS.rotateZ(abraLeftHand.MOVE_MATRIX, Math.sin(waveCycle * 1.4) * 0.04);

        // Leg animations with knee bend (subtle breathing motion in sitting pose)
        const legBreath = Math.sin(time * 1.2) * 0.02;
        
        abraLeftUpperLeg.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftUpperLeg);
        LIBS.rotateX(abraLeftUpperLeg.MOVE_MATRIX, legBreath);

        abraRightUpperLeg.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightUpperLeg);
        LIBS.rotateX(abraRightUpperLeg.MOVE_MATRIX, legBreath);

        // Knee slight movement
        abraLeftKnee.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftKnee);
        LIBS.rotateX(abraLeftKnee.MOVE_MATRIX, Math.sin(time * 1.1) * 0.03);

        abraRightKnee.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightKnee);
        LIBS.rotateX(abraRightKnee.MOVE_MATRIX, Math.sin(time * 1.1) * 0.03);

        // Lower leg subtle movement
        abraLeftLowerLeg.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftLowerLeg);
        LIBS.rotateX(abraLeftLowerLeg.MOVE_MATRIX, Math.sin(time * 0.9) * 0.04);

        abraRightLowerLeg.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightLowerLeg);
        LIBS.rotateX(abraRightLowerLeg.MOVE_MATRIX, Math.sin(time * 0.9) * 0.04);

        // Foot slight wiggle
        abraLeftFoot.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftFoot);
        LIBS.rotateX(abraLeftFoot.MOVE_MATRIX, Math.sin(time * 1.3) * 0.02);
        
        abraRightFoot.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightFoot);
        LIBS.rotateX(abraRightFoot.MOVE_MATRIX, Math.sin(time * 1.3) * 0.02);

        abraTail.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.tail);
        LIBS.rotateX(abraTail.MOVE_MATRIX, Math.sin(walkCycle * 0.6) * 0.08);
        LIBS.rotateY(abraTail.MOVE_MATRIX, Math.sin(walkCycle * 0.9) * 0.12);

        abraArmor.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.armor);
        LIBS.scaleZ(abraArmor.MOVE_MATRIX, 1.0 + Math.sin(time * 1.5) * 0.006);

        abraLeftShoulder.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftShoulder);
        LIBS.rotateZ(abraLeftShoulder.MOVE_MATRIX, Math.sin(walkCycle * 0.8) * 0.04);
        
        abraRightShoulder.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightShoulder);
        LIBS.rotateZ(abraRightShoulder.MOVE_MATRIX, Math.sin(walkCycle * 0.8) * -0.04);

        abraBody.render(MODELMATRIX);

        // ========== RENDER ALAKAZAM (AFTER ABRA, SAME SCENE) ==========
        if (alakazam && alakazam.renderOnce) {
            // Pass Abra's view and projection matrices to Alakazam
            // Convert Abra's matrix to Float32Array for Alakazam (mat4 format)
            const abraViewMatrixForAlakazam = new Float32Array(VIEWMATRIX_dynamic);
            const abraProjMatrixForAlakazam = new Float32Array(PROJMATRIX);

            // Convert light data to Float32Array for Alakazam
            const abraLightPosition = new Float32Array(lightPosition);
            const abraLightColor = new Float32Array(sunColor);
            const abraAmbientLight = new Float32Array(ambientLight);
            const abraCameraPosition = new Float32Array(cameraPos);

            // Debug: Log once to verify values (only first frame)
            if (!window.lightDebugLogged) {
                console.log("🔦 Abra Light Data sent to Alakazam:");
                console.log("  Position:", lightPosition);
                console.log("  Color:", sunColor);
                console.log("  Ambient:", ambientLight);
                console.log("  Camera:", cameraPos);
                window.lightDebugLogged = true;
            }

            // Render Alakazam with Abra's camera and lighting (shared world)
            alakazam.renderOnce(0.016, true, abraViewMatrixForAlakazam, abraProjMatrixForAlakazam,
                               abraLightPosition, abraLightColor, abraAmbientLight, abraCameraPosition);
        }

        // ========== RENDER KADABRA (AFTER ALAKAZAM, SAME SCENE) ==========
        if (kadabra && kadabra.renderOnce) {
            // Reuse Abra's matrices and lighting (already converted to Float32Array above)
            const abraViewMatrixForKadabra = new Float32Array(VIEWMATRIX_dynamic);
            const abraProjMatrixForKadabra = new Float32Array(PROJMATRIX);
            const abraLightPositionForKadabra = new Float32Array(lightPosition);
            const abraLightColorForKadabra = new Float32Array(sunColor);
            const abraAmbientLightForKadabra = new Float32Array(ambientLight);
            const abraCameraPositionForKadabra = new Float32Array(cameraPos);

            // Render Kadabra with Abra's camera and lighting (shared world)
            kadabra.renderOnce(0.016, true, abraViewMatrixForKadabra, abraProjMatrixForKadabra,
                              abraLightPositionForKadabra, abraLightColorForKadabra,
                              abraAmbientLightForKadabra, abraCameraPositionForKadabra);
        }

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    
    animate();
}

window.addEventListener('load', main);
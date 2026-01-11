function main() {
    var CANVAS = document.getElementById('myCanvas');
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    var THETA = 0, PHI = 0;
    var drag = false;
    var x_prev, y_prev;
    var FRICTION = 0.05;
    var dX = 0, dY = 0;
    var SPEED = 0.05;
    var zoom = -7;

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

    // Scroll zoom
    var scroll = (e) => {
        if (e.deltaY < 0) {
            zoom += 0.1;
        } else {
            zoom -= 0.1;
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
            vec3 ambient = mix(uAmbientLight, skyColor, 0.3) * vColor;
            
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
            
            // Atmospheric fog effect
            float fogDensity = 0.015;
            float fogAmount = 1.0 - exp(-fogDensity * abs(vDepth) * abs(vDepth));
            vec3 fogColor = vec3(0.75, 0.85, 0.95);
            
            // Combine all lighting
            vec3 result = ambient + diffuse + specular + 
                         pointLight1Diffuse + pointLight1Specular +
                         pointLight2Diffuse + pointLight2Specular;
            
            // Apply fog
            result = mix(result, fogColor, fogAmount * 0.4);
            
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

    var PROJMATRIX = LIBS.get_projection(60, CANVAS.width / CANVAS.height, 1, 100);
    var VIEWMATRIX = LIBS.get_I4();

    // Kadabra colors - ENHANCED BROWN COLORS for more defined shield
    const yellowColor = [1.0, 0.92, 0.35];
    const brownColor = [0.65, 0.42, 0.28]; // Darker, more defined brown
    const darkBrownColor = [0.50, 0.32, 0.20]; // Even darker for contrast
    const earInnerColor = [1.0, 0.92, 0.35]; // CHANGED: Full yellow like the rest of Kadabra
    const blackColor = [0.18, 0.18, 0.18];
    const noseColor = [0.95, 0.85, 0.38];
    const mouthColor = [0.38, 0.30, 0.24];
    const silverColor = [0.75, 0.75, 0.80];
    const whiskerColor = [0.85, 0.75, 0.35];
    const pinkStarColor = [1.0, 0.4, 0.6]; // Pink color for star

    // Create Kadabra objects
    const { vertices: body_vertices, indices: body_indices } = generateEllipsoid(0.55, 0.75, 0.48, 32, 32, yellowColor);
    const kadabraBody = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, body_vertices, body_indices, GL.TRIANGLES);

    // MODIFIED: Enhanced head with sharper chin (increased pointiness, reduced bluntness)
    const { vertices: head_vertices, indices: head_indices } = generateFoxHead(0.85, 0.60, 0.68, 36, 10, yellowColor, 1.2, 0.08);
    const kadabraHead = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, head_vertices, head_indices, GL.TRIANGLES);

    // MODIFIED: Mata terbuka (Kadabra style)
    const { vertices: eye_vertices, indices: eye_indices } = generateOpenEye(0.25, 0.12, 24, blackColor);
    const kadabraLeftEye = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, eye_vertices, eye_indices, GL.TRIANGLES);
    const kadabraRightEye = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, eye_vertices, eye_indices, GL.TRIANGLES);

    const { vertices: nose_vertices, indices: nose_indices } = generateNose(0.08, 0.04, 0.06, noseColor);
    const kadabraNose = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, nose_vertices, nose_indices, GL.TRIANGLES);

    const { vertices: mouth_vertices, indices: mouth_indices } = generateMouthLine(0.18, 0.02, 16, mouthColor);
    const kadabraMouth = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, mouth_vertices, mouth_indices, GL.TRIANGLES);

    const { vertices: ear_vertices, indices: ear_indices } = generateSharpCone(0.33, 1.5, 28, yellowColor);
    const kadabraLeftEar = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ear_vertices, ear_indices, GL.TRIANGLES);
    const kadabraRightEar = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ear_vertices, ear_indices, GL.TRIANGLES);

    const { vertices: ear_inner_vertices, indices: ear_inner_indices } = generateEarInner(0.24, 1.25, 18, earInnerColor);
    const kadabraLeftEarInner = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ear_inner_vertices, ear_inner_indices, GL.TRIANGLES);
    const kadabraRightEarInner = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ear_inner_vertices, ear_inner_indices, GL.TRIANGLES);

    // NEW: Kumis (Whiskers) - 2 kumis panjang
    const { vertices: whisker_vertices, indices: whisker_indices } = generateWhisker(1.2, 0.025, 20, whiskerColor);
    const kadabraLeftWhisker = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, whisker_vertices, whisker_indices, GL.TRIANGLES);
    const kadabraRightWhisker = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, whisker_vertices, whisker_indices, GL.TRIANGLES);

    // NEW: Star logo on forehead (Kadabra's iconic feature)
    const { vertices: star_vertices, indices: star_indices } = generateStar(0.12, 0.05, 0.03, 5, pinkStarColor);
    const kadabraForeheadStar = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, star_vertices, star_indices, GL.TRIANGLES);

    const { vertices: arm_vertices, indices: arm_indices } = generateCylinder(0.18, 0.14, 1.3, 14, 10, yellowColor);
    const kadabraLeftArm = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, arm_vertices, arm_indices, GL.TRIANGLES);
    const kadabraRightArm = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, arm_vertices, arm_indices, GL.TRIANGLES);

    const { vertices: wristband_vertices, indices: wristband_indices } = generateWristBand(0.15, 0.20, 16, brownColor);
    const kadabraLeftWristBand = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, wristband_vertices, wristband_indices, GL.TRIANGLES);
    const kadabraRightWristBand = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, wristband_vertices, wristband_indices, GL.TRIANGLES);

    const { vertices: hand_vertices, indices: hand_indices } = generateEllipsoid(0.20, 0.17, 0.16, 20, 20, yellowColor);
    const kadabraLeftHand = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, hand_vertices, hand_indices, GL.TRIANGLES);
    const kadabraRightHand = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, hand_vertices, hand_indices, GL.TRIANGLES);

    const { vertices: finger_vertices, indices: finger_indices } = generateCone(0.045, 0.45, 14, yellowColor);
    
    const kadabraLeftFinger1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    const kadabraLeftFinger2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    const kadabraLeftFinger3 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    
    const kadabraRightFinger1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    const kadabraRightFinger2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
    const kadabraRightFinger3 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);

    // NEW: Sendok (Spoon) - held in right hand
    const { vertices: spoon_vertices, indices: spoon_indices } = generateSpoon(0.9, 0.04, 0.25, 0.50, silverColor);
    const kadabraSpoon = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, spoon_vertices, spoon_indices, GL.TRIANGLES);

    // Kaki
    const { vertices: leg_vertices, indices: leg_indices } = generateEllipsoid(0.22, 0.85, 0.22, 22, 22, yellowColor);
    const kadabraLeftLeg = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, leg_vertices, leg_indices, GL.TRIANGLES);
    const kadabraRightLeg = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, leg_vertices, leg_indices, GL.TRIANGLES);

    // Telapak kaki
    const { vertices: foot_vertices, indices: foot_indices } = generateEllipsoid(0.32, 0.12, 0.38, 16, 16, yellowColor);
    const kadabraLeftFoot = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, foot_vertices, foot_indices, GL.TRIANGLES);
    const kadabraRightFoot = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, foot_vertices, foot_indices, GL.TRIANGLES);

    // Kuku kaki
    const { vertices: toe_vertices, indices: toe_indices } = generateFootToe(0.095, 0.42, 7, yellowColor);
    
    const kadabraLeftToe1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
    const kadabraLeftToe2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
    
    const kadabraRightToe1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
    const kadabraRightToe2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);

    // MODIFIED: Enhanced tail with brown stripes - increased length and adjusted for pointed tip
    const { vertices: tail_vertices, indices: tail_indices } = generateCurvedCylinder(0.28, 0.08, 1.45, 32, 18, yellowColor);
    const kadabraTail = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, tail_vertices, tail_indices, GL.TRIANGLES);

    // MODIFIED: Enhanced armor with more defined brown shield
    const { vertices: armor_vertices, indices: armor_indices } = generateEllipsoid(0.58, 0.78, 0.50, 32, 32, brownColor);
    const kadabraArmor = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, armor_vertices, armor_indices, GL.TRIANGLES);

    // MODIFIED: More prominent chest segments for better definition
    const { vertices: segment1_vertices, indices: segment1_indices } = generateChestSegment(0.42, 0.14, 0.22, darkBrownColor);
    const kadabraArmorSegment1 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, segment1_vertices, segment1_indices, GL.TRIANGLES);
    
    const { vertices: segment2_vertices, indices: segment2_indices } = generateChestSegment(0.40, 0.13, 0.21, darkBrownColor);
    const kadabraArmorSegment2 = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, segment2_vertices, segment2_indices, GL.TRIANGLES);

    // MODIFIED: Enhanced shoulder pads for more defined look
    const { vertices: shoulder_vertices, indices: shoulder_indices } = generateShoulderPad(0.42, 12, darkBrownColor);
    const kadabraLeftShoulder = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, shoulder_vertices, shoulder_indices, GL.TRIANGLES);
    const kadabraRightShoulder = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, shoulder_vertices, shoulder_indices, GL.TRIANGLES);

    // ===== ENHANCED ENVIRONMENT =====
    const GROUND_HEIGHT_OFFSET = -2.4;
    
    // Ground
    const { vertices: ground_vertices, indices: ground_indices } = createGroundPlane();
    const groundPlane = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, ground_vertices, ground_indices, GL.TRIANGLES);
    LIBS.translateY(groundPlane.MOVE_MATRIX, GROUND_HEIGHT_OFFSET);
    groundPlane.setup();

    // Trees (MORE TREES!)
    const { vertices: tree_vertices, indices: tree_indices } = createTree();
    const treePositions = [
        [-9, GROUND_HEIGHT_OFFSET, -9],
        [9, GROUND_HEIGHT_OFFSET, -11],
        [-11, GROUND_HEIGHT_OFFSET, 9],
        [7, GROUND_HEIGHT_OFFSET, 10],
        [-6, GROUND_HEIGHT_OFFSET, -12],
        [11, GROUND_HEIGHT_OFFSET, 7],
        [-13, GROUND_HEIGHT_OFFSET, -5],
        [5, GROUND_HEIGHT_OFFSET, -14],
        // NEW: Additional trees
        [-8, GROUND_HEIGHT_OFFSET, 6],
        [10, GROUND_HEIGHT_OFFSET, -8],
        [-14, GROUND_HEIGHT_OFFSET, 2],
        [6, GROUND_HEIGHT_OFFSET, 12],
        [-4, GROUND_HEIGHT_OFFSET, -15],
        [13, GROUND_HEIGHT_OFFSET, -3]
    ];
    const trees = treePositions.map(pos => {
        const tree = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, tree_vertices, tree_indices, GL.TRIANGLES);
        LIBS.translateX(tree.MOVE_MATRIX, pos[0]);
        LIBS.translateY(tree.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(tree.MOVE_MATRIX, pos[2]);
        const scale = 0.8 + Math.random() * 0.4;
        LIBS.scaleX(tree.MOVE_MATRIX, scale);
        LIBS.scaleY(tree.MOVE_MATRIX, scale);
        LIBS.scaleZ(tree.MOVE_MATRIX, scale);
        tree.setup();
        return tree;
    });

    // NEW: Vines on some trees
    const { vertices: vine_vertices, indices: vine_indices } = createVine();
    const vinePositions = [
        [-9, GROUND_HEIGHT_OFFSET, -9],
        [7, GROUND_HEIGHT_OFFSET, 10],
        [-13, GROUND_HEIGHT_OFFSET, -5],
        [10, GROUND_HEIGHT_OFFSET, -8]
    ];
    const vines = vinePositions.map(pos => {
        const vine = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, vine_vertices, vine_indices, GL.TRIANGLES);
        LIBS.translateX(vine.MOVE_MATRIX, pos[0]);
        LIBS.translateY(vine.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(vine.MOVE_MATRIX, pos[2]);
        vine.setup();
        return vine;
    });

    // Mountains
    const { vertices: mountain_vertices, indices: mountain_indices } = createMountain();
    const mountainPositions = [
        [-16, GROUND_HEIGHT_OFFSET, -22],
        [14, GROUND_HEIGHT_OFFSET, -24],
        [0, GROUND_HEIGHT_OFFSET, -27],
        [-20, GROUND_HEIGHT_OFFSET, -18],
        [18, GROUND_HEIGHT_OFFSET, -20]
    ];
    const mountains = mountainPositions.map(pos => {
        const mountain = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, mountain_vertices, mountain_indices, GL.TRIANGLES);
        LIBS.translateX(mountain.MOVE_MATRIX, pos[0]);
        LIBS.translateY(mountain.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(mountain.MOVE_MATRIX, pos[2]);
        const scale = 1.0 + Math.random() * 0.5;
        LIBS.scaleX(mountain.MOVE_MATRIX, scale);
        LIBS.scaleY(mountain.MOVE_MATRIX, scale);
        LIBS.scaleZ(mountain.MOVE_MATRIX, scale);
        mountain.setup();
        return mountain;
    });

    // Rocks (MORE ROCKS!)
    const { vertices: rock_vertices, indices: rock_indices } = createRock();
    const rockPositions = [
        [-3, GROUND_HEIGHT_OFFSET, 2],
        [4, GROUND_HEIGHT_OFFSET, -3],
        [-5, GROUND_HEIGHT_OFFSET, -4],
        [2, GROUND_HEIGHT_OFFSET, 5],
        [-2, GROUND_HEIGHT_OFFSET, -5],
        [6, GROUND_HEIGHT_OFFSET, 3],
        // NEW: Additional rocks
        [-7, GROUND_HEIGHT_OFFSET, -2],
        [3, GROUND_HEIGHT_OFFSET, -7],
        [-4, GROUND_HEIGHT_OFFSET, 6],
        [7, GROUND_HEIGHT_OFFSET, -5],
        [-6, GROUND_HEIGHT_OFFSET, 3],
        [5, GROUND_HEIGHT_OFFSET, 7]
    ];
    const rocks = rockPositions.map(pos => {
        const rock = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, rock_vertices, rock_indices, GL.TRIANGLES);
        LIBS.translateX(rock.MOVE_MATRIX, pos[0]);
        LIBS.translateY(rock.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(rock.MOVE_MATRIX, pos[2]);
        LIBS.rotateY(rock.MOVE_MATRIX, Math.random() * Math.PI * 2);
        const scale = 0.8 + Math.random() * 0.6;
        LIBS.scaleX(rock.MOVE_MATRIX, scale);
        LIBS.scaleY(rock.MOVE_MATRIX, scale);
        LIBS.scaleZ(rock.MOVE_MATRIX, scale);
        rock.setup();
        return rock;
    });

    // Bushes (MORE BUSHES!)
    const { vertices: bush_vertices, indices: bush_indices } = createBush();
    const bushPositions = [
        [-7, GROUND_HEIGHT_OFFSET, 4],
        [8, GROUND_HEIGHT_OFFSET, 5],
        [-4, GROUND_HEIGHT_OFFSET, 7],
        [5, GROUND_HEIGHT_OFFSET, -6],
        // NEW: Additional bushes
        [-9, GROUND_HEIGHT_OFFSET, -3],
        [6, GROUND_HEIGHT_OFFSET, 8],
        [-5, GROUND_HEIGHT_OFFSET, -8],
        [9, GROUND_HEIGHT_OFFSET, -4]
    ];
    const bushes = bushPositions.map(pos => {
        const bush = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, bush_vertices, bush_indices, GL.TRIANGLES);
        LIBS.translateX(bush.MOVE_MATRIX, pos[0]);
        LIBS.translateY(bush.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(bush.MOVE_MATRIX, pos[2]);
        bush.setup();
        return bush;
    });

    // NEW: Mushrooms
    const { vertices: mushroom_vertices, indices: mushroom_indices } = createMushroom();
    const mushroomPositions = [];
    for (let i = 0; i < 15; i++) {
        mushroomPositions.push([
            (Math.random() - 0.5) * 18,
            GROUND_HEIGHT_OFFSET,
            (Math.random() - 0.5) * 18
        ]);
    }
    const mushrooms = mushroomPositions.map(pos => {
        const mushroom = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, mushroom_vertices, mushroom_indices, GL.TRIANGLES);
        LIBS.translateX(mushroom.MOVE_MATRIX, pos[0]);
        LIBS.translateY(mushroom.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(mushroom.MOVE_MATRIX, pos[2]);
        LIBS.rotateY(mushroom.MOVE_MATRIX, Math.random() * Math.PI * 2);
        const scale = 0.8 + Math.random() * 0.4;
        LIBS.scaleX(mushroom.MOVE_MATRIX, scale);
        LIBS.scaleY(mushroom.MOVE_MATRIX, scale);
        LIBS.scaleZ(mushroom.MOVE_MATRIX, scale);
        mushroom.setup();
        return mushroom;
    });

    // NEW: Ferns
    const { vertices: fern_vertices, indices: fern_indices } = createFern();
    const fernPositions = [];
    for (let i = 0; i < 12; i++) {
        fernPositions.push([
            (Math.random() - 0.5) * 16,
            GROUND_HEIGHT_OFFSET,
            (Math.random() - 0.5) * 16
        ]);
    }
    const ferns = fernPositions.map(pos => {
        const fern = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, fern_vertices, fern_indices, GL.TRIANGLES);
        LIBS.translateX(fern.MOVE_MATRIX, pos[0]);
        LIBS.translateY(fern.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(fern.MOVE_MATRIX, pos[2]);
        LIBS.rotateY(fern.MOVE_MATRIX, Math.random() * Math.PI * 2);
        fern.setup();
        return fern;
    });

    // Flowers (MORE FLOWERS with more colors!)
    const flowerPositions = [];
    for (let i = 0; i < 35; i++) {
        flowerPositions.push([
            (Math.random() - 0.5) * 22,
            GROUND_HEIGHT_OFFSET,
            (Math.random() - 0.5) * 22
        ]);
    }
    const flowers = flowerPositions.map(pos => {
        const { vertices: flower_vertices, indices: flower_indices } = createFlower();
        const flower = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, flower_vertices, flower_indices, GL.TRIANGLES);
        LIBS.translateX(flower.MOVE_MATRIX, pos[0]);
        LIBS.translateY(flower.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(flower.MOVE_MATRIX, pos[2]);
        LIBS.rotateY(flower.MOVE_MATRIX, Math.random() * Math.PI * 2);
        flower.setup();
        return flower;
    });

    // Grass blades (MORE GRASS!)
    const { vertices: grass_vertices, indices: grass_indices } = createGrassBlade();
    const grassPositions = [];
    for (let i = 0; i < 60; i++) {
        grassPositions.push([
            (Math.random() - 0.5) * 28,
            GROUND_HEIGHT_OFFSET,
            (Math.random() - 0.5) * 28
        ]);
    }
    const grassBlades = grassPositions.map(pos => {
        const grass = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, grass_vertices, grass_indices, GL.TRIANGLES);
        LIBS.translateX(grass.MOVE_MATRIX, pos[0]);
        LIBS.translateY(grass.MOVE_MATRIX, pos[1]);
        LIBS.translateZ(grass.MOVE_MATRIX, pos[2]);
        LIBS.rotateY(grass.MOVE_MATRIX, Math.random() * Math.PI * 2);
        grass.setup();
        return grass;
    });

    // Birds (MORE BIRDS!)
    const { vertices: bird_vertices, indices: bird_indices } = createBird();
    const birds = [
        { x: -6, y: 5, z: 0, speedX: 1.8, speedY: 0.35, offset: 0 },
        { x: 4, y: 6, z: -3, speedX: -1.5, speedY: 0.28, offset: Math.PI },
        { x: 0, y: 7, z: 3, speedX: 2.0, speedY: 0.40, offset: Math.PI/2 },
        { x: -8, y: 5.5, z: 5, speedX: 1.3, speedY: 0.32, offset: Math.PI * 1.5 },
        // NEW: Additional birds
        { x: 7, y: 6.5, z: -5, speedX: -1.7, speedY: 0.30, offset: Math.PI * 0.5 },
        { x: -5, y: 7.2, z: -4, speedX: 1.6, speedY: 0.38, offset: Math.PI * 1.2 }
    ].map(birdData => {
        const bird = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, bird_vertices, bird_indices, GL.TRIANGLES);
        bird.data = birdData;
        bird.setup();
        return bird;
    });

    // NEW: Butterflies
    const butterflies = [];
    for (let i = 0; i < 8; i++) {
        const { vertices: butterfly_vertices, indices: butterfly_indices } = createButterfly();
        const butterfly = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, butterfly_vertices, butterfly_indices, GL.TRIANGLES);
        butterfly.data = {
            x: (Math.random() - 0.5) * 12,
            y: 0.5 + Math.random() * 2,
            z: (Math.random() - 0.5) * 12,
            speedX: (Math.random() - 0.5) * 0.4,
            speedY: (Math.random() - 0.5) * 0.2,
            speedZ: (Math.random() - 0.5) * 0.4,
            offset: Math.random() * Math.PI * 2
        };
        butterfly.setup();
        butterflies.push(butterfly);
    }

    // Fireflies (MORE FIREFLIES!)
    const { vertices: firefly_vertices, indices: firefly_indices } = createFirefly();
    const fireflies = [];
    for (let i = 0; i < 25; i++) {
        const firefly = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, firefly_vertices, firefly_indices, GL.TRIANGLES);
        firefly.data = {
            x: (Math.random() - 0.5) * 18,
            y: 1 + Math.random() * 3.5,
            z: (Math.random() - 0.5) * 18,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.3,
            speedZ: (Math.random() - 0.5) * 0.5,
            offset: Math.random() * Math.PI * 2
        };
        firefly.setup();
        fireflies.push(firefly);
    }

    // NEW: Clouds in the sky
    const { vertices: cloud_vertices, indices: cloud_indices } = createCloud();
    const clouds = [
        { x: -12, y: 8, z: -15, speedX: 0.3 },
        { x: 8, y: 9, z: -18, speedX: 0.25 },
        { x: -5, y: 10, z: -20, speedX: 0.35 },
        { x: 15, y: 8.5, z: -16, speedX: 0.28 }
    ].map(cloudData => {
        const cloud = new Object(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, cloud_vertices, cloud_indices, GL.TRIANGLES);
        cloud.data = cloudData;
        cloud.setup();
        return cloud;
    });

    // Kadabra transformations
    LIBS.translateY(kadabraHead.MOVE_MATRIX, 1.05);
    LIBS.translateZ(kadabraHead.MOVE_MATRIX, 0.1);
    LIBS.rotateX(kadabraHead.MOVE_MATRIX, LIBS.degToRad(40));

    // MODIFIED: Posisi mata (lebih terbuka dan alert)
    LIBS.translateX(kadabraLeftEye.MOVE_MATRIX, -0.35);
    LIBS.translateY(kadabraLeftEye.MOVE_MATRIX, 0.32);
    LIBS.translateZ(kadabraLeftEye.MOVE_MATRIX, 0.68);
    LIBS.rotateY(kadabraLeftEye.MOVE_MATRIX, LIBS.degToRad(-60));
    LIBS.rotateX(kadabraLeftEye.MOVE_MATRIX, LIBS.degToRad(5));

    LIBS.translateX(kadabraRightEye.MOVE_MATRIX, 0.35);
    LIBS.translateY(kadabraRightEye.MOVE_MATRIX, 0.32);
    LIBS.translateZ(kadabraRightEye.MOVE_MATRIX, 0.68);
    LIBS.rotateY(kadabraRightEye.MOVE_MATRIX, LIBS.degToRad(60));
    LIBS.rotateX(kadabraRightEye.MOVE_MATRIX, LIBS.degToRad(-5));

    LIBS.translateY(kadabraNose.MOVE_MATRIX, 0.05);
    LIBS.translateZ(kadabraNose.MOVE_MATRIX, 1.13);

    LIBS.translateY(kadabraMouth.MOVE_MATRIX, -0.08);
    LIBS.translateZ(kadabraMouth.MOVE_MATRIX, 0.75);

    // NEW: Posisi bintang di dahi (between eyes, on forehead)
    LIBS.translateY(kadabraForeheadStar.MOVE_MATRIX, 0.55);
    LIBS.translateZ(kadabraForeheadStar.MOVE_MATRIX, 0.78);
    LIBS.rotateX(kadabraForeheadStar.MOVE_MATRIX, LIBS.degToRad(90));

    LIBS.translateX(kadabraLeftEar.MOVE_MATRIX, -0.40);
    LIBS.translateY(kadabraLeftEar.MOVE_MATRIX, -0.01);
    LIBS.translateZ(kadabraLeftEar.MOVE_MATRIX, 0.12);
    LIBS.rotateZ(kadabraLeftEar.MOVE_MATRIX, LIBS.degToRad(40));
    LIBS.rotateY(kadabraLeftEar.MOVE_MATRIX, LIBS.degToRad(-90));

    LIBS.translateX(kadabraRightEar.MOVE_MATRIX, 0.40);
    LIBS.translateY(kadabraRightEar.MOVE_MATRIX, 0.01);
    LIBS.translateZ(kadabraRightEar.MOVE_MATRIX, 0.12);
    LIBS.rotateZ(kadabraRightEar.MOVE_MATRIX, LIBS.degToRad(-40));
    LIBS.rotateY(kadabraRightEar.MOVE_MATRIX, LIBS.degToRad(90));

    LIBS.translateZ(kadabraLeftEarInner.MOVE_MATRIX, 0);
    LIBS.translateX(kadabraLeftEarInner.MOVE_MATRIX, 0.10);
    LIBS.translateZ(kadabraRightEarInner.MOVE_MATRIX, 0);
    LIBS.translateX(kadabraRightEarInner.MOVE_MATRIX, -0.10);

    // NEW: Posisi kumis (whiskers)
    LIBS.translateX(kadabraLeftWhisker.MOVE_MATRIX, -0.25);
    LIBS.translateY(kadabraLeftWhisker.MOVE_MATRIX, 0.15);
    LIBS.translateZ(kadabraLeftWhisker.MOVE_MATRIX, 0.85);
    LIBS.rotateY(kadabraLeftWhisker.MOVE_MATRIX, LIBS.degToRad(-15));
    LIBS.rotateZ(kadabraLeftWhisker.MOVE_MATRIX, LIBS.degToRad(-5));

    LIBS.translateX(kadabraRightWhisker.MOVE_MATRIX, 0.25);
    LIBS.translateY(kadabraRightWhisker.MOVE_MATRIX, 0.15);
    LIBS.translateZ(kadabraRightWhisker.MOVE_MATRIX, 0.85);
    LIBS.rotateY(kadabraRightWhisker.MOVE_MATRIX, LIBS.degToRad(180 + 15));
    LIBS.rotateZ(kadabraRightWhisker.MOVE_MATRIX, LIBS.degToRad(5));

    // Posisi lengan 
    LIBS.translateX(kadabraLeftArm.MOVE_MATRIX, -0.68);
    LIBS.translateY(kadabraLeftArm.MOVE_MATRIX, 0.15);
    LIBS.translateZ(kadabraLeftArm.MOVE_MATRIX, 0);
    LIBS.rotateZ(kadabraLeftArm.MOVE_MATRIX, LIBS.degToRad(-22));
    LIBS.rotateX(kadabraLeftArm.MOVE_MATRIX, LIBS.degToRad(-10));

    LIBS.translateX(kadabraRightArm.MOVE_MATRIX, 0.68);
    LIBS.translateY(kadabraRightArm.MOVE_MATRIX, 0.15);
    LIBS.translateZ(kadabraRightArm.MOVE_MATRIX, 0);
    LIBS.rotateZ(kadabraRightArm.MOVE_MATRIX, LIBS.degToRad(22));
    LIBS.rotateX(kadabraRightArm.MOVE_MATRIX, LIBS.degToRad(-10));

    // Posisi wristband 
    LIBS.translateY(kadabraLeftWristBand.MOVE_MATRIX, -0.55);
    LIBS.translateY(kadabraRightWristBand.MOVE_MATRIX, -0.55);

    // Posisi tangan 
    LIBS.translateY(kadabraLeftHand.MOVE_MATRIX, -0.70);
    LIBS.translateY(kadabraRightHand.MOVE_MATRIX, -0.70);

    // NEW: Posisi sendok (di tangan kanan)
    LIBS.translateY(kadabraSpoon.MOVE_MATRIX, -0.45);
    LIBS.translateX(kadabraSpoon.MOVE_MATRIX, 0.05);
    LIBS.translateZ(kadabraSpoon.MOVE_MATRIX, 0.12);
    LIBS.rotateZ(kadabraSpoon.MOVE_MATRIX, LIBS.degToRad(-10));
    LIBS.rotateX(kadabraSpoon.MOVE_MATRIX, LIBS.degToRad(15));

    // Posisi jari-jari 
    LIBS.translateX(kadabraLeftFinger1.MOVE_MATRIX, -0.14);
    LIBS.translateY(kadabraLeftFinger1.MOVE_MATRIX, -0.01);
    LIBS.translateZ(kadabraLeftFinger1.MOVE_MATRIX, 0.03);
    LIBS.rotateZ(kadabraLeftFinger1.MOVE_MATRIX, LIBS.degToRad(-10));
    LIBS.rotateX(kadabraLeftFinger1.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateY(kadabraLeftFinger2.MOVE_MATRIX, -0.01);
    LIBS.translateZ(kadabraLeftFinger2.MOVE_MATRIX, 0.07);
    LIBS.rotateX(kadabraLeftFinger2.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateX(kadabraLeftFinger3.MOVE_MATRIX, 0.14);
    LIBS.translateY(kadabraLeftFinger3.MOVE_MATRIX, -0.01);
    LIBS.translateZ(kadabraLeftFinger3.MOVE_MATRIX, 0.03);
    LIBS.rotateZ(kadabraLeftFinger3.MOVE_MATRIX, LIBS.degToRad(10));
    LIBS.rotateX(kadabraLeftFinger3.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateX(kadabraRightFinger1.MOVE_MATRIX, -0.14);
    LIBS.translateY(kadabraRightFinger1.MOVE_MATRIX, -0.01);
    LIBS.translateZ(kadabraRightFinger1.MOVE_MATRIX, 0.03);
    LIBS.rotateZ(kadabraRightFinger1.MOVE_MATRIX, LIBS.degToRad(-10));
    LIBS.rotateX(kadabraRightFinger1.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateY(kadabraRightFinger2.MOVE_MATRIX, -0.01);
    LIBS.translateZ(kadabraRightFinger2.MOVE_MATRIX, 0.07);
    LIBS.rotateX(kadabraRightFinger2.MOVE_MATRIX, LIBS.degToRad(200));

    LIBS.translateX(kadabraRightFinger3.MOVE_MATRIX, 0.14);
    LIBS.translateY(kadabraRightFinger3.MOVE_MATRIX, -0.01);
    LIBS.translateZ(kadabraRightFinger3.MOVE_MATRIX, 0.03);
    LIBS.rotateZ(kadabraRightFinger3.MOVE_MATRIX, LIBS.degToRad(10));
    LIBS.rotateX(kadabraRightFinger3.MOVE_MATRIX, LIBS.degToRad(200));

    // Posisi kaki 
    LIBS.translateX(kadabraLeftLeg.MOVE_MATRIX, -0.30);
    LIBS.translateY(kadabraLeftLeg.MOVE_MATRIX, -1.25);

    LIBS.translateX(kadabraRightLeg.MOVE_MATRIX, 0.30);
    LIBS.translateY(kadabraRightLeg.MOVE_MATRIX, -1.25);

    // Posisi telapak kaki
    LIBS.translateY(kadabraLeftFoot.MOVE_MATRIX, -0.88);
    LIBS.translateZ(kadabraLeftFoot.MOVE_MATRIX, 0.12);

    LIBS.translateY(kadabraRightFoot.MOVE_MATRIX, -0.88);
    LIBS.translateZ(kadabraRightFoot.MOVE_MATRIX, 0.12);

    // kuku kaki
    LIBS.translateX(kadabraLeftToe1.MOVE_MATRIX, -0.12);
    LIBS.translateY(kadabraLeftToe1.MOVE_MATRIX, 0.01); 
    LIBS.translateZ(kadabraLeftToe1.MOVE_MATRIX, 0.20);
    LIBS.rotateX(kadabraLeftToe1.MOVE_MATRIX, LIBS.degToRad(65));
    LIBS.rotateZ(kadabraLeftToe1.MOVE_MATRIX, LIBS.degToRad(-12));

    LIBS.translateX(kadabraLeftToe2.MOVE_MATRIX, 0.12);
    LIBS.translateY(kadabraLeftToe2.MOVE_MATRIX, 0.01);
    LIBS.translateZ(kadabraLeftToe2.MOVE_MATRIX, 0.20);
    LIBS.rotateX(kadabraLeftToe2.MOVE_MATRIX, LIBS.degToRad(65));
    LIBS.rotateZ(kadabraLeftToe2.MOVE_MATRIX, LIBS.degToRad(12));

    LIBS.translateX(kadabraRightToe1.MOVE_MATRIX, -0.12);
    LIBS.translateY(kadabraRightToe1.MOVE_MATRIX, 0.01);
    LIBS.translateZ(kadabraRightToe1.MOVE_MATRIX, 0.20);
    LIBS.rotateX(kadabraRightToe1.MOVE_MATRIX, LIBS.degToRad(65));
    LIBS.rotateZ(kadabraRightToe1.MOVE_MATRIX, LIBS.degToRad(-12));

    LIBS.translateX(kadabraRightToe2.MOVE_MATRIX, 0.12);
    LIBS.translateY(kadabraRightToe2.MOVE_MATRIX, 0.01);
    LIBS.translateZ(kadabraRightToe2.MOVE_MATRIX, 0.20);
    LIBS.rotateX(kadabraRightToe2.MOVE_MATRIX, LIBS.degToRad(65));
    LIBS.rotateZ(kadabraRightToe2.MOVE_MATRIX, LIBS.degToRad(12));

    // MODIFIED: Posisi Ekor - adjusted to point more downward with brown stripes
    LIBS.translateY(kadabraTail.MOVE_MATRIX, 0.65);
    LIBS.translateZ(kadabraTail.MOVE_MATRIX, -0.99);
    LIBS.rotateX(kadabraTail.MOVE_MATRIX, LIBS.degToRad(132)); // Increased angle for more downward pointing
    LIBS.rotateZ(kadabraTail.MOVE_MATRIX, LIBS.degToRad(-180));

    // MODIFIED: Enhanced armor positioning for better definition
    LIBS.translateY(kadabraArmor.MOVE_MATRIX, 0.1);
    LIBS.translateZ(kadabraArmor.MOVE_MATRIX, 0.01);

    // MODIFIED: Better positioned chest segments for more prominent appearance
    LIBS.translateY(kadabraArmorSegment1.MOVE_MATRIX, 0.35);
    LIBS.translateZ(kadabraArmorSegment1.MOVE_MATRIX, 0.30);

    LIBS.translateY(kadabraArmorSegment2.MOVE_MATRIX, -0.02);
    LIBS.translateZ(kadabraArmorSegment2.MOVE_MATRIX, 0.29);

    // MODIFIED: Enhanced shoulder positioning for better definition
    LIBS.translateX(kadabraLeftShoulder.MOVE_MATRIX, -0.58);
    LIBS.translateY(kadabraLeftShoulder.MOVE_MATRIX, 0.60);
    LIBS.translateZ(kadabraLeftShoulder.MOVE_MATRIX, -0.08);

    LIBS.translateX(kadabraRightShoulder.MOVE_MATRIX, 0.58);
    LIBS.translateY(kadabraRightShoulder.MOVE_MATRIX, 0.60);
    LIBS.translateZ(kadabraRightShoulder.MOVE_MATRIX, -0.08);

    // Hierarchy
    kadabraBody.addChild(kadabraHead);
    kadabraBody.addChild(kadabraLeftArm);
    kadabraBody.addChild(kadabraRightArm);
    kadabraBody.addChild(kadabraLeftLeg);
    kadabraBody.addChild(kadabraRightLeg);
    kadabraBody.addChild(kadabraTail);
    kadabraBody.addChild(kadabraArmor);
    kadabraBody.addChild(kadabraArmorSegment1);
    kadabraBody.addChild(kadabraArmorSegment2);
    kadabraBody.addChild(kadabraLeftShoulder);
    kadabraBody.addChild(kadabraRightShoulder);

    kadabraHead.addChild(kadabraLeftEye);
    kadabraHead.addChild(kadabraRightEye);
    kadabraHead.addChild(kadabraNose);
    kadabraHead.addChild(kadabraMouth);
    kadabraHead.addChild(kadabraLeftEar);
    kadabraHead.addChild(kadabraRightEar);
    kadabraHead.addChild(kadabraLeftWhisker);
    kadabraHead.addChild(kadabraRightWhisker);
    kadabraHead.addChild(kadabraForeheadStar); // Add star to head

    kadabraLeftEar.addChild(kadabraLeftEarInner);
    kadabraRightEar.addChild(kadabraRightEarInner);

    kadabraLeftArm.addChild(kadabraLeftWristBand);
    kadabraLeftArm.addChild(kadabraLeftHand);
    kadabraRightArm.addChild(kadabraRightWristBand);
    kadabraRightArm.addChild(kadabraRightHand);

    kadabraLeftHand.addChild(kadabraLeftFinger1);
    kadabraLeftHand.addChild(kadabraLeftFinger2);
    kadabraLeftHand.addChild(kadabraLeftFinger3);

    kadabraRightHand.addChild(kadabraRightFinger1);
    kadabraRightHand.addChild(kadabraRightFinger2);
    kadabraRightHand.addChild(kadabraRightFinger3);
    kadabraRightHand.addChild(kadabraSpoon);

    kadabraLeftLeg.addChild(kadabraLeftFoot);
    kadabraRightLeg.addChild(kadabraRightFoot);

    kadabraLeftFoot.addChild(kadabraLeftToe1);
    kadabraLeftFoot.addChild(kadabraLeftToe2);

    kadabraRightFoot.addChild(kadabraRightToe1);
    kadabraRightFoot.addChild(kadabraRightToe2);

    kadabraBody.setup();

    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.75, 0.85, 0.95, 1.0);
    GL.clearDepth(1.0);

    var time = 0;
    var walkCycle = 0;
    var waveCycle = 0;

    const baseTransforms = {
        head: LIBS.copy_matrix(kadabraHead.MOVE_MATRIX),
        leftEye: LIBS.copy_matrix(kadabraLeftEye.MOVE_MATRIX),
        rightEye: LIBS.copy_matrix(kadabraRightEye.MOVE_MATRIX),
        nose: LIBS.copy_matrix(kadabraNose.MOVE_MATRIX),
        mouth: LIBS.copy_matrix(kadabraMouth.MOVE_MATRIX),
        foreheadStar: LIBS.copy_matrix(kadabraForeheadStar.MOVE_MATRIX),
        leftEar: LIBS.copy_matrix(kadabraLeftEar.MOVE_MATRIX),
        rightEar: LIBS.copy_matrix(kadabraRightEar.MOVE_MATRIX),
        leftEarInner: LIBS.copy_matrix(kadabraLeftEarInner.MOVE_MATRIX),
        rightEarInner: LIBS.copy_matrix(kadabraRightEarInner.MOVE_MATRIX),
        leftWhisker: LIBS.copy_matrix(kadabraLeftWhisker.MOVE_MATRIX),
        rightWhisker: LIBS.copy_matrix(kadabraRightWhisker.MOVE_MATRIX),
        leftArm: LIBS.copy_matrix(kadabraLeftArm.MOVE_MATRIX),
        rightArm: LIBS.copy_matrix(kadabraRightArm.MOVE_MATRIX),
        leftWristBand: LIBS.copy_matrix(kadabraLeftWristBand.MOVE_MATRIX),
        rightWristBand: LIBS.copy_matrix(kadabraRightWristBand.MOVE_MATRIX),
        leftHand: LIBS.copy_matrix(kadabraLeftHand.MOVE_MATRIX),
        rightHand: LIBS.copy_matrix(kadabraRightHand.MOVE_MATRIX),
        spoon: LIBS.copy_matrix(kadabraSpoon.MOVE_MATRIX),
        leftFinger1: LIBS.copy_matrix(kadabraLeftFinger1.MOVE_MATRIX),
        leftFinger2: LIBS.copy_matrix(kadabraLeftFinger2.MOVE_MATRIX),
        leftFinger3: LIBS.copy_matrix(kadabraLeftFinger3.MOVE_MATRIX),
        rightFinger1: LIBS.copy_matrix(kadabraRightFinger1.MOVE_MATRIX),
        rightFinger2: LIBS.copy_matrix(kadabraRightFinger2.MOVE_MATRIX),
        rightFinger3: LIBS.copy_matrix(kadabraRightFinger3.MOVE_MATRIX),
        leftLeg: LIBS.copy_matrix(kadabraLeftLeg.MOVE_MATRIX),
        rightLeg: LIBS.copy_matrix(kadabraRightLeg.MOVE_MATRIX),
        leftFoot: LIBS.copy_matrix(kadabraLeftFoot.MOVE_MATRIX),
        rightFoot: LIBS.copy_matrix(kadabraRightFoot.MOVE_MATRIX),
        leftToe1: LIBS.copy_matrix(kadabraLeftToe1.MOVE_MATRIX),
        leftToe2: LIBS.copy_matrix(kadabraLeftToe2.MOVE_MATRIX),
        rightToe1: LIBS.copy_matrix(kadabraRightToe1.MOVE_MATRIX),
        rightToe2: LIBS.copy_matrix(kadabraRightToe2.MOVE_MATRIX),
        tail: LIBS.copy_matrix(kadabraTail.MOVE_MATRIX),
        armor: LIBS.copy_matrix(kadabraArmor.MOVE_MATRIX),
        armorSegment1: LIBS.copy_matrix(kadabraArmorSegment1.MOVE_MATRIX),
        armorSegment2: LIBS.copy_matrix(kadabraArmorSegment2.MOVE_MATRIX),
        leftShoulder: LIBS.copy_matrix(kadabraLeftShoulder.MOVE_MATRIX),
        rightShoulder: LIBS.copy_matrix(kadabraRightShoulder.MOVE_MATRIX)
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

        // Enhanced dynamic lighting
        const dayNightCycle = Math.sin(time * 0.1) * 0.5 + 0.5;
        const sunColor = [1.0, 0.95 + dayNightCycle * 0.05, 0.90 + dayNightCycle * 0.10];
        
        GL.uniform3f(_uLightPosition, 
            8.0 + Math.cos(time * 0.2) * 3.0, 
            10.0 + Math.sin(time * 0.15) * 2.0, 
            12.0
        );
        GL.uniform3fv(_uLightColor, sunColor);
        GL.uniform3f(_uAmbientLight, 0.40, 0.42, 0.48);
        
        // Warm rotating light
        GL.uniform3f(_uPointLight1Pos, 
            Math.cos(time * 0.4) * 10.0, 
            3.5, 
            Math.sin(time * 0.4) * 10.0
        );
        GL.uniform3f(_uPointLight1Color, 1.0, 0.75, 0.35);
        
        // Cool rotating light
        GL.uniform3f(_uPointLight2Pos, 
            -Math.cos(time * 0.6) * 8.0, 
            2.5, 
            -Math.sin(time * 0.6) * 8.0
        );
        GL.uniform3f(_uPointLight2Color, 0.5, 0.65, 1.0);
        
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
        mountains.forEach(mountain => mountain.render(MODELMATRIX));
        trees.forEach(tree => tree.render(MODELMATRIX));
        vines.forEach(vine => vine.render(MODELMATRIX));
        rocks.forEach(rock => rock.render(MODELMATRIX));
        bushes.forEach(bush => bush.render(MODELMATRIX));
        mushrooms.forEach(mushroom => mushroom.render(MODELMATRIX));
        ferns.forEach(fern => fern.render(MODELMATRIX));
        flowers.forEach(flower => flower.render(MODELMATRIX));
        grassBlades.forEach(grass => grass.render(MODELMATRIX));

        // Update and render clouds
        clouds.forEach(cloud => {
            const data = cloud.data;
            data.x += data.speedX * 0.016;

            if (data.x > 20) data.x = -20;

            cloud.MOVE_MATRIX = LIBS.get_I4();
            LIBS.translateX(cloud.MOVE_MATRIX, data.x);
            LIBS.translateY(cloud.MOVE_MATRIX, data.y);
            LIBS.translateZ(cloud.MOVE_MATRIX, data.z);
            
            cloud.render(MODELMATRIX);
        });

        // Update and render birds
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

        // Update and render butterflies
        butterflies.forEach(butterfly => {
            const data = butterfly.data;
            data.x += data.speedX * 0.016;
            data.y += Math.sin(time * 2.5 + data.offset) * 0.008;
            data.z += data.speedZ * 0.016;

            if (data.x > 10) data.x = -10;
            if (data.x < -10) data.x = 10;
            if (data.z > 10) data.z = -10;
            if (data.z < -10) data.z = 10;
            if (data.y > 3) data.y = 0.5;
            if (data.y < 0.5) data.y = 3;

            butterfly.MOVE_MATRIX = LIBS.get_I4();
            LIBS.translateX(butterfly.MOVE_MATRIX, data.x);
            LIBS.translateY(butterfly.MOVE_MATRIX, data.y);
            LIBS.translateZ(butterfly.MOVE_MATRIX, data.z);
            
            // Wing flapping animation
            const wingFlap = Math.sin(time * 15 + data.offset) * 0.3;
            LIBS.rotateZ(butterfly.MOVE_MATRIX, wingFlap);

            butterfly.render(MODELMATRIX);
        });

        // Update and render fireflies
        fireflies.forEach(firefly => {
            const data = firefly.data;
            data.x += data.speedX * 0.016;
            data.y += Math.sin(time * 3 + data.offset) * 0.01;
            data.z += data.speedZ * 0.016;

            if (data.x > 15) data.x = -15;
            if (data.x < -15) data.x = 15;
            if (data.z > 15) data.z = -15;
            if (data.z < -15) data.z = 15;
            if (data.y > 4.5) data.y = 1;
            if (data.y < 1) data.y = 4.5;

            firefly.MOVE_MATRIX = LIBS.get_I4();
            LIBS.translateX(firefly.MOVE_MATRIX, data.x);
            LIBS.translateY(firefly.MOVE_MATRIX, data.y);
            LIBS.translateZ(firefly.MOVE_MATRIX, data.z);
            
            const pulse = Math.sin(time * 5 + data.offset) * 0.5 + 0.5;
            LIBS.scaleX(firefly.MOVE_MATRIX, 0.5 + pulse * 0.5);
            LIBS.scaleY(firefly.MOVE_MATRIX, 0.5 + pulse * 0.5);

            firefly.render(MODELMATRIX);
        });

        // Render Kadabra with animations
        const floatY = Math.sin(time * 1.0) * 0.15;
        const breathScale = 1.0 + Math.sin(time * 1.5) * 0.010;
        
        kadabraBody.MOVE_MATRIX = LIBS.get_I4();
        LIBS.translateY(kadabraBody.MOVE_MATRIX, floatY);
        LIBS.scaleX(kadabraBody.MOVE_MATRIX, breathScale);
        LIBS.scaleZ(kadabraBody.MOVE_MATRIX, breathScale);

        const headBob = Math.sin(walkCycle * 1.3) * 0.035;
        kadabraHead.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.head);
        LIBS.translateY(kadabraHead.MOVE_MATRIX, headBob);
        LIBS.rotateZ(kadabraHead.MOVE_MATRIX, Math.sin(walkCycle * 0.6) * 0.020);

        // Star animation (subtle glow/pulse effect)
        const starPulse = Math.sin(time * 3.0) * 0.05 + 1.0;
        kadabraForeheadStar.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.foreheadStar);
        LIBS.scaleX(kadabraForeheadStar.MOVE_MATRIX, starPulse);
        LIBS.scaleY(kadabraForeheadStar.MOVE_MATRIX, starPulse);
        LIBS.rotateZ(kadabraForeheadStar.MOVE_MATRIX, time * 0.3);

        const earWiggle = Math.sin(walkCycle * 1.5) * 0.06;
        
        kadabraLeftEar.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftEar);
        LIBS.rotateZ(kadabraLeftEar.MOVE_MATRIX, earWiggle);
        
        kadabraRightEar.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightEar);
        LIBS.rotateZ(kadabraRightEar.MOVE_MATRIX, -earWiggle);

        // Whisker animation
        const whiskerSway = Math.sin(time * 2.0) * 0.03;
        kadabraLeftWhisker.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftWhisker);
        LIBS.rotateZ(kadabraLeftWhisker.MOVE_MATRIX, whiskerSway);
        
        kadabraRightWhisker.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightWhisker);
        LIBS.rotateZ(kadabraRightWhisker.MOVE_MATRIX, -whiskerSway);

        // Spoon animation (psychic power effect)
        const spoonFloat = Math.sin(time * 1.5) * 0.08;
        const spoonRotate = Math.sin(time * 2.0) * 0.15;
        
        kadabraSpoon.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.spoon);
        LIBS.translateY(kadabraSpoon.MOVE_MATRIX, spoonFloat);
        LIBS.rotateZ(kadabraSpoon.MOVE_MATRIX, spoonRotate);

        const rightArmSwing = Math.sin(waveCycle * 0.8) * 0.08;
        const rightArmRotation = Math.sin(waveCycle * 1.2) * 0.06;
        
        kadabraRightArm.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightArm);
        LIBS.rotateZ(kadabraRightArm.MOVE_MATRIX, rightArmSwing);
        LIBS.rotateX(kadabraRightArm.MOVE_MATRIX, rightArmRotation);

        const leftArmSwing = Math.sin(walkCycle * 0.7) * 0.06;
        kadabraLeftArm.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftArm);
        LIBS.rotateZ(kadabraLeftArm.MOVE_MATRIX, leftArmSwing);
        LIBS.rotateX(kadabraLeftArm.MOVE_MATRIX, Math.sin(walkCycle * 0.9) * 0.04);

        kadabraRightHand.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightHand);
        LIBS.rotateZ(kadabraRightHand.MOVE_MATRIX, Math.sin(waveCycle * 1.6) * 0.05);
        
        kadabraLeftHand.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftHand);
        LIBS.rotateZ(kadabraLeftHand.MOVE_MATRIX, Math.sin(waveCycle * 1.4) * 0.04);

        const leftLegSwing = Math.sin(walkCycle) * 0.10;
        const rightLegSwing = Math.sin(walkCycle + Math.PI) * 0.10;

        kadabraLeftLeg.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftLeg);
        LIBS.rotateX(kadabraLeftLeg.MOVE_MATRIX, leftLegSwing);

        kadabraRightLeg.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightLeg);
        LIBS.rotateX(kadabraRightLeg.MOVE_MATRIX, rightLegSwing);

        kadabraLeftFoot.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftFoot);
        LIBS.rotateX(kadabraLeftFoot.MOVE_MATRIX, Math.sin(walkCycle) * 0.05);
        
        kadabraRightFoot.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightFoot);
        LIBS.rotateX(kadabraRightFoot.MOVE_MATRIX, Math.sin(walkCycle + Math.PI) * 0.05);

        kadabraTail.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.tail);
        LIBS.rotateX(kadabraTail.MOVE_MATRIX, Math.sin(walkCycle * 0.6) * 0.08);
        LIBS.rotateY(kadabraTail.MOVE_MATRIX, Math.sin(walkCycle * 0.9) * 0.12);

        kadabraArmor.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.armor);
        LIBS.scaleZ(kadabraArmor.MOVE_MATRIX, 1.0 + Math.sin(time * 1.5) * 0.006);

        kadabraLeftShoulder.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.leftShoulder);
        LIBS.rotateZ(kadabraLeftShoulder.MOVE_MATRIX, Math.sin(walkCycle * 0.8) * 0.04);
        
        kadabraRightShoulder.MOVE_MATRIX = LIBS.copy_matrix(baseTransforms.rightShoulder);
        LIBS.rotateZ(kadabraRightShoulder.MOVE_MATRIX, Math.sin(walkCycle * 0.8) * -0.04);

        kadabraBody.render(MODELMATRIX);

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    
    animate();
}

window.addEventListener('load', main);
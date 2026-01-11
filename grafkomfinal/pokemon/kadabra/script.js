// Kadabra App - Shared GL Context Integration
// Similar pattern to AlakazamApp for shared Pokemon world

class KadabraApp {
    constructor(sharedGL = null, autoRender = true) {
        console.log("🔮 Initializing Kadabra...");

        // Accept GL context from Abra or create own
        this.GL = sharedGL;
        if (!this.GL) {
            console.error("❌ KadabraApp requires shared GL context from Abra!");
            return;
        }

        this.autoRender = autoRender;
        this.time = 0;
        this.walkCycle = 0;
        this.waveCycle = 0;
        this.positionZ = 1.2; // Pastikan baris ini ADA
        this.jumpY = 0;

        // Create shader program for Kadabra
        this.createShaderProgram();

        // Create all Kadabra body parts
        this.createKadabra();

        // Setup base transforms
        this.setupBaseTransforms();

        console.log("✅ Kadabra initialized successfully!");

        // Only auto-render if not sharing GL (standalone mode)
        if (this.autoRender) {
            console.warn("⚠️ KadabraApp in standalone mode - should use renderOnce() when shared with Abra!");
        }
    }

    createShaderProgram() {
        const GL = this.GL;

        // Use Abra-compatible shaders (same attribute names and structure)
        const shader_vertex_source = `
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

        const shader_fragment_source = `
            precision mediump float;

            varying vec3 vColor;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying float vDepth;

            uniform vec3 uLightPosition;
            uniform vec3 uLightColor;
            uniform vec3 uAmbientLight;
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

                // Atmospheric fog effect - REDUCED for max view distance
                float fogDensity = 0.002;
                float fogAmount = 1.0 - exp(-fogDensity * abs(vDepth) * abs(vDepth));
                vec3 fogColor = vec3(0.75, 0.85, 0.95);

                // Combine all lighting
                vec3 result = ambient + diffuse + specular;

                // Apply fog - REDUCED
                result = mix(result, fogColor, fogAmount * 0.1);

                gl_FragColor = vec4(result, 1.0);
            }
        `;

        // Compile shaders
        const compile_shader = function (source, type, typeString) {
            const shader = GL.createShader(type);
            GL.shaderSource(shader, source);
            GL.compileShader(shader);
            if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
                console.error("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
                return false;
            }
            return shader;
        };

        const shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
        const shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

        this.SHADER_PROGRAM = GL.createProgram();
        GL.attachShader(this.SHADER_PROGRAM, shader_vertex);
        GL.attachShader(this.SHADER_PROGRAM, shader_fragment);
        GL.linkProgram(this.SHADER_PROGRAM);

        // Get attribute locations
        this._position = GL.getAttribLocation(this.SHADER_PROGRAM, "position");
        this._color = GL.getAttribLocation(this.SHADER_PROGRAM, "color");
        this._normal = GL.getAttribLocation(this.SHADER_PROGRAM, "normal");

        GL.enableVertexAttribArray(this._position);
        GL.enableVertexAttribArray(this._color);
        GL.enableVertexAttribArray(this._normal);

        // Get uniform locations
        this._Pmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Pmatrix");
        this._Vmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Vmatrix");
        this._Mmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Mmatrix");
        this._Nmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Nmatrix");

        this._uLightPosition = GL.getUniformLocation(this.SHADER_PROGRAM, "uLightPosition");
        this._uLightColor = GL.getUniformLocation(this.SHADER_PROGRAM, "uLightColor");
        this._uAmbientLight = GL.getUniformLocation(this.SHADER_PROGRAM, "uAmbientLight");
        this._uCameraPosition = GL.getUniformLocation(this.SHADER_PROGRAM, "uCameraPosition");
        this._uShininess = GL.getUniformLocation(this.SHADER_PROGRAM, "uShininess");
        this._uSpecularStrength = GL.getUniformLocation(this.SHADER_PROGRAM, "uSpecularStrength");
        this._uTime = GL.getUniformLocation(this.SHADER_PROGRAM, "uTime");
    }

    createKadabra() {
        const GL = this.GL;

        // Kadabra colors
        const yellowColor = [1.0, 0.92, 0.35];
        const brownColor = [0.65, 0.42, 0.28];
        const darkBrownColor = [0.50, 0.32, 0.20];
        const earInnerColor = [1.0, 0.92, 0.35];
        const blackColor = [0.18, 0.18, 0.18];
        const noseColor = [0.95, 0.85, 0.38];
        const mouthColor = [0.38, 0.30, 0.24];
        const silverColor = [0.75, 0.75, 0.80];
        const whiskerColor = [0.85, 0.75, 0.35];
        const pinkStarColor = [1.0, 0.4, 0.6];

        // Create body parts using helper functions
        const { vertices: body_vertices, indices: body_indices } = generateEllipsoid(0.55, 0.75, 0.48, 32, 32, yellowColor);
        this.kadabraBody = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, body_vertices, body_indices, GL.TRIANGLES);

        const { vertices: head_vertices, indices: head_indices } = generateFoxHead(0.85, 0.60, 0.68, 36, 10, yellowColor, 1.2, 0.08);
        this.kadabraHead = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, head_vertices, head_indices, GL.TRIANGLES);

        // Open eyes (different from Abra's closed eyes)
        const { vertices: eye_vertices, indices: eye_indices } = generateOpenEye(0.25, 0.12, 24, blackColor);
        this.kadabraLeftEye = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, eye_vertices, eye_indices, GL.TRIANGLES);
        this.kadabraRightEye = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, eye_vertices, eye_indices, GL.TRIANGLES);

        const { vertices: nose_vertices, indices: nose_indices } = generateNose(0.08, 0.04, 0.06, noseColor);
        this.kadabraNose = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, nose_vertices, nose_indices, GL.TRIANGLES);

        const { vertices: mouth_vertices, indices: mouth_indices } = generateMouthLine(0.18, 0.02, 16, mouthColor);
        this.kadabraMouth = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, mouth_vertices, mouth_indices, GL.TRIANGLES);

        // Ears - longer than Abra's
        const { vertices: ear_vertices, indices: ear_indices } = generateSharpCone(0.33, 1.5, 28, yellowColor);
        this.kadabraLeftEar = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, ear_vertices, ear_indices, GL.TRIANGLES);
        this.kadabraRightEar = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, ear_vertices, ear_indices, GL.TRIANGLES);

        const { vertices: ear_inner_vertices, indices: ear_inner_indices } = generateEarInner(0.24, 1.25, 18, earInnerColor);
        this.kadabraLeftEarInner = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, ear_inner_vertices, ear_inner_indices, GL.TRIANGLES);
        this.kadabraRightEarInner = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, ear_inner_vertices, ear_inner_indices, GL.TRIANGLES);

        // Whiskers - signature Kadabra feature
        const { vertices: whisker_vertices, indices: whisker_indices } = generateWhisker(1.2, 0.025, 20, whiskerColor);
        this.kadabraLeftWhisker = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, whisker_vertices, whisker_indices, GL.TRIANGLES);
        this.kadabraRightWhisker = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, whisker_vertices, whisker_indices, GL.TRIANGLES);

        // Pink star on forehead
        const { vertices: star_vertices, indices: star_indices } = generateStar(0.12, 0.05, 0.03, 5, pinkStarColor);
        this.kadabraForeheadStar = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, star_vertices, star_indices, GL.TRIANGLES);

        // Arms
        const { vertices: arm_vertices, indices: arm_indices } = generateCylinder(0.18, 0.14, 1.3, 14, 10, yellowColor);
        this.kadabraLeftArm = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, arm_vertices, arm_indices, GL.TRIANGLES);
        this.kadabraRightArm = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, arm_vertices, arm_indices, GL.TRIANGLES);

        // Wrist bands
        const { vertices: wristband_vertices, indices: wristband_indices } = generateWristBand(0.15, 0.20, 16, brownColor);
        this.kadabraLeftWristBand = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, wristband_vertices, wristband_indices, GL.TRIANGLES);
        this.kadabraRightWristBand = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, wristband_vertices, wristband_indices, GL.TRIANGLES);

        // Hands
        const { vertices: hand_vertices, indices: hand_indices } = generateEllipsoid(0.20, 0.17, 0.16, 20, 20, yellowColor);
        this.kadabraLeftHand = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, hand_vertices, hand_indices, GL.TRIANGLES);
        this.kadabraRightHand = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, hand_vertices, hand_indices, GL.TRIANGLES);

        // Fingers
        const { vertices: finger_vertices, indices: finger_indices } = generateCone(0.045, 0.45, 14, yellowColor);

        this.kadabraLeftFinger1 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
        this.kadabraLeftFinger2 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
        this.kadabraLeftFinger3 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);

        this.kadabraRightFinger1 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
        this.kadabraRightFinger2 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);
        this.kadabraRightFinger3 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, finger_vertices, finger_indices, GL.TRIANGLES);

        // SPOON - Signature Kadabra item!
        const { vertices: spoon_vertices, indices: spoon_indices } = generateSpoon(0.9, 0.04, 0.25, 0.50, silverColor);
        this.kadabraSpoon = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, spoon_vertices, spoon_indices, GL.TRIANGLES);

        // Legs - ELLIPSOID not Cylinder!
        const { vertices: leg_vertices, indices: leg_indices } = generateEllipsoid(0.22, 0.85, 0.22, 22, 22, yellowColor);
        this.kadabraLeftLeg = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, leg_vertices, leg_indices, GL.TRIANGLES);
        this.kadabraRightLeg = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, leg_vertices, leg_indices, GL.TRIANGLES);

        // Feet - BIGGER!
        const { vertices: foot_vertices, indices: foot_indices } = generateEllipsoid(0.32, 0.12, 0.38, 16, 16, yellowColor);
        this.kadabraLeftFoot = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, foot_vertices, foot_indices, GL.TRIANGLES);
        this.kadabraRightFoot = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, foot_vertices, foot_indices, GL.TRIANGLES);

        // Toes (2 per foot)
        const { vertices: toe_vertices, indices: toe_indices } = generateFootToe(0.095, 0.42, 7, yellowColor);

        this.kadabraLeftToe1 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
        this.kadabraLeftToe2 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);

        this.kadabraRightToe1 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);
        this.kadabraRightToe2 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, toe_vertices, toe_indices, GL.TRIANGLES);

        // Tail - Enhanced with brown stripes, longer
        const { vertices: tail_vertices, indices: tail_indices } = generateCurvedCylinder(0.28, 0.08, 1.45, 32, 18, yellowColor);
        this.kadabraTail = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, tail_vertices, tail_indices, GL.TRIANGLES);

        // Armor - Enhanced with more defined brown shield
        const { vertices: armor_vertices, indices: armor_indices } = generateEllipsoid(0.58, 0.78, 0.50, 32, 32, brownColor);
        this.kadabraArmor = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, armor_vertices, armor_indices, GL.TRIANGLES);

        // Armor segments - More prominent for better definition
        const { vertices: segment1_vertices, indices: segment1_indices } = generateChestSegment(0.42, 0.14, 0.22, darkBrownColor);
        this.kadabraArmorSegment1 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, segment1_vertices, segment1_indices, GL.TRIANGLES);

        const { vertices: segment2_vertices, indices: segment2_indices } = generateChestSegment(0.40, 0.13, 0.21, darkBrownColor);
        this.kadabraArmorSegment2 = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, segment2_vertices, segment2_indices, GL.TRIANGLES);

        // Shoulder pads - Enhanced for more defined look
        const { vertices: shoulder_vertices, indices: shoulder_indices } = generateShoulderPad(0.42, 12, darkBrownColor);
        this.kadabraLeftShoulder = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, shoulder_vertices, shoulder_indices, GL.TRIANGLES);
        this.kadabraRightShoulder = new Object(GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, shoulder_vertices, shoulder_indices, GL.TRIANGLES);

        // Setup transformations and hierarchy
        this.setupKadabraTransforms();
    }

    setupKadabraTransforms() {
        // Position head - HIGHER and MORE TILTED
        LIBS.translateY(this.kadabraHead.MOVE_MATRIX, 1.05);
        LIBS.translateZ(this.kadabraHead.MOVE_MATRIX, 0.1);
        LIBS.rotateX(this.kadabraHead.MOVE_MATRIX, LIBS.degToRad(40));

        // Position eyes - More alert positioning
        LIBS.translateX(this.kadabraLeftEye.MOVE_MATRIX, -0.35);
        LIBS.translateY(this.kadabraLeftEye.MOVE_MATRIX, 0.32);
        LIBS.translateZ(this.kadabraLeftEye.MOVE_MATRIX, 0.68);
        LIBS.rotateY(this.kadabraLeftEye.MOVE_MATRIX, LIBS.degToRad(-60));
        LIBS.rotateX(this.kadabraLeftEye.MOVE_MATRIX, LIBS.degToRad(5));

        LIBS.translateX(this.kadabraRightEye.MOVE_MATRIX, 0.35);
        LIBS.translateY(this.kadabraRightEye.MOVE_MATRIX, 0.32);
        LIBS.translateZ(this.kadabraRightEye.MOVE_MATRIX, 0.68);
        LIBS.rotateY(this.kadabraRightEye.MOVE_MATRIX, LIBS.degToRad(60));
        LIBS.rotateX(this.kadabraRightEye.MOVE_MATRIX, LIBS.degToRad(-5));

        // Position nose and mouth
        LIBS.translateY(this.kadabraNose.MOVE_MATRIX, 0.05);
        LIBS.translateZ(this.kadabraNose.MOVE_MATRIX, 1.13);

        LIBS.translateY(this.kadabraMouth.MOVE_MATRIX, -0.08);
        LIBS.translateZ(this.kadabraMouth.MOVE_MATRIX, 0.75);

        // Position ears - Completely different rotation!
        LIBS.translateX(this.kadabraLeftEar.MOVE_MATRIX, -0.40);
        LIBS.translateY(this.kadabraLeftEar.MOVE_MATRIX, -0.01);
        LIBS.translateZ(this.kadabraLeftEar.MOVE_MATRIX, 0.12);
        LIBS.rotateZ(this.kadabraLeftEar.MOVE_MATRIX, LIBS.degToRad(40));
        LIBS.rotateY(this.kadabraLeftEar.MOVE_MATRIX, LIBS.degToRad(-90));

        LIBS.translateX(this.kadabraRightEar.MOVE_MATRIX, 0.40);
        LIBS.translateY(this.kadabraRightEar.MOVE_MATRIX, 0.01);
        LIBS.translateZ(this.kadabraRightEar.MOVE_MATRIX, 0.12);
        LIBS.rotateZ(this.kadabraRightEar.MOVE_MATRIX, LIBS.degToRad(-40));
        LIBS.rotateY(this.kadabraRightEar.MOVE_MATRIX, LIBS.degToRad(90));

        // Position ear inners
        LIBS.translateZ(this.kadabraLeftEarInner.MOVE_MATRIX, 0);
        LIBS.translateX(this.kadabraLeftEarInner.MOVE_MATRIX, 0.10);

        LIBS.translateZ(this.kadabraRightEarInner.MOVE_MATRIX, 0);
        LIBS.translateX(this.kadabraRightEarInner.MOVE_MATRIX, -0.10);

        // Position whiskers
        // Kumis Kiri (Normal mengikuti koordinat fungsi)
        LIBS.translateX(this.kadabraLeftWhisker.MOVE_MATRIX, -0.25);
        LIBS.translateY(this.kadabraLeftWhisker.MOVE_MATRIX, 0.15);
        LIBS.translateZ(this.kadabraLeftWhisker.MOVE_MATRIX, 0.85);

        // Kumis Kanan (Gunakan skala negatif pada X agar menjadi cermin/simetris)
        LIBS.translateX(this.kadabraRightWhisker.MOVE_MATRIX, 0.25);
        LIBS.translateY(this.kadabraRightWhisker.MOVE_MATRIX, 0.15);
        LIBS.translateZ(this.kadabraRightWhisker.MOVE_MATRIX, 0.85);
        LIBS.scaleX(this.kadabraRightWhisker.MOVE_MATRIX, -1); // Membalikkan kurva ke arah kanan

        // Position forehead star - Between eyes, on forehead
        LIBS.translateY(this.kadabraForeheadStar.MOVE_MATRIX, 0.55);
        LIBS.translateZ(this.kadabraForeheadStar.MOVE_MATRIX, 0.78);
        LIBS.rotateX(this.kadabraForeheadStar.MOVE_MATRIX, LIBS.degToRad(90));

        // Position arms
        LIBS.translateX(this.kadabraLeftArm.MOVE_MATRIX, -0.68);
        LIBS.translateY(this.kadabraLeftArm.MOVE_MATRIX, 0.15);
        LIBS.translateZ(this.kadabraLeftArm.MOVE_MATRIX, 0);
        LIBS.rotateZ(this.kadabraLeftArm.MOVE_MATRIX, LIBS.degToRad(-22));
        LIBS.rotateX(this.kadabraLeftArm.MOVE_MATRIX, LIBS.degToRad(-10));

        LIBS.translateX(this.kadabraRightArm.MOVE_MATRIX, 0.68);
        LIBS.translateY(this.kadabraRightArm.MOVE_MATRIX, 0.15);
        LIBS.translateZ(this.kadabraRightArm.MOVE_MATRIX, 0);
        LIBS.rotateZ(this.kadabraRightArm.MOVE_MATRIX, LIBS.degToRad(22));
        LIBS.rotateX(this.kadabraRightArm.MOVE_MATRIX, LIBS.degToRad(-10));

        // Position wrist bands
        LIBS.translateY(this.kadabraLeftWristBand.MOVE_MATRIX, -0.55);
        LIBS.translateY(this.kadabraRightWristBand.MOVE_MATRIX, -0.55);

        // Position hands
        LIBS.translateY(this.kadabraLeftHand.MOVE_MATRIX, -0.70);
        LIBS.translateY(this.kadabraRightHand.MOVE_MATRIX, -0.70);

        // Position SPOON (in right hand) - Adjusted rotation
        LIBS.translateY(this.kadabraSpoon.MOVE_MATRIX, -0.45);
        LIBS.translateX(this.kadabraSpoon.MOVE_MATRIX, 0.05);
        LIBS.translateZ(this.kadabraSpoon.MOVE_MATRIX, 0.12);
        LIBS.rotateZ(this.kadabraSpoon.MOVE_MATRIX, LIBS.degToRad(-10));
        LIBS.rotateX(this.kadabraSpoon.MOVE_MATRIX, LIBS.degToRad(15));

        // Position fingers - Left hand
        LIBS.translateX(this.kadabraLeftFinger1.MOVE_MATRIX, -0.14);
        LIBS.translateY(this.kadabraLeftFinger1.MOVE_MATRIX, -0.01);
        LIBS.translateZ(this.kadabraLeftFinger1.MOVE_MATRIX, 0.03);
        LIBS.rotateZ(this.kadabraLeftFinger1.MOVE_MATRIX, LIBS.degToRad(-10));
        LIBS.rotateX(this.kadabraLeftFinger1.MOVE_MATRIX, LIBS.degToRad(200));

        LIBS.translateY(this.kadabraLeftFinger2.MOVE_MATRIX, -0.01);
        LIBS.translateZ(this.kadabraLeftFinger2.MOVE_MATRIX, 0.07);
        LIBS.rotateX(this.kadabraLeftFinger2.MOVE_MATRIX, LIBS.degToRad(200));

        LIBS.translateX(this.kadabraLeftFinger3.MOVE_MATRIX, 0.14);
        LIBS.translateY(this.kadabraLeftFinger3.MOVE_MATRIX, -0.01);
        LIBS.translateZ(this.kadabraLeftFinger3.MOVE_MATRIX, 0.03);
        LIBS.rotateZ(this.kadabraLeftFinger3.MOVE_MATRIX, LIBS.degToRad(10));
        LIBS.rotateX(this.kadabraLeftFinger3.MOVE_MATRIX, LIBS.degToRad(200));

        // Position fingers - Right hand
        LIBS.translateX(this.kadabraRightFinger1.MOVE_MATRIX, -0.14);
        LIBS.translateY(this.kadabraRightFinger1.MOVE_MATRIX, -0.01);
        LIBS.translateZ(this.kadabraRightFinger1.MOVE_MATRIX, 0.03);
        LIBS.rotateZ(this.kadabraRightFinger1.MOVE_MATRIX, LIBS.degToRad(-10));
        LIBS.rotateX(this.kadabraRightFinger1.MOVE_MATRIX, LIBS.degToRad(200));

        LIBS.translateY(this.kadabraRightFinger2.MOVE_MATRIX, -0.01);
        LIBS.translateZ(this.kadabraRightFinger2.MOVE_MATRIX, 0.07);
        LIBS.rotateX(this.kadabraRightFinger2.MOVE_MATRIX, LIBS.degToRad(200));

        LIBS.translateX(this.kadabraRightFinger3.MOVE_MATRIX, 0.14);
        LIBS.translateY(this.kadabraRightFinger3.MOVE_MATRIX, -0.01);
        LIBS.translateZ(this.kadabraRightFinger3.MOVE_MATRIX, 0.03);
        LIBS.rotateZ(this.kadabraRightFinger3.MOVE_MATRIX, LIBS.degToRad(10));
        LIBS.rotateX(this.kadabraRightFinger3.MOVE_MATRIX, LIBS.degToRad(200));

        // Position legs - MUCH LOWER!
        LIBS.translateX(this.kadabraLeftLeg.MOVE_MATRIX, -0.30);
        LIBS.translateY(this.kadabraLeftLeg.MOVE_MATRIX, -1.25);

        LIBS.translateX(this.kadabraRightLeg.MOVE_MATRIX, 0.30);
        LIBS.translateY(this.kadabraRightLeg.MOVE_MATRIX, -1.25);

        // Position feet - LOWER!
        LIBS.translateY(this.kadabraLeftFoot.MOVE_MATRIX, -0.88);
        LIBS.translateZ(this.kadabraLeftFoot.MOVE_MATRIX, 0.12);

        LIBS.translateY(this.kadabraRightFoot.MOVE_MATRIX, -0.88);
        LIBS.translateZ(this.kadabraRightFoot.MOVE_MATRIX, 0.12);

        // Position toes (2 per foot)
        LIBS.translateX(this.kadabraLeftToe1.MOVE_MATRIX, -0.12);
        LIBS.translateY(this.kadabraLeftToe1.MOVE_MATRIX, 0.01);
        LIBS.translateZ(this.kadabraLeftToe1.MOVE_MATRIX, 0.20);
        LIBS.rotateX(this.kadabraLeftToe1.MOVE_MATRIX, LIBS.degToRad(65));
        LIBS.rotateZ(this.kadabraLeftToe1.MOVE_MATRIX, LIBS.degToRad(-12));

        LIBS.translateX(this.kadabraLeftToe2.MOVE_MATRIX, 0.12);
        LIBS.translateY(this.kadabraLeftToe2.MOVE_MATRIX, 0.01);
        LIBS.translateZ(this.kadabraLeftToe2.MOVE_MATRIX, 0.20);
        LIBS.rotateX(this.kadabraLeftToe2.MOVE_MATRIX, LIBS.degToRad(65));
        LIBS.rotateZ(this.kadabraLeftToe2.MOVE_MATRIX, LIBS.degToRad(12));

        LIBS.translateX(this.kadabraRightToe1.MOVE_MATRIX, -0.12);
        LIBS.translateY(this.kadabraRightToe1.MOVE_MATRIX, 0.01);
        LIBS.translateZ(this.kadabraRightToe1.MOVE_MATRIX, 0.20);
        LIBS.rotateX(this.kadabraRightToe1.MOVE_MATRIX, LIBS.degToRad(65));
        LIBS.rotateZ(this.kadabraRightToe1.MOVE_MATRIX, LIBS.degToRad(-12));

        LIBS.translateX(this.kadabraRightToe2.MOVE_MATRIX, 0.12);
        LIBS.translateY(this.kadabraRightToe2.MOVE_MATRIX, 0.01);
        LIBS.translateZ(this.kadabraRightToe2.MOVE_MATRIX, 0.20);
        LIBS.rotateX(this.kadabraRightToe2.MOVE_MATRIX, LIBS.degToRad(65));
        LIBS.rotateZ(this.kadabraRightToe2.MOVE_MATRIX, LIBS.degToRad(12));

        // Position tail - Adjusted to point more downward
        LIBS.translateY(this.kadabraTail.MOVE_MATRIX, 0.65);
        LIBS.translateZ(this.kadabraTail.MOVE_MATRIX, -0.99);
        LIBS.rotateX(this.kadabraTail.MOVE_MATRIX, LIBS.degToRad(132));
        LIBS.rotateZ(this.kadabraTail.MOVE_MATRIX, LIBS.degToRad(-180));

        // Position armor - Enhanced for better definition
        LIBS.translateY(this.kadabraArmor.MOVE_MATRIX, 0.1);
        LIBS.translateZ(this.kadabraArmor.MOVE_MATRIX, 0.01);

        // Position armor segments - Better positioned for more prominent appearance
        LIBS.translateY(this.kadabraArmorSegment1.MOVE_MATRIX, 0.35);
        LIBS.translateZ(this.kadabraArmorSegment1.MOVE_MATRIX, 0.30);

        LIBS.translateY(this.kadabraArmorSegment2.MOVE_MATRIX, -0.02);
        LIBS.translateZ(this.kadabraArmorSegment2.MOVE_MATRIX, 0.29);

        // Position shoulders - Enhanced for better definition
        LIBS.translateX(this.kadabraLeftShoulder.MOVE_MATRIX, -0.58);
        LIBS.translateY(this.kadabraLeftShoulder.MOVE_MATRIX, 0.60);
        LIBS.translateZ(this.kadabraLeftShoulder.MOVE_MATRIX, -0.08);

        LIBS.translateX(this.kadabraRightShoulder.MOVE_MATRIX, 0.58);
        LIBS.translateY(this.kadabraRightShoulder.MOVE_MATRIX, 0.60);
        LIBS.translateZ(this.kadabraRightShoulder.MOVE_MATRIX, -0.08);

        // Setup hierarchy
        this.kadabraBody.addChild(this.kadabraHead);
        this.kadabraBody.addChild(this.kadabraLeftArm);
        this.kadabraBody.addChild(this.kadabraRightArm);
        this.kadabraBody.addChild(this.kadabraLeftLeg);
        this.kadabraBody.addChild(this.kadabraRightLeg);
        this.kadabraBody.addChild(this.kadabraTail);
        this.kadabraBody.addChild(this.kadabraArmor);
        this.kadabraBody.addChild(this.kadabraArmorSegment1);
        this.kadabraBody.addChild(this.kadabraArmorSegment2);
        this.kadabraBody.addChild(this.kadabraLeftShoulder);
        this.kadabraBody.addChild(this.kadabraRightShoulder);

        this.kadabraHead.addChild(this.kadabraLeftEye);
        this.kadabraHead.addChild(this.kadabraRightEye);
        this.kadabraHead.addChild(this.kadabraNose);
        this.kadabraHead.addChild(this.kadabraMouth);
        this.kadabraHead.addChild(this.kadabraLeftEar);
        this.kadabraHead.addChild(this.kadabraRightEar);
        this.kadabraHead.addChild(this.kadabraLeftWhisker);
        this.kadabraHead.addChild(this.kadabraRightWhisker);
        this.kadabraHead.addChild(this.kadabraForeheadStar);

        this.kadabraLeftEar.addChild(this.kadabraLeftEarInner);
        this.kadabraRightEar.addChild(this.kadabraRightEarInner);

        this.kadabraLeftArm.addChild(this.kadabraLeftWristBand);
        this.kadabraLeftArm.addChild(this.kadabraLeftHand);
        this.kadabraRightArm.addChild(this.kadabraRightWristBand);
        this.kadabraRightArm.addChild(this.kadabraRightHand);

        this.kadabraLeftHand.addChild(this.kadabraLeftFinger1);
        this.kadabraLeftHand.addChild(this.kadabraLeftFinger2);
        this.kadabraLeftHand.addChild(this.kadabraLeftFinger3);

        this.kadabraRightHand.addChild(this.kadabraRightFinger1);
        this.kadabraRightHand.addChild(this.kadabraRightFinger2);
        this.kadabraRightHand.addChild(this.kadabraRightFinger3);
        this.kadabraRightHand.addChild(this.kadabraSpoon); // Spoon held in right hand

        this.kadabraLeftLeg.addChild(this.kadabraLeftFoot);
        this.kadabraRightLeg.addChild(this.kadabraRightFoot);

        this.kadabraLeftFoot.addChild(this.kadabraLeftToe1);
        this.kadabraLeftFoot.addChild(this.kadabraLeftToe2);

        this.kadabraRightFoot.addChild(this.kadabraRightToe1);
        this.kadabraRightFoot.addChild(this.kadabraRightToe2);

        // Setup all objects
        this.kadabraBody.setup();
    }

    setupBaseTransforms() {
        // Store base transforms for animation
        this.baseTransforms = {
            head: LIBS.copy_matrix(this.kadabraHead.MOVE_MATRIX),
            leftEye: LIBS.copy_matrix(this.kadabraLeftEye.MOVE_MATRIX),
            rightEye: LIBS.copy_matrix(this.kadabraRightEye.MOVE_MATRIX),
            nose: LIBS.copy_matrix(this.kadabraNose.MOVE_MATRIX),
            mouth: LIBS.copy_matrix(this.kadabraMouth.MOVE_MATRIX),
            leftEar: LIBS.copy_matrix(this.kadabraLeftEar.MOVE_MATRIX),
            rightEar: LIBS.copy_matrix(this.kadabraRightEar.MOVE_MATRIX),
            leftEarInner: LIBS.copy_matrix(this.kadabraLeftEarInner.MOVE_MATRIX),
            rightEarInner: LIBS.copy_matrix(this.kadabraRightEarInner.MOVE_MATRIX),
            leftWhisker: LIBS.copy_matrix(this.kadabraLeftWhisker.MOVE_MATRIX),
            rightWhisker: LIBS.copy_matrix(this.kadabraRightWhisker.MOVE_MATRIX),
            foreheadStar: LIBS.copy_matrix(this.kadabraForeheadStar.MOVE_MATRIX),
            leftArm: LIBS.copy_matrix(this.kadabraLeftArm.MOVE_MATRIX),
            rightArm: LIBS.copy_matrix(this.kadabraRightArm.MOVE_MATRIX),
            leftWristBand: LIBS.copy_matrix(this.kadabraLeftWristBand.MOVE_MATRIX),
            rightWristBand: LIBS.copy_matrix(this.kadabraRightWristBand.MOVE_MATRIX),
            leftHand: LIBS.copy_matrix(this.kadabraLeftHand.MOVE_MATRIX),
            rightHand: LIBS.copy_matrix(this.kadabraRightHand.MOVE_MATRIX),
            spoon: LIBS.copy_matrix(this.kadabraSpoon.MOVE_MATRIX),
            leftFinger1: LIBS.copy_matrix(this.kadabraLeftFinger1.MOVE_MATRIX),
            leftFinger2: LIBS.copy_matrix(this.kadabraLeftFinger2.MOVE_MATRIX),
            leftFinger3: LIBS.copy_matrix(this.kadabraLeftFinger3.MOVE_MATRIX),
            rightFinger1: LIBS.copy_matrix(this.kadabraRightFinger1.MOVE_MATRIX),
            rightFinger2: LIBS.copy_matrix(this.kadabraRightFinger2.MOVE_MATRIX),
            rightFinger3: LIBS.copy_matrix(this.kadabraRightFinger3.MOVE_MATRIX),
            leftLeg: LIBS.copy_matrix(this.kadabraLeftLeg.MOVE_MATRIX),
            rightLeg: LIBS.copy_matrix(this.kadabraRightLeg.MOVE_MATRIX),
            leftFoot: LIBS.copy_matrix(this.kadabraLeftFoot.MOVE_MATRIX),
            rightFoot: LIBS.copy_matrix(this.kadabraRightFoot.MOVE_MATRIX),
            leftToe1: LIBS.copy_matrix(this.kadabraLeftToe1.MOVE_MATRIX),
            leftToe2: LIBS.copy_matrix(this.kadabraLeftToe2.MOVE_MATRIX),
            rightToe1: LIBS.copy_matrix(this.kadabraRightToe1.MOVE_MATRIX),
            rightToe2: LIBS.copy_matrix(this.kadabraRightToe2.MOVE_MATRIX),
            tail: LIBS.copy_matrix(this.kadabraTail.MOVE_MATRIX),
            armor: LIBS.copy_matrix(this.kadabraArmor.MOVE_MATRIX),
            armorSegment1: LIBS.copy_matrix(this.kadabraArmorSegment1.MOVE_MATRIX),
            armorSegment2: LIBS.copy_matrix(this.kadabraArmorSegment2.MOVE_MATRIX),
            leftShoulder: LIBS.copy_matrix(this.kadabraLeftShoulder.MOVE_MATRIX),
            rightShoulder: LIBS.copy_matrix(this.kadabraRightShoulder.MOVE_MATRIX)
        };
    }

    animate() {
        this.time += 0.016;
        this.walkCycle += 0.040; // Kecepatan langkah kaki/bobbing
        this.waveCycle += 0.028; // Kecepatan lambaian tangan

        // --- 1. LOGIKA MELOMPAT MAJU CEPAT ---
        let jumpWave = Math.sin(this.time *9.0); 
        this.jumpY = Math.max(0, jumpWave * 1.8); 
        
        // Maju ke depan (sumbu Z) hanya saat sedang di udara
        if (this.jumpY > 0) {
            this.positionZ += 0.25; 
        }
        // Looping posisi
        if (this.positionZ > 20) this.positionZ = -15;

        // --- 2. LOGIKA BERKEDIP (BLINK) & BENTUK MATA TAJAM ---
        let blinkWave = Math.sin(this.time * 4.0); 
        // Skala 0.01 agar benar-benar terlihat tertutup saat kedip
        let blinkScale = (blinkWave > 0.8) ? 0.01 : 1.0; 

        // Parameter desain mata agar terlihat lebih bagus/garang
        const eyeHeight = 0.4; // Membuat mata sipit permanen (keren)
        const eyeWidth = 1.4;  // Membuat mata sedikit lebih panjang horizontal
        
        // Mata Kiri
        if (this.kadabraLeftEye) {
            this.kadabraLeftEye.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.leftEye);
            LIBS.scaleY(this.kadabraLeftEye.MOVE_MATRIX, blinkScale * eyeHeight); 
            LIBS.scaleX(this.kadabraLeftEye.MOVE_MATRIX, eyeWidth); 
            LIBS.rotateZ(this.kadabraLeftEye.MOVE_MATRIX, 0.4); // Miring ke dalam (Angry Look)
        }
        
        // Mata Kanan
        if (this.kadabraRightEye) {
            this.kadabraRightEye.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.rightEye);
            LIBS.scaleY(this.kadabraRightEye.MOVE_MATRIX, blinkScale * eyeHeight);
            LIBS.scaleX(this.kadabraRightEye.MOVE_MATRIX, eyeWidth);
            LIBS.rotateZ(this.kadabraRightEye.MOVE_MATRIX, -0.4); // Miring ke dalam
        }

        // --- 3. EFEK VISUAL DASAR (MELAYANG & NAPAS) ---
        const floatY = Math.sin(this.time * 1.0) * 0.12;
        const breathScale = 1.0 + Math.sin(this.time * 1.5) * 0.008;

        // --- 4. ANIMASI BAGIAN TUBUH LAINNYA ---

        // Kepala (Head Bob + Ikut naik saat lompat)
        const headBob = Math.sin(this.walkCycle * 1.3) * 0.030;
        this.kadabraHead.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.head);
        LIBS.translateY(this.kadabraHead.MOVE_MATRIX, headBob + (this.jumpY * 0.05));
        LIBS.rotateZ(this.kadabraHead.MOVE_MATRIX, Math.sin(this.walkCycle * 0.6) * 0.020);

        // Bintang di dahi (Star pulse)
        const starPulse = Math.sin(this.time * 3.0) * 0.05 + 1.0;
        this.kadabraForeheadStar.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.foreheadStar);
        LIBS.scaleX(this.kadabraForeheadStar.MOVE_MATRIX, starPulse);
        LIBS.scaleY(this.kadabraForeheadStar.MOVE_MATRIX, starPulse);
        LIBS.rotateZ(this.kadabraForeheadStar.MOVE_MATRIX, this.time * 0.3);

        // Telinga (Ear wiggle)
        const earWiggle = Math.sin(this.walkCycle * 1.5) * 0.06;
        this.kadabraLeftEar.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.leftEar);
        LIBS.rotateZ(this.kadabraLeftEar.MOVE_MATRIX, earWiggle);
        this.kadabraRightEar.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.rightEar);
        LIBS.rotateZ(this.kadabraRightEar.MOVE_MATRIX, -earWiggle);

        // Di dalam method createKadabra()
        const whiskerColor = [0.85, 0.75, 0.35];

        // Menggunakan fungsi kurva baru (20 segmen agar mulus)
        const { vertices: whisker_vertices, indices: whisker_indices } = generateBezierWhisker(20, 0.025, whiskerColor);

        this.kadabraLeftWhisker = new Object(this.GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, whisker_vertices, whisker_indices, this.GL.TRIANGLES);
        this.kadabraRightWhisker = new Object(this.GL, this.SHADER_PROGRAM, this._position, this._color, this._normal, this._Mmatrix, this._Nmatrix, whisker_vertices, whisker_indices, this.GL.TRIANGLES);

        // Sendok (Spoon floating)
        const spoonFloat = Math.sin(this.time * 1.5) * 0.08;
        const spoonRotate = Math.sin(this.time * 2.0) * 0.15;
        this.kadabraSpoon.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.spoon);
        LIBS.translateY(this.kadabraSpoon.MOVE_MATRIX, spoonFloat);
        LIBS.rotateZ(this.kadabraSpoon.MOVE_MATRIX, spoonRotate);

        // Lengan (Tangan melebar sedikit saat lompat)
        const jumpArmSpread = this.jumpY * 0.1;
        this.kadabraRightArm.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.rightArm);
        LIBS.rotateZ(this.kadabraRightArm.MOVE_MATRIX, (Math.sin(this.waveCycle * 0.8) * 0.08) + jumpArmSpread);
        LIBS.rotateX(this.kadabraRightArm.MOVE_MATRIX, Math.sin(this.waveCycle * 1.2) * 0.06);

        this.kadabraLeftArm.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.leftArm);
        LIBS.rotateZ(this.kadabraLeftArm.MOVE_MATRIX, (Math.sin(this.walkCycle * 0.7) * 0.06) - jumpArmSpread);

        // Kaki (Menekuk saat melayang)
        const jumpLegTuck = this.jumpY * 0.2;
        this.kadabraLeftLeg.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.leftLeg);
        LIBS.rotateX(this.kadabraLeftLeg.MOVE_MATRIX, Math.sin(this.walkCycle) * 0.10 + jumpLegTuck);
        
        this.kadabraRightLeg.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.rightLeg);
        LIBS.rotateX(this.kadabraRightLeg.MOVE_MATRIX, Math.sin(this.walkCycle + Math.PI) * 0.10 + jumpLegTuck);

        // Ekor
        this.kadabraTail.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.tail);
        LIBS.rotateX(this.kadabraTail.MOVE_MATRIX, Math.sin(this.walkCycle * 0.6) * 0.08 + (this.jumpY * 0.1));

        // Armor
        this.kadabraArmor.MOVE_MATRIX = LIBS.copy_matrix(this.baseTransforms.armor);
        LIBS.scaleZ(this.kadabraArmor.MOVE_MATRIX, 1.0 + Math.sin(this.time * 1.5) * 0.006);

        // Kirimkan data akhir ke renderOnce()
        return { 
            totalY: floatY + this.jumpY, 
            posZ: this.positionZ, 
            breathScale 
        };
    }

    renderOnce(deltaTime = 0.016, skipClear = false, abraViewMatrix = null, abraProjectionMatrix = null,
               abraLightPosition = null, abraLightColor = null, abraAmbientLight = null, abraCameraPosition = null) {
        const GL = this.GL;

        // 1. Jalankan animasi dan ambil datanya (Cukup panggil 1x saja)
        const animData = this.animate();

        // ========== SAVE ABRA'S GL STATE ==========
        const previousProgram = GL.getParameter(GL.CURRENT_PROGRAM);

        // Update time & cycles
        this.time += deltaTime;
        this.walkCycle += 0.020;
        this.waveCycle += 0.028;

        // Validasi Data Animasi (Agar tidak hilang/NaN)
        const currentY = (animData && animData.totalY !== undefined) ? animData.totalY : 0;
        const currentZ = (animData && animData.posZ !== undefined) ? animData.posZ : 1.2;
        const currentScale = (animData && animData.breathScale !== undefined) ? animData.breathScale : 1.0;

        // Only clear if not sharing canvas
        if (!skipClear) {
            GL.clearColor(0.75, 0.85, 0.95, 1.0);
            GL.clearDepth(1.0);
            GL.enable(GL.DEPTH_TEST);
            GL.depthFunc(GL.LEQUAL);
            GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        }

        // Use Kadabra's shader program
        // Pastikan menggunakan nama variabel shader yang benar (this.SHADER_PROGRAM atau this._shaderProgram)
        const program = this.SHADER_PROGRAM || this._shaderProgram;
        GL.useProgram(program);

        // Projection matrix
        let PROJMATRIX;
        if (abraProjectionMatrix) {
            PROJMATRIX = abraProjectionMatrix;
        } else {
            PROJMATRIX = LIBS.get_projection(60, GL.canvas.width / GL.canvas.height, 1, 1000);
        }
        GL.uniformMatrix4fv(this._Pmatrix, false, PROJMATRIX);

        // View matrix
        let VIEWMATRIX;
        if (abraViewMatrix) {
            VIEWMATRIX = Array.isArray(abraViewMatrix) ? abraViewMatrix : Array.from(abraViewMatrix);
        } else {
            VIEWMATRIX = LIBS.get_I4();
            LIBS.translateZ(VIEWMATRIX, -15); // Mundurkan kamera sedikit agar terlihat saat melompat jauh
        }
        GL.uniformMatrix4fv(this._Vmatrix, false, VIEWMATRIX);

        // Lighting
        if (abraLightPosition && abraLightColor && abraAmbientLight && abraCameraPosition) {
            GL.uniform3fv(this._uLightPosition, abraLightPosition);
            GL.uniform3fv(this._uLightColor, abraLightColor);
            GL.uniform3fv(this._uAmbientLight, abraAmbientLight);
            GL.uniform3fv(this._uCameraPosition, abraCameraPosition);
            GL.uniform1f(this._uShininess, 32.0);
            GL.uniform1f(this._uSpecularStrength, 0.7);
        } else {
            GL.uniform3fv(this._uLightPosition, [50.0, 100.0, 80.0]);
            GL.uniform3fv(this._uLightColor, [1.0, 0.98, 0.95]);
            GL.uniform3fv(this._uAmbientLight, [0.55, 0.58, 0.62]);
            GL.uniform3fv(this._uCameraPosition, [0.0, 0.0, 10.0]);
            GL.uniform1f(this._uShininess, 32.0);
            GL.uniform1f(this._uSpecularStrength, 0.7);
        }
        GL.uniform1f(this._uTime, this.time);

        // --- MODEL MATRIX (TRANSLASI MAJU & MELOMPAT) ---
        const MODELMATRIX = LIBS.get_I4();
        
        LIBS.translateX(MODELMATRIX, -3.5);  // Posisi samping
        LIBS.translateY(MODELMATRIX, currentY); // Hasil gabungan float + jump
        LIBS.translateZ(MODELMATRIX, currentZ); // Posisi Z yang bertambah (Maju)
        
        LIBS.scaleX(MODELMATRIX, currentScale);
        LIBS.scaleZ(MODELMATRIX, currentScale);

        // Render Kadabra
        this.kadabraBody.render(MODELMATRIX);

        // ========== RESTORE ABRA'S GL STATE ==========
        GL.useProgram(previousProgram);
    }
}

// Export to global scope - DON'T auto-start, will be initialized from Abra
window.KadabraApp = KadabraApp;

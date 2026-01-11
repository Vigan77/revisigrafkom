// Enhanced Vertex Shader with texture coordinates
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTexCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vTexCoord;
    varying vec3 vWorldPosition;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vNormal = normalize((uNormalMatrix * vec4(aVertexNormal, 0.0)).xyz);
        vPosition = (uModelViewMatrix * aVertexPosition).xyz;
        vWorldPosition = aVertexPosition.xyz;
        vTexCoord = aTexCoord;
    }
`;

// Enhanced Fragment Shader with better lighting
const fsSource = `
    precision mediump float;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vTexCoord;
    varying vec3 vWorldPosition;

    uniform vec3 uColor;
    uniform vec3 uSecondaryColor;
    uniform vec3 uLightPosition;
    uniform vec3 uLightColor;
    uniform vec3 uAmbientLight;
    uniform vec3 uCameraPosition;
    uniform float uShininess;
    uniform float uSpecularStrength;
    uniform float uMetallic;
    uniform float uTime;
    uniform int uMaterialType;

    void main() {
        // Ensure normal is normalized
        vec3 normal = normalize(vNormal);

        // Check if normal is valid (not zero vector)
        if (length(vNormal) < 0.01) {
            // Normal is zero/invalid - show as RED for debugging
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            return;
        }

        // FLIP NORMALS if they're pointing the wrong way (try both directions)
        // Calculate lighting with both normal and flipped normal, use the better one
        vec3 lightDir = normalize(uLightPosition - vPosition);
        float diffNormal = max(dot(normal, lightDir), 0.0);
        float diffFlipped = max(dot(-normal, lightDir), 0.0);

        // Use whichever gives more light (auto-correct for inverted normals)
        float diff = max(diffNormal, diffFlipped);
        if (diffFlipped > diffNormal) {
            normal = -normal; // Use flipped normal for specular too
        }

        // Enhanced ambient with atmospheric color - balanced
        vec3 skyColor = vec3(0.6, 0.75, 0.95);
        vec3 ambient = mix(uAmbientLight, skyColor, 0.35) * uColor * 0.85;

        // Main diffuse lighting - balanced
        vec3 diffuse = diff * uLightColor * uColor * 0.8;

        // Specular - balanced
        vec3 viewDir = normalize(uCameraPosition - vPosition);
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
        vec3 specular = uSpecularStrength * spec * uLightColor * 0.7;

        // Combine all lighting - DEFAULT untuk semua material types
        vec3 result = ambient + diffuse + specular;

        // Material-specific effects
        if (uMaterialType == 1) {
            // Metallic - enhance specular (balanced)
            result += specular * 0.4;
        } else if (uMaterialType == 2) {
            // Stripes - apply pattern (balanced)
            float stripePattern = step(0.5, fract(vWorldPosition.y * 3.0));
            vec3 stripeColor = mix(uColor, uSecondaryColor, stripePattern);
            result = mix(uAmbientLight, skyColor, 0.35) * stripeColor * 0.85 + diff * uLightColor * stripeColor * 0.8 + specular * 0.7;
        }

        gl_FragColor = vec4(result, 1.0);
    }
`;

class AlakazamApp {
    constructor(sharedGL = null, autoRender = true) {
        // Accept GL context from Abra or create own
        this.gl = sharedGL || initWebGL();
        if (!this.gl) return;

        this.program = createProgram(this.gl, vsSource, fsSource);
        this.setupAttributes();
        this.createGeometries();
        this.createEnhancedAlakazam();
        this.setupCamera();
        this.setupControls();
        this.time = 0;
        this.animationMode = 0; // 0: idle, 1: psychic pose, 2: meditation
        this.autoRender = autoRender;

        // Only auto-render if not sharing GL (to avoid conflicts)
        if (this.autoRender) {
            this.render();
        }
    }

    setupAttributes() {
        const gl = this.gl;
        this.programInfo = {
            attribLocations: {
                vertexPosition: gl.getAttribLocation(this.program, 'aVertexPosition'),
                vertexNormal: gl.getAttribLocation(this.program, 'aVertexNormal'),
                texCoord: gl.getAttribLocation(this.program, 'aTexCoord'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix'),
                normalMatrix: gl.getUniformLocation(this.program, 'uNormalMatrix'),
                color: gl.getUniformLocation(this.program, 'uColor'),
                secondaryColor: gl.getUniformLocation(this.program, 'uSecondaryColor'),
                lightPosition: gl.getUniformLocation(this.program, 'uLightPosition'),
                lightColor: gl.getUniformLocation(this.program, 'uLightColor'),
                ambientLight: gl.getUniformLocation(this.program, 'uAmbientLight'),
                cameraPosition: gl.getUniformLocation(this.program, 'uCameraPosition'),
                shininess: gl.getUniformLocation(this.program, 'uShininess'),
                specularStrength: gl.getUniformLocation(this.program, 'uSpecularStrength'),
                metallic: gl.getUniformLocation(this.program, 'uMetallic'),
                time: gl.getUniformLocation(this.program, 'uTime'),
                materialType: gl.getUniformLocation(this.program, 'uMaterialType'),
            },
        };
    }

    createGeometryBuffers(geometry) {
        const gl = this.gl;

        // Debug: Check if normals exist and are valid
        if (!geometry.normals || geometry.normals.length === 0) {
            console.error("❌ Geometry has NO normals!", geometry);
        } else if (!window.geometryNormalsLogged) {
            console.log("✅ Creating geometry buffers:");
            console.log("  Positions:", geometry.positions.length / 3, "vertices");
            console.log("  Normals:", geometry.normals.length / 3, "vertices");
            console.log("  First normal:", geometry.normals.slice(0, 3));
            window.geometryNormalsLogged = true;
        }

        const buffers = {
            position: createBuffer(gl, new Float32Array(geometry.positions)),
            normal: createBuffer(gl, new Float32Array(geometry.normals)),
            indices: createBuffer(gl, new Uint16Array(geometry.indices), gl.ELEMENT_ARRAY_BUFFER),
            indexCount: geometry.indices.length
        };

        if (geometry.texCoords) {
            buffers.texCoord = createBuffer(gl, new Float32Array(geometry.texCoords));
        }

        return buffers;
    }

    createGeometries() {
        this.sphereBuffers = this.createGeometryBuffers(createSphere(1, 20, 20));
        this.cylinderBuffers = this.createGeometryBuffers(createCylinder(1, 1, 2, 20, 3));
        this.coneBuffers = this.createGeometryBuffers(createCone(1, 2, 20));
        this.roundedConeBuffers = this.createGeometryBuffers(createRoundedCone(1, 2, 20, 0.15)); // Rounded tip cone

        // NEW: Rounded Triangle dengan Loop Subdivision dari pohon cemara
        const roundedTriangleObj = new RoundedTriangleObject(4, 2.0, 1.5, 1.5);
        this.roundedTriangleBuffers = this.createGeometryBuffers(roundedTriangleObj.getGeometryForAlakazam());

        // NEW: Rounded Isosceles Triangle untuk elbow joints
        const roundedIsoscelesObj = new RoundedIsoscelesTriangle(4, 0.4, 0.3, 0.25);
        this.roundedIsoscelesBuffers = this.createGeometryBuffers(roundedIsoscelesObj.getGeometryForAlakazam());

        // NEW: Bezier-based Chicken Foot Hand (Mega Alakazam style) - For HANDS
        const chickenFootHand = new ChickenFootHand({
            wristScale: [0.5, 1, 0.5],           // [X, Y, Z] - Wrist scale
            centerFingerScale: [0.7, 0.7, 0.7],    // [X, Y, Z] - Center finger scale
            leftFingerScale: [0.5, 0.7, 0.6],      // [X, Y, Z] - Left finger scale
            rightFingerScale: [0.5, 0.7, 0.6]      // [X, Y, Z] - Right finger scale
        });
        this.chickenFootHandBuffers = this.createGeometryBuffers(chickenFootHand.getGeometryForAlakazam());

        // NEW: Bezier-based Chicken Foot for LEFT LEG (curves inward to right for prayer pose)
        const chickenFootLeftLeg = new ChickenFootLeg({
            wristScale: [0.8, 1, 0.7],           // [X, Y, Z] - Ankle/heel scale
            centerToeScale: [0.6, 1, 0.5],         // [X, Y, Z] - Center toe scale
            leftToeScale: [0.6, 0.7, 0.5],         // [X, Y, Z] - Left toe scale
            rightToeScale: [0.6, 0.7, 0.5],        // [X, Y, Z] - Right toe scale

            // LEFT FOOT - EDITABLE BEZIER CURVES (curves INWARD to right for prayer pose)
            centerToeCurve: [
                [0, -0.35, 0],       // P0: Start at ankle
                [0.1, -0.45, 0.4],   // P1: Curve slightly RIGHT
                [0.15, -0.5, 0.7],   // P2: Continue curving RIGHT
                [0.2, -0.45, 1.0]    // P3: End pointing inward (to center)
            ],
            leftToeCurve: [
                [-0.08, -0.37, 0],       // P0: Start left side
                [-0.1, -0.48, 0.3],      // P1: Curve toward center
                [0.05, -0.5, 0.6],       // P2: Continue inward RIGHT
                [0.15, -0.45, 0.85]      // P3: End pointing inward
            ],
            rightToeCurve: [
                [0.08, -0.37, 0],        // P0: Start right side
                [0.2, -0.48, 0.3],       // P1: Curve strongly RIGHT
                [0.3, -0.5, 0.6],        // P2: Continue RIGHT
                [0.35, -0.45, 0.85]      // P3: End pointing strongly inward
            ]
        });
        // Get separate toe geometries for individual BodyParts (per-toe translation control)
        const leftToeGeometries = chickenFootLeftLeg.getSeparateToeGeometries();
        this.leftAnkleWristBuffers = this.createGeometryBuffers({...leftToeGeometries.wrist, texCoords: new Array(leftToeGeometries.wrist.positions.length / 3 * 2).fill(0.5)});
        this.leftCenterToeBuffers = this.createGeometryBuffers({...leftToeGeometries.centerToe, texCoords: new Array(leftToeGeometries.centerToe.positions.length / 3 * 2).fill(0.5)});
        this.leftLeftToeBuffers = this.createGeometryBuffers({...leftToeGeometries.leftToe, texCoords: new Array(leftToeGeometries.leftToe.positions.length / 3 * 2).fill(0.5)});
        this.leftRightToeBuffers = this.createGeometryBuffers({...leftToeGeometries.rightToe, texCoords: new Array(leftToeGeometries.rightToe.positions.length / 3 * 2).fill(0.5)});

        // NEW: Bezier-based Chicken Foot for RIGHT LEG (curves inward to left for prayer pose)
        const chickenFootRightLeg = new ChickenFootLeg({
            wristScale: [0.6, 0.8, 0.6],           // [X, Y, Z] - Ankle/heel scale
            centerToeScale: [0.6, 1, 0.5],         // [X, Y, Z] - Center toe scale
            leftToeScale: [0.6, 0.7, 0.5],         // [X, Y, Z] - Left toe scale
            rightToeScale: [0.6, 0.7, 0.5],        // [X, Y, Z] - Right toe scale

            // RIGHT FOOT - EDITABLE BEZIER CURVES (curves INWARD to left for prayer pose)
            centerToeCurve: [
                [0, -0.35, 0],        // P0: Start at ankle
                [-0.1, -0.6, 0.4],   // P1: Curve slightly LEFT
                [-0.15, -0.5, 0.7],   // P2: Continue curving LEFT
                [-0.2, -0.45, 1.0]    // P3: End pointing inward (to center)
            ],
            leftToeCurve: [
                [-0.08, -0.1, 0],       // P0: Start left side
                [-0.2, -0.48, 0.3],      // P1: Curve strongly LEFT
                [-0.3, -0.5, 0.6],       // P2: Continue LEFT
                [-0.1, -0.45, 0.85]     // P3: End pointing strongly inward
            ],
            rightToeCurve: [
                [0.08, -0.37, 0],        // P0: Start right side
                [0.1, -0.48, 0.3],       // P1: Curve toward center
                [-0.05, -0.5, 0.6],      // P2: Continue inward LEFT
                [-0.15, -0.45, 0.85]     // P3: End pointing inward
            ]
        });
        // Get separate toe geometries for individual BodyParts (per-toe translation control)
        const rightToeGeometries = chickenFootRightLeg.getSeparateToeGeometries();
        this.rightAnkleWristBuffers = this.createGeometryBuffers({...rightToeGeometries.wrist, texCoords: new Array(rightToeGeometries.wrist.positions.length / 3 * 2).fill(0.5)});
        this.rightCenterToeBuffers = this.createGeometryBuffers({...rightToeGeometries.centerToe, texCoords: new Array(rightToeGeometries.centerToe.positions.length / 3 * 2).fill(0.5)});
        this.rightLeftToeBuffers = this.createGeometryBuffers({...rightToeGeometries.leftToe, texCoords: new Array(rightToeGeometries.leftToe.positions.length / 3 * 2).fill(0.5)});
        this.rightRightToeBuffers = this.createGeometryBuffers({...rightToeGeometries.rightToe, texCoords: new Array(rightToeGeometries.rightToe.positions.length / 3 * 2).fill(0.5)});

        // NEW: Hyperboloid for organic leg shapes
        // Parameters: radiusTop, radiusBottom, radiusWaist, height, waistPosition, segments, heightSegments
        this.hyperboloidLegBuffers = this.createGeometryBuffers(
            createHyperboloid(0.3, 0.25, 0.18, 2.0, 0.5, 16, 20)
        );

        this.torusBuffers = this.createGeometryBuffers(createTorus(0.5, 0.2, 16, 12));

        // Trapezoid torso - angular body shape (wide shoulders, narrow waist)
        // Parameters: topWidth, topDepth, bottomWidth, bottomDepth, height, segments
        this.trapezoidTorsoBuffers = this.createGeometryBuffers(
            createTrapezoidTorso(1.8, 0.8, 0.9, 0.5, 2.0, 20)
        );

        // Inverted trapezoid for lower body/pants (narrow waist, wide thighs)
        // Flip the parameters: small at top, large at bottom
        this.invertedTrapezoidBuffers = this.createGeometryBuffers(
            createTrapezoidTorso(0.5, 0.3, 1.0, 0.6, 1.0, 20)
            // topWidth=0.5 (narrow waist), bottomWidth=1.0 (wide thighs)
        );

        // Various ellipsoids for better anatomy
        this.headBuffers = this.createGeometryBuffers(createRoundedCone(0.25, 1.6, 20, 0.15));
        this.bodyBuffers = this.createGeometryBuffers(createEllipsoid(0.8, 1.2, 0.65, 20, 20));
        this.armBuffers = this.createGeometryBuffers(createCylinder(0.15, 0.12, 1.2, 16, 4));
        this.legBuffers = this.createGeometryBuffers(createCylinder(0.18, 0.14, 1.4, 16, 4));

        // Fox-like pointed snout
        // Adjust these values: sharpness (1.0=sharp, 3.0=blunt), tipRadius (0.0=point, 0.2=blunt)
        const snoutSharpness = 1;  // More blunt taper (was 1.5)
        const snoutTipRadius = 0.2; // Blunter tip (was 0.05)
        this.foxSnoutBuffers = this.createGeometryBuffers(createFoxSnout(snoutSharpness, snoutTipRadius));

        // Sharp triangular eyes (right triangle shape)
        this.triangularEyeBuffers = this.createGeometryBuffers(createTriangularEye());

        // Curved mustache buffers (left curves left, right curves right)
        this.leftMustacheBuffers = this.createGeometryBuffers(createCurvedMustache(-1));
        this.rightMustacheBuffers = this.createGeometryBuffers(createCurvedMustache(1));

        // Flame-shaped center mustache (points downward)
        this.flameMustacheBuffers = this.createGeometryBuffers(createFlameMustache());

        // Complete spoon geometry - handle + bowl in one mesh
        // PARAMETERS: Adjust these to change spoon size
        const spoonHandleX = 0.025;       // Gagang lebar X
        const spoonHandleZ = 0.005;       // Gagang depth Z
        const spoonHandleLength = 0.5;   // Gagang panjang Y
        const spoonBowlWidth = 0.135;      // Bowl lebar X (radius horizontal)
        const spoonBowlLength = 0.2;     // Bowl panjang Z (radius depth)
        const spoonBowlThickness = 0.01; // Bowl ketebalan Y (radius vertical - KECIL=GEPENG)

        // ROTASI BOWL HEAD (relatif ke gagang)
        const spoonBowlRotX = 4.7;         // X-axis: tilt depan(-)/belakang(+)
        const spoonBowlRotY = 0;         // Y-axis: putar kiri(-)/kanan(+)
        const spoonBowlRotZ = 0;         // Z-axis: roll samping

        // TRANSLASI/POSISI BOWL HEAD (geser posisi bowl)
        const spoonBowlOffsetX = 0;      // X: geser kiri(-)/kanan(+)
        const spoonBowlOffsetY = 0;      // Y: geser bawah(-)/atas(+)
        const spoonBowlOffsetZ = -0.1;      // Z: geser belakang(-)/depan(+)

        this.completeSpoonBuffers = this.createGeometryBuffers(
            createSpoon(spoonHandleX, spoonHandleZ, spoonHandleLength,
                       spoonBowlWidth, spoonBowlLength, spoonBowlThickness,
                       spoonBowlRotX, spoonBowlRotY, spoonBowlRotZ,
                       spoonBowlOffsetX, spoonBowlOffsetY, spoonBowlOffsetZ)
        );
    }

    createEnhancedAlakazam() {
        // Alakazam's accurate color palette
        const mainYellow = [0.88, 0.75, 0.35];
        const darkBrown = [0.45, 0.30, 0.15];
        const mustacheWhite = [0.95, 0.95, 0.98]; // Changed to white
        const silver = [0.85, 0.88, 0.92];
        const gold = [0.95, 0.85, 0.40];

        // Root - SCALED DOWN and POSITIONED beside Abra
        this.root = new BodyPart(null, mainYellow);
        this.BASE_Y_OFFSET = 0.5; // ← EDIT INI untuk adjust ketinggian base
        this.root.translation = [3, this.BASE_Y_OFFSET, 1]; // X, Y (base), Z
        this.root.rotation = [0, 0.1, 0]; // [X, Y, Z] - Y rotation untuk arah hadap (EDIT INI!)
        this.root.scale = [0.8,0.8,0.8]; // Scale to ~1.2x Abra size

        // BODY - Angular trapezoid torso (wide shoulders, narrow waist)
        // Changed from round ellipsoid to sharp geometric trapezoid shape
        this.body = new BodyPart(this.trapezoidTorsoBuffers, mainYellow, null, this.root, 2);
        this.body.scale = [1.0, 1.0, 1.0];
        this.body.translation = [0, 0.5, 0];
        this.body.shininess = 32.0;    // Shader untuk lighting
        this.body.metallic = 0.2;

        // Chest armor/plate
        this.chestPlate = new BodyPart(this.sphereBuffers, darkBrown, null, this.body, 0);
        this.chestPlate.scale = [0.7, 0.4, 0.3];
        this.chestPlate.translation = [0, 0.5, 0.5];
        this.chestPlate.shininess = 32.0;
        this.chestPlate.metallic = 0.2;


        // HEAD - Fox-like with better proportions
        this.head = new BodyPart(this.headBuffers, mainYellow, null, this.body, 2);
        this.head.scale = [1.1, 1.35, 1.1];
        this.head.translation = [0, 1.8, 0];
        this.head.shininess = 32.0;    // Shader untuk lighting
        this.head.metallic = 0.2;

        // Snout base - rounded sphere (connects to head)
        this.snoutBase = new BodyPart(this.sphereBuffers, mainYellow, null, this.head, 0);
        this.snoutBase.scale = [0.3, 0.32, 0.25]; // Sphere at base
        this.snoutBase.translation = [0, -0.15, 0.6];
        this.snoutBase.shininess = 32.0;
        this.snoutBase.metallic = 0.2;

        // Sharp V-shaped fox snout tip (extends from sphere front)
        this.snoutTip = new BodyPart(this.foxSnoutBuffers, mainYellow, null, this.snoutBase, 0);
        this.snoutTip.scale = [2, 3, 4]; // Tapered V-shape (longer)
        this.snoutTip.translation = [0, -0.08, 0.5]; // Move further forward to clear sphere
        this.snoutTip.rotation[0] = 0.08; // Slight downward angle
        this.snoutTip.shininess = 32.0;
        this.snoutTip.metallic = 0.2;

        // EYES - Sharp triangular/angular (right triangle shape)
        const eyeWhite = [0.95, 0.95, 0.98];
        const eyeBlack = [0.1, 0.1, 0.1]; // Black pupil

        // Left eye - sharp right triangle (white fill)
        this.leftEye = new BodyPart(this.triangularEyeBuffers, eyeWhite, null, this.head, 0);
        this.leftEye.scale = [0.4, 0.4, 0.4]; // Sharp triangular
        this.leftEye.translation = [-0.3, 0.3, 0.5]; // Side of head
        this.leftEye.rotation[1] = -0.3; // Angle outward
        this.leftEye.rotation[2] = 4.8; // No tilt (keep triangle upright)

        // Left eye outline - black edges
        this.leftEyeOutline = new BodyPart(this.triangularEyeBuffers, eyeBlack, null, this.leftEye, 0);
        this.leftEyeOutline.scale = [1.05, 1.05, 0.95]; // Slightly larger for outline effect
        this.leftEyeOutline.translation = [0, 0, -0.01]; // Behind white triangle

        // Left pupil - small black dot at tip
        this.leftPupil = new BodyPart(this.sphereBuffers, eyeBlack, null, this.leftEye, 0);
        this.leftPupil.scale = [0.08, 0.08, 0.2]; // Very small dot
        this.leftPupil.translation = [0.25, 0.1, 0.1]; // At the sharp tip corner

        // Right eye - sharp right triangle (mirrored, white fill)
        this.rightEye = new BodyPart(this.triangularEyeBuffers, eyeWhite, null, this.head, 0);
        this.rightEye.scale = [-0.4, 0.4, 0.4]; // Mirror with negative X scale
        this.rightEye.translation = [0.3, 0.3, 0.59]; // Side of head
        this.rightEye.rotation[1] = 0.1; // Angle outward
        this.rightEye.rotation[2] = -4.8; // No tilt

        // Right eye outline - black edges
        this.rightEyeOutline = new BodyPart(this.triangularEyeBuffers, eyeBlack, null, this.rightEye, 0);
        this.rightEyeOutline.scale = [1.05, 1.05, 0.95]; // Slightly larger for outline effect
        this.rightEyeOutline.translation = [0, 0, -0.01]; // Behind white triangle

        // Right pupil - small black dot at tip
        this.rightPupil = new BodyPart(this.sphereBuffers, eyeBlack, null, this.rightEye, 0);
        this.rightPupil.scale = [0.08, 0.08, 0.2]; // Very small dot
        this.rightPupil.translation = [0.25, 0.1, 0.1]; // At the sharp tip corner (mirrored)

        // EARS - Large pointed fox ears
        this.leftEar = new BodyPart(this.coneBuffers, mainYellow, null, this.head, 0);
        this.leftEar.scale = [0.3, 0.6, 0.35];
        this.leftEar.rotation[0] = 0.2;    // X-axis (tilt back slightly)
        this.leftEar.rotation[1] = 0.3;    // Y-axis (turn outward)
        this.leftEar.rotation[2] = -1;    // Z-axis (tilt left) - base value
        this.leftEar.translation = [0.69, 0.8, 0];
        this.leftEar.shininess = 32.0;
        this.leftEar.metallic = 0.2;

        this.rightEar = new BodyPart(this.coneBuffers, mainYellow, null, this.head, 0);
        this.rightEar.scale = [0.35, 0.6, 0.35];
        this.rightEar.rotation[0] = -0.2;   // X-axis (tilt back slightly)
        this.rightEar.rotation[1] = 0.3;    // Y-axis (turn outward)
        this.rightEar.rotation[2] = 1;    // Z-axis (tilt right) - base value
        this.rightEar.translation = [-0.69, 0.8, 0];
        this.rightEar.shininess = 32.0;
        this.rightEar.metallic = 0.2;

        // Inner ears
        this.leftInnerEar = new BodyPart(this.coneBuffers, darkBrown, null, this.leftEar, 0);
        this.leftInnerEar.scale = [0.5, 0.7, 0.5];
        this.leftInnerEar.translation = [0, 0, 0];
        this.leftInnerEar.shininess = 32.0;
        this.leftInnerEar.metallic = 0.2;

        this.rightInnerEar = new BodyPart(this.coneBuffers, darkBrown, null, this.rightEar, 0);
        this.rightInnerEar.scale = [0.5, 0.7, 0.5];
        this.rightInnerEar.translation = [0, 0, 0];
        this.rightInnerEar.shininess = 32.0;
        this.rightInnerEar.metallic = 0.2;

        // CHEEK SPIKES - Ear-like protrusions on cheeks (Alakazam's signature feature)
        // Using rounded cone for blunt tip (not sharp like needle, but still pointed)
        this.leftCheekSpike = new BodyPart(this.roundedConeBuffers, mainYellow, null, this.head, 0);
        this.leftCheekSpike.scale = [0.25, 0.4, 0.25];
        this.leftCheekSpike.rotation[0] = 3;    // Tilt slightly forward
        this.leftCheekSpike.rotation[1] = -0.2;   // Point outward to the left
        this.leftCheekSpike.rotation[2] = 1.5;   // Angle downward-outward
        this.leftCheekSpike.translation = [-0.9, -0.2, 0.2];
        this.leftCheekSpike.shininess = 32.0;
        this.leftCheekSpike.metallic = 0.2;

        this.rightCheekSpike = new BodyPart(this.roundedConeBuffers, mainYellow, null, this.head, 0);
        this.rightCheekSpike.scale = [0.25, 0.4, 0.25];
        this.rightCheekSpike.rotation[0] = 3;   // Tilt slightly forward
        this.rightCheekSpike.rotation[1] = 0.2;   // Point outward to the right
        this.rightCheekSpike.rotation[2] = -1.5;   // Angle downward-outward
        this.rightCheekSpike.translation = [0.9, -0.2, 0.2];
        this.rightCheekSpike.shininess = 32.0;
        this.rightCheekSpike.metallic = 0.2;

        // Inner cheek spikes (darker brown) - also rounded
        this.leftCheekSpikeInner = new BodyPart(this.roundedConeBuffers, darkBrown, null, this.leftCheekSpike, 0);
        this.leftCheekSpikeInner.scale = [0.5, 0.7, 0.5];
        this.leftCheekSpikeInner.translation = [0, 0, 0];
        this.leftCheekSpikeInner.shininess = 32.0;
        this.leftCheekSpikeInner.metallic = 0.2;

        this.rightCheekSpikeInner = new BodyPart(this.roundedConeBuffers, darkBrown, null, this.rightCheekSpike, 0);
        this.rightCheekSpikeInner.scale = [0.5, 0.7, 0.5];
        this.rightCheekSpikeInner.translation = [0, 0, 0];
        this.rightCheekSpikeInner.shininess = 32.0;
        this.rightCheekSpikeInner.metallic = 0.2;

        // MUSTACHE - Iconic wavy white mustache with 3 curves
        this.leftMustache = new BodyPart(this.leftMustacheBuffers, mustacheWhite, null, this.head, 0);
        this.leftMustache.scale = [1.0, 1.0, 1.0]; // Natural scale for wavy curves
        this.leftMustache.translation = [-0.1, -0.05, 1]; // Position on face
        this.leftMustache.rotation[0] = 0.4; // Tilt downward (X-axis rotation)
        this.leftMustache.rotation[1] = 0.2; // Angle outward
        this.leftMustache.rotation[2] = 0.3; // More droop (increased from 0.1)
        this.leftMustache.shininess = 48.0; // Slight shine for white hair
        this.leftMustache.metallic = 0.2;

        this.rightMustache = new BodyPart(this.rightMustacheBuffers, mustacheWhite, null, this.head, 0);
        this.rightMustache.scale = [1.0, 1.0, 1.0];
        this.rightMustache.translation = [0.1, -0.05, 1];
        this.rightMustache.rotation[0] = 0.4; // Tilt downward (X-axis rotation)
        this.rightMustache.rotation[1] = -0.2; // Angle outward
        this.rightMustache.rotation[2] = -0.3; // More droop (radians, not degrees!)
        this.rightMustache.shininess = 48.0;
        this.rightMustache.metallic = 0.2;

        // CENTER MUSTACHE - Flame-shaped, pointing downward between left and right mustaches
        // PARAMETERS: Adjust these to change size and position
        const centerMustacheWidth = 1.8;   // X-axis: Width (larger = wider, try 2.0-4.0)
        const centerMustacheLength = 3;  // Y-axis: Length downward (larger = longer, try 2.0-4.0)
        const centerMustacheDepth = 1.5;   // Z-axis: Thickness (larger = thicker, try 1.0-2.0)
        const centerMustacheY = -0.1;      // Vertical position (lower = more negative)
        const centerMustacheZ = 0.95;      // Forward position (forward = larger value)

        this.centerMustache = new BodyPart(this.flameMustacheBuffers, mustacheWhite, null, this.head, 0);
        this.centerMustache.scale = [centerMustacheWidth, centerMustacheLength, centerMustacheDepth];
        this.centerMustache.translation = [0, centerMustacheY, centerMustacheZ];
        this.centerMustache.rotation[0] = 0; // X-axis tilt (positive = tilt forward)
        this.centerMustache.rotation[1] = 0; // Y-axis rotation (side rotation)
        this.centerMustache.rotation[2] = 0; // Z-axis roll (tilt sideways)
        this.centerMustache.shininess = 48.0;
        this.centerMustache.metallic = 0.2;

        // Star on forehead
        this.foreheadStar = new BodyPart(this.sphereBuffers, [0.9, 0.2, 0.2], null, this.head, 0);
        this.foreheadStar.scale = [0.1, 0.15, 0.1];
        this.foreheadStar.translation = [0, 0.7, 0.45];

    
    
    // ========== KEPALA (ROUNDED CONE) ==========
        // Menggunakan RoundedTriangleObject class dengan Loop subdivision algorithm
        this.roundedTriangleTest = new BodyPart(this.roundedTriangleBuffers, mainYellow, null, this.head, 0);
        this.roundedTriangleTest.scale = [2.7, 3.5, 2];       // [X:lebar, Y:tinggi, Z:depth]
        this.roundedTriangleTest.translation = [0, -1.4, 0];  // [X:kiri (negatif), Y:atas, Z:depan/belakang]
        this.roundedTriangleTest.rotation[0] = 0;               // X-axis: tilt depan/belakang
        this.roundedTriangleTest.rotation[1] = 5.6;               // Y-axis: putar kiri/kanan
        this.roundedTriangleTest.rotation[2] = 0;               // Z-axis: roll samping
        this.roundedTriangleTest.shininess = 32.0;              // Konsisten dengan bagian tubuh lain
        this.roundedTriangleTest.metallic = 0.2;                // Natural, tidak terlalu metallic
        // ===========================================

        // NOSE BRIDGE - Cylindrical bone structure from forehead star to snout
        // Parameters: scale[0]=width, scale[1]=length, scale[2]=depth
        // Adjust these values to make it slimmer or longer
        const noseBridgeWidth = 0.07;   // X-axis thickness (slimmer = smaller value)
        const noseBridgeLength = 0.51;   // Y-axis length (longer = larger value)
        const noseBridgeDepth = 0.11;   // Z-axis thickness (slimmer = smaller value)

        this.noseBridge = new BodyPart(this.cylinderBuffers, mainYellow, null, this.head, 0);
        this.noseBridge.scale = [noseBridgeWidth, noseBridgeLength, noseBridgeDepth];
        this.noseBridge.translation = [0, 0.15, 0.62]; // Position between forehead and snout
        this.noseBridge.rotation[0] = 2; // Tilt downward toward snout (increase for steeper angle)

        // Nose bridge cap TOP - sphere to close the top end of the cylinder
        this.noseBridgeCapTop = new BodyPart(this.sphereBuffers, mainYellow, null, this.noseBridge, 0);
        this.noseBridgeCapTop.scale = [1.2, 1.0, 1.2]; // Slightly larger than cylinder to ensure coverage
        this.noseBridgeCapTop.translation = [0, noseBridgeLength, 0]; // At the top end of cylinder

        // Nose bridge cap BOTTOM - sphere to close the bottom end of the cylinder
        this.noseBridgeCapBottom = new BodyPart(this.sphereBuffers, mainYellow, null, this.noseBridge, 0);
        this.noseBridgeCapBottom.scale = [1.2, 1.0, 1.2]; // Slightly larger than cylinder to ensure coverage
        this.noseBridgeCapBottom.translation = [0, -noseBridgeLength, 0]; // At the bottom end of cylinder

        // MEGA ALAKAZAM - FLOATING SPOONS ABOVE HEAD (5 spoons in circular formation)
        const floatingSpoonGray = [0.7, 0.7, 0.75]; // Silver-gray color
        const spoonDistance = 1.8; // Distance from head center (increased for wider gap like anime)
        const spoonHeight = 1.5;   // Height above head

        // Center top spoon (back) - Complete spoon (handle + bowl)
        this.floatingSpoon1 = new BodyPart(this.completeSpoonBuffers, floatingSpoonGray, null, this.head, 1);
        this.floatingSpoon1.scale = [1.0, 1.0, 1.0];
        this.floatingSpoon1.translation = [0, spoonHeight, -spoonDistance * 0.8];
        this.floatingSpoon1.rotation[0] = -0.3; // Tilt down
        this.floatingSpoon1.rotation[2] = 0; // Upright
        this.floatingSpoon1.shininess = 64.0;
        this.floatingSpoon1.metallic = 0.9;

        // Left-back spoon
        this.floatingSpoon2 = new BodyPart(this.completeSpoonBuffers, floatingSpoonGray, null, this.head, 1);
        this.floatingSpoon2.scale = [1.0, 1.0, 1.0];
        this.floatingSpoon2.translation = [-spoonDistance * 0.7, spoonHeight, -spoonDistance * 0.5];
        this.floatingSpoon2.rotation[0] = -0.3;
        this.floatingSpoon2.rotation[1] = 0.5;
        this.floatingSpoon2.shininess = 64.0;
        this.floatingSpoon2.metallic = 0.9;

        // Right-back spoon
        this.floatingSpoon3 = new BodyPart(this.completeSpoonBuffers, floatingSpoonGray, null, this.head, 1);
        this.floatingSpoon3.scale = [1.0, 1.0, 1.0];
        this.floatingSpoon3.translation = [spoonDistance * 0.7, spoonHeight, -spoonDistance * 0.5];
        this.floatingSpoon3.rotation[0] = -0.3;
        this.floatingSpoon3.rotation[1] = -0.5;
        this.floatingSpoon3.shininess = 64.0;
        this.floatingSpoon3.metallic = 0.9;

        // Left-front spoon
        this.floatingSpoon4 = new BodyPart(this.completeSpoonBuffers, floatingSpoonGray, null, this.head, 1);
        this.floatingSpoon4.scale = [1.0, 1.0, 1.0];
        this.floatingSpoon4.translation = [-spoonDistance, spoonHeight, spoonDistance * 0.3];
        this.floatingSpoon4.rotation[0] = 0.2;
        this.floatingSpoon4.rotation[1] = 0.8;
        this.floatingSpoon4.shininess = 64.0;
        this.floatingSpoon4.metallic = 0.9;

        // Right-front spoon
        this.floatingSpoon5 = new BodyPart(this.completeSpoonBuffers, floatingSpoonGray, null, this.head, 1);
        this.floatingSpoon5.scale = [1.0, 1.0, 1.0];
        this.floatingSpoon5.translation = [spoonDistance, spoonHeight, spoonDistance * 0.3];
        this.floatingSpoon5.rotation[0] = 0.2;
        this.floatingSpoon5.rotation[1] = -0.8;
        this.floatingSpoon5.shininess = 64.0;
        this.floatingSpoon5.metallic = 0.9;

        // SHOULDERS - Hierarki dengan pivot untuk animasi
        const paleMaroon = [0.9, 0.4, 0.7]; // Maroon #7B4056 (seperti baju Mega Alakazam)

        // Left Shoulder Joint (pivot untuk animasi, tidak ada visual)
        this.leftShoulderJoint = new BodyPart(null, null, null, this.body, 0);
        this.leftShoulderJoint.translation = [-1.0, 0.9, 0];  // Posisi pivot di kiri atas body

        // Left Shoulder Pad - cone visual (child dari joint)
        this.leftShoulderPad = new BodyPart(this.roundedTriangleBuffers, paleMaroon, null, this.leftShoulderJoint, 1);
        this.leftShoulderPad.scale = [1.2, 2.2, 1.7];         // [X:panjang cone, Y:lebar, Z:depth]
        this.leftShoulderPad.translation = [1, -0.5, 0];         // Relatif ke joint (center)
        this.leftShoulderPad.rotation[0] = 0;                 // X-axis
        this.leftShoulderPad.rotation[1] = 0;                 // Y-axis
        this.leftShoulderPad.rotation[2] = (Math.PI / 2.7);      // Z-axis: rotate 90° agar ujung runcing ke kiri
        this.leftShoulderPad.shininess = 32.0;   // Lebih rendah untuk tampilan natural seperti fabric
        this.leftShoulderPad.metallic = 0.3;     // Lebih rendah, tidak terlalu metallic

        // Right Shoulder Joint (pivot untuk animasi, tidak ada visual)
        this.rightShoulderJoint = new BodyPart(null, null, null, this.body, 0);
        this.rightShoulderJoint.translation = [1.0, 0.9, 0];   // Posisi pivot di kanan atas body

        // Right Shoulder Pad - cone visual (child dari joint)
        this.rightShoulderPad = new BodyPart(this.roundedTriangleBuffers, paleMaroon, null, this.rightShoulderJoint, 1);
        this.rightShoulderPad.scale = [1.2, 2.2, 1.7];        // [X:panjang cone, Y:lebar, Z:depth]
        this.rightShoulderPad.translation = [-1, -0.5, 0];        // Relatif ke joint (center)
        this.rightShoulderPad.rotation[0] = 0;                // X-axis
        this.rightShoulderPad.rotation[1] = 0;                // Y-axis
        this.rightShoulderPad.rotation[2] = -Math.PI / 2.7;      // Z-axis: rotate 90° agar ujung runcing ke kanan
        this.rightShoulderPad.shininess = 32.0;   // Lebih rendah untuk tampilan natural seperti fabric
        this.rightShoulderPad.metallic = 0.3;     // Lebih rendah, tidak terlalu metallic

        // ARMS - Segmented with joints (parent: shoulder JOINT, bukan pad, agar tidak ter-rotate)
        this.leftUpperArm = new BodyPart(this.armBuffers, mainYellow, null, this.leftShoulderJoint, 2);
        this.leftUpperArm.scale = [0.5, 0.6, 0.7];  // [X:width, Y:length, Z:width] - lebih ramping dan panjang
        this.leftUpperArm.translation = [0, -0.7, 0];
        this.leftUpperArm.rotation[0] = 0; // X-axis: tilt depan/belakang
        this.leftUpperArm.rotation[1] = 0; // Y-axis: putar kiri/kanan
        this.leftUpperArm.rotation[2] = -0.25; // Z-axis: roll samping

        // Left elbow JOINT (pivot tanpa visual - tidak mempengaruhi scale)
        this.leftElbowJoint = new BodyPart(null, null, null, this.leftUpperArm, 0);
        this.leftElbowJoint.translation = [0, -0.65, 0];

        // Left elbow VISUAL (decoration - tidak mempengaruhi hierarki lower arm)
        this.leftElbow = new BodyPart(this.roundedIsoscelesBuffers, paleMaroon, null, this.leftElbowJoint, 0);
        this.leftElbow.scale = [23 , 28, 23];
        this.leftElbow.translation = [-4, -0.79, 1.2];
        this.leftElbow.rotation[0] = 0; // X-axis: tilt depan/belakang
        this.leftElbow.rotation[1] = 0.3; // Y-axis: putar kiri/kanan
        this.leftElbow.rotation[2] = -1.5; // Z-axis: roll samping
        this.leftElbow.shininess = 32.0;   // Konsisten dengan shoulderPad
        this.leftElbow.metallic = 0.3;

        // Mega Alakazam: Bezier-based Chicken Foot Hand (wrist + 3 curved fingers)
        this.leftChickenHand = new BodyPart(this.chickenFootHandBuffers, mainYellow, null, this.leftElbowJoint, 0);
        this.leftChickenHand.scale = [2.0, 2.0, 2.0];
        this.leftChickenHand.translation = [-2.4, 0.5, 0.5];
        this.leftChickenHand.rotation[0] = 3;  // X-axis
        this.leftChickenHand.rotation[1] = 3;  // Y-axis
        this.leftChickenHand.rotation[2] = 1.25;  // Z-axis

        // Right arm (mirror) (parent: shoulder JOINT, bukan pad, agar tidak ter-rotate)
        this.rightUpperArm = new BodyPart(this.armBuffers, mainYellow, null, this.rightShoulderJoint, 2);
        this.rightUpperArm.scale = [0.5, 0.6, 0.7];  // [X:width, Y:length, Z:width] - lebih ramping dan panjang
        this.rightUpperArm.translation = [0, -0.7, 0];
        this.rightUpperArm.rotation[0] = 0; // X-axis: tilt depan/belakang
        this.rightUpperArm.rotation[1] = 0; // Y-axis: putar kiri/kanan
        this.rightUpperArm.rotation[2] = 0.25; // Z-axis: roll samping (mirror dari left -0.25)

        // Right elbow JOINT (pivot tanpa visual - tidak mempengaruhi scale)
        this.rightElbowJoint = new BodyPart(null, null, null, this.rightUpperArm, 0);
        this.rightElbowJoint.translation = [0, -0.65, 0];

        // Right elbow VISUAL (decoration - tidak mempengaruhi hierarki lower arm)
        this.rightElbow = new BodyPart(this.roundedIsoscelesBuffers, paleMaroon, null, this.rightElbowJoint, 0);
        this.rightElbow.scale = [23, 28, 23];  // Sama dengan left
        this.rightElbow.translation = [4, 0.6, 1.2];  // Mirror X dari left, Y sama dengan left
        this.rightElbow.rotation[0] = 0; // X-axis: tilt depan/belakang (sama)
        this.rightElbow.rotation[1] = -0.3; // Y-axis: putar kiri/kanan (mirror dari left 0.3)
        this.rightElbow.rotation[2] = 1.5; // Z-axis: roll samping (mirror dari left -1.5)
        this.rightElbow.shininess = 32.0;   // Konsisten dengan shoulderPad
        this.rightElbow.metallic = 0.3;

        // Mega Alakazam: Bezier-based Chicken Foot Hand (wrist + 3 curved fingers)
        this.rightChickenHand = new BodyPart(this.chickenFootHandBuffers, mainYellow, null, this.rightElbowJoint, 0);
        this.rightChickenHand.scale = [2.0, 2.0, 2.0];
        this.rightChickenHand.translation = [2, 0.3, 0.6];  // Mirror X dari left (-2.4 jadi 2.4)
        this.rightChickenHand.rotation[0] = 3;  // X-axis: sama dengan left
        this.rightChickenHand.rotation[1] = -3;  // Y-axis: mirror dari left (3 jadi -3)
        this.rightChickenHand.rotation[2] = -1.25;  // Z-axis: mirror dari left (1.25 jadi -1.25)

        // Mega Alakazam: No spoons needed - chicken foot hands only

        // LOWER BODY / PANTS - Inverted trapezoid (narrow waist at top, wider at thighs at bottom)
        // Using invertedTrapezoidBuffers (already shaped correctly - no rotation needed)
        this.lowerBody = new BodyPart(this.invertedTrapezoidBuffers, mainYellow, paleMaroon, this.body, 2);
        this.lowerBody.scale = [1.0, 1.0, 1.0]; // Natural scale
        this.lowerBody.translation = [0, -1.0, 0]; // Below the body/torso
        this.lowerBody.shininess = 32.0;
        this.lowerBody.metallic = 0.2;

        // LEGS - Direct connection from lowerBody (pants) to thigh (no hip sphere)
        this.leftThigh = new BodyPart(this.hyperboloidLegBuffers, mainYellow, null, this.lowerBody, 2);
        this.leftThigh.scale = [1 , 0.5, 0.6];
        this.leftThigh.translation = [-0.4, -0.4, 0.29]; // Directly from lowerBody
        this.leftThigh.rotation[0] = 3; // X-axis: forward/backward tilt
        this.leftThigh.rotation[1] = -0.5; // Y-axis: left/right twist
        this.leftThigh.rotation[2] = -1.6; // Z-axis: outward/inward angle

        // Left knee sphere (joint/pivot point)
        this.leftKnee = new BodyPart(this.sphereBuffers, paleMaroon, null, this.leftThigh, 0);
        this.leftKnee.scale = [0.4, 1, 0.5]; // Same as right knee
        this.leftKnee.translation = [0, -1.6, 0]; // Same as right knee
        this.leftKnee.rotation[0] = 0;
        this.leftKnee.rotation[1] = 0;
        this.leftKnee.rotation[2] = 0;
        this.leftKnee.shininess = 32.0;   // Konsisten dengan shoulderPad
        this.leftKnee.metallic = 0.3;

        this.leftCalf = new BodyPart(this.hyperboloidLegBuffers, mainYellow, null, this.leftKnee, 2);
        this.leftCalf.scale = [0.7, 2, 1.3]; // Same as right calf
        this.leftCalf.translation = [-0.5, 0.3, -1.5]; // Mirror X of right calf [1, 0, -1.5]
        this.leftCalf.rotation[0] = 1; // X-axis: same as right (forward/backward bend)
        this.leftCalf.rotation[1] = -1.5; // Y-axis: mirror of right (left/right twist)
        this.leftCalf.rotation[2] = -0.8; // Z-axis: mirror of right (outward/inward angle)

        this.leftAnkle = new BodyPart(this.sphereBuffers, darkBrown, null, this.leftCalf, 0);
        this.leftAnkle.scale = [0.18, 0.18, 0.18];
        this.leftAnkle.translation = [0, -0.7, 0];
        this.leftAnkle.shininess = 32.0;
        this.leftAnkle.metallic = 0.2;

        // Left Chicken Foot - SEPARATE TOES (individual translation control per toe)

        // Left ankle wrist (base)
        this.leftAnkleWrist = new BodyPart(this.leftAnkleWristBuffers, mainYellow, null, this.leftAnkle, 0);
        this.leftAnkleWrist.scale = [10, 7, 10];
        this.leftAnkleWrist.translation = [0, -1, 0];
        this.leftAnkleWrist.rotation[0] = 0;
        this.leftAnkleWrist.rotation[1] = -1;
        this.leftAnkleWrist.rotation[2] = -0.3;

        // Left center toe - EDITABLE TRANSLATION
        this.leftCenterToe = new BodyPart(this.leftCenterToeBuffers, mainYellow, null, this.leftAnkle, 0);
        this.leftCenterToe.scale = [10, 7, 10];
        this.leftCenterToe.translation = [0.7, -0.8, -0.6]; // Base position, edit X/Y/Z untuk pindah jari tengah
        this.leftCenterToe.rotation[0] = 0;
        this.leftCenterToe.rotation[1] = -1;
        this.leftCenterToe.rotation[2] = -0.3;

        // Left left toe - EDITABLE TRANSLATION
        this.leftLeftToe = new BodyPart(this.leftLeftToeBuffers, mainYellow, null, this.leftAnkle, 0);
        this.leftLeftToe.scale = [10, 7, 10];
        this.leftLeftToe.translation = [0, -1, 0]; // Base position, edit X/Y/Z untuk pindah jari kiri
        this.leftLeftToe.rotation[0] = 0;
        this.leftLeftToe.rotation[1] = -1;
        this.leftLeftToe.rotation[2] = -0.3;

        // Left right toe - EDITABLE TRANSLATION
        this.leftRightToe = new BodyPart(this.leftRightToeBuffers, mainYellow, null, this.leftAnkle, 0);
        this.leftRightToe.scale = [10, 7, 10];
        this.leftRightToe.translation = [0, -1, 0]; // Base position, edit X/Y/Z untuk pindah jari kanan
        this.leftRightToe.rotation[0] = 0;
        this.leftRightToe.rotation[1] = -1;
        this.leftRightToe.rotation[2] = -0.3;

        // Right leg (mirror) - Direct connection from lowerBody (pants) to thigh (no hip sphere)
        this.rightThigh = new BodyPart(this.hyperboloidLegBuffers, mainYellow, null, this.lowerBody, 2);
        this.rightThigh.scale = [1, 0.5, 0.6]; // Same as left (updated to 1)
        this.rightThigh.translation = [0.4, -0.4, 0.29]; // Mirror X of left
        this.rightThigh.rotation[0] = 3; // X-axis: same as left (forward/backward tilt)
        this.rightThigh.rotation[1] = 0.5; // Y-axis: mirror of left (twist)
        this.rightThigh.rotation[2] = 1.6; // Z-axis: mirror of left (outward angle)

        // Right knee sphere (joint/pivot point)
        this.rightKnee = new BodyPart(this.sphereBuffers, paleMaroon, null, this.rightThigh, 0);
        this.rightKnee.scale = [0.4, 1, 0.5]; // Slightly bigger for visibility
        this.rightKnee.translation = [0, -1.6, 0]; // At bottom of thigh
        this.rightKnee.rotation[0] = 0;
        this.rightKnee.rotation[1] = 0;
        this.rightKnee.rotation[2] = 0;
        this.rightKnee.shininess = 32.0;   // Konsisten dengan shoulderPad
        this.rightKnee.metallic = 0.3;

        this.rightCalf = new BodyPart(this.hyperboloidLegBuffers, mainYellow, null, this.rightKnee, 2);
        this.rightCalf.scale = [0.7, 2, 1.3]; // Same as left calf
        this.rightCalf.translation = [0.5, 0.3, -1.5]; // Mirror X of left calf [-0.5, 0.3, -1.5]
        this.rightCalf.rotation[0] = 1; // X-axis: same as left (forward/backward bend)
        this.rightCalf.rotation[1] = 1.5; // Y-axis: mirror of left (-1.5 → 1.5)
        this.rightCalf.rotation[2] = 0.8; // Z-axis: same as left (outward/inward angle)

        this.rightAnkle = new BodyPart(this.sphereBuffers, darkBrown, null, this.rightCalf, 0);
        this.rightAnkle.scale = [0.18, 0.18, 0.18];
        this.rightAnkle.translation = [0, -0.7, 0];
        this.rightAnkle.shininess = 32.0;
        this.rightAnkle.metallic = 0.2;

        // Right Chicken Foot - SEPARATE TOES (individual translation control per toe)

        // Right ankle wrist (base)
        this.rightAnkleWrist = new BodyPart(this.rightAnkleWristBuffers, mainYellow, null, this.rightAnkle, 0);
        this.rightAnkleWrist.scale = [10, 7, 10];
        this.rightAnkleWrist.translation = [0, -1, 0];
        this.rightAnkleWrist.rotation[0] = 0;
        this.rightAnkleWrist.rotation[1] = 1;
        this.rightAnkleWrist.rotation[2] = 0.3;

        // Right center toe - EDITABLE TRANSLATION
        this.rightCenterToe = new BodyPart(this.rightCenterToeBuffers, mainYellow, null, this.rightAnkle, 0);
        this.rightCenterToe.scale = [10, 7, 10];
        this.rightCenterToe.translation = [-0.1, -0.18, 0]; // Base position, edit X/Y/Z untuk pindah jari tengah
        this.rightCenterToe.rotation[0] = 0;
        this.rightCenterToe.rotation[1] = 1;
        this.rightCenterToe.rotation[2] = 0.3;

        // Right left toe - EDITABLE TRANSLATION
        this.rightLeftToe = new BodyPart(this.rightLeftToeBuffers, mainYellow, null, this.rightAnkle, 0);
        this.rightLeftToe.scale = [10, 7, 10];
        this.rightLeftToe.translation = [0, -1, 0]; // Base position, edit X/Y/Z untuk pindah jari kiri
        this.rightLeftToe.rotation[0] = 0;
        this.rightLeftToe.rotation[1] = 1;
        this.rightLeftToe.rotation[2] = 0.3;

        // Right right toe - EDITABLE TRANSLATION
        this.rightRightToe = new BodyPart(this.rightRightToeBuffers, mainYellow, null, this.rightAnkle, 0);
        this.rightRightToe.scale = [10, 7, 10];
        this.rightRightToe.translation = [0, -1, 0]; // Base position, edit X/Y/Z untuk pindah jari kanan
        this.rightRightToe.rotation[0] = 0;
        this.rightRightToe.rotation[1] = 1;
        this.rightRightToe.rotation[2] = 0.3;

        // TAIL - CONTINUOUS CURVED TAIL with MANY SMALL SEGMENTS
        // Banyak segment kecil tersambung rapat = terlihat seperti 1 tabung continuous yang bengkok
        const TAIL_SEGMENTS = 20; // Banyak segment untuk smooth continuous curve
        this.tailSegments = [];

        for (let i = 0; i < TAIL_SEGMENTS; i++) {
            const segment = new BodyPart(this.cylinderBuffers, mainYellow, null, this.body, 2);

            // Taper (mengecil ke ujung) untuk natural look
            const taper = 1.0 - (i / TAIL_SEGMENTS) * 0.5; // Start thick, end 50% thinner
            const thickness = 0.13 * taper;
            const segmentLength = 0.12; // Small segments untuk smooth curve

            segment.scale = [thickness, segmentLength, thickness];
            segment.translation = [0, -0.9 - i * 0.1, -0.5]; // Will be overridden by Bezier

            this.tailSegments.push(segment);
        }

        // Tail tip at the end
        this.tailTip = new BodyPart(this.sphereBuffers, mainYellow, null, this.body, 0);
        this.tailTip.scale = [0.07, 0.07, 0.07];
        this.tailTip.translation = [0, -3.0, -0.5]; // Will be overridden

        // Decorative end ball
        this.tailEnd = new BodyPart(this.sphereBuffers, darkBrown, null, this.body, 0);
        this.tailEnd.scale = [0.15, 0.15, 0.15];
        this.tailEnd.translation = [0, -3.1, -0.5]; // Will be overridden
        this.tailEnd.shininess = 32.0;
        this.tailEnd.metallic = 0.2;
    }

    setupCamera() {
        this.camera = {
            distance: 6,  // Closer camera for larger model
            rotationX: 0.2,
            rotationY: 0.3,
            targetRotationY: 0.3,
            autoRotate: false  // ← MATIKAN auto-rotate agar Alakazam DIAM
        };
    }

    setupControls() {
        // DISABLED - Biarkan Abra yang handle semua controls
        // Alakazam tidak perlu event listeners sendiri karena share GL context dengan Abra

        /* DISABLED - Camera controls now handled by Abra
        const canvas = this.gl.canvas;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            this.camera.autoRotate = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;

                this.camera.targetRotationY += deltaX * 0.01;
                this.camera.rotationX += deltaY * 0.01;
                this.camera.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotationX));

                lastX = e.clientX;
                lastY = e.clientY;
            }
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camera.distance += e.deltaY * 0.01;
            this.camera.distance = Math.max(3, Math.min(15, this.camera.distance));
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.animationMode = (this.animationMode + 1) % 3;
                e.preventDefault();
            }
        });

        window.addEventListener('resize', () => {
            const canvas = this.gl.canvas;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            this.gl.viewport(0, 0, canvas.width, canvas.height);
        });
        */
    }

    animate() {
        this.time += 0.016;

        // Auto-rotate camera
        if (this.camera.autoRotate) {
            this.camera.targetRotationY += 0.003;
        }

        // Smooth camera
        this.camera.rotationY += (this.camera.targetRotationY - this.camera.rotationY) * 0.1;

        // ========== FITUR PARAMETRIK: CURVED TAIL dengan ARBITRARY AXIS ROTATION ==========
        // Bezier curve untuk tail path dengan 4 control points - ANIMATED WAVY S-CURVE

        // ANIMATED Control points - bergerak untuk membuat wave motion
        const wavePhase1 = Math.sin(this.time * 2.0) * 0.8;        // Fast wave untuk control point 1
        const wavePhase2 = Math.sin(this.time * 2.0 + Math.PI) * 0.8; // Opposite phase untuk S-shape
        const wavePhase3 = Math.sin(this.time * 2.5) * 0.3;        // Slower wave untuk depth

        const p0 = { x: 0, y: 0, z: 0 };                           // Base (fixed)
        const p1 = {
            x: wavePhase1,                    // Oscillates left-right
            y: -0.6,
            z: -0.3 + Math.sin(this.time * 1.5) * 0.2  // Depth wave
        };
        const p2 = {
            x: wavePhase2,                    // Oscillates right-left (opposite)
            y: -1.2,
            z: -0.4 + Math.cos(this.time * 1.5) * 0.2  // Depth wave
        };
        const p3 = {
            x: Math.sin(this.time * 2.0 + Math.PI * 1.5) * 0.4,  // End oscillates
            y: -2.0,
            z: -0.2 + wavePhase3             // Depth wave
        };

        // Cubic Bezier curve formula: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
        const bezierPoint = (t, p0, p1, p2, p3) => {
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;

            return {
                x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
                y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
                z: uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z
            };
        };

        // Tangent vector calculation (derivative of Bezier curve) untuk arbitrary axis
        const bezierTangent = (t, p0, p1, p2, p3) => {
            const u = 1 - t;
            const uu = u * u;
            const tt = t * t;

            return {
                x: -3 * uu * p0.x + 3 * uu * p1.x - 6 * u * t * p1.x + 6 * u * t * p2.x - 3 * tt * p2.x + 3 * tt * p3.x,
                y: -3 * uu * p0.y + 3 * uu * p1.y - 6 * u * t * p1.y + 6 * u * t * p2.y - 3 * tt * p2.y + 3 * tt * p3.y,
                z: -3 * uu * p0.z + 3 * uu * p1.z - 6 * u * t * p1.z + 6 * u * t * p2.z - 3 * tt * p2.z + 3 * tt * p3.z
            };
        };

        // Apply Bezier curve to ALL tail segments (20 segments for continuous curve)
        this.tailSegments.forEach((segment, index) => {
            // Calculate t parameter for this segment (0 to 1 along curve)
            const t = index / (this.tailSegments.length - 1);

            // Calculate ABSOLUTE position on Bezier curve
            const position = bezierPoint(t, p0, p1, p2, p3);

            // Set absolute translation (all segments are siblings of body)
            segment.translation = [
                position.x,
                position.y - 0.9,  // Offset from body center
                position.z - 0.2
            ];

            // Calculate tangent at this point (for direction and arbitrary axis rotation)
            const tangent = bezierTangent(t, p0, p1, p2, p3);
            const tangentLength = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y + tangent.z * tangent.z);

            if (tangentLength > 0.001) {
                // Normalize tangent
                const normalizedTangent = {
                    x: tangent.x / tangentLength,
                    y: tangent.y / tangentLength,
                    z: tangent.z / tangentLength
                };

                // Calculate rotation to align with tangent direction
                // Align Y-axis of segment with tangent vector
                const angleY = Math.atan2(normalizedTangent.x, normalizedTangent.y);
                const angleX = Math.asin(-normalizedTangent.z);

                segment.rotation[0] = angleX;
                segment.rotation[1] = angleY;

                // Arbitrary axis for sway animation
                // Perpendicular axis untuk twist/roll animation
                const arbitraryAxis = [
                    normalizedTangent.y,  // Perpendicular to tangent
                    -normalizedTangent.x,
                    0
                ];

                // Sway animation angle (wave propagates along tail)
                const swayAngle = Math.sin(this.time * 2.0 + index * 0.3) * 0.1;

                // Apply arbitrary axis rotation for twist/sway
                segment.arbitraryAxis = arbitraryAxis;
                segment.arbitraryAngle = swayAngle;
            }
        });

        // Position tail tip at end of curve
        const tipPosition = bezierPoint(1.0, p0, p1, p2, p3);
        this.tailTip.translation = [tipPosition.x, tipPosition.y - 0.9, tipPosition.z - 0.2];

        // Position tail end ball slightly beyond tip
        this.tailEnd.translation = [tipPosition.x, tipPosition.y - 1.0, tipPosition.z - 0.2];
        // ===================================================================================

        // Animation modes
        if (this.animationMode === 0) {
            // Idle: gentle floating and breathing
            this.root.translation[1] = this.BASE_Y_OFFSET + Math.sin(this.time * 1.5) * 0.05; // ← Kurangi dari 0.15 ke 0.05

            // Breathing (with evolution boost)
            const evolutionCycleBody = this.time % 15.0; // Sinkron dengan arm cycle (15 detik)
            const isEvolutionBody = evolutionCycleBody < 7.0;

            let breathe;
            if (isEvolutionBody) {
                // EVOLUTION: Larger breathing pulse (sangat lambat)
                breathe = Math.sin(this.time * 1.5) * 0.08 + 1.0; // Bigger pulse, very slow
            } else {
                // NORMAL: Gentle breathing
                breathe = Math.sin(this.time * 2) * 0.03 + 1.0;
            }
            this.body.scale[0] = breathe;
            this.body.scale[2] = breathe;

            // Gentle head movement
            this.head.rotation[1] = Math.sin(this.time * 0.8) * 0.1;
            this.head.rotation[0] = Math.sin(this.time * 1.2) * 0.05;

            // Tail sway animation now handled by Bezier curve above (line 962-1030)

            // Ear animation disabled - rotations set in constructor only

            // Wavy mustache subtle movement (maintain downward tilt)
            this.leftMustache.rotation[0] = 0.4 + Math.sin(this.time * 1.5) * 0.02; // Maintain tilt
            this.leftMustache.rotation[2] = 0.3 + Math.sin(this.time * 3) * 0.04;
            this.leftMustache.rotation[1] = 0.2 + Math.sin(this.time * 2) * 0.03;
            this.rightMustache.rotation[0] = 0.4 + Math.sin(this.time * 1.5) * 0.02; // Maintain tilt
            this.rightMustache.rotation[2] = -0.3 - Math.sin(this.time * 3) * 0.04;

            // Center flame mustache - gentle sway like flame flickering
            this.centerMustache.rotation[0] = Math.sin(this.time * 2) * 0.05; // Subtle forward/back sway
            this.centerMustache.rotation[2] = Math.sin(this.time * 2.5 + 1) * 0.06; // Side-to-side flicker
            this.rightMustache.rotation[1] = -0.2 - Math.sin(this.time * 2) * 0.03;

            // ARMS - Gentle breathing movement dengan evolution animation
            // Check if evolution animation should trigger
            const evolutionCycle = this.time % 15.0; // 0-15 seconds cycle
            const isEvolution = evolutionCycle < 7.0; // Evolution happens in first 7 seconds (3s naik + 4s turun)

            let armMovement;
            let forwardMovement;

            if (isEvolution) {
                // EVOLUTION MODE: Arms raise upward dramatically (VERY SLOW)
                // FASE 1 (0-3 detik): Shoulder naik ke atas
                // FASE 2 (3-7 detik): Elbow turun (straighten)

                const phase1Progress = Math.min(evolutionCycle / 3.0, 1.0); // 0-3 detik (fase 1: shoulder naik)
                const phase1Ease = Math.sin(phase1Progress * Math.PI); // Smooth shoulder raise

                armMovement = -phase1Ease * 0.6; // NEGATIVE = raise up (fase 1: shoulder naik)
                forwardMovement = -Math.sin(this.time * 0.8) * 0.3; // Backward lean (lebih lambat lagi)

                // Add gentle pulsing effect during evolution
                const pulse = Math.sin(this.time * 2.0) * 0.05; // Lebih subtle dan lambat
                armMovement += pulse;
            } else {
                // NORMAL IDLE: Gentle breathing
                armMovement = Math.sin(this.time * 1.2) * 0.15; // Slow breathing rhythm
                forwardMovement = Math.sin(this.time * 1.0) * 0.08; // Slight forward/back
            }

            // Left shoulder joint - controls entire left arm hierarchy
            this.leftShoulderJoint.rotation[2] = armMovement; // Z-axis: negative=up, positive=down
            this.leftShoulderJoint.rotation[0] = forwardMovement; // X-axis: forward/back

            // Right shoulder joint - controls entire right arm hierarchy (mirror)
            this.rightShoulderJoint.rotation[2] = -armMovement; // Z-axis: mirror untuk symmetry
            this.rightShoulderJoint.rotation[0] = forwardMovement; // X-axis: forward/back

            // ELBOW JOINTS - Tambahan animasi straighten saat evolution (HANYA elbow & hierarki di bawahnya)
            if (isEvolution) {
                // FASE 2 (3-7 detik): Elbow turun SETELAH shoulder mencapai puncak
                // Mulai dari detik 3.0, durasi 4 detik
                if (evolutionCycle >= 3.0) {
                    const phase2Progress = (evolutionCycle - 3.0) / 4.0; // 0 to 1 (detik 3-7, durasi 4 detik)
                    const phase2Ease = Math.sin(phase2Progress * Math.PI); // Smooth elbow straighten

                    // POSITIF = elbow turun (berlawanan dari shoulder yang naik)
                    this.leftElbowJoint.rotation[0] = phase2Ease * 0.8; // Elbow turun
                    this.rightElbowJoint.rotation[0] = phase2Ease * 0.8; // Elbow turun
                } else {
                    // FASE 1 (0-3 detik): Elbow masih natural (belum bergerak)
                    this.leftElbowJoint.rotation[0] = 0;
                    this.rightElbowJoint.rotation[0] = 0;
                }
            } else {
                // NORMAL IDLE: Elbow bouncy animation (subtle breathing/floating effect)
                const elbowBounce = Math.sin(this.time * 1.8) * 0.12; // Gentle bounce
                const elbowFloat = Math.sin(this.time * 2.3 + 0.5) * 0.08; // Secondary floating motion

                this.leftElbowJoint.rotation[0] = elbowBounce + elbowFloat; // Combined bouncy motion
                this.rightElbowJoint.rotation[0] = elbowBounce + elbowFloat; // Synchronized with left

                // Elbow visual decoration - subtle scale bounce for organic feel
                const elbowScaleBounce = Math.sin(this.time * 2.2) * 0.8; // Subtle breathing scale (scaled for large base)
                this.leftElbow.scale = [
                    23 + elbowScaleBounce,
                    28 + elbowScaleBounce * 1.2, // Slightly more Y bounce
                    23 + elbowScaleBounce
                ];
                this.rightElbow.scale = [
                    23 + elbowScaleBounce,
                    28 + elbowScaleBounce * 1.2,
                    23 + elbowScaleBounce
                ];
            }

            // THIGH - Bouncy animation (UP/DOWN translation only, no rotation)
            if (!isEvolution) {
                const thighBounceY = Math.sin(this.time * 1.5) * 0.08;
                const thighFloatY = Math.sin(this.time * 2.0 + 0.3) * 0.04;
                this.leftThigh.translation[1] = -0.4 + thighBounceY + thighFloatY;
                this.rightThigh.translation[1] = -0.4 + thighBounceY + thighFloatY;
            } else {
                this.leftThigh.translation[1] = -0.4;
                this.rightThigh.translation[1] = -0.4;
            }

            // SHOULDER PADS - Bouncy fabric animation (kain yang mengikuti gerakan)
            const shoulderBounce = Math.sin(this.time * 3) * 0.05; // Bouncy scale
            const shoulderSway = Math.sin(this.time * 2.5) * 0.08; // Sway rotation

            // Left shoulder pad - bouncy like fabric
            this.leftShoulderPad.scale[1] = 2.2 + shoulderBounce; // Y-axis bounce
            this.leftShoulderPad.rotation[0] = shoulderSway * 2; // Slight forward/back sway

            // Right shoulder pad - bouncy like fabric (dengan phase berbeda)
            this.rightShoulderPad.scale[1] = 2.2 + shoulderBounce;
            this.rightShoulderPad.rotation[0] = shoulderSway * 2; 

            // MEGA ALAKAZAM - Floating spoons dengan evolution transformation (1→3→5)
            if (isEvolution) {
                // EVOLUTION MODE: Spoons transform dari 1 → 3 → 5
                // FASE 1 (0-2.5 detik): Hanya 1 spoon (spoon1 di tengah kepala)
                // FASE 2 (2.5-5 detik): 1 → 3 spoons (spoon1, 2, 3 muncul dan bergeser)
                // FASE 3 (5-7 detik): 3 → 5 spoons (semua 5 spoons muncul dan bergeser)

                if (evolutionCycle < 2.5) {
                    // FASE 1: Hanya spoon 1 (di tengah kepala, tetap)
                    this.floatingSpoon1.scale = [1.0, 1.0, 1.0]; // Visible
                    this.floatingSpoon1.translation = [0, 2.0, 0]; // Tengah kepala
                    this.floatingSpoon1.rotation[1] = 0;

                    // Spoon 2-5 invisible (scale = 0)
                    this.floatingSpoon2.scale = [0, 0, 0];
                    this.floatingSpoon3.scale = [0, 0, 0];
                    this.floatingSpoon4.scale = [0, 0, 0];
                    this.floatingSpoon5.scale = [0, 0, 0];

                } else if (evolutionCycle < 5.0) {
                    // FASE 2: 1 → 3 spoons (spoon 2, 3 FADE IN dari spoon 1 lalu bergeser)
                    const phase2Progress = (evolutionCycle - 2.5) / 2.5; // 0 to 1
                    const phase2Ease = phase2Progress; // Linear movement

                    // Spoon 1 tetap di posisi tengah kepala
                    this.floatingSpoon1.scale = [1.0, 1.0, 1.0];
                    this.floatingSpoon1.translation = [0, 2.0, 0]; // Tetap di tengah
                    this.floatingSpoon1.rotation[1] = 0;

                    // Spoon 2 FADE IN (grow dari spoon 1) dengan BOUNDARY lalu bergeser ke kiri
                    const spoon2FadeIn = Math.min(phase2Ease * 2, 1.0); // Fade in di 50% pertama
                    this.floatingSpoon2.scale = [spoon2FadeIn, spoon2FadeIn, spoon2FadeIn]; // Grow from 0 to 1

                    const spoon2StartX = -0.3; // Mulai dengan boundary (tidak di tengah, tapi sudah ada jarak)
                    const spoon2StartY = 2.0;
                    const spoon2EndX = -0.8; // Target akhir (kiri)
                    const spoon2EndY = 1.5;
                    this.floatingSpoon2.translation = [
                        spoon2StartX + (spoon2EndX - spoon2StartX) * phase2Ease,
                        spoon2StartY + (spoon2EndY - spoon2StartY) * phase2Ease,
                        this.floatingSpoon2.translation[2]
                    ];
                    this.floatingSpoon2.rotation[1] = 0.5 * phase2Ease;

                    // Spoon 3 FADE IN (grow dari spoon 1) dengan BOUNDARY lalu bergeser ke kanan
                    const spoon3FadeIn = Math.min(phase2Ease * 2, 1.0); // Fade in di 50% pertama
                    this.floatingSpoon3.scale = [spoon3FadeIn, spoon3FadeIn, spoon3FadeIn]; // Grow from 0 to 1

                    const spoon3StartX = 0.3; // Mulai dengan boundary (tidak di tengah, tapi sudah ada jarak)
                    const spoon3StartY = 2.0;
                    const spoon3EndX = 0.8; // Target akhir (kanan)
                    const spoon3EndY = 1.5;
                    this.floatingSpoon3.translation = [
                        spoon3StartX + (spoon3EndX - spoon3StartX) * phase2Ease,
                        spoon3StartY + (spoon3EndY - spoon3StartY) * phase2Ease,
                        this.floatingSpoon3.translation[2]
                    ];
                    this.floatingSpoon3.rotation[1] = -0.5 * phase2Ease;

                    // Spoon 4-5 masih invisible
                    this.floatingSpoon4.scale = [0, 0, 0];
                    this.floatingSpoon5.scale = [0, 0, 0];

                } else {
                    // FASE 3: 3 → 5 spoons (spoon 4, 5 muncul DARI spoon 2 & 3 lalu bergeser)
                    const phase3Progress = (evolutionCycle - 5.0) / 2.0; // 0 to 1
                    const phase3Ease = phase3Progress; // Linear movement

                    // Spoon 1 tetap di tengah
                    this.floatingSpoon1.scale = [1.0, 1.0, 1.0];
                    this.floatingSpoon1.translation = [0, 2.0, 0];
                    this.floatingSpoon1.rotation[1] = 0;

                    // Spoon 2 tetap di posisi kiri
                    this.floatingSpoon2.scale = [1.0, 1.0, 1.0];
                    this.floatingSpoon2.translation = [-0.8, 1.5, this.floatingSpoon2.translation[2]];
                    this.floatingSpoon2.rotation[1] = 0.5;

                    // Spoon 3 tetap di posisi kanan
                    this.floatingSpoon3.scale = [1.0, 1.0, 1.0];
                    this.floatingSpoon3.translation = [0.8, 1.5, this.floatingSpoon3.translation[2]];
                    this.floatingSpoon3.rotation[1] = -0.5;

                    // Spoon 4 FADE IN (grow dari spoon 2) dengan BOUNDARY lalu bergeser ke kiri-depan
                    const spoon4FadeIn = Math.min(phase3Ease * 2, 1.0); // Fade in di 50% pertama
                    this.floatingSpoon4.scale = [spoon4FadeIn, spoon4FadeIn, spoon4FadeIn]; // Grow from 0 to 1

                    const spoon4StartX = -1.0; // Mulai dengan boundary dari spoon 2 (-0.8 - 0.2)
                    const spoon4StartY = 1.5;
                    const spoon4StartZ = this.floatingSpoon2.translation[2];
                    const spoon4EndX = -1.2; // Lebih ke kiri
                    const spoon4EndY = 1.5;
                    const spoon4EndZ = 0.5; // Ke depan
                    this.floatingSpoon4.translation = [
                        spoon4StartX + (spoon4EndX - spoon4StartX) * phase3Ease,
                        spoon4StartY + (spoon4EndY - spoon4StartY) * phase3Ease,
                        spoon4StartZ + (spoon4EndZ - spoon4StartZ) * phase3Ease
                    ];
                    this.floatingSpoon4.rotation[1] = 0.5 + 0.3 * phase3Ease;

                    // Spoon 5 FADE IN (grow dari spoon 3) dengan BOUNDARY lalu bergeser ke kanan-depan
                    const spoon5FadeIn = Math.min(phase3Ease * 2, 1.0); // Fade in di 50% pertama
                    this.floatingSpoon5.scale = [spoon5FadeIn, spoon5FadeIn, spoon5FadeIn]; // Grow from 0 to 1

                    const spoon5StartX = 1.0; // Mulai dengan boundary dari spoon 3 (0.8 + 0.2)
                    const spoon5StartY = 1.5;
                    const spoon5StartZ = this.floatingSpoon3.translation[2];
                    const spoon5EndX = 1.2; // Lebih ke kanan
                    const spoon5EndY = 1.5;
                    const spoon5EndZ = 0.5; // Ke depan
                    this.floatingSpoon5.translation = [
                        spoon5StartX + (spoon5EndX - spoon5StartX) * phase3Ease,
                        spoon5StartY + (spoon5EndY - spoon5StartY) * phase3Ease,
                        spoon5StartZ + (spoon5EndZ - spoon5StartZ) * phase3Ease
                    ];
                    this.floatingSpoon5.rotation[1] = -0.5 - 0.3 * phase3Ease;
                }

            } else {
                // NORMAL IDLE: Semua 5 spoons orbit dengan gentle bob
                const orbitSpeed = this.time * 0.5; // Slow orbit
                const floatBob = Math.sin(this.time * 2) * 0.1; // Gentle up/down bob

                // Smooth transition dari evolution ke idle (2 detik setelah evolution selesai)
                const timeSinceEvolutionEnd = evolutionCycle - 7.0; // 7 detik adalah akhir evolution
                const transitionProgress = Math.min(Math.max(timeSinceEvolutionEnd / 2.0, 0.0), 1.0); // Smooth lerp over 2 seconds

                // Target idle positions (dari constructor)
                const spoonDistance = 1.8; // Wider gap like anime Alakazam
                const spoonHeight = 1.5;
                const idlePositions = {
                    spoon1: [0, spoonHeight, -spoonDistance * 0.8],
                    spoon2: [-spoonDistance * 0.7, spoonHeight, -spoonDistance * 0.5],
                    spoon3: [spoonDistance * 0.7, spoonHeight, -spoonDistance * 0.5],
                    spoon4: [-spoonDistance, spoonHeight, spoonDistance * 0.3],
                    spoon5: [spoonDistance, spoonHeight, spoonDistance * 0.3]
                };

                // Evolution end positions (posisi terakhir saat evolution selesai)
                const evolutionEndPositions = {
                    spoon1: [0, 2.0, this.floatingSpoon1.translation[2]],
                    spoon2: [-0.8, 1.5, this.floatingSpoon2.translation[2]],
                    spoon3: [0.8, 1.5, this.floatingSpoon3.translation[2]],
                    spoon4: [-1.2, 1.5, 0.5],
                    spoon5: [1.2, 1.5, 0.5]
                };

                // Lerp helper function
                const lerp = (start, end, t) => start + (end - start) * t;

                // Each spoon rotates slightly and bobs dengan smooth transition
                this.floatingSpoon1.scale = [1.0, 1.0, 1.0];
                this.floatingSpoon1.rotation[1] = orbitSpeed;
                if (transitionProgress < 1.0) {
                    // Transitioning: lerp from evolution end to idle
                    this.floatingSpoon1.translation[0] = lerp(evolutionEndPositions.spoon1[0], idlePositions.spoon1[0], transitionProgress);
                    this.floatingSpoon1.translation[1] = lerp(evolutionEndPositions.spoon1[1], idlePositions.spoon1[1] + floatBob, transitionProgress);
                    this.floatingSpoon1.translation[2] = lerp(evolutionEndPositions.spoon1[2], idlePositions.spoon1[2], transitionProgress);
                } else {
                    // Fully in idle mode
                    this.floatingSpoon1.translation = [idlePositions.spoon1[0], idlePositions.spoon1[1] + floatBob, idlePositions.spoon1[2]];
                }

                this.floatingSpoon2.scale = [1.0, 1.0, 1.0];
                this.floatingSpoon2.rotation[1] = orbitSpeed + 0.5;
                if (transitionProgress < 1.0) {
                    this.floatingSpoon2.translation[0] = lerp(evolutionEndPositions.spoon2[0], idlePositions.spoon2[0], transitionProgress);
                    this.floatingSpoon2.translation[1] = lerp(evolutionEndPositions.spoon2[1], idlePositions.spoon2[1] + Math.sin(this.time * 2 + 1) * 0.1, transitionProgress);
                    this.floatingSpoon2.translation[2] = lerp(evolutionEndPositions.spoon2[2], idlePositions.spoon2[2], transitionProgress);
                } else {
                    this.floatingSpoon2.translation = [idlePositions.spoon2[0], idlePositions.spoon2[1] + Math.sin(this.time * 2 + 1) * 0.1, idlePositions.spoon2[2]];
                }

                this.floatingSpoon3.scale = [1.0, 1.0, 1.0];
                this.floatingSpoon3.rotation[1] = orbitSpeed - 0.5;
                if (transitionProgress < 1.0) {
                    this.floatingSpoon3.translation[0] = lerp(evolutionEndPositions.spoon3[0], idlePositions.spoon3[0], transitionProgress);
                    this.floatingSpoon3.translation[1] = lerp(evolutionEndPositions.spoon3[1], idlePositions.spoon3[1] + Math.sin(this.time * 2 + 2) * 0.1, transitionProgress);
                    this.floatingSpoon3.translation[2] = lerp(evolutionEndPositions.spoon3[2], idlePositions.spoon3[2], transitionProgress);
                } else {
                    this.floatingSpoon3.translation = [idlePositions.spoon3[0], idlePositions.spoon3[1] + Math.sin(this.time * 2 + 2) * 0.1, idlePositions.spoon3[2]];
                }

                this.floatingSpoon4.scale = [1.0, 1.0, 1.0];
                this.floatingSpoon4.rotation[1] = orbitSpeed + 0.8;
                if (transitionProgress < 1.0) {
                    this.floatingSpoon4.translation[0] = lerp(evolutionEndPositions.spoon4[0], idlePositions.spoon4[0], transitionProgress);
                    this.floatingSpoon4.translation[1] = lerp(evolutionEndPositions.spoon4[1], idlePositions.spoon4[1] + Math.sin(this.time * 2 + 3) * 0.1, transitionProgress);
                    this.floatingSpoon4.translation[2] = lerp(evolutionEndPositions.spoon4[2], idlePositions.spoon4[2], transitionProgress);
                } else {
                    this.floatingSpoon4.translation = [idlePositions.spoon4[0], idlePositions.spoon4[1] + Math.sin(this.time * 2 + 3) * 0.1, idlePositions.spoon4[2]];
                }

                this.floatingSpoon5.scale = [1.0, 1.0, 1.0];
                this.floatingSpoon5.rotation[1] = orbitSpeed - 0.8;
                if (transitionProgress < 1.0) {
                    this.floatingSpoon5.translation[0] = lerp(evolutionEndPositions.spoon5[0], idlePositions.spoon5[0], transitionProgress);
                    this.floatingSpoon5.translation[1] = lerp(evolutionEndPositions.spoon5[1], idlePositions.spoon5[1] + Math.sin(this.time * 2 + 4) * 0.1, transitionProgress);
                    this.floatingSpoon5.translation[2] = lerp(evolutionEndPositions.spoon5[2], idlePositions.spoon5[2], transitionProgress);
                } else {
                    this.floatingSpoon5.translation = [idlePositions.spoon5[0], idlePositions.spoon5[1] + Math.sin(this.time * 2 + 4) * 0.1, idlePositions.spoon5[2]];
                }
            }

        } else if (this.animationMode === 1) {
            // Psychic pose: arms raised, spoons crossed
            this.root.translation[1] = this.BASE_Y_OFFSET + Math.sin(this.time * 2) * 0.3 + 0.5;

            // Arms raised up
            // Animasi shoulder joint (pivot), pad akan ikut
            this.leftShoulderJoint.rotation[0] = -Math.PI / 3;
            this.leftShoulderJoint.rotation[2] = 0.4;
            this.rightShoulderJoint.rotation[0] = -Math.PI / 3;
            this.rightShoulderJoint.rotation[2] = -0.4;

            // SHOULDER PADS - Energetic bouncy animation (psychic power effect)
            const energyBounce = Math.sin(this.time * 5) * 0.08; // Faster bounce untuk psychic mode
            const energySway = Math.sin(this.time * 4) * 0.15; // Stronger sway

            this.leftShoulderPad.scale[1] = 2.2 + energyBounce;
            this.leftShoulderPad.rotation[0] = energySway * 0.6;

            this.rightShoulderPad.scale[1] = 2.2 + Math.sin(this.time * 5 + 0.5) * 0.08;
            this.rightShoulderPad.rotation[0] = Math.sin(this.time * 4 + 0.5) * 0.15 * 0.6;

            // Elbows bent
            this.leftElbowJoint.rotation[0] = -0.6;
            this.rightElbowJoint.rotation[0] = -0.6;

            // Head tilted back
            this.head.rotation[0] = -0.2 + Math.sin(this.time * 3) * 0.05;

            // Intense tail movement (with new segment)
            this.tailBase.rotation[0] = 0.6 + Math.sin(this.time * 3) * 0.3;
            this.tailMid1.rotation[0] = Math.sin(this.time * 3.5) * 0.25;
            this.tailMid2.rotation[0] = Math.sin(this.time * 4) * 0.2;
            this.tailMid3.rotation[0] = Math.sin(this.time * 4.5) * 0.15;

        } else if (this.animationMode === 2) {
            // Meditation: cross-legged, spoons in front
            this.root.translation[1] = this.BASE_Y_OFFSET + -1.5 + Math.sin(this.time * 1) * 0.08;

            // Legs folded - using thigh rotation now (no hip)
            this.leftThigh.rotation[0] = Math.PI / 2;
            this.leftThigh.rotation[2] = -0.5;
            this.rightThigh.rotation[0] = Math.PI / 2;
            this.rightThigh.rotation[2] = 0.5;

            this.leftKnee.rotation[0] = -Math.PI / 2.5;
            this.rightKnee.rotation[0] = -Math.PI / 2.5;

            // Arms in meditation pose
            // Animasi shoulder joint (pivot), pad akan ikut
            this.leftShoulderJoint.rotation[0] = -0.3;
            this.leftShoulderJoint.rotation[2] = 0.6;
            this.rightShoulderJoint.rotation[0] = -0.3;
            this.rightShoulderJoint.rotation[2] = -0.6;

            // SHOULDER PADS - Calm breathing animation (meditation mode)
            const breathBounce = Math.sin(this.time * 1.5) * 0.03; // Slow, gentle bounce
            const breathSway = Math.sin(this.time * 1.2) * 0.05; // Very subtle sway

            this.leftShoulderPad.scale[1] = 2.2 + breathBounce;
            this.leftShoulderPad.rotation[0] = breathSway * 0.4;

            this.rightShoulderPad.scale[1] = 2.2 + Math.sin(this.time * 1.5 + 0.5) * 0.03;
            this.rightShoulderPad.rotation[0] = Math.sin(this.time * 1.2 + 0.5) * 0.05 * 0.4;

            this.leftElbowJoint.rotation[0] = -1.2;
            this.rightElbowJoint.rotation[0] = -1.2;

            // Head peaceful
            this.head.rotation[0] = -0.15;

            // Tail relaxed (with new segment)
            this.tailBase.rotation[0] = 0.8;
            this.tailMid1.rotation[0] = 0.1;
            this.tailMid2.rotation[0] = 0.05;
            this.tailMid3.rotation[0] = 0.03;
        }
    }

    drawBodyPart(part, viewMatrix) {
        if (!part.geometry) return;

        const gl = this.gl;
        const programInfo = this.programInfo;

        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, part.geometry.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        // Bind normal buffer
        if (!part.geometry.normal) {
            if (!window.noNormalBufferLogged) {
                console.error("❌ Part has NO normal buffer!");
                window.noNormalBufferLogged = true;
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, part.geometry.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

        // Bind texture coordinates if available
        if (part.geometry.texCoord) {
            gl.bindBuffer(gl.ARRAY_BUFFER, part.geometry.texCoord);
            gl.vertexAttribPointer(programInfo.attribLocations.texCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.texCoord);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.geometry.indices);

        // Calculate matrices
        const modelViewMatrix = mat4.create();
        mat4.multiply(modelViewMatrix, viewMatrix, part.worldMatrix);

        // Calculate normal matrix using simpler approach
        // Extract rotation and normalized scale from modelViewMatrix
        const m = modelViewMatrix;
        const normalMatrix = mat4.create();

        // Extract the 3x3 rotation/scale part
        const x0 = m[0], x1 = m[1], x2 = m[2];
        const y0 = m[4], y1 = m[5], y2 = m[6];
        const z0 = m[8], z1 = m[9], z2 = m[10];

        // Calculate scale factors (length of each column)
        let sx = Math.sqrt(x0*x0 + x1*x1 + x2*x2);
        let sy = Math.sqrt(y0*y0 + y1*y1 + y2*y2);
        let sz = Math.sqrt(z0*z0 + z1*z1 + z2*z2);

        // Clamp to minimum value to prevent division by zero
        const minScale = 0.001;
        if (sx < minScale) sx = minScale;
        if (sy < minScale) sy = minScale;
        if (sz < minScale) sz = minScale;

        // Normal matrix = normalized rotation (NO TRANSPOSE - try direct copy first)
        // Normalize each column to get pure rotation (division safe now)
        const nx0 = x0/sx, nx1 = x1/sx, nx2 = x2/sx;
        const ny0 = y0/sy, ny1 = y1/sy, ny2 = y2/sy;
        const nz0 = z0/sz, nz1 = z1/sz, nz2 = z2/sz;

        // Direct copy (NO TRANSPOSE) - column-major format
        // Column 0: indices [0, 1, 2, 3]
        normalMatrix[0] = nx0; normalMatrix[1] = nx1; normalMatrix[2] = nx2; normalMatrix[3] = 0;
        // Column 1: indices [4, 5, 6, 7]
        normalMatrix[4] = ny0; normalMatrix[5] = ny1; normalMatrix[6] = ny2; normalMatrix[7] = 0;
        // Column 2: indices [8, 9, 10, 11]
        normalMatrix[8] = nz0; normalMatrix[9] = nz1; normalMatrix[10] = nz2; normalMatrix[11] = 0;
        // Column 3: indices [12, 13, 14, 15]
        normalMatrix[12] = 0; normalMatrix[13] = 0; normalMatrix[14] = 0; normalMatrix[15] = 1;

        // Set uniforms
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
        gl.uniform3fv(programInfo.uniformLocations.color, part.color);
        gl.uniform3fv(programInfo.uniformLocations.secondaryColor, part.secondaryColor);
        gl.uniform1f(programInfo.uniformLocations.shininess, part.shininess);
        gl.uniform1f(programInfo.uniformLocations.metallic, part.metallic);
        gl.uniform1i(programInfo.uniformLocations.materialType, part.materialType);

        // Draw
        gl.drawElements(gl.TRIANGLES, part.geometry.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    drawHierarchy(part, viewMatrix) {
        if (part.geometry) {
            this.drawBodyPart(part, viewMatrix);
        }

        for (const child of part.children) {
            this.drawHierarchy(child, viewMatrix);
        }
    }

    render() {
        const gl = this.gl;

        // Ensure viewport matches canvas size
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Animate
        this.animate();

        // Update hierarchy
        this.root.updateLocalMatrix();
        this.root.updateWorldMatrix();

        for (const child of this.root.children) {
            child.updateLocalMatrix();
            child.updateWorldMatrix(this.root.worldMatrix);
            this.updateHierarchyMatrices(child);
        }

        // Clear
        gl.clearColor(0.05, 0.03, 0.15, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Use program
        gl.useProgram(this.program);

        // Projection matrix
        const projectionMatrix = mat4.create();
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        mat4.perspective(projectionMatrix, Math.PI / 4, aspect, 0.1, 100.0);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // View matrix
        const viewMatrix = mat4.create();
        mat4.translate(viewMatrix, viewMatrix, [0, -1, -this.camera.distance]);
        mat4.rotate(viewMatrix, viewMatrix, this.camera.rotationX, [1, 0, 0]);
        mat4.rotate(viewMatrix, viewMatrix, this.camera.rotationY, [0, 1, 0]);

        // Lighting - USE SAME AS ABRA (STATIC, NOT ROTATING)
        console.log("⚠️ Alakazam render() called (standalone mode) - using Abra's static lighting");
        gl.uniform3fv(this.programInfo.uniformLocations.lightPosition, [50.0, 100.0, 80.0]);
        gl.uniform3fv(this.programInfo.uniformLocations.lightColor, [1.0, 0.98, 0.95]);
        gl.uniform3fv(this.programInfo.uniformLocations.ambientLight, [0.55, 0.58, 0.62]);
        gl.uniform3fv(this.programInfo.uniformLocations.cameraPosition, [0.0, 0.0, this.camera.distance]);
        gl.uniform1f(this.programInfo.uniformLocations.shininess, 32.0);
        gl.uniform1f(this.programInfo.uniformLocations.specularStrength, 0.7);
        gl.uniform1f(this.programInfo.uniformLocations.time, this.time);

        // Draw
        this.drawHierarchy(this.root, viewMatrix);

        // Only auto-loop if autoRender is true
        if (this.autoRender) {
            requestAnimationFrame(() => this.render());
        }
    }

    // Manual render method (for integration with Abra's loop)
    // Parameters: deltaTime, skipClear, abraViewMatrix, abraProjectionMatrix, abraLightPosition, abraLightColor, abraAmbientLight, abraCameraPosition
    renderOnce(deltaTime = 0.016, skipClear = false, abraViewMatrix = null, abraProjectionMatrix = null, abraLightPosition = null, abraLightColor = null, abraAmbientLight = null, abraCameraPosition = null) {
        const gl = this.gl;

        // ========== SAVE ABRA'S GL STATE ==========
        const previousProgram = gl.getParameter(gl.CURRENT_PROGRAM);

        // Update time
        this.time += deltaTime;

        // Animate
        this.animate();

        // Update hierarchy
        this.root.updateLocalMatrix();
        this.root.updateWorldMatrix();

        for (const child of this.root.children) {
            child.updateLocalMatrix();
            child.updateWorldMatrix(this.root.worldMatrix);
            this.updateHierarchyMatrices(child);
        }

        // Only clear if not sharing canvas
        if (!skipClear) {
            gl.clearColor(0.05, 0.03, 0.15, 1.0);
            gl.clearDepth(1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }

        // Use Alakazam's shader program
        gl.useProgram(this.program);

        // Projection matrix - Use Abra's if provided, otherwise use own
        let projectionMatrix;
        if (abraProjectionMatrix) {
            projectionMatrix = abraProjectionMatrix;
        } else {
            projectionMatrix = mat4.create();
            const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
            mat4.perspective(projectionMatrix, Math.PI / 4, aspect, 0.1, 100.0);
        }
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // View matrix - Use Abra's camera if provided, otherwise use own
        let viewMatrix;
        if (abraViewMatrix) {
            // USE ABRA'S VIEW MATRIX - Alakazam akan ikut world, tidak ikut kamera
            viewMatrix = abraViewMatrix;
        } else {
            // Fallback: use own camera (independent mode)
            viewMatrix = mat4.create();
            mat4.translate(viewMatrix, viewMatrix, [0, -1, -this.camera.distance]);
            mat4.rotate(viewMatrix, viewMatrix, this.camera.rotationX, [1, 0, 0]);
            mat4.rotate(viewMatrix, viewMatrix, this.camera.rotationY, [0, 1, 0]);
        }

        // Lighting - MUST use Abra's lighting (no fallback to own lighting)
        if (abraLightPosition && abraLightColor && abraAmbientLight && abraCameraPosition) {
            // Debug: Log once to verify received values
            if (!window.alakazamLightDebugLogged) {
                console.log("✅ 🔮 Alakazam RECEIVED light data from Abra:");
                console.log("  Position:", abraLightPosition);
                console.log("  Color:", abraLightColor);
                console.log("  Ambient:", abraAmbientLight);
                console.log("  Camera:", abraCameraPosition);
                window.alakazamLightDebugLogged = true;
            }

            // Use Abra's global lighting (SAME AS ABRA)
            gl.uniform3fv(this.programInfo.uniformLocations.lightPosition, abraLightPosition);
            gl.uniform3fv(this.programInfo.uniformLocations.lightColor, abraLightColor);
            gl.uniform3fv(this.programInfo.uniformLocations.ambientLight, abraAmbientLight);
            gl.uniform3fv(this.programInfo.uniformLocations.cameraPosition, abraCameraPosition);
            gl.uniform1f(this.programInfo.uniformLocations.shininess, 32.0);
            gl.uniform1f(this.programInfo.uniformLocations.specularStrength, 0.7);
        } else {
            // ERROR: Light data not provided!
            console.error("❌ ERROR: Alakazam NOT receiving light data from Abra!");

            // Use Abra's default lighting values
            gl.uniform3fv(this.programInfo.uniformLocations.lightPosition, [50.0, 100.0, 80.0]);
            gl.uniform3fv(this.programInfo.uniformLocations.lightColor, [1.0, 0.98, 0.95]);
            gl.uniform3fv(this.programInfo.uniformLocations.ambientLight, [0.55, 0.58, 0.62]);
            gl.uniform3fv(this.programInfo.uniformLocations.cameraPosition, [0.0, 0.0, 10.0]);
            gl.uniform1f(this.programInfo.uniformLocations.shininess, 32.0);
            gl.uniform1f(this.programInfo.uniformLocations.specularStrength, 0.7);
        }
        gl.uniform1f(this.programInfo.uniformLocations.time, this.time);

        // Draw
        this.drawHierarchy(this.root, viewMatrix);

        // ========== RESTORE ABRA'S GL STATE ==========
        gl.useProgram(previousProgram);
    }

    updateHierarchyMatrices(part) {
        for (const child of part.children) {
            child.updateLocalMatrix();
            child.updateWorldMatrix(part.worldMatrix);
            this.updateHierarchyMatrices(child);
        }
    }
}

// Export to global scope - DON'T auto-start, will be initialized from Abra
window.AlakazamApp = AlakazamApp;

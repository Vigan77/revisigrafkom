var LIBS = {
    degToRad: function (angle) {
        return (angle * Math.PI / 180);
    },

    get_projection: function (angle, a, zMin, zMax) {
        var tan = Math.tan(LIBS.degToRad(0.5 * angle)),
            A = -(zMax + zMin) / (zMax - zMin),
            B = (-2 * zMax * zMin) / (zMax - zMin);

        return [
            0.5 / tan, 0, 0, 0,
            0, 0.5 * a / tan, 0, 0,
            0, 0, A, -1,
            0, 0, B, 0
        ];
    },

    get_I4: function () {
        return [1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1];
    },

    set_I4: function (m) {
        m[0] = 1, m[1] = 0, m[2] = 0, m[3] = 0,
            m[4] = 0, m[5] = 1, m[6] = 0, m[7] = 0,
            m[8] = 0, m[9] = 0, m[10] = 1, m[11] = 0,
            m[12] = 0, m[13] = 0, m[14] = 0, m[15] = 1;
    },

    copy_matrix: function (m) {
        return [
            m[0], m[1], m[2], m[3],
            m[4], m[5], m[6], m[7],
            m[8], m[9], m[10], m[11],
            m[12], m[13], m[14], m[15]
        ];
    },

    rotateX: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv1 = m[1], mv5 = m[5], mv9 = m[9];
        m[1] = m[1] * c - m[2] * s;
        m[5] = m[5] * c - m[6] * s;
        m[9] = m[9] * c - m[10] * s;

        m[2] = m[2] * c + mv1 * s;
        m[6] = m[6] * c + mv5 * s;
        m[10] = m[10] * c + mv9 * s;
    },

    rotateY: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv0 = m[0], mv4 = m[4], mv8 = m[8];
        m[0] = c * m[0] + s * m[2];
        m[4] = c * m[4] + s * m[6];
        m[8] = c * m[8] + s * m[10];

        m[2] = c * m[2] - s * mv0;
        m[6] = c * m[6] - s * mv4;
        m[10] = c * m[10] - s * mv8;
    },

    rotateZ: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv0 = m[0], mv4 = m[4], mv8 = m[8];
        m[0] = c * m[0] - s * m[1];
        m[4] = c * m[4] - s * m[5];
        m[8] = c * m[8] - s * m[9];

        m[1] = c * m[1] + s * mv0;
        m[5] = c * m[5] + s * mv4;
        m[9] = c * m[9] + s * mv8;
    },

    rotateArbitraryAxis: function (m, axis, angle) {
        // Normalize axis
        let len = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
        let x = axis[0] / len;
        let y = axis[1] / len;
        let z = axis[2] / len;

        let c = Math.cos(angle);
        let s = Math.sin(angle);
        let t = 1 - c;

        // Rotation matrix for arbitrary axis
        let r00 = t * x * x + c;
        let r01 = t * x * y - s * z;
        let r02 = t * x * z + s * y;

        let r10 = t * x * y + s * z;
        let r11 = t * y * y + c;
        let r12 = t * y * z - s * x;

        let r20 = t * x * z - s * y;
        let r21 = t * y * z + s * x;
        let r22 = t * z * z + c;

        // Apply rotation to matrix m
        let m0 = m[0], m1 = m[1], m2 = m[2];
        let m4 = m[4], m5 = m[5], m6 = m[6];
        let m8 = m[8], m9 = m[9], m10 = m[10];

        m[0] = r00 * m0 + r01 * m1 + r02 * m2;
        m[1] = r10 * m0 + r11 * m1 + r12 * m2;
        m[2] = r20 * m0 + r21 * m1 + r22 * m2;

        m[4] = r00 * m4 + r01 * m5 + r02 * m6;
        m[5] = r10 * m4 + r11 * m5 + r12 * m6;
        m[6] = r20 * m4 + r21 * m5 + r22 * m6;

        m[8] = r00 * m8 + r01 * m9 + r02 * m10;
        m[9] = r10 * m8 + r11 * m9 + r12 * m10;
        m[10] = r20 * m8 + r21 * m9 + r22 * m10;
    },

    translateX: function (m, t) {
        m[12] = m[0] * t + m[12];
        m[13] = m[1] * t + m[13];
        m[14] = m[2] * t + m[14];
        m[15] = m[3] * t + m[15];
    },

    translateY: function (m, t) {
        m[12] = m[4] * t + m[12];
        m[13] = m[5] * t + m[13];
        m[14] = m[6] * t + m[14];
        m[15] = m[7] * t + m[15];
    },

    translateZ: function (m, t) {
        m[12] = m[8] * t + m[12];
        m[13] = m[9] * t + m[13];
        m[14] = m[10] * t + m[14];
        m[15] = m[11] * t + m[15];
    },

    scaleX: function (m, s) {
        m[0] = m[0] * s;
        m[1] = m[1] * s;
        m[2] = m[2] * s;
        m[3] = m[3] * s;
    },

    scaleY: function (m, s) {
        m[4] = m[4] * s;
        m[5] = m[5] * s;
        m[6] = m[6] * s;
        m[7] = m[7] * s;
    },

    scaleZ: function (m, s) {
        m[8] = m[8] * s;
        m[9] = m[9] * s;
        m[10] = m[10] * s;
        m[11] = m[11] * s;
    },

    multiply: function (m1, m2, result) {
        if (!result) { result = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; }

        result[0] = m1[0] * m2[0] + m1[4] * m2[1] + m1[8] * m2[2] + m1[12] * m2[3];
        result[1] = m1[1] * m2[0] + m1[5] * m2[1] + m1[9] * m2[2] + m1[13] * m2[3];
        result[2] = m1[2] * m2[0] + m1[6] * m2[1] + m1[10] * m2[2] + m1[14] * m2[3];
        result[3] = m1[3] * m2[0] + m1[7] * m2[1] + m1[11] * m2[2] + m1[15] * m2[3];

        result[4] = m1[0] * m2[4] + m1[4] * m2[5] + m1[8] * m2[6] + m1[12] * m2[7];
        result[5] = m1[1] * m2[4] + m1[5] * m2[5] + m1[9] * m2[6] + m1[13] * m2[7];
        result[6] = m1[2] * m2[4] + m1[6] * m2[5] + m1[10] * m2[6] + m1[14] * m2[7];
        result[7] = m1[3] * m2[4] + m1[7] * m2[5] + m1[11] * m2[6] + m1[15] * m2[7];

        result[8] = m1[0] * m2[8] + m1[4] * m2[9] + m1[8] * m2[10] + m1[12] * m2[11];
        result[9] = m1[1] * m2[8] + m1[5] * m2[9] + m1[9] * m2[10] + m1[13] * m2[11];
        result[10] = m1[2] * m2[8] + m1[6] * m2[9] + m1[10] * m2[10] + m1[14] * m2[11];
        result[11] = m1[3] * m2[8] + m1[7] * m2[9] + m1[11] * m2[10] + m1[15] * m2[11];

        result[12] = m1[0] * m2[12] + m1[4] * m2[13] + m1[8] * m2[14] + m1[12] * m2[15];
        result[13] = m1[1] * m2[12] + m1[5] * m2[13] + m1[9] * m2[14] + m1[13] * m2[15];
        result[14] = m1[2] * m2[12] + m1[6] * m2[13] + m1[10] * m2[14] + m1[14] * m2[15];
        result[15] = m1[3] * m2[12] + m1[7] * m2[13] + m1[11] * m2[14] + m1[15] * m2[15];

        return result;
    }
};
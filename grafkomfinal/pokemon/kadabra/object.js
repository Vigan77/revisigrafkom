class Object {
    GL = null;
    SHADER_PROGRAM = null;

    _position = null;
    _color = null;
    _normal = null;
    _Mmatrix = null;
    _Nmatrix = null;

    vertex = [];
    faces = [];

    OBJECT_VERTEX = null;
    OBJECT_FACES = null;

    MOVE_MATRIX = LIBS.get_I4();
    MODEL_MATRIX = LIBS.get_I4();

    childs = [];
    draw = null;

    constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, _Nmatrix, vertex = [], faces = [], draw) {
        this.GL = GL;
        this.SHADER_PROGRAM = SHADER_PROGRAM;

        this._position = _position;
        this._color = _color;
        this._normal = _normal;
        this._Mmatrix = _Mmatrix;
        this._Nmatrix = _Nmatrix;

        this.vertex = vertex;
        this.faces = faces;

        this.draw = draw;
    }

    setup() {
        this.OBJECT_VERTEX = this.GL.createBuffer();
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
        this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.vertex), this.GL.STATIC_DRAW);

        this.OBJECT_FACES = this.GL.createBuffer();
        this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
        this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), this.GL.STATIC_DRAW);

        this.childs.forEach(child => child.setup());
    }

    render(PARENT_MATRIX) {
        this.GL.useProgram(this.SHADER_PROGRAM);

        this.MODEL_MATRIX = LIBS.multiply(PARENT_MATRIX, this.MOVE_MATRIX);

        this.GL.uniformMatrix4fv(this._Mmatrix, false, this.MODEL_MATRIX);
        
        // Calculate and set normal matrix (inverse transpose of model matrix)
        var normalMatrix = LIBS.get_I4();
        LIBS.set_I4(normalMatrix, this.MODEL_MATRIX);
        // For uniform scaling, we can use the model matrix directly
        // For non-uniform scaling, we would need proper inverse transpose
        this.GL.uniformMatrix4fv(this._Nmatrix, false, normalMatrix);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
        this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);

        // Vertex format: position (3) + color (3) + normal (3) = 9 floats
        var stride = 4 * 9; // 9 floats * 4 bytes per float
        this.GL.vertexAttribPointer(this._position, 3, this.GL.FLOAT, false, stride, 0);
        this.GL.vertexAttribPointer(this._color, 3, this.GL.FLOAT, false, stride, 4 * 3);
        this.GL.vertexAttribPointer(this._normal, 3, this.GL.FLOAT, false, stride, 4 * 6);

        this.GL.drawElements(this.draw, this.faces.length, this.GL.UNSIGNED_SHORT, 0);

        this.childs.forEach(child => child.render(this.MODEL_MATRIX));
    }

    addChild(child) {
        this.childs.push(child);
    }
}
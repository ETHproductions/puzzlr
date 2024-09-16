export class PuzzleVariable {
    var_id;
    value;
    constraints = [];
    must_be_unique;
    vpos;
    constructor(var_id, value) {
        this.var_id = var_id;
        this.value = value;
    }
    toString() {
        return `V${this.var_id}`;
    }
}

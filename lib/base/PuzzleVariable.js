export class PuzzleVariable {
    var_id = -1;
    value;
    constraints = [];
    must_be_unique = true;
    constructor(value = []) {
        this.value = value;
    }
    toString() {
        return `V${this.var_id}`;
    }
    valueIs(value) {
        return this.value.length == 1 && this.value[0] == value;
    }
    valueHas(value) {
        return this.value.includes(value);
    }
}

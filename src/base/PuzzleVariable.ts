import { Constraint } from "./Constraint.js";

export class PuzzleVariable {
  var_id: number = -1;
  value: PuzzleVariableValues;
  constraints: Constraint[] = [];
  must_be_unique: boolean = true;

  constructor(value: PuzzleVariableValues = []) {
    this.value = value;
  }

  toString() {
    return `V${this.var_id}`;
  }
  valueIs(value: PuzzleVariableValue) {
    return this.value.length == 1 && this.value[0] == value;
  }
  valueHas(value: PuzzleVariableValue) {
    return this.value.includes(value);
  }
}
export type PuzzleVariableValue = string | number;
export type PuzzleVariableValues = PuzzleVariableValue[];

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
}
export type PuzzleVariableValue = string | number;
export type PuzzleVariableValues = PuzzleVariableValue[];

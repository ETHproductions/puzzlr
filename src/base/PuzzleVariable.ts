import { Constraint } from "./Constraint.js";

export class PuzzleVariable {
  var_id: number;
  value: PuzzleVariableValues;
  constraints: Constraint[] = [];
  must_be_unique: boolean | undefined;
  vpos: any;

  constructor(var_id: number, value: PuzzleVariableValues) {
    this.var_id = var_id;
    this.value = value;
  }

  toString() {
    return `V${this.var_id}`;
  }
}
export type PuzzleVariableValue = string | number;
export type PuzzleVariableValues = PuzzleVariableValue[];

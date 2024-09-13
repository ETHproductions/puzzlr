import { Constraint } from "./Constraint";

export interface PuzzleVariable {
    var_id: number;
    value: PuzzleVariableValues;
    constraints: Constraint[];
    must_be_unique: boolean | undefined;
    vpos: any;
}
export type PuzzleVariableValue = string | number;
export type PuzzleVariableValues = PuzzleVariableValue[];

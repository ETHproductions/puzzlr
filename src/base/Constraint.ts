import { PuzzleVariable } from "./PuzzleVariable.js";

export type Constraint = {
  id: number;
  check: ConstraintCheck;
  variables: PuzzleVariable[];
  targets: any[];
};
export type ConstraintCheck = ((
  variables: PuzzleVariable[],
  ...targets: any[]
) => boolean) & { global?: boolean };

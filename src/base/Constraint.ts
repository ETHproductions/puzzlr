import { PuzzleVariable } from "./PuzzleVariable";

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

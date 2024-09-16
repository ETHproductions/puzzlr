import { PuzzleVariable } from "./PuzzleVariable.js";

export class Constraint {
  id: number;
  runCheck: (...a: any) => boolean = () => true;
  variables: PuzzleVariable[] = [];
  targets: any[] = [];
  name: string = "_default_";
  global: boolean = false;

  static build<T extends PuzzleVariable>(
    id: number,
    check: ConstraintCheck<T>,
    variables: T[],
    targets: any[],
  ) {
    const constraint = new Constraint(id);
    constraint.name = check.name;
    constraint.global = !!check.global;
    constraint.runCheck = (...extraArgs: any) =>
      check(variables, ...targets, ...extraArgs);
    constraint.variables = variables;
    constraint.targets = targets;
    return constraint;
  }

  constructor(id: number) {
    this.id = id;
  }

  toString() {
    let varstring = this.variables
      .slice(0, 5)
      .map((v) => "V" + v.var_id)
      .join(", ");
    if (this.variables.length > 5) varstring += ", ...";
    return `C${this.id} #${this.name} ${this.targets} (${varstring})`;
  }
}
export type ConstraintCheck<T extends PuzzleVariable> = ((
  variables: T[],
  ...targets: any[]
) => boolean) & { global?: boolean };

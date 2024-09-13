/* eslint-disable no-constant-condition */
/**
 * The Puzzle class is the main entrypoint to the solving algorithm. A Puzzle
 * is initiated with a set of variables that need to be solved, and a set of
 * constraints that need to be satisfied. In this manner any type of puzzle can
 * theoretically be represented and solved with a generic algorithm. In prac-
 * tice, however, some puzzles play more nicely with this system than others.
 */

import { Constraint, ConstraintCheck } from "./Constraint";
import PuzzleGrid from "./PuzzleGrid";
import {
  PuzzleVariable,
  PuzzleVariableValue,
  PuzzleVariableValues,
} from "./PuzzleVariable";

export default class Puzzle {
  grid: PuzzleGrid;
  options: any;
  variables: PuzzleVariable[];
  constraints: Constraint[];

  ps: PartialSolution = new PartialSolution(this);
  base_partsol: PartialSolution = this.ps;
  current_depth: number = 0;
  partsols_by_depth: PartialSolution[][] = [];

  global_stats: any;
  start_time?: Date;

  get type() {
    return "default";
  }
  get renderSettings() {
    return { defaultScale: 30, funcs: ["edgearea", "binarygrey"] };
  }

  /**
   * Takes a grid and begins the process of creating a puzzle.
   */
  constructor(grid: PuzzleGrid) {
    this.grid = grid;
    this.variables = [];
    this.constraints = [];
  }

  /**
   * Create a variable attached to an element of the grid.
   * @param ref GridCell, GridVertex, GridEdge, or an object that represents a
   * structure
   * @param value array of possible values
   * @param must_be_unique if false, ignores this variable when checking
   * whether the puzzle is fully solved
   */
  addVariable(
    ref: PuzzleVariable,
    value: PuzzleVariableValues,
    must_be_unique: boolean = true
  ) {
    ref.value = value;
    ref.var_id = this.variables.length;
    ref.must_be_unique = must_be_unique;
    if (ref.constraints == undefined) ref.constraints = [];
    this.variables.push(ref);
  }

  /**
   * Create a constraint on a fixed set of variables.
   * @param check function to check whether an array of values can meet a given
   * target value
   * @param variables array of variables on which to apply this constraint
   * @param target value to pass into the check function
   */
  addConstraint(
    check: ConstraintCheck,
    variables: PuzzleVariable[],
    ...targets: any[]
  ) {
    const constraint = {
      id: this.constraints.length,
      check,
      variables,
      targets,
    };
    this.constraints.push(constraint);
    for (const variable of variables) {
      if (variable.constraints == undefined) variable.constraints = [];
      variable.constraints.push(constraint);
    }
  }

  debug_log(debug_level: number, ...args: any[]) {
    if (this.options.debug < debug_level + +(this.ps.depth > 0)) return;
    if (typeof args[0] == "function") args = args[0]();
    args[0] =
      this.ps.assumptions
        .map(
          (x) =>
            (x.variable.vpos ? "V" : "S") + x.variable.var_id + "=" + x.value
        )
        .join(";") +
      " " +
      args[0];
    console.log.apply(null, args);
  }

  format_var(variable: PuzzleVariable) {
    if (variable.vpos)
      return `V${variable.var_id} @${variable.vpos.d ?? ""}(${
        variable.vpos.x
      },${variable.vpos.y})`;
    return `S${variable.var_id}`;
  }

  format_con(constraint: Constraint) {
    let varstring = constraint.variables
      .slice(0, 5)
      .map((v) => (v.vpos ? "V" : "S") + v.var_id)
      .join(", ");
    if (constraint.variables.length > 5) varstring += ", ...";
    return `C${constraint.id} #${constraint.check.name} ${constraint.targets} (${varstring})`;
  }

  /**
   * Once the puzzle has been set up, all that's left to do is solve it.
   * There are multiple ways of going about a solve, all using the same algo-
   * rithm with slight tweaks.
   *
   * The sole parameter is an object with several options:
   * - max_depth (required): maximum number of recursions before giving up
   * - debug (default=0): output detailed info about deduction process
   * - mode (default='thorough'): how to run the algorithm
   *   - 'thorough': check every variable before making the next deduction
   *   - 'fast': make the first deduction found
   */
  initiate_solve(options: {
    max_depth: number;
    debug?: number;
    mode?: string;
  }) {
    if (typeof options.max_depth != "number")
      throw new Error(
        "Puzzle.solve(): no or invalid max_depth parameter provided"
      );
    if (!["fast", "thorough"].includes(options.mode ?? ""))
      options.mode = "thorough";
    if (!("debug" in options)) options.debug = 0;
    this.options = options;
    this.global_stats = {
      total_constraint_checks: 0,
      total_contradiction_checks: 0,
      total_context_switches: 0,
      total_deduction_checks: 0,
      invalid_deductions: 0,
      partsol_rebases: 0,
      measured_time: 0,
    };
    this.start_time = new Date();
    this.current_depth = 0;

    this.base_partsol = this.ps = new PartialSolution(this);
    this.partsols_by_depth = [[this.base_partsol]];

    this.debug_log(0, "Solve initiated in", options.mode, "mode");
    this.debug_log(
      0,
      "Created",
      this.variables.length,
      "variables and",
      this.constraints.length,
      "constraints"
    );

    for (const constraint of this.constraints)
      for (const variable of constraint.variables)
        this.ps.check_queue.push({ variable, constraint });
  }

  solve(options: { max_depth: number; debug?: number; mode?: string }) {
    if (options) this.initiate_solve(options);
    this.debug_log(0, "Running...");
    solveloop: while (true) {
      this.simplify();
      if (this.check_if_done()) return this;

      while (this.current_depth < this.options.max_depth) {
        this.current_depth++;
        this.prepare_next_depth();
        const success = this.run_next_depth();
        if (success) {
          this.current_depth = 0;
          continue solveloop;
        }
      }

      this.ps.status = "unsolvable";
      this.debug_log(0, "Depth not supported!");
      return this;
    }
  }

  /**
   * Runs checks and deductions on the current level until there are none
   * remaining.
   */
  simplify() {
    while (this.next_step());
  }

  /**
   * Runs the next check or deduction based on the mode selected, returning
   * true if successful, false if nothing left to do.
   * - thorough: perform checks before deductions
   * - fast: perform deductions before checks
   */
  next_step() {
    if (
      (this.options.mode != "fast" || this.ps.deduct_queue.length == 0) &&
      this.ps.check_queue.length > 0
    ) {
      if (!this.next_check()) return false;
    } else if (
      (this.options.mode != "thorough" || this.ps.check_queue.length == 0) &&
      this.ps.deduct_queue.length > 0
    ) {
      if (!this.next_deduct()) return false;
    } else {
      this.debug_log(
        2,
        "No more depth-" + this.current_depth,
        "deductions found."
      );
      return false;
    }
    return true;
  }

  /**
   * Performs the next check in the queue and returns false if it directly
   * causes a contradiction, true if not.
   */
  next_check() {
    const check = this.ps.check_queue.shift();
    if (!check) return;
    const variable = check.variable;
    const values = variable.value;
    const constraint = check.constraint;
    if (
      this.options.mode == "thorough" &&
      values.length == 1 &&
      !constraint.check.global
    )
      return true;
    this.debug_log(3, () => [
      " Checking",
      this.format_var(variable),
      "on",
      this.format_con(constraint),
    ]);

    for (const value of values) {
      variable.value = [value];
      this.global_stats.total_constraint_checks++;
      if (
        constraint.check(constraint.variables, ...constraint.targets, variable)
      )
        continue;
      if (
        this.ps.deduct_queue.find(
          (d) => d.variable == variable && d.value == value
        )
      )
        continue;

      this.ps.deduct_queue.push({ variable, value, constraint });
      this.debug_log(1, () => [
        " " + this.format_var(variable),
        "with value",
        value,
        "fails",
        this.format_con(constraint),
      ]);
      if (
        values.every(
          (v) =>
            ++this.global_stats.total_contradiction_checks &&
            this.ps.deduct_queue.find(
              (d) => d.variable == variable && d.value == v
            )
        )
      ) {
        this.debug_log(1, "  Contradiction! Aborting solve...");
        this.ps.status = "contradiction";
        if (typeof this.options.on_contradict == "function")
          this.options.on_contradict(variable);
        return false;
      }
    }

    variable.value = values;
    if (typeof this.options.on_check == "function")
      this.options.on_check(check);
    return true;
  }

  /**
   * Performs the next deduction in the queue and returns false if it causes
   * a contradiction (i.e. no valid values left), true otherwise.
   */
  next_deduct() {
    const deduction = this.ps.deduct_queue.shift();
    if (!deduction) return;
    deduction.id = this.ps.deductions_made.length;
    this.ps.deductions_made.push(deduction);
    const variable = deduction.variable;

    if (variable.value.indexOf(deduction.value) == -1) {
      this.debug_log(1, () => [
        "Warning:",
        this.format_var(variable),
        "has already had value",
        deduction.value,
        "deducted",
      ]);
      this.global_stats.invalid_deductions++;
      return true;
    }

    if (this.ps.assumptions.some((a) => a.variable == variable))
      this.debug_log(1, () => [
        "Deduction",
        deduction.id,
        ":",
        this.format_var(variable),
        "removing value",
        deduction.value,
      ]);
    else
      this.debug_log(1, () => [
        "Deduction",
        deduction.id,
        ":",
        this.format_var(variable),
        "cannot have value",
        deduction.value,
        "due to",
        deduction.constraint
          ? this.format_con(deduction.constraint)
          : "future contradiction",
      ]);
    variable.value.splice(variable.value.indexOf(deduction.value), 1);
    if (typeof this.options.on_deduct == "function")
      this.options.on_deduct(deduction);
    if (variable.value.length == 1) {
      this.debug_log(1, () => [
        "  " + this.format_var(variable),
        "has value",
        variable.value[0],
      ]);
      if (typeof this.options.on_value == "function")
        this.options.on_value(variable);
    } else if (variable.value.length == 0) {
      this.debug_log(1, "  Contradiction! Aborting solve...");
      this.ps.status = "contradiction";
      if (typeof this.options.on_contradict == "function")
        this.options.on_contradict(variable);
      return false;
    }

    for (const constraint of variable.constraints)
      for (const subvar of constraint.check.global
        ? [variable]
        : constraint.variables.filter((v) => v.value.length > 1))
        if (
          !this.ps.check_queue.some(
            (x) =>
              x.variable.var_id == subvar.var_id &&
              x.constraint.id == constraint.id
          )
        )
          this.ps.check_queue.push({ variable: subvar, constraint });

    return true;
  }

  prepare_next_depth() {
    if (this.partsols_by_depth.length > this.current_depth) {
      // Cull partsols whose variables have been solved or who have a
      // value that has been deducted in the base
      const new_child_partsols = [];
      for (const new_partsol of this.partsols_by_depth[this.current_depth]) {
        if (new_partsol.status == "contradiction") continue;
        if (
          new_partsol.assumptions.some(
            (a) => this.base_partsol.values[a.variable.var_id].length == 1
          )
        )
          continue;
        if (
          new_partsol.assumptions.some((a) =>
            this.ps.deductions_made.some(
              (d) => d.variable == a.variable && d.value == a.value
            )
          )
        )
          continue;
        new_child_partsols.push(new_partsol);
      }
      this.partsols_by_depth[this.current_depth] = new_child_partsols;
      this.debug_log(
        1,
        "Resuming depth-" + this.current_depth,
        "search:",
        new_child_partsols.length,
        "partsols remaining"
      );
      return;
    }

    const child_partsols = [];
    let parent_partsols = this.partsols_by_depth[this.current_depth - 1];
    if (this.current_depth > 1) {
      // Rotate partsols so lowest indexed variable is first
      const first_index =
        parent_partsols.findIndex(
          (ps, i) =>
            ps.assumptions[0].variable.var_id >
            parent_partsols[(i + 1) % parent_partsols.length].assumptions[0]
              .variable.var_id
        ) + 1;
      parent_partsols = parent_partsols
        .slice(first_index)
        .concat(parent_partsols.slice(0, first_index));
    }
    // Create partsols for all remaining variable/value pairs
    for (const partsol of parent_partsols) {
      for (const variable of this.variables.slice(
        this.current_depth == 1
          ? 0
          : partsol.assumptions.slice(-1)[0].variable.var_id + 1
      )) {
        const values = this.base_partsol.values[variable.var_id];
        if (values.length == 1) continue;
        for (const value of values) {
          const assumptions = partsol.assumptions.concat({ variable, value });
          const new_partsol = new PartialSolution(this, assumptions);
          if (this.current_depth == 1) {
            for (const v2 of values)
              if (v2 != value) {
                new_partsol.deduct_queue.push({ variable, value: v2 });
              }
          }
          child_partsols.push(new_partsol);
        }
      }
    }
    this.partsols_by_depth[this.current_depth] = child_partsols;
    this.debug_log(
      1,
      "Starting depth-" + this.current_depth,
      "search:",
      child_partsols.length,
      "partsols created"
    );
  }

  /**
   * Performs checks and deductions on each child partsol until done. Returns
   * true if any contradictions and/or agreements are found, false otherwise.
   * In fast mode, returns as soon as an agreement is found in one variable.
   */
  run_next_depth() {
    const base_partsol = this.ps;
    let new_partsol: PartialSolution;
    const current_partsols = this.partsols_by_depth[this.current_depth];
    let success = false;
    for (const ps of current_partsols) ps.done = false;
    while (current_partsols.length > 0) {
      new_partsol = current_partsols.shift()!;
      if (new_partsol.done) {
        current_partsols.unshift(new_partsol);
        break;
      }

      new_partsol.merge_from_parents();
      new_partsol.restore(true);
      this.simplify();

      if (new_partsol.status == "contradiction") {
        // Could discard this child and add to parents' deduct queues
        // This is technically redundant as the agreement check below
        // will handle this case just fine, but might be useful to
        // handle separately to save processing time
        this.debug_log(2, () => [
          "Contradiction in {",
          new_partsol.assumptions
            .map((a) => this.format_var(a.variable) + " => " + a.value)
            .join("; "),
          "}",
        ]);
      } else {
        new_partsol.done = true;
        current_partsols.push(new_partsol);
        this.debug_log(2, () => [
          "Done with {",
          new_partsol.assumptions
            .map((a) => this.format_var(a.variable) + " => " + a.value)
            .join("; "),
          "}",
        ]);
      }

      for (const parent of new_partsol.parents) {
        if (parent.merge_from_children(new_partsol.assumptions)) success = true;
      }

      if (success && this.options.mode == "fast") {
        base_partsol.restore(true);
        return true;
      }
    }
    base_partsol.restore(true);
    this.debug_log(1, "Finished depth-" + this.current_depth, "search");
    return success;
  }

  check_if_done() {
    if (this.ps.status == "contradiction") {
      this.debug_log(0, "Could not solve due to contradiction");
      return true;
    }
    if (this.variables.every((v) => v.value.length == 1 || !v.must_be_unique)) {
      this.debug_log(
        0,
        "Puzzle solved in",
        (Date.now().valueOf() - (this.start_time?.valueOf() ?? 0)) / 1000,
        "seconds"
      );
      this.ps.status = "solved";
      return true;
    }
    if (this.options.max_depth <= 0) {
      this.ps.status = "unsolvable";
      this.debug_log(
        0,
        "Could not solve with max depth",
        this.options.max_depth
      );
      return true;
    }
    return false;
  }
}

class PartialSolution {
  puzzle: Puzzle;
  depth: number;
  status: string;
  assumptions: Assumption[];
  check_queue: { variable: PuzzleVariable; constraint: Constraint }[];
  deduct_queue: Deduction[];
  deductions_made: Deduction[];
  values: PuzzleVariableValues[];
  parents: PartialSolution[];
  children: PartialSolution[];
  done?: boolean;

  constructor(puzzle: Puzzle, assumptions: Assumption[] = []) {
    this.puzzle = puzzle;
    this.assumptions = assumptions;
    this.depth = assumptions.length;
    this.status = "partial";

    this.check_queue = [];
    this.deduct_queue = [];
    this.deductions_made = [];

    this.values = [];
    for (const variable of this.puzzle.variables)
      this.values.push(variable.value.slice());

    this.parents = [];
    this.children = [];
    if (this.depth > 0) {
      this.parents = puzzle.partsols_by_depth[this.depth - 1].filter((p) =>
        p.assumptions.every((a) =>
          assumptions.some(
            (b) => a.variable == b.variable && a.value == b.value
          )
        )
      );
      this.merge_from_parents();
      for (const parent of this.parents) parent.children.push(this);
    }
  }

  save() {
    this.values = [];
    for (const variable of this.puzzle.variables)
      this.values.push(variable.value);
  }

  restore(save: boolean) {
    if (save) this.puzzle.ps.save();

    this.puzzle.ps = this;
    for (let i = 0; i < this.values.length; i++)
      this.puzzle.variables[i].value = this.values[i];
    this.puzzle.global_stats.total_context_switches++;
  }

  debug_log(debug_level: number, ...args: any[]) {
    const b = this.puzzle.ps;
    this.puzzle.ps = this;
    this.puzzle.debug_log(debug_level, ...args);
    this.puzzle.ps = b;
  }
  format_var(variable: PuzzleVariable) {
    return this.puzzle.format_var(variable);
  }
  format_con(constraint: Constraint) {
    return this.puzzle.format_con(constraint);
  }

  merge_from_parents() {
    const all_partsols = [...this.parents, this];
    all_partsols.sort(
      (a, b) => b.deductions_made.length - a.deductions_made.length
    );
    const new_base = all_partsols.shift()!;
    const deduct_lists = all_partsols.map((ps) => ps.deductions_made.slice());

    if (new_base != this) {
      this.puzzle.global_stats.partsol_rebases++;
      this.debug_log(2, () => [
        "Rebasing on {",
        new_base.assumptions
          .map((a) => this.format_var(a.variable) + " => " + a.value)
          .join("; ") || "root",
        "}",
      ]);
      this.deductions_made = new_base.deductions_made.slice();
      this.values = new_base.values.map((v) => v.slice());
    }

    for (const list of deduct_lists)
      for (const deduction of list) this.try_deduction(deduction);
  }

  merge_from_children(assumptions: Assumption[]) {
    const missing_variable = assumptions.find(
      (a) => !this.assumptions.some((b) => a.variable == b.variable)
    )?.variable;
    let valid_children = this.children.filter((ps) =>
      ps.assumptions.some((a) => a.variable == missing_variable)
    );
    // Return early if a child hasn't finished running yet
    if (!valid_children.every((ps) => ps.done || ps.status == "contradiction"))
      return false;

    const shared_assumptions = assumptions.map((a) =>
      valid_children.every((ps) =>
        ps.assumptions.some(
          (b) => a.variable == b.variable && a.value == b.value
        )
      )
        ? a
        : { variable: a.variable, value: undefined }
    );

    valid_children = valid_children.filter(
      (ps) => ps.status != "contradiction"
    );
    if (valid_children.length == 0) {
      this.status = "contradiction";
      this.debug_log(2, () => [
        "Universal contradiction found in {",
        this.assumptions
          .map((a) => this.format_var(a.variable) + " => " + a.value)
          .join("; "),
        "}",
      ]);
      return true;
    }

    let deductions = valid_children[0].deductions_made;
    for (let i = 1; i < valid_children.length; i++) {
      const partsol = valid_children[i];
      const new_deductions = [];
      for (const deduction of deductions) {
        if (
          partsol.deductions_made.some(
            (d) =>
              d.variable == deduction.variable && d.value == deduction.value
          )
        )
          new_deductions.push(deduction);
      }
      deductions = new_deductions;
    }

    const successful_deductions = [];
    for (const deduction of deductions) {
      if (this.try_deduction(deduction)) {
        successful_deductions.push(deduction);
      }
    }
    if (successful_deductions.length > 0) {
      this.debug_log(2, () => [
        successful_deductions.length,
        "agreements found in {",
        shared_assumptions
          .map(
            (a) =>
              this.format_var(a.variable) +
              (a.value == undefined ? "" : " => " + a.value)
          )
          .join("; "),
        "}",
      ]);
      const base_partsol = this.puzzle.ps;
      this.restore(true);
      this.puzzle.simplify();
      base_partsol.restore(true);

      let success = this.depth == 0;
      for (const parent of this.parents) {
        if (parent.merge_from_children(this.assumptions)) success = true;
      }
      return success;
    }
    return false;
  }

  /**
   * Attempts to apply a deduction; fails if the deduction already exists.
   */
  try_deduction(deduction: Deduction) {
    this.puzzle.global_stats.total_deduction_checks++;
    if (
      !this.deduct_queue
        .concat(this.deductions_made)
        .some(
          (d) => d.variable == deduction.variable && d.value == deduction.value
        )
    ) {
      this.deduct_queue.push({
        variable: deduction.variable,
        value: deduction.value,
        constraint: deduction.constraint,
      });
      return true;
    } else {
      return false;
    }
  }
}

type Deduction = {
  variable: PuzzleVariable;
  value: PuzzleVariableValue;
  constraint?: Constraint;
  id?: number;
};
type Assumption = {
  variable: PuzzleVariable;
  value: PuzzleVariableValue;
};

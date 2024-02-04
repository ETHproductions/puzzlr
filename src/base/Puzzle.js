/**
 * The Puzzle class is the main entrypoint to the solving algorithm. A Puzzle
 * is initiated with a set of variables that need to be solved, and a set of
 * constraints that need to be satisfied. In this manner any type of puzzle can
 * theoretically be represented and solved with a generic algorithm. In prac-
 * tice, however, some puzzles play more nicely with this system than others.
 */

class Puzzle {
    /**
     * The Puzzle constructor takes a list of variables to be solved, and con-
     * straints that need to be satisfied. If the puzzle is properly specified,
     * there will only be one set of variables that satisfies all constraints.
     * 
     * Variables need to have the following properties:
     * - id: sequential integers starting at 0
     * - value: array of all possible values; will be pruned down to one value
     * - pos: { x, y } of variable in puzzle
     * - constraints: array of constraints in which this variable is involved
     * 
     * Constraints have a similar list of properties:
     * - id: sequential integers starting at 0
     * - check: function that takes in a list of variables and a target value,
     *     returning false if the constraint cannot be met, true otherwise
     * - target: target value for the check function
     * - variables: array of variables which this constraint involves
     */
    constructor(grid) {
        this.grid = grid;
        this.variables = [];
        this.constraints = [];
    }

    addVariable(ref, value, must_be_unique = true) {
        ref.value = value;
        ref.var_id = this.variables.length;
        ref.must_be_unique = must_be_unique;
        if (ref.constraints == undefined)
            ref.constraints = [];
        this.variables.push(ref);
    }

    addConstraint(check, variables, target) {
        let constraint = { id: this.constraints.length, check, variables, target };
        this.constraints.push(constraint);
        for (let variable of variables) {
            if (variable.constraints == undefined)
                variable.constraints = [];
            variable.constraints.push(constraint);
        }
    }
    
    debug_log(debug_level, ...args) {
        if (this.options.debug < debug_level + this.search_depth) return;
        args[0] = this.assumptions.map(x => (x.variable.vpos ? 'V' : 'S') + x.variable.var_id + "=" + x.value).join(";") + " " + args[0];
        console.log.apply(null, args);
    }

    format_var(variable) {
        if (variable.vpos)
            return `V${ variable.var_id } @(${ variable.vpos.x },${ variable.vpos.y})`;
        return `S${ variable.var_id }`;
    }

    format_con(constraint) {
        return `C${ constraint.id } #${ constraint.check.name }`;
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
     *   - 'nextstep': analyze the puzzle but don't actually apply deductions
     */
    solve(options) {
        if (typeof options.max_depth != 'number')
            throw new Error('Puzzle.solve(): no or invalid max_depth parameter provided');
        if (!['fast', 'thorough', 'nextstep'].includes(options.mode))
            options.mode = 'thorough';
        if (!('debug' in options))
            options.debug = 0;
        this.options = options;
        console.log('Solve initiated in', options.mode, 'mode');
        this.global_stats = {
            total_constraint_checks: 0,
            total_level_checks: [],
            total_contradiction_checks: 0,
            total_context_switches: 0,
            invalid_deductions: 0,
        };
        this.current_deduct_id = [];
        this.check_queue = [];
        this.deduct_queue = [];
        this.deductions_made = [];
        this.assumptions = [];
        this.status = 'partial';
        this.search_depth = 0;

        this.child_partsols = [];
        this.initial_partsol = new PartialSolution(this, 0);
        this.initial_partsol.save();
        this.partsol = new PartialSolution(this, 0);

        // Level 0: check whether any possible value for each variable immediat-
        // ely breaks any of its constraints, and remove the ones that do
        for (let constraint of this.constraints)
            for (let variable of constraint.variables)
                this.check_queue.push({ variable, constraint, deduct_id: '-1' });

        console.log('Running...');
        while (true) {
            this.simplify();
            if (this.check_if_done())
                return this;
            this.prepare_next_depth();
            if (!this.next_depth_fast()) {
                this.status = 'unsolvable';
                console.log('Depth not supported!');
                return this;
            }
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
     * - nextstep: perform only checks
     */
    next_step() {
        if ((this.options.mode != 'fast' || this.deduct_queue.length == 0) && this.check_queue.length > 0) {
            if (!this.next_check())
                return false;
        }
        else if ((this.options.mode != 'thorough' || this.check_queue.length == 0) && (this.options.mode != 'nextstep' && this.deduct_queue.length > 0)) {
            if (!this.next_deduct())
                return false;
        }
        else {
            this.debug_log(1, "No more depth-" + this.search_depth, "deductions found.");
            return false;
        }
        return true;
    }

    /**
     * Performs the next check in the queue and returns false if it directly
     * causes a contradiction, true if not.
     */
    next_check() {
        let check = this.check_queue.shift();
        let variable = check.variable;
        let values = variable.value;
        if (this.options.mode == 'thorough' && values.length == 1)
            return true;
        let constraint = check.constraint;
        let var_id = variable.var_id;
        this.debug_log(3, " Checking", this.format_var(variable), "on", this.format_con(constraint));

        for (let value of values) {
            variable.value = [value];
            this.global_stats.total_constraint_checks++;
            if (constraint.check(constraint.variables, constraint.target))
                continue;
            if (this.deduct_queue.find(d => d.variable == variable && d.value == value))
                continue;

            this.deduct_queue.push({ variable, value, constraint });
            this.debug_log(2, " " + this.format_var(variable), "with value", value, "fails", this.format_con(constraint));
            if (values.every(v => ++this.global_stats.total_contradiction_checks && this.deduct_queue.find(d => d.variable == variable && d.value == v))) {
                this.debug_log(2, "  Contradiction! Aborting solve...");
                this.status = "contradiction";
                return false;
            }
        }

        variable.value = values;
        return true;
    }

    /**
     * Performs the next deduction in the queue and returns false if it causes
     * a contradiction (i.e. no valid values left), true otherwise.
     */
    next_deduct() {
        let deduction = this.deduct_queue.shift();
        deduction.id = this.deductions_made.length;
        this.deductions_made.push(deduction);
        let variable = deduction.variable;

        if (variable.value.indexOf(deduction.value) == -1) {
            this.debug_log(1, "Warning:", this.format_var(variable), "has already had value", deduction.value, "deducted");
            this.global_stats.invalid_deductions++;
            return true;
        }

        this.debug_log(1, "Deduction", deduction.id, ":", this.format_var(variable), "cannot have value", deduction.value);
        variable.value.splice(variable.value.indexOf(deduction.value), 1);
        if (variable.value.length == 1) {
            this.debug_log(1, "  " + this.format_var(variable), "has value", variable.value[0]);
        } else if (variable.value.length == 0) {
            this.debug_log(1, "  Contradiction! Aborting solve...");
            this.status = 'contradiction';
            return false;
        }

        for (let constraint of variable.constraints) {
            for (let variable of constraint.variables) if (variable.value.length > 1) {
                let existing_check = this.check_queue.findIndex(x => x.variable.var_id == variable.var_id && x.constraint.id == constraint.id);
                if (existing_check == -1)
                    this.check_queue.push({ variable, constraint });
            }
        }

        return true;
    }

    prepare_next_depth() {
        if (this.child_partsols.length > 0) {
            // Eventually the goal is to merge changes to the parent partsol
            // into the children but for now we just ignore
            return;
        }
        let base_partsol = this.partsol;

        for (let variable of this.variables) if (variable.value.length > 1) {
            let values = variable.value.slice();
            for (let value of values) {
                base_partsol.save();
                let new_partsol = new PartialSolution(this, this.search_depth + 1, variable, value);
                this.child_partsols = [];
                this.variables[variable.var_id].value = [value];
                this.assumptions.push({ variable, value });
                this.deductions_made = [];
                for (let v2 of values) if (v2 != value)
                    this.deductions_made.push({ variable, value: v2 });
                for (let constraint of this.variables[variable.var_id].constraints) {
                    for (let subvariable of constraint.variables)
                        this.check_queue.push({ variable: subvariable, constraint });
                }
                new_partsol.save();
                base_partsol.restore();
                this.child_partsols.push(new_partsol);
            }
        }
    }

    /**
     * Runs through child partsols, performing one deduction or check at a time
     * until one of these situations occurs:
     * - a contradiction occurs in a child, leading to an immediate deduction
     *   in the parent (returns true)
     * - an agreement occurs between all children with the same variable, again
     *   leading to a deduction in the parent (returns true)
     * - all children have completed, contradicted, or run out of checks and
     *   deductions (returns false)
     */
    next_depth_fast() {
        // TODO: flesh out thorough mode
        let base_partsol = this.partsol;
        while (this.child_partsols.some(ps => !ps.done)) {
            let new_partsol = this.child_partsols.shift();
            if (new_partsol.done) {
                this.child_partsols.push(new_partsol);
                continue;
            }
            base_partsol.save();
            new_partsol.restore();

            if ((this.options.mode != 'thorough' || this.check_queue.length == 0) && this.deduct_queue.length > 0) {
                if (!this.next_deduct()) {
                    // contradiction, discard this child and add to the deduct queue
                    base_partsol.restore();
                    this.deduct_queue.push({ variable: new_partsol.variable, value: new_partsol.value });
                    return true;
                }
                new_partsol.save();
                base_partsol.restore();
                // TODO: agreements
            }
            else if ((this.options.mode != 'fast' || this.deduct_queue.length == 0) && this.check_queue.length > 0) {
                if (!this.next_check()) {
                    // contradiction, discard this child and add to the deduct queue
                    base_partsol.restore();
                    this.deduct_queue.push({ variable: new_partsol.variable, value: new_partsol.value });
                    return true;
                }
                new_partsol.save();
                base_partsol.restore();
            }
            else {
                this.debug_log(1, "Done with", this.format_var(new_partsol.variable), "=>", new_partsol.value)
                new_partsol.done = true;
                new_partsol.save();
                base_partsol.restore();
            }

            if (this.options.mode == 'thorough')
                this.child_partsols.unshift(new_partsol);
            else
                this.child_partsols.push(new_partsol);
        }
        console.log('Finished depth-' + (this.search_depth + 1), 'search')
        return false;
    }

    check_if_done() {
        if (this.status == 'contradiction') {
            console.log('Could not solve due to contradiction');
            return true;
        }
        if (this.options.mode == 'nextstep' && this.deduct_queue.length > 0) {
            console.log('Found simplifications');
            return true;
        }
        if (this.variables.every(v => v.value.length == 1)) {
            console.log('Puzzle solved');
            this.status = 'solved';
            return true;
        }
        if (this.options.max_depth <= 0) {
            this.status = 'unsolvable';
            console.log('Could not solve with max depth', this.options.max_depth);
            return true;
        }
        return false;
    }
}

class PartialSolution {
    constructor(puzzle, level, variable, value) {
        this.puzzle = puzzle;
        this.level = level;
        this.variable = variable;
        this.value = value;
        this.save();
    }

    static #propsToSave = ['check_queue', 'deduct_queue', 'deductions_made', 'child_partsols', 'status', 'assumptions'];
    save() {
        for (let prop of PartialSolution.#propsToSave)
            this[prop] = this.puzzle[prop].slice();
        this.values = [];
        for (let variable of this.puzzle.variables)
            this.values.push(variable.value.slice());
    }

    restore() {
        for (let prop of PartialSolution.#propsToSave)
            this.puzzle[prop] = this[prop].slice();
        for (let i = 0; i < this.values.length; i++)
            this.puzzle.variables[i].value = this.values[i].slice();
        this.puzzle.search_depth = this.level;
        this.puzzle.global_stats.total_context_switches++;
    }

    clone() {
        let ps = new PartialSolution(this.puzzle, this.level + 1);
        ps.values = this.values.map(v => v.slice());
        return ps;
    }

    static agreement(...partsols) {
        if (partsols.length == 1 && partsols[0] instanceof Array)
            partsols = partsols[0];
        if (partsols.length == 0)
            throw new Error("PartialSolution.agreement must be at least one partial solution");

        let init = partsols[0];
        let result = new PartialSolution(init.puzzle, init.level);
        result.deductions_made = init.deductions_made.map(d => ({ variable: d.variable, value: d.value }));
        result.values = init.values.map(v => v.slice());
        for (let partsol of partsols.slice(1))
            for (let var_id in partsol.values)
                for (let value of partsol.values[var_id])
                    if (!result.values[var_id].includes(value)) {
                        result.values[var_id].push(value);
                        result.deductions_made.splice(result.deductions_made.findIndex(d => d.variable.var_id == var_id && d.value == value), 1);
                    }
        return result;
    }
}

module.exports = Puzzle;

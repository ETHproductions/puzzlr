/**
 * The Puzzle class is the main entrypoint to the solving algorithm. A Puzzle
 * is initiated with a set of variables that need to be solved, and a set of
 * constraints that need to be satisfied. In this manner any type of puzzle can
 * theoretically be represented and solved with a generic algorithm. In prac-
 * tice, however, some puzzles play more nicely with this system than others.
 */

class Puzzle {
    /**
     * Takes a grid and begins the process of creating a puzzle.
     */
    constructor(grid) {
        this.grid = grid;
        this.variables = [];
        this.constraints = [];
    }

    /**
     * Create a variable attached to an element of the grid.
     * @param {object} ref GridCell, GridVertex, GridEdge, or an object that
     * represents a structure
     * @param {(number|string)[]} value array of possible values
     * @param {boolean} must_be_unique if false, ignores this variable when
     * checking whether the puzzle is fully solved
     */
    addVariable(ref, value, must_be_unique = true) {
        ref.value = value;
        ref.var_id = this.variables.length;
        ref.must_be_unique = must_be_unique;
        if (ref.constraints == undefined)
            ref.constraints = [];
        this.variables.push(ref);
    }

    /**
     * @callback constraintCheck 
     * @param {(number|string)[][]} values value array for each variable
     * @param {number|string} target value to be aimed for; exact usage depends
     * upon check function
     */
    /**
     * Create a constraint on a fixed set of variables.
     * @param {constraintCheck} check function to check whether an array of
     * values can meet a given target value 
     * @param {object[]} variables array of variables on which to apply this
     * constraint
     * @param {number|string} target value to pass into the check function
     */
    addConstraint(check, variables, ...targets) {
        let constraint = { id: this.constraints.length, check, variables, targets };
        this.constraints.push(constraint);
        for (let variable of variables) {
            if (variable.constraints == undefined)
                variable.constraints = [];
            variable.constraints.push(constraint);
        }
    }
    
    debug_log(debug_level, ...args) {
        if (this.options.debug < debug_level + (this.ps.depth > 0)) return;
        if (typeof args[0] == 'function') args = args[0]();
        args[0] = this.ps.assumptions.map(x => (x.variable.vpos ? 'V' : 'S') + x.variable.var_id + "=" + x.value).join(";") + " " + args[0];
        console.log.apply(null, args);
    }

    format_var(variable) {
        if (variable.vpos)
            return `V${ variable.var_id } @${ variable.vpos.d ?? '' }(${ variable.vpos.x },${ variable.vpos.y})`;
        return `S${ variable.var_id }`;
    }

    format_con(constraint) {
        let varstring = constraint.variables.slice(0, 5).map(v => (v.vpos ? 'V' : 'S') + v.var_id ).join(', ');
        if (constraint.variables.length > 5) varstring += ', ...';
        return `C${ constraint.id } #${ constraint.check.name } ${ constraint.targets } (${ varstring })`;
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
    initiate_solve(options) {
        if (typeof options.max_depth != 'number')
            throw new Error('Puzzle.solve(): no or invalid max_depth parameter provided');
        if (!['fast', 'thorough'].includes(options.mode))
            options.mode = 'thorough';
        if (!('debug' in options))
            options.debug = 0;
        this.options = options;
        this.global_stats = {
            total_constraint_checks: 0,
            total_contradiction_checks: 0,
            total_context_switches: 0,
            total_deduction_checks: 0,
            invalid_deductions: 0,
            measured_time: 0,
        };
        this.start_time = new Date;
        this.current_deduct_id = [];
        this.current_depth = 0;
        this.current_max_depth = 0;

        this.base_partsol = this.ps = new PartialSolution(this);

        this.debug_log(0, 'Solve initiated in', options.mode, 'mode');
        this.debug_log(0, 'Created', this.variables.length, 'variables with mean domain', (this.variables.reduce((p, c) => p + c.value.length, 0) / this.variables.length * 1000 | 0) / 1000);
        this.debug_log(0, 'Created', this.constraints.length, 'constraints with mean size', (this.constraints.reduce((p, c) => p + c.variables.length, 0) / this.constraints.length * 1000 | 0) / 1000);

        for (let constraint of this.constraints)
            for (let variable of constraint.variables)
                this.ps.check_queue.push({ variable, constraint, deduct_id: '-1' });
    }

    solve(options) {
        if (options) this.initiate_solve(options);
        this.debug_log(0, 'Running...');
        while (true) {
            this.simplify();
            if (this.check_if_done())
                return this;
            this.prepare_next_depth();
            let success = this.next_depth();
            if (!success) {
                this.ps.status = 'unsolvable';
                this.debug_log(0, 'Depth not supported!');
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
     */
    next_step() {
        if ((this.options.mode != 'fast' || this.ps.deduct_queue.length == 0) && this.ps.check_queue.length > 0) {
            if (!this.next_check())
                return false;
        }
        else if ((this.options.mode != 'thorough' || this.ps.check_queue.length == 0) && this.ps.deduct_queue.length > 0) {
            if (!this.next_deduct())
                return false;
        }
        else {
            this.debug_log(2, "No more depth-" + this.current_depth, "deductions found.");
            return false;
        }
        return true;
    }

    /**
     * Performs the next check in the queue and returns false if it directly
     * causes a contradiction, true if not.
     */
    next_check() {
        let check = this.ps.check_queue.shift();
        let variable = check.variable;
        let values = variable.value;
        let constraint = check.constraint;
        if (this.options.mode == 'thorough' && values.length == 1 && !constraint.check.global)
            return true;
        this.debug_log(3, () => [" Checking", this.format_var(variable), "on", this.format_con(constraint)]);

        for (let value of values) {
            variable.value = [value];
            this.global_stats.total_constraint_checks++;
            if (constraint.check(constraint.variables, ...constraint.targets, variable))
                continue;
            if (this.ps.deduct_queue.find(d => d.variable == variable && d.value == value))
                continue;

            this.ps.deduct_queue.push({ variable, value, constraint });
            this.debug_log(1, () => [" " + this.format_var(variable), "with value", value, "fails", this.format_con(constraint)]);
            if (values.every(v => ++this.global_stats.total_contradiction_checks && this.ps.deduct_queue.find(d => d.variable == variable && d.value == v))) {
                this.debug_log(1, "  Contradiction! Aborting solve...");
                this.ps.status = "contradiction";
                if (typeof this.options.on_contradict == 'function' && this.current_depth == 0) this.options.on_contradict(variable);
                return false;
            }
        }

        variable.value = values;
        if (typeof this.options.on_check == 'function' && this.current_depth == 0) this.options.on_check(check);
        return true;
    }

    /**
     * Performs the next deduction in the queue and returns false if it causes
     * a contradiction (i.e. no valid values left), true otherwise.
     */
    next_deduct() {
        let deduction = this.ps.deduct_queue.shift();
        deduction.id = this.ps.deductions_made.length;
        this.ps.deductions_made.push(deduction);
        let variable = deduction.variable;

        if (variable.value.indexOf(deduction.value) == -1) {
            this.debug_log(1, () => ["Warning:", this.format_var(variable), "has already had value", deduction.value, "deducted"]);
            this.global_stats.invalid_deductions++;
            return true;
        }

        if (this.ps.variable == variable)
            this.debug_log(1, () => ["Deduction", deduction.id, ":", this.format_var(variable), "removing value", deduction.value]);
        else
            this.debug_log(1, () => ["Deduction", deduction.id, ":", this.format_var(variable), "cannot have value", deduction.value, "due to", deduction.constraint ? this.format_con(deduction.constraint) : "future contradiction"]);
        variable.value.splice(variable.value.indexOf(deduction.value), 1);
        if (typeof this.options.on_deduct == 'function' && this.current_depth == 0) this.options.on_deduct(deduction);
        if (variable.value.length == 1) {
            this.debug_log(1, () => ["  " + this.format_var(variable), "has value", variable.value[0]]);
            if (typeof this.options.on_value == 'function' && this.current_depth == 0) this.options.on_value(variable);
        }
        else if (variable.value.length == 0) {
            this.debug_log(1, "  Contradiction! Aborting solve...");
            this.ps.status = 'contradiction';
            if (typeof this.options.on_contradict == 'function' && this.current_depth == 0) this.options.on_contradict(variable);
            return false;
        }

        for (let constraint of variable.constraints) {
            for (let subvar of constraint.check.global ? [variable] : constraint.variables.filter(v => v.value.length > 1)) {
                let existing_check = this.ps.check_queue.findIndex(x => (x.variable.var_id == subvar.var_id) && x.constraint.id == constraint.id);
                if (existing_check == -1)
                    this.ps.check_queue.push({ variable: subvar, constraint });
            }
        }

        return true;
    }

    prepare_next_depth() {
        let base_partsol = this.ps;
        if (this.ps.children.length > 0) {
            // Cull partsols whose variable has been solved or whose value has
            // been deducted in the parent
            let new_child_partsols = [];
            for (let new_partsol of this.ps.children) {
                if (new_partsol.variable.value.length == 1)
                    continue;
                if (this.ps.deductions_made.findIndex(d => d.variable == new_partsol.variable && d.value == new_partsol.value) != -1)
                    continue;
                new_child_partsols.push(new_partsol);
            }
            this.debug_log(2, "Culled", this.ps.children.length - new_child_partsols.length, "partsols,", new_child_partsols.length, "remaining");
            this.ps.children = new_child_partsols;
            base_partsol.last_deduction_update = base_partsol.deductions_made.length;
            this.debug_log(1, 'Resuming depth-' + (this.current_depth + 1), 'search');
            return;
        }

        // Create partsols for all remaining variable/value pairs
        for (let variable of this.variables) if (variable.value.length > 1) {
            let values = variable.value.slice();
            for (let value of values) {
                let new_partsol = new PartialSolution(this, variable, value);
                for (let v2 of values) if (v2 != value)
                    new_partsol.deduct_queue.push({ variable, value: v2 });
                this.ps.children.push(new_partsol);
            }
        }
        base_partsol.last_deduction_update = 0;
        this.debug_log(1, 'Starting depth-' + (this.current_depth + 1), 'search');
    }

    /**
     * Performs checks and deductions on each child partsol until done. Returns
     * true if any contradictions and/or agreements are found, false otherwise.
     * In fast mode, returns as soon as an agreement is found in one variable.
     */
    next_depth() {
        let base_partsol = this.ps, old_partsol, new_partsol;
        let var_partsols = [];
        let success = false;
        for (let ps of this.ps.children) ps.done = false;
        while (true) {
            if (this.ps == base_partsol) {
                old_partsol = this.ps.children.shift();
                if (old_partsol.done) {
                    this.ps.children.unshift(old_partsol);
                    break;
                }

                new_partsol = new PartialSolution(this, old_partsol.variable, old_partsol.value);
                new_partsol.deduct_queue = old_partsol.deduct_queue.slice();
                for (let deduction of old_partsol.deductions_made) {
                    new_partsol.try_deduction(deduction);
                }
                new_partsol.restore(true);
            }

            let contradiction = false;
            if ((this.options.mode == 'thorough' || this.ps.deduct_queue.length == 0) && this.ps.check_queue.length > 0) {
                if (!this.next_check())
                    contradiction = true;
            }
            else if ((this.options.mode == 'fast' || this.ps.check_queue.length == 0) && this.ps.deduct_queue.length > 0) {
                if (!this.next_deduct())
                    contradiction = true;
            }
            else {
                new_partsol.done = true;
                base_partsol.restore(true);
                this.debug_log(2, () => ["Done with", this.format_var(new_partsol.variable), "=>", new_partsol.value]);
                var_partsols.push(new_partsol);
            }
            if (contradiction) {
                // discard this child and add to the deduct queue
                base_partsol.restore();
                if (base_partsol.try_deduction(new_partsol)) {
                    success = true;
                    this.debug_log(2, () => ['Found new deduction:', this.format_var(new_partsol.variable), '=/>', new_partsol.value]);
                }
            }
            if (this.ps == base_partsol && this.ps.children[0].variable != new_partsol.variable) {
                // agreement check
                for (let deduction of PartialSolution.agreement(var_partsols).deductions_made) {
                    if (this.ps.try_deduction(deduction)) {
                        success = true;
                        this.debug_log(2, () => ['Agreement found in', this.format_var(new_partsol.variable) + ':', this.format_var(deduction.variable), '=/>', deduction.value]);
                    }
                }
                
                this.ps.children.push(...var_partsols);
                var_partsols = [];
                if (success && this.options.mode == 'fast')
                    return true;
            }
        }
        this.debug_log(1, 'Finished depth-' + (this.current_depth + 1), 'search');
        return success;
    }

    check_if_done() {
        if (this.ps.status == 'contradiction') {
            this.debug_log(0, 'Could not solve due to contradiction');
            return true;
        }
        if (this.variables.every(v => v.value.length == 1 || !v.must_be_unique)) {
            this.debug_log(0, 'Puzzle solved in', (new Date - this.start_time)/1000, 'seconds');
            this.ps.status = 'solved';
            return true;
        }
        if (this.options.max_depth <= 0) {
            this.ps.status = 'unsolvable';
            this.debug_log(0, 'Could not solve with max depth', this.options.max_depth);
            return true;
        }
        return false;
    }
}

class PartialSolution {
    constructor(puzzle, variable, value) {
        let ps;
        if (puzzle instanceof PartialSolution) {
            ps = puzzle;
            puzzle = ps.puzzle;
        }
        this.puzzle = puzzle;
        this.depth = puzzle.ps ? puzzle.ps.depth + 1 : 0;
        this.parent = ps || puzzle;
        this.variable = variable;
        this.value = value;
        this.status = 'partial';

        this.check_queue = [];
        this.deduct_queue = [];
        this.deductions_made = [];
        this.prior_deductions = puzzle.ps ? puzzle.ps.prior_deductions.concat(puzzle.ps.deductions_made) : [];
        this.last_base_update = this.prior_deductions.length;
        this.assumptions = puzzle.ps ? puzzle.ps.assumptions.concat({ variable, value }) : [];
        this.children = [];

        this.values = [];
        for (let variable of this.puzzle.variables)
            this.values.push(variable.value.slice());
    }

    save() {
        this.values = [];
        for (let variable of this.puzzle.variables)
            this.values.push(variable.value);
    }

    restore(save) {
        if (save)
            this.puzzle.ps.save();

        this.puzzle.ps = this;
        for (let i = 0; i < this.values.length; i++)
            this.puzzle.variables[i].value = this.values[i];
        this.puzzle.global_stats.total_context_switches++;
    }

    /**
     * Attempts to apply a deduction; fails if the deduction already exists.
     * @param {{ variable: object, value: number|string}} deduction 
     * @returns true if deduction succeeds, false otherwise
     */
    try_deduction(deduction) {
        this.puzzle.global_stats.total_deduction_checks++;
        if (this.deduct_queue.concat(this.deductions_made, this.prior_deductions).findIndex(d => d.variable == deduction.variable && d.value == deduction.value) == -1) {
            this.deduct_queue.push({ variable: deduction.variable, value: deduction.value, constraint: deduction.constraint });
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Takes a group of PartialSolutions and finds the deductions all have in
     * common.
     * If only one input is given, returns it verbatim; otherwise creates a new
     * PartialSolution with the correct .values and .deductions_made.
     * @param  {...PartialSolution|PartialSolution[]} partsols 
     * @returns PartialSolution with deductions agreed upon by all inputs
     */
    static agreement(...partsols) {
        if (partsols.length == 1 && partsols[0] instanceof Array)
            partsols = partsols[0];
        if (partsols.length == 0)
            throw new Error("PartialSolution.agreement must be at least one partial solution");
        if (partsols.length == 1)
            return partsols[0];

        let init = partsols[0];
        let result = new PartialSolution(init.parent);
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

export default Puzzle;

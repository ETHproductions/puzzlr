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
    constructor(variables, constraints) {
        this.variables = variables;
        this.constraints = constraints;
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
            total_contradiction_checks: 0
        };
        this.current_deduct_id = [];
        this.all_partsols = [];
        this.partsol = new PartialSolution(this, 0);

        // Level 0: check whether any possible value for each variable immediat-
        // ely breaks any of its constraints, and remove the ones that do
        for (let constraint of this.partsol.constraints)
            for (let variable of constraint.variables)
                this.partsol.check_queue.push({ variable, constraint, deduct_id: '-1' });

        console.log('Running...');
        //let next_level_index = 0;
        this.partsol.simplify();

        if (this.partsol.status == 'contradiction') {
            console.log('Could not solve due to contradiction');
            return this;
        }
        if (this.options.mode == 'nextstep' && this.partsol.deduct_queue.length > 0) {
            console.log('Found simplifications');
            return this;
        }
        if (this.partsol.variables.every(v => v.value.length == 1)) {
            console.log('Puzzle solved');
            this.partsol.status = 'solved';
            return this;
        }
        if (this.options.max_depth <= 0) {
            this.partsol.status = 'unsolvable';
            console.log('Could not solve with max depth', this.options.max_depth);
            return this;
        }

        // Level 1: check whether assuming each possible value for each variable
        // results in contradiction or agreements (same deductions from all
        // values of a variable)
        console.log('Starting level 1 search...');
        this.current_deduct_id.push(this.partsol.deductions_made.length);
        let level_1_queue = [];
        for (let variable of this.partsol.variables) if (variable.value.length > 1) {
            let partsols = [];
            let contradictions = [];
            for (let value of variable.value) {
                let new_partsol = new PartialSolution(this, 1, this.partsol.variables, this.partsol.constraints);
                this.options.debug >= 1 && console.log('Setting variable', variable.id, `(${variable.pos.x},${variable.pos.y})`, 'to', value);
                new_partsol.variables[variable.id].value = [value];
                this.current_deduct_id.push('(' + variable.id + ':' + value + ')');
                for (let constraint of new_partsol.variables[variable.id].constraints) {
                    for (let subvariable of constraint.variables)
                        new_partsol.check_queue.push({ variable: subvariable, constraint, deduct_id: this.current_deduct_id.join('.') });
                }
                this.options.debug >= 1 && console.log('>>>>>>>>>>>>>>>>');
                new_partsol.simplify();
                this.options.debug >= 1 && console.log('<<<<<<<<<<<<<<<<');
                this.current_deduct_id.pop();
                if (new_partsol.status == 'contradiction') {
                    this.options.debug >= 1 && console.log('Variable', variable.id, `(${variable.pos.x},${variable.pos.y})`, 'with value', value, 'causes a contradiction');
                    contradictions.push({ variable, value });
                } else {
                    this.options.debug >= 1 && console.log('Variable', variable.id, `(${variable.pos.x},${variable.pos.y})`, 'with value', value, 'leads to', new_partsol.deductions_made.length, 'simplifications');
                    partsols.push(new_partsol);
                }
            }
            let agreement = PartialSolution.agreement(partsols).deductions_made.map(x => ({ variable: x.variable.id, value: x.value }));
            agreement.unshift(...contradictions.map(x => ({ variable: x.variable.id, value: x.value })));
            this.options.debug >= 1 && console.log('Variable', variable.id, `(${variable.pos.x},${variable.pos.y})`, 'agreement:', agreement);
            level_1_queue.push(...contradictions);
            //console.log(partsols);
        }

        console.log('Level 1 deductions found:', level_1_queue.map(x => ({ variable: x.variable.id, value: x.value })))
        this.partsol.status = 'unsolvable';
        console.log('Depth not supported!');
        return this;
    }
}

class PartialSolution {
    constructor(puzzle, level, variables = puzzle.variables, constraints = puzzle.constraints) {
        this.puzzle = puzzle;
        this.id = this.puzzle.all_partsols.length;
        this.puzzle.all_partsols.push(this);
        this.variables = [];
        this.constraints = [];

        for (let variable of variables)
            this.variables.push({
                partsol_id: this.id,
                id: variable.id,
                pos: variable.pos,
                value: variable.value.slice(),
                constraints: variable.constraints,
                deduct_ids: []
            });
        for (let constraint of constraints)
            this.constraints.push({
                partsol_id: this.id,
                id: constraint.id,
                check: constraint.check,
                target: constraint.target,
                variables: constraint.variables,
                deduct_ids: []
            });

        for (let variable of this.variables)
            variable.constraints = variable.constraints.map(c => this.constraints[c.id]);
        for (let constraint of this.constraints)
            constraint.variables = constraint.variables.map(v => this.variables[v.id]);

        this.level = level;
        this.check_queue = [];
        this.deduct_queue = [];
        this.deductions_made = [];
        this.status = "partial";
    }

    debug_log(level, ...args) {
        if (this.puzzle.options.debug < level) return;
        args[0] = " ".repeat(4 * this.level).concat(args[0]);
        console.log.apply(null, args);
    }

    simplify() {
        while (true) {
            if ((this.puzzle.options.mode != 'fast' || this.deduct_queue.length == 0) && this.check_queue.length > 0) {
                if (!this.next_check())
                    return;
            }
            else if ((this.puzzle.options.mode != 'thorough' || this.check_queue.length == 0) && (this.puzzle.options.mode != 'nextstep' && this.deduct_queue.length > 0)) {
                if (!this.next_deduct())
                    return;
            }
            else {
                // And this is where I would put my recursions...
                // IF I HAD ANY!!!
                this.debug_log(1, "No more level-" + this.level, "deductions found.");
                return;
            }
        }
    }

    /**
     * Performs the next check in the queue and returns false if it directly
     * causes a contradiction, 
     */
    next_check() {
        let check = this.check_queue.shift();
        let variable = check.variable;
        if (variable.value.length == 1)
            return true;
        let constraint = check.constraint;
        let var_id = variable.id;
        this.debug_log(3, " Checking variable", variable.id, `(${variable.pos.x},${variable.pos.y})`, "on constraint", constraint.id, "per deduction", check.deduct_id);

        let values = variable.value;

        for (let value of values) {
            variable.value = [value];
            this.puzzle.global_stats.total_constraint_checks++;
            if (!constraint.check(constraint.variables, constraint.target)) {
                if (!this.deduct_queue.find(d => d.variable == variable && d.value == value)) {
                    this.deduct_queue.push({ variable, value, constraint, prior_id: check.deduct_id });
                    this.debug_log(2, "  Variable", variable.id, `(${variable.pos.x},${variable.pos.y})`, "with value", value, "fails constraint", constraint.id);
                    if (values.every(v => ++this.puzzle.global_stats.total_contradiction_checks && this.deduct_queue.find(d => d.variable == variable && d.value == v))) {
                        this.debug_log(2, "  Contradiction! Aborting solve...");
                        this.status = "contradiction";
                        return false;
                    }
                }
            }
        }

        variable.value = values;
        return true;
    }

    next_deduct() {
        let deduction = this.deduct_queue.shift();
        deduction.id = [...this.puzzle.current_deduct_id, this.deductions_made.length].join('.');
        this.deductions_made.push(deduction);
        let variable = deduction.variable;

        this.debug_log(1, "Deduction", deduction.id, ": variable", variable.id, `(${variable.pos.x},${variable.pos.y})`, "cannot have value", deduction.value, "as per deduction(s)", this.puzzle.options.mode == 'fast' ? deduction.constraint.deduct_ids : deduction.prior_id);
        variable.value.splice(variable.value.indexOf(deduction.value), 1);
        variable.deduct_ids.push(deduction.id);
        if (variable.value.length == 1) {
            this.debug_log(1, "  Variable", variable.id, `(${variable.pos.x},${variable.pos.y})`, "has value", variable.value[0], "as per deduction(s)", variable.deduct_ids);
        } else if (variable.value.length == 0) {
            this.debug_log(1, "  Contradiction! Aborting solve...");
            this.status = "contradiction";
            return false;
        }

        for (let constraint of variable.constraints) {
            constraint.deduct_ids.push(deduction.id);
            for (let variable of constraint.variables) if (variable.value.length > 1) {
                let existing_check = this.check_queue.findIndex(x => x.variable.id == variable.id && x.constraint.id == constraint.id);
                if (existing_check == -1)
                    this.check_queue.push({ variable, constraint, deduct_id: deduction.id });
            }
        }

        return true;
    }

    static agreement(...partsols) {
        if (partsols.length == 1 && partsols[0] instanceof Array)
            partsols = partsols[0];
        if (partsols.length == 0)
            throw new Error("PartialSolution.agreement must be at least one partial solution");

        let init = partsols[0];
        let result = new PartialSolution(init.puzzle, init.level, init.variables, init.constraints);
        result.deductions_made = init.deductions_made.map(d => ({ variable: d.variable, value: d.value }));
        for (let partsol of partsols.slice(1))
            for (let variable of partsol.variables)
                for (let value of variable.value)
                    if (!result.variables[variable.id].value.includes(value)) {
                        result.variables[variable.id].value.push(value);
                        result.deductions_made.splice(result.deductions_made.findIndex(d => d.variable.id == variable.id && d.value == value), 1);
                    }
        return result;
    }
}


function generic_solver(puzzle) {
    debug_log("Starting solver...");
    //puzzle = object_clone(puzzle);
    /*let levels = puzzle.levels;
    if (!levels || levels.length == 0) {
        levels = puzzle.levels = [];
        puzzle.status = "partial";
        total_constraint_checks = 0, total_level_checks = [];
    }*/
    //puzzle.max_depths = puzzle.max_depths || 0;
    total_level_checks[levels.length] = -~total_level_checks[levels.length];
    let all_variables = puzzle.variables;
    let all_constraints = puzzle.constraints;
    //let deduct_queue = [], check_queue = [];
    //let deductions_made = puzzle.deductions_made = [];

    /*if (puzzle.constraints_to_check) {
        for (let constraint of puzzle.constraints_to_check)
            for (let var_id of constraint.var_ids) {
                let variable = all_variables[var_id];
                if (variable.value.length > 1 && !check_queue.find(c => c.variable == variable))
                    check_queue.push({ variable });
            }
        puzzle.constraints_to_check = null;
    } else {
        for (let variable of all_variables)
            if (variable.value.length > 1)
                check_queue.push({ variable });
    }*/

    let next_level_index = 0;

    while (true) {
        if (check_queue.length > 0) {
            /*let check = check_queue.shift();
            let variable = check.variable;
            //debug_log(" Checking variable", variable.id, "per deduction", deductions_made.length - 1);
            let values = variable.value;
            
            for (let value of values) {
                variable.value = [value];
                for (let const_id of check.const_id ? [check.const_id] : variable.const_ids) {
                    let constraint = all_constraints[const_id];
                    total_constraint_checks++;
                    if (!constraint.check(constraint.var_ids.map(id => all_variables[id]), constraint.target)) {
                        if (!deduct_queue.find(d => d.variable == variable && d.value == value)) {
                            deduct_queue.push({ variable, value, prior: [deductions_made.length - 1] });
                            debug_log("  Variable", variable.id, [+variable.x, +variable.y], "with value", value, "fails constraint", constraint.id);
                            if (values.every(v => deduct_queue.find(d => d.variable == variable && d.value == v))) {
                                debug_log("  Contradiction! Aborting solve...");
                                puzzle.status = "contradiction";
                                return puzzle;
                            }
                        }
                    }
                }
            }
            
            variable.value = values;*/
        }
        else if (deduct_queue.length > 0) {/*
            let deduction = deduct_queue.shift();
            deduction.id = deductions_made.length;
            deductions_made.push(deduction);
            let variable = deduction.variable;
            
            debug_log("Deduction", [...levels, deduction.id], ": variable", variable.id, "cannot have value", deduction.value, "as per deduction", [...levels, ...deduction.prior]);
            variable.value.splice(variable.value.indexOf(deduction.value), 1);
            variable.deductions.push(deduction.id);
            if (variable.value.length == 1)
                debug_log("  Variable", variable.id, "has value", variable.value[0], "as per deduction(s)", variable.deductions);
            else if (variable.value.length == 0) {
                debug_log("  Contradiction! Aborting solve...");
                puzzle.status = "contradiction";
                return puzzle;
            }
            
            for (let const_id of variable.const_ids) {
                let constraint = all_constraints[const_id];
                constraint.deductions.push(deduction.id);
                for (let var_id of constraint.var_ids) if (all_variables[var_id].value.length > 1) {
                    let existing_check = check_queue.find(x => x.variable.id == var_id && (x.const_id == undefined || x.const_id == const_id));
                    if (!existing_check) {
                        check_queue.push({ variable: all_variables[var_id], const_id });
                    }
                }
            }*/
        }
        else {
            // This is where I would put my recursions...
            // IF I HAD ANY!!!
            debug_log("No more level-" + levels.length, "deductions found.");
            if (levels.length >= puzzle.max_depths) {
                puzzle.status = "unsolvable";
                return puzzle;
            }
            varloop:
            for (let i = 0; i < all_variables.length; i++) {
                let index = (next_level_index + i) % all_variables.length;
                let variable = all_variables[index];
                if (variable.value.length <= 1) continue;

                debug_log("Exploring variable", variable.id);
                for (let value of variable.value) {
                    let new_puzzle = object_clone(puzzle);
                    new_puzzle.variables[variable.id].value = [value];
                    new_puzzle.levels.push(deductions_made.length);
                    new_puzzle.constraints_to_check = variable.const_ids.map(const_id => all_constraints[const_id]);

                    debug_log("  Trying variable", variable.id, "with value", value);
                    debug_log("  >>>>>>>>>>>>>>>>");
                    new_puzzle = generic_solver(new_puzzle);
                    debug_log("  <<<<<<<<<<<<<<<<");

                    // technique 2: shaving
                    if (new_puzzle.status == 'contradiction') {
                        deduct_queue.push({ variable, value, prior: [...new_puzzle.levels, new_puzzle.deductions_made.length - 1] });
                        debug_log("  Variable", variable.id, "with value", value, "fails level-" + new_puzzle.levels.length, "check");
                        next_level_index = index;
                        break varloop;
                    }
                }
            }
            if (deduct_queue.length == 0) {
                debug_log("Done...?")
                if (all_variables.every(v => v.value.length == 1))
                    puzzle.status = "solved";
                else
                    puzzle.status = "unsolvable";
                return puzzle;
            }
        }
    }

    console.log("How did we get here?");
    return puzzle;
}

module.exports = Puzzle;
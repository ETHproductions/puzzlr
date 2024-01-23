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

    addVariable(ref, value) {
        ref.value = value;
        ref.var_id = this.variables.length;
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
        this.check_queue = [];
        this.deduct_queue = [];
        this.deductions_made = [];
        this.status = 'partial';
        this.search_depth = 0;

        this.all_partsols = [];
        this.initial_partsol = new PartialSolution(this, 0);
        this.initial_partsol.save();
        this.partsol = new PartialSolution(this, 0);

        // Level 0: check whether any possible value for each variable immediat-
        // ely breaks any of its constraints, and remove the ones that do
        for (let constraint of this.constraints)
            for (let variable of constraint.variables)
                this.check_queue.push({ variable, constraint, deduct_id: '-1' });

        console.log('Running...');
        this.simplify();
        if (this.check_if_done())
            return this;

        // Level 1: check whether assuming each possible value for each variable
        // results in contradiction or agreements (same deductions from all
        // values of a variable)
        let next_depth_queue = [];
        while (true) {
            if (next_depth_queue.length == 0) {
                console.log('Starting level 1 search...');
                next_depth_queue = this.next_depth();
                if (next_depth_queue.length == 0) {
                    this.status = 'unsolvable';
                    console.log('Depth not supported!');
                    return this;
                }
            }

            let deduction;
            while (next_depth_queue.length > 0) {
                deduction = next_depth_queue.shift();
                if (deduction.variable.value.includes(deduction.value)) break;
                deduction = null;
            }
            
            if (deduction) {
                this.deduct_queue.push(deduction);
                this.simplify();
                if (this.check_if_done())
                    return this;
            }
        }
    }
    
    debug_log(debug_level, ...args) {
        if (this.options.debug < debug_level) return;
        args[0] = " ".repeat(4 * this.search_depth).concat(args[0]);
        console.log.apply(null, args);
    }

    simplify() {
        while (true) {
            if ((this.options.mode != 'fast' || this.deduct_queue.length == 0) && this.check_queue.length > 0) {
                if (!this.next_check())
                    return;
            }
            else if ((this.options.mode != 'thorough' || this.check_queue.length == 0) && (this.options.mode != 'nextstep' && this.deduct_queue.length > 0)) {
                if (!this.next_deduct())
                    return;
            }
            else {
                // And this is where I would put my recursions...
                // IF I HAD ANY!!!
                this.debug_log(1, "No more level-" + this.search_depth, "deductions found.");
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
        let values = variable.value;
        if (values.length == 1)
            return true;
        let constraint = check.constraint;
        let var_id = variable.var_id;
        this.debug_log(3, " Checking variable", var_id, `(${variable.vpos?.x},${variable.vpos?.y})`, "on constraint", constraint.id);

        for (let value of values) {
            variable.value = [value];
            this.global_stats.total_constraint_checks++;
            if (constraint.check(constraint.variables, constraint.target))
                continue;
            if (this.deduct_queue.find(d => d.variable == variable && d.value == value))
                continue;

            this.deduct_queue.push({ variable, value, constraint });
            this.debug_log(2, "  Variable", var_id, `(${variable.vpos?.x},${variable.vpos?.y})`, "with value", value, "fails constraint", constraint.id);
            if (values.every(v => ++this.global_stats.total_contradiction_checks && this.deduct_queue.find(d => d.variable == variable && d.value == v))) {
                this.debug_log(2, "  Contradiction! Aborting solve...");
                this.status = "contradiction";
                return false;
            }
        }

        variable.value = values;
        return true;
    }

    next_deduct() {
        let deduction = this.deduct_queue.shift();
        deduction.id = this.deductions_made.length;
        this.deductions_made.push(deduction);
        let variable = deduction.variable;

        this.debug_log(1, "Deduction", deduction.id, ": variable", variable.var_id, `(${variable.vpos?.x},${variable.vpos?.y})`, "cannot have value", deduction.value);
        variable.value.splice(variable.value.indexOf(deduction.value), 1);
        if (variable.value.length == 1) {
            this.debug_log(1, "  Variable", variable.var_id, `(${variable.vpos?.x},${variable.vpos?.y})`, "has value", variable.value[0]);
        } else if (variable.value.length == 0) {
            this.debug_log(1, "  Contradiction! Aborting solve...");
            this.status = "contradiction";
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

    next_depth() {
        let base_partsol = this.partsol;
        base_partsol.save();

        let all_agreements = [];
        for (let variable of this.variables) if (variable.value.length > 1) {
            let partsols = [];
            let contradictions = [];
            this.deductions_made = [];
            let values = variable.value.slice();
            for (let value of values) {
                let new_partsol = new PartialSolution(this, this.search_depth + 1);
                this.debug_log(1, '  Setting variable', variable.var_id, `(${variable.vpos?.x},${variable.vpos?.y})`, 'to', value);
                this.variables[variable.var_id].value = [value];
                for (let v2 of values) if (v2 != value)
                    this.deductions_made.push({ variable, value: v2 });
                for (let constraint of this.variables[variable.var_id].constraints) {
                    for (let subvariable of constraint.variables)
                        this.check_queue.push({ variable: subvariable, constraint });
                }
                this.debug_log(1, '  >>>>>>>>>>>>>>>>');
                this.search_depth++;
                this.simplify();
                new_partsol.save();
                this.search_depth--;
                this.debug_log(1, '  <<<<<<<<<<<<<<<<');
                if (this.status == 'contradiction') {
                    this.debug_log(1, '  Variable', variable.var_id, `(${variable.vpos?.x},${variable.vpos?.y})`, 'with value', value, 'causes a contradiction');
                    contradictions.push({ variable, value });
                    console.log(variable.var_id, value)
                } else {
                    this.debug_log(1, '  Variable', variable.var_id, `(${variable.vpos?.x},${variable.vpos?.y})`, 'with value', value, 'leads to', this.deductions_made.length, 'simplifications');
                    partsols.push(new_partsol);
                }
                base_partsol.restore();
            }
            let agreement = PartialSolution.agreement(partsols).deductions_made;
            this.debug_log(1, '  Variable', variable.var_id, `(${variable.vpos?.x},${variable.vpos?.y})`, 'agreement:', agreement.map(x => 'v' + x.variable.var_id + ' => ' + x.value).join('; '));
            if (agreement.length > 0)
                all_agreements.push({contradictions, agreement});
        }
        //this.debug_log(1, 'Level', this.search_depth, 'deductions found:', all_agreements.map(x => 'v' + x.contradictions.variable.var_id + ' => ' + x.value))
        
        all_agreements.sort((a, b) => b.agreement.length - a.agreement.length);
        return all_agreements.flatMap(x => x.contradictions);
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
    constructor(puzzle, level) {
        this.puzzle = puzzle;
        this.level = level;
        this.save();
    }

    static #propsToSave = ['check_queue', 'deduct_queue', 'deductions_made', 'status'];
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

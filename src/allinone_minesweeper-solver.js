const SUM_EQUALS = function (vars, target) {
	let old_sums = new Set([0]);
	for (let variable of vars) {
		let sums = new Set();
		for (let value of variable.value)
			for (let sum of old_sums)
				sums.add(+value + sum);
		old_sums = sums;
	}
	return old_sums.has(+target);
}

let variables = [], constraints = [];
let varmap = [];

let task = [[0,-1,-1,-1,1,-1,-1,-1,-1,-1,1,-1,-1,-1,1,-1,-1,-1,-1,-1],[-1,1,-1,-1,1,2,3,-1,-1,4,3,2,-1,2,-1,0,-1,2,-1,2],[-1,1,2,-1,-1,-1,2,2,-1,-1,-1,-1,-1,-1,2,-1,-1,3,-1,2],[-1,-1,3,-1,-1,2,-1,3,-1,4,5,-1,-1,3,-1,-1,2,-1,3,-1],[-1,3,-1,3,3,-1,-1,-1,-1,-1,-1,-1,-1,2,-1,-1,-1,3,-1,3],[-1,-1,-1,-1,4,-1,3,-1,3,-1,-1,-1,2,-1,-1,-1,2,-1,-1,-1],[2,3,4,-1,-1,2,-1,-1,-1,-1,2,-1,3,4,-1,4,-1,-1,-1,-1],[2,-1,-1,-1,-1,-1,-1,0,-1,-1,3,-1,-1,-1,-1,-1,-1,2,-1,3],[-1,-1,4,2,-1,-1,2,-1,1,-1,-1,-1,5,-1,-1,2,1,-1,2,-1],[-1,-1,-1,-1,-1,-1,1,-1,-1,-1,-1,-1,2,-1,-1,-1,1,-1,-1,-1],[-1,3,3,2,1,-1,1,-1,-1,-1,1,-1,2,1,-1,-1,1,2,2,-1],[1,-1,-1,-1,2,-1,0,-1,1,-1,-1,-1,-1,-1,-1,1,-1,1,-1,-1],[-1,-1,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2,-1,-1,-1,-1,3,-1],[2,-1,-1,-1,2,1,-1,-1,0,-1,3,5,-1,-1,1,-1,1,-1,-1,-1],[-1,-1,4,-1,-1,-1,3,-1,-1,2,-1,-1,1,-1,-1,-1,-1,3,-1,2],[2,2,-1,-1,2,-1,-1,3,-1,-1,1,-1,1,1,3,-1,-1,-1,3,2],[-1,2,1,0,-1,-1,-1,3,-1,-1,-1,-1,-1,-1,-1,-1,3,-1,-1,-1],[-1,-1,-1,-1,2,-1,-1,3,-1,3,-1,-1,-1,-1,2,2,-1,2,2,1],[2,-1,-1,-1,-1,2,-1,2,-1,2,2,3,-1,3,-1,-1,-1,1,1,-1],[-1,-1,2,3,-1,-1,-1,-1,-1,-1,1,-1,1,-1,-1,-1,1,-1,-1,-1]];

console.log("\n\n\n\n\n\nParsing puzzle...");

// set up variables
for (let y in task) {
	varmap[y] = [];
	for (let x in task[y]) {
		varmap[y][x] = -1;
		let c = task[y][x];
		if (c != -1) continue;
		
		let variable = {
			value: [0, 1],
			const_ids: [],
			id: variables.length,
			deductions: [],
			x, y
		};
		varmap[y][x] = variable.id;
		variables.push(variable);
	}
}

// set up constraints
for (let y in task) {
	for (let x in task[y]) {
		let c = task[y][x];
		if (c == -1) continue;
		
		let constraint = {
			check: SUM_EQUALS,
			var_ids: [],
			target: +c,
			id: constraints.length,
			deductions: []
		};
		for ([dx,dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
			let variable = variables[varmap[+y + dy]?.[+x + dx]];
			if (variable) {
				constraint.var_ids.push(variable.id);
				variable.const_ids.push(constraint.id);
			}
		}
		constraints.push(constraint);
	}
}
console.log("Done parsing. Created", variables.length, "variables and", constraints.length, "constraints.");

function object_clone(object) {
	if (typeof object != 'object')
		return object;
	
	let clone = new object.constructor();
	for (let k in object)
		clone[k] = object_clone(object[k]);
	return clone;
}

let start_time = new Date;
let total_constraint_checks, total_level_checks;
function generic_solver(puzzle) {
	function debug_log() {
		if (!puzzle.debug) return;
		let args = [...arguments];
		args[0] = " ".repeat(4 * puzzle.levels?.length) + args[0];
		console.log.apply(console, args);
	}
	debug_log("Starting solver...");
	puzzle = object_clone(puzzle);
	let levels = puzzle.levels;
	if (!levels || levels.length == 0) {
		levels = puzzle.levels = [];
		puzzle.status = "partial";
		total_constraint_checks = 0, total_level_checks = [];
	}
	puzzle.max_levels = puzzle.max_levels || 0;
	total_level_checks[levels.length] = -~total_level_checks[levels.length];
	let all_variables = puzzle.variables;
	let all_constraints = puzzle.constraints;
	let deduct_queue = [], check_queue = [];
	let deductions_made = puzzle.deductions_made = [];
	
	if (puzzle.constraints_to_check) {
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
	}
	
	let next_level_index = 0;
	
	while (true) {
		if (check_queue.length > 0) {
			let check = check_queue.shift();
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
			
			variable.value = values;
		}
		else if (deduct_queue.length > 0) {
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
			}
		}
		else {
			// This is where I would put my recursions...
			// IF I HAD ANY!!!
			debug_log("No more level-" + levels.length, "deductions found.");
			if (levels.length >= puzzle.max_levels) {
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

let puzzle = generic_solver({ variables, constraints, max_levels: 1, debug: true });
console.log("Puzzle result:", puzzle.status);
console.log("Took", new Date - start_time, "ms");
console.log("Took", total_constraint_checks, "constraint checks and", total_level_checks, "recursions");

console.log(varmap.map((r, y) => r.map((c, x) => c != -1 ? puzzle.variables[c].value.length == 1 ? ".#"[puzzle.variables[c].value] : "?" : task[y][x]).join(" ")).join("\n"))
let Puzzle = require('./base/Puzzle.js');
let Array2D = require('./base/Array2D.js');

const SUM_LT = function (vars, target) {
	let old_sums = new Set([0]);
	for (let variable of vars) {
		let sums = new Set();
		for (let value of variable.value)
			for (let sum of old_sums)
				if (+value + sum < target)
					sums.add(+value + sum);
		old_sums = sums;
	}
	return old_sums.size > 0;
}
const ALL_CONNECTED = function (vars, target) {
	let islands = [], island_map = [];
	function merge_islands(a, b) {
		if (a == b) return;
		let island_b = islands[b];
		islands[b] = undefined;
		for (let [x, y] of island_b) {
			island_map[y][x] = a;
			islands[a].push([x, y]);
		}
	}
	let height = 0, width = 0;
	for (let variable of vars) {
		if (!vars.value.includes(target)) continue;
		let { x, y } = variable.pos;
		if (x >= width) width = x + 1;
		if (y >= height) height = y + 1;
		if (!island_map[y]) island_map[y] = [];
		island_map[y][x] = islands.length;
		islands.push([[x, y]]);
	}
	for (let y = 0; y < height; y++) {
		if (!island_map[y]) continue;
		for (let x = 0; x < width; x++) {
			if (x > 0 && island_map[y][x - 1] > -1)
				merge_islands(island_map[y][x - 1], island_map[y][x]);
			if (y > 0 && island_map[y - 1]?.[x] > -1)
				merge_islands(island_map[y - 1][x], island_map[y][x]);
		}
	}
	return islands.filter(x => x).length <= 1;
}
const ISLAND_SIZE = function (vars, { center, size }) {
	
}

let variables = [], constraints = [];
let varmap = [];

let task = [[3,-1,-1,-1,5],[-1,-1,-1,-1,-1],[1,-1,-1,-1,-1],[-1,-1,-1,-1,-1],[-1,-1,-1,-1,5]];

console.log("\n\n\n\n\n\nParsing puzzle...");

// set up variables
for (let y in task) {
	varmap[y] = [];
	for (let x in task[y]) {
		varmap[y][x] = -1;
		let c = task[y][x];
		
		let variable = {
			id: variables.length,
			value: c == -1 ? [0, 1] : [0],
			constraints: [],
			pos: { x: +x, y: +y }
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
			id: constraints.length,
			check: SUM_EQUALS,
			variables: [],
			target: +c
		};
		for ([dx,dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
			let variable = variables[varmap[+y + dy]?.[+x + dx]];
			if (variable) {
				constraint.variables.push(variable);
				variable.constraints.push(constraint);
			}
		}
		constraints.push(constraint);
	}
}
console.log("Done parsing. Created", variables.length, "variables and", constraints.length, "constraints.");

let start_time = new Date;
let puzzle = new Puzzle(variables, constraints);
puzzle.solve({ max_depth: 1, debug: !true });
console.log("Puzzle result:", puzzle.partsol.status);
console.log("Took", new Date - start_time, "ms");
console.log("Stats:", puzzle.global_stats);

console.log(varmap.map((r, y) => r.map((c, x) => c != -1 ? puzzle.partsol.variables[c].value.length == 1 ? ".#"[puzzle.partsol.variables[c].value] : "?" : task[y][x]).join(" ")).join("\n"))
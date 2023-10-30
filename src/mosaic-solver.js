let Puzzle = require('./base/Puzzle.js');

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

let task = [[-1, 1, -1, -1, -1, -1, -1, -1, 3, -1], [2, 3, -1, -1, 6, 5, 7, 6, 6, -1], [3, -1, 4, -1, 3, 2, -1, 5, -1, 3], [3, -1, 3, 2, 2, 1, -1, 5, 6, 3], [3, 3, 1, 1, -1, 1, -1, -1, -1, 3], [4, -1, 4, 4, 4, -1, -1, -1, -1, -1], [-1, -1, 4, -1, 5, -1, -1, -1, 4, 3], [5, 6, -1, -1, 6, -1, 3, 1, 2, -1], [4, -1, 5, 4, -1, 6, 4, 3, 3, -1], [-1, 4, -1, 4, -1, 4, -1, -1, -1, 2]];

console.log("\n\n\n\n\n\nParsing puzzle...");

// set up variables
for (let y in task) {
    varmap[y] = [];
    for (let x in task[y]) {
        varmap[y][x] = -1;
        let c = task[y][x];

        let variable = {
            id: variables.length,
            value: [0, 1],
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
        for ([dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
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
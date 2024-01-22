const Puzzle = require('../base/Puzzle.js');
const Constraints = require('../base/generic-constraints.js');
const SquareGrid = require('../base/SquareGrid.js');

class ThermometersPuzzle extends Puzzle {
    constructor(areas, task) {
        super();
        this.grid = SquareGrid.fromAreas(areas);
        if (this.grid.width + this.grid.height != task.length)
            throw new Error("Task length must equal width of grid plus height of grid");
        this.areas = areas;
        let var_id = 0;
        this.variables = [];
        this.structures = { thermo: [] };
        this.constraints = [];

        const THERMO_LENGTH = function([thermo, cell], target) {
            if (cell.value.includes(0) && thermo.value.some(v => v <= target))
                return true;
            if (cell.value.includes(1) && thermo.value.some(v => v > target))
                return true;
            return false;
        };
        for (let area of areas) {
            let thermo = { id: this.structures.thermo.length, vars: [], value: [0] };
            for (let pos of area) {
                let cell = this.grid.cellmap.get2D(pos.x, pos.y);
                this.addVariable(cell, [0, 1]);

                thermo.vars.push(cell);
                thermo.value.push(thermo.vars.length);

                this.addConstraint(THERMO_LENGTH, [thermo, cell], thermo.vars.length - 1);
            }
            this.structures.thermo.push(thermo);
        }

        let i = 0;
        for (let vars of [...this.grid.cellCols, ...this.grid.cellRows]) {
            this.addConstraint(Constraints.SUM_EQUALS, vars, task[i++]);
        }
    }
}

let testPuzzle = new ThermometersPuzzle([[{ x: 0, y: 0 }, { x: 0, y: 1 }], [{ x: 1, y: 1 }, { x: 1, y: 0 }]], [1, 1, 1, 1]);
//let testPuzzle = new ThermometersPuzzle([[{x:0,y:0},{x:1,y:0},{x:2,y:0}],[{x:3,y:1},{x:3,y:0}],[{x:0,y:1},{x:1,y:1},{x:2,y:1}],[{x:0,y:2},{x:0,y:3}],[{x:1,y:2},{x:1,y:3}],[{x:2,y:2},{x:3,y:2}],[{x:3,y:3},{x:2,y:3}]], [2,2,1,2,3,2,1,1]);
console.log(testPuzzle);
testPuzzle.solve({ max_depth: 0, debug: Infinity });
for (let row of testPuzzle.grid.cellRows)
    console.log(row.map(v => v.value.length > 1 ? "?" : v.value[0] == 1 ? "X" : "_").join(" "));

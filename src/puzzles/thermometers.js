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
            let thermo = { id: this.structures.thermo.length, vars: [], value: [] };
            for (let pos of area) {
                let cell = this.grid.cellmap.get2D(pos.x, pos.y);
                cell.value = [0, 1];
                cell.var_id = var_id++;
                this.variables.push(cell);

                thermo.vars.push(cell);
                thermo.value.push(thermo.vars.length);

                this.constraints.push({
                    id: this.constraints.length,
                    check: THERMO_LENGTH,
                    vars: [thermo, cell],
                    target: thermo.vars.length - 1
                });
            }
            this.structures.thermo.push(thermo);
        }

        let i = 0;
        for (let vars of [...this.grid.cellRows, ...this.grid.cellCols]) {
            this.constraints.push({
                id: this.constraints.length,
                check: Constraints.SUM_EQUALS,
                vars: vars,
                target: task[i++]
            });
        }
    }
}

let testPuzzle = new ThermometersPuzzle([[{ x: 0, y: 0 }, { x: 0, y: 1 }], [{ x: 1, y: 1 }, { x: 1, y: 0 }]], [1, 1, 1, 1]);
console.log(testPuzzle);

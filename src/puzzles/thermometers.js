const Puzzle = require('../base/Puzzle.js');
const Constraints = require('../base/generic-constraints.js');
const SquareGrid = require('../base/SquareGrid.js');

class ThermometersPuzzle extends Puzzle {
    constructor({ thermometers, sums }) {
        super(SquareGrid.fromAreas(thermometers));
        if (this.grid.width + this.grid.height != sums.length)
            throw new Error("Task length must equal width of grid plus height of grid");
        this.areas = thermometers;
        this.structures = { thermo: [] };

        const THERMO_LENGTH = function([thermo, cell], target) {
            if (cell.value.includes(0) && thermo.value.some(v => v <= target))
                return true;
            if (cell.value.includes(1) && thermo.value.some(v => v > target))
                return true;
            return false;
        };
        for (let area of thermometers) {
            let thermo = { vars: [] };
            this.addVariable(thermo, [0], false);
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
            this.addConstraint(Constraints.SUM_EQUALS, vars, sums[i++]);
        }
    }
}

module.exports = ThermometersPuzzle;

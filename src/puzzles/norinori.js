const Puzzle = require('../base/Puzzle.js');
const Constraints = require('../base/generic-constraints.js');
const SquareGrid = require('../base/SquareGrid.js');

class NorinoriPuzzle extends Puzzle {
    constructor({ areas }) {
        super(SquareGrid.fromAreas(areas));
        this.areas = areas;

        const ONLY_DOMINOES = function([cell, ...adj], target) {
            if (cell.value.includes(0))
                return true;
            return Constraints.SUM_EQUALS(adj, target);
        }

        for (let area of areas) {
            let cells = [];
            for (let pos of area) {
                let cell = this.grid.cellmap.get2D(pos.x, pos.y);
                cells.push(cell);
                this.addVariable(cell, [0, 1]);
                this.addConstraint(ONLY_DOMINOES, [cell, ...cell.adjacentEdge], 1);
            }
            this.addConstraint(Constraints.SUM_EQUALS, cells, 2);
        }
    }
}

module.exports = NorinoriPuzzle;

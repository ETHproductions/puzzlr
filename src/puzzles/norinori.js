import Puzzle from '../base/Puzzle.js';
import { SUM_EQUALS } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class NorinoriPuzzle extends Puzzle {
    get type() { return 'norinori'; }
    constructor({ areas }) {
        super(SquareGrid.fromAreas(areas));
        this.areas = areas;

        const ONLY_DOMINOES = function([cell, ...adj], target) {
            if (cell.value.includes(0))
                return true;
            return SUM_EQUALS(adj, target);
        }

        for (let area of areas) {
            let cells = [];
            for (let pos of area) {
                let cell = this.grid.cellmap.get2D(pos.x, pos.y);
                cells.push(cell);
                this.addVariable(cell, [0, 1]);
                this.addConstraint(ONLY_DOMINOES, [cell, ...cell.adjacentEdge], 1);
            }
            this.addConstraint(SUM_EQUALS, cells, 2);
        }
    }
}

export default NorinoriPuzzle;

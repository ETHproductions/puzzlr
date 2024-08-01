import Puzzle from '../base/Puzzle.js';
import { SUM_EQUALS, SUM_EQUALS_IF } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class NorinoriPuzzle extends Puzzle {
    get type() { return 'norinori'; }
    get renderSettings() { return { defaultScale: 30, funcs: ["edgearea", "binarygrey"] }; }
    constructor({ areas }) {
        super(SquareGrid.fromAreas(areas));
        this.areas = areas;

        for (let area of areas) {
            let cells = [];
            for (let pos of area) {
                let cell = this.grid.cellmap.get2D(pos.x, pos.y);
                cells.push(cell);
                this.addVariable(cell, [0, 1]);
                this.addConstraint(SUM_EQUALS_IF, [cell, ...cell.adjacentEdge], 1, 1);
            }
            this.addConstraint(SUM_EQUALS, cells, 2);
        }
    }
}

export default NorinoriPuzzle;

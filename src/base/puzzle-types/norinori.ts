import Puzzle from '../Puzzle';
import { SUM_EQUALS, SUM_EQUALS_IF } from '../base/generic-constraints.js';
import SquareGrid from '../grids/SquareGrid';

class NorinoriPuzzle extends Puzzle {
    get type() { return 'norinori'; }
    get renderSettings() { return { defaultScale: 30, funcs: ["edgearea", "binarygrey"] }; }

    areas: { x: number, y: number }[][];
    constructor({ areas }: { areas: { x: number, y: number }[][] }) {
        super(SquareGrid.fromAreas(areas));
        this.areas = areas;

        for (const area of areas) {
            const cells = [];
            for (const pos of area) {
                const cell = this.grid.cellmap.get2D(pos.x, pos.y);
                cells.push(cell);
                this.addVariable(cell, [0, 1]);
                this.addConstraint(SUM_EQUALS_IF, [cell, ...cell.adjacentEdge], 1, 1);
            }
            this.addConstraint(SUM_EQUALS, cells, 2);
        }
    }
}

export default NorinoriPuzzle;
import Puzzle from '../base/Puzzle.js';
import { SUM_EQUALS, SUM_EQUALS_IF } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class StarBattlePuzzle extends Puzzle {
    get type() { return 'star-battle'; }
    get renderSettings() { return { defaultScale: 30, funcs: ["edgearea", "binarygrey"] }; }
    constructor({ areas, star_count }) {
        super(SquareGrid.fromAreas(areas));
        this.areas = areas;

        for (let area of areas) {
            let cells = [];
            for (let pos of area) {
                let cell = this.grid.cellmap.get2D(pos.x, pos.y);
                cells.push(cell);
                this.addVariable(cell, [0, 1]);
                this.addConstraint(SUM_EQUALS_IF, [cell, ...cell.adjacentAll], 1, 0);
            }
            this.addConstraint(SUM_EQUALS, cells, star_count);
        }
        
        for (let vars of [...this.grid.cellCols, ...this.grid.cellRows]) {
            this.addConstraint(SUM_EQUALS, vars, star_count);
        }
    }
}

export default StarBattlePuzzle;

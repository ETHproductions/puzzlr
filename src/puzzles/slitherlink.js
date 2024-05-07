import Puzzle from '../base/Puzzle.js';
import { SUM_EQUALS, SUM_EQUALS_ANY, CONTIG_EDGE_ALL } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class SlitherlinkPuzzle extends Puzzle {
    get type() { return 'slitherlink'; }
    constructor({ grid, task }) {
        super(SquareGrid.fromSize(grid.width, grid.height));
        
        for (let edge of this.grid.edges) {
            this.addVariable(edge, [0, 1]);
            this.addConstraint(CONTIG_EDGE_ALL, [edge], 1);
        }
        for (let vert of this.grid.verts) {
            this.addConstraint(SUM_EQUALS_ANY, vert.edges, [0, 2]);
        }
        this.grid.cellmap.map((cell, {x, y}) => {
            let hint = task[y][x];
            if (hint != -1) {
                cell.value = hint;
                this.addConstraint(SUM_EQUALS, cell.edges, hint);
            }
        });
    }
}

export default SlitherlinkPuzzle;

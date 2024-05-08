import Puzzle from '../base/Puzzle.js';
import { SUM_EQUALS, SUM_EQUALS_ANY, CONTIG_EDGE_ALL } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class SlitherlinkPuzzle extends Puzzle {
    get type() { return 'slitherlink'; }
    constructor({ grid, task }) {
        super(SquareGrid.fromSize(grid.width, grid.height));
        
        function DIFF_EQUALS([edge, cell1, cell2]) {
            let val1 = cell1.value;
            let val2 = cell2 ? cell2.value : [0];
            if (edge.value.includes(0) && val1.some(v => val2.includes(v)))
                return true;
            if (edge.value.includes(1) && val1.some(v => val2 != v))
                return true;
            return false;
        }
        this.addConstraint(CONTIG_EDGE_ALL, this.grid.edges, 1);
        for (let edge of this.grid.edges) {
            this.addVariable(edge, [0, 1]);
            this.addConstraint(DIFF_EQUALS, [edge, edge.leftCell, edge.rightCell].filter(x => x));
        }
        for (let vert of this.grid.verts) {
            this.addConstraint(SUM_EQUALS_ANY, vert.edges, [0, 2]);
        }
        this.grid.cellmap.map((cell, {x, y}) => {
            this.addVariable(cell, [0, 1], false);
            let hint = task[y][x];
            if (hint != -1) {
                cell.hint = hint;
                this.addConstraint(SUM_EQUALS, cell.edges, hint);
            }
        });
    }
}

export default SlitherlinkPuzzle;

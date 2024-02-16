import Puzzle from '../base/Puzzle.js';
import { SUM_EQUALS } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class DominosaPuzzle extends Puzzle {
    get type() { return 'dominosa'; }
    constructor({ grid, task }) {
        super(SquareGrid.fromSize(grid.width, grid.height));

        let maxNum = 0;
        this.grid.cellmap.map((cell, {x, y}) => {
            cell.value = task[y][x];
            if (cell.value > maxNum) maxNum = cell.value;
        });
        let uniqueDominoes = {};
        for (let i = 0; i <= maxNum; i++) {
            for (let j = i; j <= maxNum; j++) {
                uniqueDominoes[[i, j]] = [];
            }
        }
        for (let edge of this.grid.edges) {
            if (!edge.leftCell || !edge.rightCell) continue;
            this.addVariable(edge, [0, 1]);
            
            let id = [edge.leftCell.value, edge.rightCell.value];
            if (id[0] > id[1]) id.reverse();
            uniqueDominoes[id].push(edge);
        }
        for (let id of Object.keys(uniqueDominoes))
            this.addConstraint(SUM_EQUALS, uniqueDominoes[id], 1);

        for (let cell of this.grid.cells) {
            let edges = [];
            for (let edge of cell.edges)
                if (!edge.isEdgeOfGrid)
                    edges.push(edge);
            this.addConstraint(SUM_EQUALS, edges, 1);
        }
    }
}

export default DominosaPuzzle;

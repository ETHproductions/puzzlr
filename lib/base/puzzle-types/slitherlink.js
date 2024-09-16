import Puzzle from "../Puzzle.js";
import { SUM_EQUALS, SUM_EQUALS_ANY, CONTIG_EDGE_ALL, } from "../generic-constraints.js";
import SquareGrid from "../grids/SquareGrid.js";
export default class SlitherlinkPuzzle extends Puzzle {
    static get type() {
        return "slitherlink";
    }
    get renderSettings() {
        return { defaultScale: 24, funcs: ["numhint", "edgedraw"] };
    }
    constructor({ grid, task, color = false, }) {
        const _grid = SquareGrid.fromSize(grid.width, grid.height);
        super(_grid);
        function DIFF_EQUALS([edge, cell1, cell2]) {
            const val1 = cell1.value;
            const val2 = cell2 ? cell2.value : [0];
            if (edge.value.includes(0) && val1.some((v) => val2.includes(v)))
                return true;
            if (edge.value.includes(1) &&
                val1.some((v) => val2.length != 1 || val2[0] != v))
                return true;
            return false;
        }
        this.addConstraint(CONTIG_EDGE_ALL, this.grid.edges, 1);
        for (const edge of this.grid.edges) {
            this.addVariable(edge, [0, 1]);
            if (color)
                this.addConstraint(DIFF_EQUALS, [edge, edge.leftCell, edge.rightCell].filter((x) => x));
        }
        for (const vert of this.grid.verts) {
            this.addConstraint(SUM_EQUALS_ANY, vert.edges, [0, 2]);
        }
        _grid.cellmap.map((cell, { x, y }) => {
            if (color)
                this.addVariable(cell, [0, 1], false);
            const hint = task[y][x];
            if (hint != -1) {
                cell.hint = hint;
                this.addConstraint(SUM_EQUALS, cell.edges, hint);
            }
        });
    }
}
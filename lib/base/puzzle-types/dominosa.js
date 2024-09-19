import Puzzle from "../Puzzle.js";
import { SUM_EQUALS } from "../generic-constraints.js";
import SquareGrid from "../grids/SquareGrid.js";
export default class DominosaPuzzle extends Puzzle {
    static get type() {
        return "dominosa";
    }
    get renderSettings() {
        return { defaultScale: 20, funcs: ["numhint", "edgedomino"] };
    }
    uniqueDominoes = {};
    constructor({ grid, task, }) {
        const _grid = SquareGrid.fromSize(grid.width, grid.height);
        super(_grid);
        let maxNum = 0;
        _grid.cellmap.map((cell, { x, y }) => {
            cell.hint = task[y][x];
            if (cell.hint > maxNum)
                maxNum = cell.hint;
        });
        this.uniqueDominoes = {};
        for (let i = 0; i <= maxNum; i++) {
            for (let j = i; j <= maxNum; j++) {
                this.uniqueDominoes[i + "," + j] = [];
            }
        }
        for (const edge of this.grid.edges) {
            if (!edge.leftCell || !edge.rightCell)
                continue;
            this.addVariable(edge, [0, 1]);
            const id = [edge.leftCell.hint, edge.rightCell.hint];
            if (id[0] > id[1])
                id.reverse();
            this.uniqueDominoes[id + ""].push(edge);
        }
        for (const id of Object.keys(this.uniqueDominoes))
            this.addConstraint(SUM_EQUALS, this.uniqueDominoes[id], 1);
        for (const cell of this.grid.cells) {
            const edges = [];
            for (const edge of cell.edges)
                if (!edge.isEdgeOfGrid)
                    edges.push(edge);
            this.addConstraint(SUM_EQUALS, edges, 1);
        }
    }
}

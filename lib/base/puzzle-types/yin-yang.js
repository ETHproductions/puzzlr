import Puzzle from "../Puzzle.js";
import { CONTIG_CELL_ALL } from "../generic-constraints.js";
import SquareGrid from "../grids/SquareGrid.js";
export default class YinYangPuzzle extends Puzzle {
    static get type() {
        return "yin-yang";
    }
    get renderSettings() {
        return { defaultScale: 24, funcs: ["edgearea", "binarygrey"] };
    }
    constructor({ grid, task, }) {
        const _grid = SquareGrid.fromSize(grid.width, grid.height);
        super(_grid);
        _grid.cellmap.map((cell, { x, y }) => {
            const hint = task[y][x];
            if (hint != -1)
                cell.hint = hint;
            this.addVariable(cell, hint != -1 ? [hint] : [0, 1]);
        });
        this.addConstraint(CONTIG_CELL_ALL, this.grid.cells, 0);
        this.addConstraint(CONTIG_CELL_ALL, this.grid.cells, 1);
        function NOT_ALL_EQUAL(cells) {
            const value = cells[0].value;
            if (value.length > 1)
                return true;
            for (let i = 0; i < cells.length; i++) {
                if (cells[i].value.length > 1 || cells[i].value[0] != value[0])
                    return true;
            }
            return false;
        }
        function NOT_CHECKER_2x2(cells) {
            for (let i = 0; i < cells.length; i++) {
                if (cells[(i + 1) % cells.length].value.some((v) => cells[i].valueHas(v)))
                    return true;
            }
            return false;
        }
        _grid.verts.map((vert) => vert.cells.length == 4 &&
            (this.addConstraint(NOT_ALL_EQUAL, vert.cells),
                this.addConstraint(NOT_CHECKER_2x2, vert.cells)));
        function BORDER_CONTIG(cells) {
            const values = new Set([].concat(...cells.map((c) => c.value)));
            for (const v of values) {
                let indices = cells.map((c) => c.valueIs(v) ? 1 : c.valueHas(v) ? 0 : -1);
                const index = indices.indexOf(1);
                if (index == -1)
                    continue;
                indices = indices.slice(index).concat(indices.slice(0, index));
                // If there is more than one pair of 1s with a -1 in between,
                // this is an invalid border
                let broken = false, can_break = false;
                for (const i of indices) {
                    if (i == 1)
                        can_break = true;
                    if (i == -1 && can_break) {
                        if (broken)
                            return false;
                        broken = true;
                        can_break = false;
                    }
                }
            }
            return true;
        }
        const foundEdges = new Set();
        for (const edge of this.grid.edges)
            if (edge.isEdgeOfGrid && !foundEdges.has(edge)) {
                let nextEdge = edge;
                let nextVert = edge.toVert;
                const cellLoop = [];
                while (!foundEdges.has(nextEdge)) {
                    foundEdges.add(nextEdge);
                    for (const cell of nextVert.cells.slice().reverse())
                        if (cell != null && !cellLoop.includes(cell))
                            cellLoop.push(cell);
                    nextEdge = nextVert.edges.find((e) => e.isEdgeOfGrid && e != nextEdge);
                    nextVert = nextEdge.otherVert(nextVert);
                }
                this.addConstraint(BORDER_CONTIG, cellLoop);
            }
    }
}

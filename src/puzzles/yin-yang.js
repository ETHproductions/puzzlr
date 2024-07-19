import Puzzle from '../base/Puzzle.js';
import { CONTIG_CELL_ALL } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class YinYangPuzzle extends Puzzle {
    get type() { return 'yin-yang'; }
    constructor({ grid, task }) {
        let size = task.length;

        super(SquareGrid.fromSize(grid.width, grid.height));

        this.grid.cellmap.map((cell, {x, y}) => {
            let hint = task[y][x];
            this.addVariable(cell, hint != -1 ? [hint] : [0, 1]);
        });
        
        this.addConstraint(CONTIG_CELL_ALL, this.grid.cells, 0);
        this.addConstraint(CONTIG_CELL_ALL, this.grid.cells, 1);

        function NOT_ALL_EQUAL(cells) {
            let value = cells[0].value;
            if (value.length > 1) return true;
            for (let i = 0; i < cells.length; i++) {
                if (cells[i].value.length > 1 || cells[i].value[0] != value[0]) return true;
            }
            return false;
        }
        function NOT_CHECKER_2x2(cells) {
            for (let i = 0; i < cells.length; i++) {
                if (cells[(i + 1) % cells.length].value.some(v => cells[i].value.includes(v)))
                    return true;
            }
            return false;
        }

        this.grid.verts.map(vert => vert.cells.length == 4 && (
            this.addConstraint(NOT_ALL_EQUAL, vert.cells),
            this.addConstraint(NOT_CHECKER_2x2, vert.cells)
        ));

        function BORDER_CONTIG(cells) {
            let value_map = [];
            for (let v of cells.slice(-1)[0].value)
                value_map.push({ value: v, start: -1, end: -1 });
            for (let i = 0; i < cells.length; i++) {
                let {value} = cells[i];
                if (value.length == 1) {
                    let v = value_map.find(v => v.value == value[0]);
                    if (!v) {
                        v = { value: value[0], start: i, end: -1 }
                        value_map.push(v);
                    }
                    if (v.start != -1 && v.start < v.end)
                        return false;
                    if (v.end != -1)
                        v.start = i;
                }
                let values_left = value.slice();
                for (let v of value_map) {
                    if (values_left.includes(v))
                        values_left.splice(values_left.indexOf(v), 1);
                    if (v.end == -1 && !value.includes(v.value)) {
                        v.end = i;
                    }
                }
                for (let v of values_left) {
                    value_map.push({ value: v, start: -1, end: -1 });
                }
            }
            return true;
        }

        let foundEdges = new Set(), cellLoops = [];
        for (let edge of this.grid.edges) if (edge.isEdgeOfGrid && !foundEdges.has(edge)) {
            let nextEdge = edge;
            let nextVert = edge.toVert;
            let cellLoop = [];
            while (!foundEdges.has(nextEdge)) {
                foundEdges.add(nextEdge);
                for (let cell of nextVert.cells) if (cell != null && !cellLoop.includes(cell)) cellLoop.push(cell);
                nextEdge = nextVert.edges.find(e => e.isEdgeOfGrid && e != nextEdge);
                nextVert = nextEdge.otherVert(nextVert);
            }
            //console.log(cellLoop);
            this.addConstraint(BORDER_CONTIG, cellLoop);
        }
    }
}

export default YinYangPuzzle;

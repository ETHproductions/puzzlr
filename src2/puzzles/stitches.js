import Puzzle from '../base/Puzzle.js';
import { SUM_EQUALS, SUM_EQUALS_IF } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class StitchesPuzzle extends Puzzle {
    get type() { return 'stitches'; }
    get renderSettings() { return { defaultScale: 30, funcs: ["edgestitch", "stitchhole"] }; }
    constructor({ stitch_count, areas, sums }) {
        super(SquareGrid.fromAreas(areas));
        if (this.grid.width + this.grid.height != sums.length)
            throw new Error("Task length must equal width of grid plus height of grid");
        this.areas = areas;
        this.colHints = sums.slice(0, this.grid.width);
        this.rowHints = sums.slice(this.grid.width);

        this.areaEdges = {};
        for (let i = 0; i <= areas.length; i++) {
            for (let j = i; j <= areas.length; j++) {
                this.areaEdges[[i, j]] = [];
            }
        }
        for (let edge of this.grid.edges) if (!edge.isEdgeOfGrid) {
            let id = [edge.leftCell.area_id, edge.rightCell.area_id];
            if (id[0] == id[1]) continue;
            if (id[0] > id[1]) id.reverse();
            this.areaEdges[id].push(edge);
            this.addVariable(edge, [0, 1]);
        }
        for (let id of Object.keys(this.areaEdges)) {
            if (this.areaEdges[id].length == 0)
                delete this.areaEdges[id];
            else
                this.addConstraint(SUM_EQUALS, this.areaEdges[id], stitch_count);
        }
        for (let cell of this.grid.cells) {
            this.addVariable(cell, [0, 1], false);
            this.addConstraint(SUM_EQUALS_IF, [cell, ...cell.edges.filter(e => e.value)], 0, 0);
            this.addConstraint(SUM_EQUALS_IF, [cell, ...cell.edges.filter(e => e.value)], 1, 1);
        }

        let i = 0;
        for (let vars of [...this.grid.cellCols, ...this.grid.cellRows]) {
            this.addConstraint(SUM_EQUALS, vars, sums[i++]);
        }
    }
}

export default StitchesPuzzle;

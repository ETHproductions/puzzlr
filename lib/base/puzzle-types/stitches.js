import Puzzle from "../Puzzle.js";
import { SUM_EQUALS, SUM_EQUALS_IF } from "../generic-constraints.js";
import SquareGrid from "../grids/SquareGrid.js";
export default class StitchesPuzzle extends Puzzle {
    static get type() {
        return "stitches";
    }
    get renderSettings() {
        return { defaultScale: 30, funcs: ["edgestitch", "stitchhole"] };
    }
    areas;
    colHints;
    rowHints;
    areaEdges;
    constructor({ stitch_count, areas, sums, }) {
        super(SquareGrid.fromAreas(areas));
        if (this.grid.width + this.grid.height != sums.length)
            throw new Error("Task length must equal width of grid plus height of grid");
        this.areas = areas;
        this.colHints = sums.slice(0, this.grid.width);
        this.rowHints = sums.slice(this.grid.width);
        this.areaEdges = {};
        for (let i = 0; i <= areas.length; i++) {
            for (let j = i; j <= areas.length; j++) {
                this.areaEdges[i + "," + j] = [];
            }
        }
        for (const edge of this.grid.edges)
            if (edge.isInnerEdge()) {
                const id = [edge.leftCell.area_id, edge.rightCell.area_id];
                if (id[0] == id[1])
                    continue;
                if (id[0] > id[1])
                    id.reverse();
                this.areaEdges[id + ""].push(edge);
                this.addVariable(edge, [0, 1]);
            }
        for (const id of Object.keys(this.areaEdges)) {
            if (this.areaEdges[id].length == 0)
                delete this.areaEdges[id];
            else
                this.addConstraint(SUM_EQUALS, this.areaEdges[id], stitch_count);
        }
        for (const cell of this.grid.cells) {
            this.addVariable(cell, [0, 1], false);
            this.addConstraint(SUM_EQUALS_IF, [cell, ...cell.edges.filter((e) => e.var_id > -1)], 0, 0);
            this.addConstraint(SUM_EQUALS_IF, [cell, ...cell.edges.filter((e) => e.var_id > -1)], 1, 1);
        }
        let i = 0;
        for (const vars of [...this.grid.cellCols, ...this.grid.cellRows]) {
            this.addConstraint(SUM_EQUALS, vars, sums[i++]);
        }
    }
}

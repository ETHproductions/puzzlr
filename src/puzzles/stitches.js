import Puzzle from '../base/Puzzle.js';
import { SUM_EQUALS } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class StitchesPuzzle extends Puzzle {
    get type() { return 'stitches'; }
    constructor({ stitch_count, areas, sums }) {
        super(SquareGrid.fromAreas(areas));
        if (this.grid.width + this.grid.height != sums.length)
            throw new Error("Task length must equal width of grid plus height of grid");
        this.areas = areas;

        const STITCH_DIRECTION = function([cell, ...edges]) {
            for (let i = 0; i < 4; i++) {
                let edgeval = cell.edges[i].value || [0];
                if ((!cell.value.includes(i) && !edgeval.includes(0)) || (cell.value == i && !edgeval.includes(1)))
                    return false;
            }
            return true;
        };
        const COUNT_EQUALS = function(cells, target) {
            let vars = [];
            for (let c of cells) {
                let value = [];
                if (c.value.includes(-1))
                    value.push(0);
                if (c.value != -1)
                    value.push(1);
                vars.push({ value });
            }
            return SUM_EQUALS(vars, target);
        }
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
            let value = [-1];
            for (let i = 0; i < 4; i++) {
                let edge = cell.edges[i];
                let otherCell = edge.leftCell == cell ? edge.rightCell : edge.leftCell;
                if (otherCell) value.push(i);
            }
            this.addVariable(cell, value, false);
            this.addConstraint(STITCH_DIRECTION, [cell, ...cell.edges.filter(e => e.value)]);
        }

        let i = 0;
        for (let vars of [...this.grid.cellCols, ...this.grid.cellRows]) {
            this.addConstraint(COUNT_EQUALS, vars, sums[i++]);
        }
    }
}

export default StitchesPuzzle;

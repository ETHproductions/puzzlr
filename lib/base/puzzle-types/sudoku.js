import Puzzle from "../Puzzle.js";
import { CONTAINS_ALL } from "../generic-constraints.js";
import SquareGrid from "../grids/SquareGrid.js";
export default class SudokuPuzzle extends Puzzle {
    static get type() {
        return "sudoku";
    }
    get renderSettings() {
        return { defaultScale: 36, funcs: ["edgearea", "numhint", "sudoku"] };
    }
    constructor({ grid, task, }) {
        if (task.length != task[0].length)
            throw new Error("Sudoku grid must be square");
        const { boxwidth, boxheight } = grid;
        if (boxwidth * boxheight != task.length)
            throw new Error("Sudoku boxes must have same number of cells as rows and columns");
        const size = task.length;
        const areamap = [];
        for (let i = 0; i < size; i++)
            areamap.push([]);
        task.map((r, y) => r.map((c, x) => areamap[((y / boxheight) | 0) * boxheight + ((x / boxwidth) | 0)].push({
            x,
            y,
        })));
        super(SquareGrid.fromAreas(areamap));
        const areas = [];
        const values = [];
        for (let i = 0; i < size; i++) {
            areas.push([]);
            values.push(i + 1);
        }
        this.grid.cellmap.map((cell, { x, y }) => {
            const hint = task[y][x];
            if (hint && hint != -1)
                cell.hint = hint;
            this.addVariable(cell, hint && hint != -1 ? [parseInt(hint + "", 36)] : values.slice());
            areas[((x / boxwidth) | 0) + boxheight * ((y / boxheight) | 0)].push(cell);
        });
        [...this.grid.cellLines, ...areas].forEach((x) => this.addConstraint(CONTAINS_ALL, x, values.slice()));
    }
}

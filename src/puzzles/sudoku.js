import Puzzle from '../base/Puzzle.js';
import { CONTAINS_ALL } from '../base/generic-constraints.js';
import SquareGrid from '../base/SquareGrid.js';

class SudokuPuzzle extends Puzzle {
    constructor({ grid, task }) {
        if (task.length != task[0].length)
            throw new Error("Sudoku grid must be square");
        let { boxwidth, boxheight } = grid;
        if (boxwidth * boxheight != task.length)
            throw new Error("Sudoku boxes must have same number of cells as rows and columns");
        let size = task.length;

        super(SquareGrid.fromSize(size));

        let areas = [];
        let values = [];
        for (let i = 0; i < size; i++) {
            areas.push([]);
            values.push(i + 1);
        }
        this.grid.cellmap.map((cell, {x, y}) => {
            let hint = task[y][x];
            this.addVariable(cell, hint && hint != -1 ? [ parseInt(hint, 36) ] : values.slice());
            areas[(x / boxwidth | 0) + boxheight * (y / boxheight | 0)].push(cell);
        });
        [...this.grid.cellRows, ...this.grid.cellCols, ...areas].forEach(x => this.addConstraint(CONTAINS_ALL, x, values.slice()));
    }
}

export default SudokuPuzzle;

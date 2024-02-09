const Puzzle = require('../base/Puzzle.js');
const Constraints = require('../base/generic-constraints.js');
const SquareGrid = require('../base/SquareGrid.js');

class SudokuPuzzle extends Puzzle {
    constructor({ subsize, task }) {
        if (task.length != task[0].length)
            throw new Error("Sudoku grid must be square");
        let { width, height } = subsize;
        if (width * height != task.length)
            throw new Error("Sudoku subgrid must have same number of cells as rows and columns");
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
            areas[(x / width | 0) + height * (y / height | 0)].push(cell);
        });
        [...this.grid.cellRows, ...this.grid.cellCols, ...areas].forEach(x => this.addConstraint(Constraints.CONTAINS_ALL, x, values.slice()));
    }
}

module.exports = SudokuPuzzle;

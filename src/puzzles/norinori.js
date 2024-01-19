const Puzzle = require('../base/Puzzle.js');
const Constraints = require('../base/generic-constraints.js');
const SquareGrid = require('../base/SquareGrid.js');

class NorinoriPuzzle extends Puzzle {
    constructor(areas) {
        super();
        this.grid = SquareGrid.fromAreas(areas);
        this.areas = areas;
        let var_id = 0;
        this.variables = [];
        this.constraints = [];

        const ONLY_DOMINOES = function([cell], target) {
            if (cell.value.includes(0))
                return true;
            return Constraints.SUM_EQUALS(cell.adjacentEdge, target);
        }

        for (let area of areas) {
            for (let pos of area) {
                let cell = this.grid.cellmap.get2D(pos.x, pos.y);
                cell.value = [0, 1];
                cell.var_id = var_id++;
                this.variables.push(cell);
                this.constraints.push({
                    id: this.constraints.length,
                    check: ONLY_DOMINOES,
                    vars: [cell],
                    target: 1
                })
            }
            this.constraints.push({
                id: this.constraints.length,
                check: Constraints.SUM_EQUALS,
                vars: area.map(({x, y}) => this.grid.cellmap.get2D(x, y)),
                target: 2
            });
        }
    }
}

let testPuzzle = new NorinoriPuzzle([[{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], [{ x: 1, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 0 }]]);
console.log(testPuzzle);

const Puzzle = require('../base/Puzzle.js');
const Constraints = require('../base/generic-constraints.js');
const SquareGrid = require('../base/SquareGrid.js');

class NorinoriPuzzle extends Puzzle {
    constructor(areas) {
        super(SquareGrid.fromAreas(areas));
        this.areas = areas;

        const ONLY_DOMINOES = function([cell, ...adj], target) {
            if (cell.value.includes(0))
                return true;
            return Constraints.SUM_EQUALS(adj, target);
        }

        for (let area of areas) {
            let cells = [];
            for (let pos of area) {
                let cell = this.grid.cellmap.get2D(pos.x, pos.y);
                cells.push(cell);
                this.addVariable(cell, [0, 1]);
                this.addConstraint(ONLY_DOMINOES, [cell, ...cell.adjacentEdge], 1);
            }
            this.addConstraint(Constraints.SUM_EQUALS, cells, 2);
        }
    }
}

//let testPuzzle = new NorinoriPuzzle([[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 0 }]]);
let testPuzzle = new NorinoriPuzzle([[{x:0,y:0},{x:0,y:1},{x:1,y:1}],[{x:1,y:0},{x:2,y:0},{x:3,y:0}],[{x:4,y:0},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:2,y:4},{x:5,y:4}],[{x:5,y:0},{x:5,y:1}],[{x:0,y:2},{x:1,y:2},{x:0,y:3}],[{x:0,y:4},{x:1,y:4},{x:0,y:5},{x:1,y:5}],[{x:3,y:4},{x:2,y:5},{x:3,y:5}],[{x:4,y:4},{x:4,y:5},{x:5,y:5}]]);

console.log(testPuzzle);
testPuzzle.solve({ max_depth: 1, debug: Infinity });
for (let row of testPuzzle.grid.cellRows)
    console.log(row.map(v => v.value.length > 1 ? "?" : v.value[0] == 1 ? "X" : "_").join(" "));


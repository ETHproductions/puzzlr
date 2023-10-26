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
		for (let area of areas)
			for (let pos of area)
				this.variables.push({ id: var_id++, pos, value: [0, 1] });
		
		this.constraints = [
			{
				on: 'area',
				check: Constraints.SUM_EQUALS,
				target: 2
			},
			{
				on: 'cell=1 adj-ortho',
				check: Constraints.SUM_EQUALS,
				target: 1
			}
		];
	}
}

console.log(new NorinoriPuzzle([[{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}], [{x: 1, y: 0}, {x: 2, y: 1}, {x: 2, y: 0}]]))

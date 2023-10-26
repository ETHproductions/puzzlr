const PuzzleGrid = require('./PuzzleGrid.js');
const Array2D = require('./Array2D.js');

class SquareGrid extends PuzzleGrid {
	constructor(w, h = w) {
		if (!(w > 0) || w%1 !== 0 || !(h > 0) || h%1 !== 0)
			throw new Error("Grid dimensions must be positive integers");
		super(w, h);
		
		this.cellmap = new Array2D(w, h);
		this.areamap = new Array2D(w, h);
		this.vertmap = new Array2D(w+1, h+1);
		this.edgemap = {
			vert: new Array2D(w+1, h),
			horiz: new Array2D(w, h+1)
		};
	}
	
	static fromCoords(coords) {
		if (!(coords instanceof Array && 'x' in coords[0] && 'y' in coords[0]))
			throw new Error("SquareGrid.fromCoords arg 0 must be an array of {x, y} values");
		
		return SquareGrid.fromAreas([coords]);
		
	}
	
	static fromAreas(areas, value) {
		if (!(areas instanceof Array && areas[0] instanceof Array && 'x' in areas[0][0] && 'y' in areas[0][0]))
			throw new Error("SquareGrid.fromAreas argument 0 must be an array of arrays of coordinates");
		
		let minX = 1/0, maxX = -1/0, minY = 1/0, maxY = -1/0;
		for (let coords of areas)
			for (let {x, y} of coords) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		let w = maxX - minX + 1, h = maxY - minY + 1;
		let grid = new SquareGrid(w, h);
		for (let i in areas)
			for (let {x, y} of areas[i])
				grid.addCell(x - minX, y - minY, +i);
		
		grid.finalize();
		return grid;
	}
	
	addCell(x, y, area = 0) {
		this.areamap.set2D(x, y, area);
	}
	removeCell(x, y) {
		this.areamap.set2D(x, y, null);
	}
	addRect(x, y, w, h, area = 0) {
		for (let j = 0; j < h; j++)
			for (let i = 0; i < w; i++)
				this.areamap.set2D(x+i, y+j, area);
	}
	removeRect(x, y, w, h) {
		for (let j = 0; j < h; j++)
			for (let i = 0; i < w; i++)
				this.areamap.set2D(x+i, y+j, null);
	}
	fill() {
		this.addRect(0, 0, this.width, this.height);
	}
	
	finalize() {
		for (let y = 0; y <= this.height; y++)
			for (let x = 0; x <= this.width; x++) {
				let cells = (this.areamap.get2D(x-1, y-1, null) != null) << 3
					      | (this.areamap.get2D(x  , y-1, null) != null) << 2
					      | (this.areamap.get2D(x-1, y  , null) != null) << 1
					      | (this.areamap.get2D(x  , y  , null) != null);
				if (!cells) continue;
				
				this.addVertAtPoint({x, y});
				this.vertmap.set2D(x, y, this.lastVert);
				
				if (cells & 0b1100) {
					this.addEdge(this.vertmap.get2D(x, y-1), this.lastVert);
					this.edgemap.vert.set2D(x, y-1, this.lastEdge);
				}
				if (cells & 0b1010) {
					this.addEdge(this.vertmap.get2D(x-1, y), this.lastVert, !(cells & 0b1000));
					this.edgemap.horiz.set2D(x-1, y, this.lastEdge);
				}
				
				if (this.lastCell != null) {
					this.cellmap.set2D(x-1, y-1, this.lastCell);
				}
			}
		
		super.finalize();
	}
}

module.exports = SquareGrid;

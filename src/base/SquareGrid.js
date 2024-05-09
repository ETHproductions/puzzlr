import PuzzleGrid from './PuzzleGrid.js';
import Array2D from './Array2D.js';

class SquareGrid extends PuzzleGrid {
    /**
     * Creates a new empty square grid with a given width and height, which
     * cannot be changed.
     * The grid returned will contain no cells and must be filled in manually.
     * To create a ready-to-use rectangular grid, try static methods
     * fromSize(), fromCoords(), or fromAreas().
     * @param {number} w width of puzzle
     * @param {number} h height of puzzle
     */
    constructor(w, h = w) {
        if (!(w > 0) || w % 1 !== 0 || !(h > 0) || h % 1 !== 0)
            throw new Error("Grid dimensions must be positive integers");
        super(w, h);

        this.cellmap = new Array2D(w, h);
        this.areamap = new Array2D(w, h);
        this.vertmap = new Array2D(w + 1, h + 1);
        this.edgemap = {
            vert: new Array2D(w + 1, h),
            horiz: new Array2D(w, h + 1)
        };
    }

    /**
     * Creates a new SquareGrid from a width and height and fills with cells.
     * @param {number} w width of puzzle
     * @param {number} h height of puzzle
     */
    static fromSize(w, h = w) {
        let grid = new SquareGrid(w, h);
        grid.fill();
        grid.finalize();
        return grid;
    }

    /**
     * Creates a new SquareGrid from an array of {x, y} coordinates.
     * @param {{x: Number, y: Number}[]} coords array of coords that describe the grid area
     * @returns new SquareGrid with given coordinates
     */
    static fromCoords(coords) {
        if (!(coords instanceof Array && 'x' in coords[0] && 'y' in coords[0]))
            throw new Error("SquareGrid.fromCoords arg 0 must be an array of {x, y} values");

        return SquareGrid.fromAreas([coords]);
    }

    /**
     * Creates a new SquareGrid split into a series of areas.
     * @param {{x: Number, y: Number}[][]} areas array of arrays of coordinates that each
     * describe an area in the grid 
     * @returns new SquareGrid with given areas
     */
    static fromAreas(areas) {
        if (!(areas instanceof Array && areas[0] instanceof Array && 'x' in areas[0][0] && 'y' in areas[0][0]))
            throw new Error("SquareGrid.fromAreas argument 0 must be an array of arrays of coordinates");

        let minX = 1 / 0, maxX = -1 / 0, minY = 1 / 0, maxY = -1 / 0;
        for (let coords of areas)
            for (let { x, y } of coords) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        let w = maxX - minX + 1, h = maxY - minY + 1;
        let grid = new SquareGrid(w, h);
        for (let i in areas)
            for (let { x, y } of areas[i])
                grid.addCell(x - minX, y - minY, +i);

        grid.finalize();
        return grid;
    }

    /**
     * Adds a cell to this SquareGrid at a given coordinate.
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} area optional ID of area that this cell belongs to
     */
    addCell(x, y, area = 0) {
        this.areamap.set2D(x, y, area);
    }
    /**
     * Removes a cell from this SquareGrid at a given coordinate.
     * @param {Number} x 
     * @param {Number} y 
     */
    removeCell(x, y) {
        this.areamap.set2D(x, y, null);
    }
    /**
     * Adds a rectangle of cells to this SquareGrid.
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} w 
     * @param {Number} h 
     * @param {Number} area optional ID of area that these cells belong to
     */
    addRect(x, y, w, h, area = 0) {
        for (let j = 0; j < h; j++)
            for (let i = 0; i < w; i++)
                this.areamap.set2D(x + i, y + j, area);
    }
    /**
     * Removes a rectangle of cells from this SquareGrid.
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} w 
     * @param {Number} h 
     */
    removeRect(x, y, w, h) {
        for (let j = 0; j < h; j++)
            for (let i = 0; i < w; i++)
                this.areamap.set2D(x + i, y + j, null);
    }
    /**
     * Fills the entire width and height of this SquareGrid with cells.
     */
    fill() {
        this.addRect(0, 0, this.width, this.height);
    }

    /**
     * Prepares this SquareGrid for use by converting the list of coordinates
     * into actual vertex, edge and cell objects.
     */
    finalize() {
        for (let y = 0; y <= this.height; y++)
            for (let x = 0; x <= this.width; x++) {
                // For each possible vertex location:
                let cells = (this.areamap.get2D(x - 1, y - 1, null) != null) << 3
                          | (this.areamap.get2D(x    , y - 1, null) != null) << 2
                          | (this.areamap.get2D(x - 1, y    , null) != null) << 1
                          | (this.areamap.get2D(x    , y    , null) != null);
                // If there are no cells touching this vertex, don't create one
                if (!cells) continue;

                this.addVert({ x, y });
                this.vertmap.set2D(x, y, this.lastVert);

                // Create a vertical edge from this cell, if necessary
                if (cells & 0b1100) {
                    this.addEdge(this.vertmap.get2D(x, y - 1), this.lastVert, { d: 'v', x, y: y - 1 });
                    this.edgemap.vert.set2D(x, y - 1, this.lastEdge);
                }
                // Create a horizontal edge from this cell, if necessary
                // If there isn't a cell to the top left, avoid creating one
                if (cells & 0b1010) {
                    this.addEdge(this.vertmap.get2D(x - 1, y), this.lastVert, { d: 'h', x: x - 1, y }, !(cells & 0b1000));
                    this.edgemap.horiz.set2D(x - 1, y, this.lastEdge);
                }

                // Finally, capture the cell that was created, if any
                if (this.lastCell != null) {
                    this.cellmap.set2D(x - 1, y - 1, this.lastCell);
                    this.lastCell.vpos = { x: x - 1, y: y - 1 };
                    this.lastCell.area_id = this.areamap.get2D(x - 1, y - 1);
                }
            }

        super.finalize();
    }

    /**
     * Returns the cells in each row as an Array of Arrays.
     */
    get cellRows() {
        let rows = [];
        for (let y = 0; y < this.height; y++) {
            let row = [];
            for (let x = 0; x < this.width; x++) {
                row.push(this.cellmap.get2D(x, y));
            }
            rows.push(row);
        }
        return rows;
    }

    /**
     * Returns the cells in each column as an Array of Arrays.
     */
    get cellCols() {
        let cols = [];
        for (let x = 0; x < this.width; x++) {
            let col = [];
            for (let y = 0; y < this.height; y++) {
                col.push(this.cellmap.get2D(x, y));
            }
            cols.push(col);
        }
        return cols;
    }
}

export default SquareGrid;

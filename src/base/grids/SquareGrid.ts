import { PuzzleGrid, GridCell, GridEdge, GridVertex } from "../";
import Array2D from "../util/Array2D";

export default class SquareGrid extends PuzzleGrid {
  cellmap: Array2D<GridCell>;
  areamap: Array2D<number | null>;
  vertmap: Array2D<GridVertex>;
  edgemap: { vert: Array2D<GridEdge>; horiz: Array2D<GridEdge> };

  /**
   * Creates a new empty square grid with a given width and height, which
   * cannot be changed.
   * The grid returned will contain no cells and must be filled in manually.
   * To create a ready-to-use rectangular grid, try static methods
   * fromSize(), fromCoords(), or fromAreas().
   */
  constructor(w: number, h: number = w) {
    if (!(w > 0) || w % 1 !== 0 || !(h > 0) || h % 1 !== 0)
      throw new Error("Grid dimensions must be positive integers");
    super(w, h);

    this.cellmap = new Array2D(w, h);
    this.areamap = new Array2D(w, h);
    this.vertmap = new Array2D(w + 1, h + 1);
    this.edgemap = {
      vert: new Array2D(w + 1, h),
      horiz: new Array2D(w, h + 1),
    };
  }

  /**
   * Creates a new SquareGrid from a width and height and fills with cells.
   */
  static fromSize(w: number, h: number = w) {
    const grid = new SquareGrid(w, h);
    grid.fill();
    grid.finalize();
    return grid;
  }

  /**
   * Creates a new SquareGrid from an array of {x, y} coordinates.
   * @param {{x: Number, y: Number}[]} coords array of coords that describe the grid area
   * @returns new SquareGrid with given coordinates
   */
  static fromCoords(coords: { x: number; y: number }[]) {
    return SquareGrid.fromAreas([coords]);
  }

  /**
   * Creates a new SquareGrid split into a series of areas.
   * @param areas array of arrays of coordinates that each describe an area
   * in the grid
   * @returns new SquareGrid with given areas
   */
  static fromAreas(areas: { x: number; y: number }[][]) {
    let minX = 1 / 0,
      maxX = -1 / 0,
      minY = 1 / 0,
      maxY = -1 / 0;
    for (const coords of areas)
      for (const { x, y } of coords) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    const w = maxX - minX + 1,
      h = maxY - minY + 1;
    const grid = new SquareGrid(w, h);
    for (const i in areas)
      for (const { x, y } of areas[i]) grid.addCell(x - minX, y - minY, +i);

    grid.finalize();
    return grid;
  }

  /**
   * Adds a cell to this SquareGrid at a given coordinate.
   */
  addCell(x: number, y: number, areaID: number = 0) {
    this.areamap.set2D(x, y, areaID);
  }
  /**
   * Removes a cell from this SquareGrid at a given coordinate.
   */
  removeCell(x: number, y: number) {
    this.areamap.set2D(x, y, null);
  }
  /**
   * Adds a rectangle of cells to this SquareGrid.
   */
  addRect(x: number, y: number, w: number, h: number, areaID: number = 0) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        this.areamap.set2D(x + i, y + j, areaID);
      }
    }
  }
  /**
   * Removes a rectangle of cells from this SquareGrid.
   */
  removeRect(x: number, y: number, w: number, h: number) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        this.areamap.set2D(x + i, y + j, null);
      }
    }
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
        const cells =
          (+(this.areamap.get2DUnsafe(x - 1, y - 1, null) != null) << 3) |
          (+(this.areamap.get2DUnsafe(x, y - 1, null) != null) << 2) |
          (+(this.areamap.get2DUnsafe(x - 1, y, null) != null) << 1) |
          +(this.areamap.get2DUnsafe(x, y, null) != null);
        // If there are no cells touching this vertex, don't create one
        if (!cells) continue;

        const newVert = this.addVert({ x, y });
        this.vertmap.set2D(x, y, newVert);

        // Create a vertical edge from this cell, if necessary
        if (cells & 0b1100) {
          const newEdge = this.addEdge(
            this.vertmap.get2D(x, y - 1),
            newVert,
            { d: "v", x, y: y - 1 },
            false,
          );
          this.edgemap.vert.set2D(x, y - 1, newEdge);
        }
        // Create a horizontal edge from this cell, if necessary
        // If there isn't a cell to the top left, avoid creating one
        if (cells & 0b1010) {
          const newEdge = this.addEdge(
            this.vertmap.get2D(x - 1, y),
            newVert,
            { d: "h", x: x - 1, y },
            !(cells & 0b1000),
          );
          this.edgemap.horiz.set2D(x - 1, y, newEdge);
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
    const rows: GridCell[][] = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
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
    const cols: GridCell[][] = [];
    for (let x = 0; x < this.width; x++) {
      const col = [];
      for (let y = 0; y < this.height; y++) {
        col.push(this.cellmap.get2D(x, y));
      }
      cols.push(col);
    }
    return cols;
  }
}

import { PuzzleGrid, GridCell, GridEdge } from "./";
import { Constraint } from "./Constraint";
import { PuzzleVariable, PuzzleVariableValues } from "./PuzzleVariable";

export default class GridVertex implements PuzzleVariable {
  grid: PuzzleGrid;
  rpos: { x: number; y: number };
  vpos: any;
  id: number;
  netid: number;
  cells: (GridCell | null)[] = [];
  edges: GridEdge[] = [];
  adjacent: GridVertex[] = [];

  var_id: number = -1;
  value: PuzzleVariableValues = [];
  constraints: Constraint[] = [];
  must_be_unique: boolean | undefined;

  /**
   * Creates a new grid vertex at a point in the plane.
   * @param {PuzzleGrid} grid the grid this vertex belongs to
   * @param {{x: number, y: number}} rpos position of the vertex in the plane
   * @param {Object} vpos virtual position for simplfying non-square grids;
   * can be anything but recommended to be integer {x, y}
   */
  constructor(
    grid: PuzzleGrid,
    rpos: { x: number; y: number },
    vpos: object = rpos
  ) {
    if (!(grid instanceof PuzzleGrid))
      throw new Error("new GridVertex() arg 0 must be a PuzzleGrid object");
    if (!(rpos && "x" in rpos && "y" in rpos))
      throw new Error(
        "new GridVertex() arg 1 must be an object with 'x' and 'y' properties"
      );

    this.grid = grid;
    this.rpos = rpos;
    this.vpos = vpos;

    this.id = grid.verts.length;
    grid.verts.push(this);
    this.netid = this.id;
  }

  /**
   * Sets the ID for the network of vertices connected to this one.
   * @param {number} id
   */
  setNetID(id: number) {
    if (this.netid == id) return;
    this.netid = id;
    for (const vert of this.adjacent) vert.setNetID(id);
  }

  /**
   * Adds a vertex to the list of those connected with this one.
   * @param {GridVertex} vert vertex to be connected
   * @param {GridEdge} edge edge connecting this vertex to the other
   */
  addEdgeTo(vert: GridVertex, edge: GridEdge) {
    if (this.grid.finalized) throw new Error("Cannot modify a finalized grid");

    if (typeof vert == "number") vert = this.grid.verts[vert];

    const dir = this.angleTo(vert);
    let i = 0;
    while (i < this.adjacent.length) {
      if (dir > this.angleTo(this.adjacent[i])) i++;
      else break;
    }
    this.adjacent.splice(i, 0, vert);
    this.edges.splice(i, 0, edge);
    this.cells.splice(i, 0, null);
  }

  /**
   * Calculate the angle of the line from this vertex to another.
   * @param {GridVertex} vert
   * @returns {number} angle in (-pi, pi]
   */
  angleTo(vert: GridVertex): number {
    if (typeof vert == "number") vert = this.grid.verts[vert];

    return Math.atan2(vert.rpos.y - this.rpos.y, vert.rpos.x - this.rpos.x);
  }

  get isEdgeOfGrid() {
    return this.edges.some((e) => e.isEdgeOfGrid);
  }
  get isCornerOfGrid() {
    return this.cells.length == 1;
  }

  get type() {
    return "vertex";
  }
}

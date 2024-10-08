import { PuzzleGrid, GridEdge, GridVertex } from "./index.js";
import { PuzzleVariable } from "./PuzzleVariable.js";

export default class GridCell extends PuzzleVariable {
  grid: PuzzleGrid;
  verts: GridVertex[];
  edges: GridEdge[] = [];
  vpos: { x: number; y: number } = { x: NaN, y: NaN };
  id: number;

  // Cache of adjacent cells, in format { cell, type: 'edge' | 'vert' }
  #adjacent: { cell: GridCell; type: string }[] = [];
  area_id: any;

  hint?: number | string;
  thermoIndex?: number;

  /**
   * Creates a new grid cell out of a list of vertices.
   */
  constructor(
    grid: PuzzleGrid,
    verts: GridVertex[],
    vpos?: { x: number; y: number },
  ) {
    super();
    if (verts.length < 3)
      throw new Error("Cell must contain at least 3 vertices");

    this.grid = grid;
    this.verts = verts;
    for (let i = 0; i < verts.length; i++)
      this.edges.push(this.grid.getEdge(verts[i], verts[i + 1] || verts[0])!);

    if (vpos) this.vpos = vpos;

    this.id = grid.cells.length;
    grid.cells.push(this);
  }

  toString() {
    return `V${this.var_id} @(${this.vpos.x},${this.vpos.y})`;
  }

  /**
   * Do anything required to finalize the grid, which currently includes:
   * - cache list of adjacent cells
   */
  finalize() {
    this.#adjacent = this.adjacent;
  }

  get adjacent() {
    if (this.#adjacent.length > 0) return this.#adjacent;

    const adjacent = [];
    for (const v of this.verts) {
      const startInd = v.cells.indexOf(this);
      for (let i = 1; i < v.cells.length - 1; i++) {
        const cell = v.cells[(startInd + i) % v.cells.length];
        if (cell != null)
          adjacent.push({ type: i == 1 ? "edge" : "vert", cell });
      }
    }
    return adjacent;
  }

  /**
   * List of all cells adjacent to this one by edge or vertex, starting in
   * the top left and moving clockwise.
   */
  get adjacentAll() {
    return this.adjacent.map((c) => c.cell);
  }
  /**
   * List of all cells directly adjacent to this one, starting in the top
   * left and moving clockwise.
   */
  get adjacentEdge() {
    return this.adjacent.filter((c) => c.type == "edge").map((c) => c.cell);
  }
  /**
   * List of all cells that share a corner with this one, starting in the
   * top-left and moving clockwise.
   */
  get adjacentVert() {
    return this.adjacent.filter((c) => c.type == "vert").map((c) => c.cell);
  }

  get midpoint() {
    const vertsX = this.verts.map((v) => v.rpos.x),
      vertsY = this.verts.map((v) => v.rpos.y);
    return {
      x: (Math.min(...vertsX) + Math.max(...vertsX)) / 2,
      y: (Math.min(...vertsY) + Math.max(...vertsY)) / 2,
    };
  }

  get type() {
    return "cell";
  }
}

import { PuzzleVariable } from "./PuzzleVariable.js";
export default class GridEdge extends PuzzleVariable {
    grid;
    fromVert;
    toVert;
    slope;
    vpos = {
        x: NaN,
        y: NaN,
        d: NaN,
    };
    id;
    leftCell = null;
    rightCell = null;
    /**
     * Creates a new grid edge between two vertices.
     */
    constructor(grid, fromVert, toVert, vpos) {
        super();
        this.grid = grid;
        this.fromVert = fromVert;
        this.toVert = toVert;
        this.slope = fromVert.angleTo(toVert);
        if (vpos)
            this.vpos = vpos;
        this.id = grid.edges.length;
        grid.edges.push(this);
    }
    toString() {
        return `V${this.var_id} @${this.vpos.d}(${this.vpos.x},${this.vpos.y})`;
    }
    /**
     * Takes an endpoint of this edge and returns the other endpoint. If the
     * vertex provided is not an endpoint of this edge, throws an error.
     */
    otherVert(vert) {
        if (vert == this.fromVert)
            return this.toVert;
        if (vert == this.toVert)
            return this.fromVert;
        throw new Error("Vertex provided is not an endpoint of this edge");
    }
    /**
     * Takes one cell adjacent to this edge and returns the other. If the cell
     * provided is not adjacent to this edge, throws an error.
     */
    otherCell(cell) {
        if (cell == this.leftCell)
            return this.rightCell;
        if (cell == this.rightCell)
            return this.leftCell;
        throw new Error("Cell provided is not adjacent to this edge");
    }
    get isEdgeOfGrid() {
        return this.leftCell == null || this.rightCell == null;
    }
    get type() {
        return "edge";
    }
}

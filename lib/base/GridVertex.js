import { PuzzleVariable } from "./PuzzleVariable.js";
export default class GridVertex extends PuzzleVariable {
    grid;
    rpos;
    vpos;
    id;
    netid;
    cells = [];
    edges = [];
    adjacent = [];
    /**
     * Creates a new grid vertex at a point in the plane.
     * @param grid the grid this vertex belongs to
     * @param rpos position of the vertex in the plane
     * @param vpos virtual position for simplfying non-square grids; can be
     * anything but recommended to be integer {x, y}
     */
    constructor(grid, rpos, vpos = rpos) {
        super();
        this.grid = grid;
        this.rpos = rpos;
        this.vpos = vpos;
        this.id = grid.verts.length;
        grid.verts.push(this);
        this.netid = this.id;
    }
    toString() {
        if (this.vpos)
            return `V${this.var_id} @(${this.vpos.x},${this.vpos.y})`;
        return `S${this.var_id}`;
    }
    /**
     * Sets the ID for the network of vertices connected to this one.
     */
    setNetID(id) {
        if (this.netid == id)
            return;
        this.netid = id;
        for (const vert of this.adjacent)
            vert.setNetID(id);
    }
    /**
     * Adds a vertex to the list of those connected with this one.
     */
    addEdgeTo(vert, edge) {
        if (this.grid.finalized)
            throw new Error("Cannot modify a finalized grid");
        if (typeof vert == "number")
            vert = this.grid.verts[vert];
        const dir = this.angleTo(vert);
        let i = 0;
        while (i < this.adjacent.length) {
            if (dir > this.angleTo(this.adjacent[i]))
                i++;
            else
                break;
        }
        this.adjacent.splice(i, 0, vert);
        this.edges.splice(i, 0, edge);
        this.cells.splice(i, 0, null);
    }
    /**
     * Calculate the angle of the line from this vertex to another.
     * @returns angle in (-pi, pi]
     */
    angleTo(vert) {
        if (typeof vert == "number")
            vert = this.grid.verts[vert];
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

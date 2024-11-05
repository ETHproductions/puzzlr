import { GridCell, GridEdge, GridVertex } from "./index.js";
/**
 * How to make a custom puzzle grid
 *
 * A grid is created by placing vertices on the plane and connecting them with
 * edges. A subclass representing a custom grid type (square, hexagonal, etc.)
 * should first call super(w, h), then use addVert() and addEdge() as required
 * to create the grid, and finally call super.finalize() to mark the grid as
 * complete and ready for use. This can all be done in the subclass constructor
 * or spread out across different methods to further customize your grid.
 *
 * See individual methods below for more info on how to use them.
 */
export default class PuzzleGrid {
    #width;
    #height;
    #finalized = false;
    #edgeMap = new Map();
    onNewCell;
    cells = [];
    verts = [];
    edges = [];
    lastCell = null;
    /**
     * Creates a new empty grid with a given width and height, which cannot be
     * changed.
     */
    constructor(w, h = w) {
        if (!(w > 0) || !(h > 0))
            throw new Error("Grid dimensions must be positive");
        this.#width = w;
        this.#height = h;
    }
    /**
     * Creates a vertex at a given {x, y} position in the plane and optionally
     * adds edges to connect it to one or more existing vertices. this.lastVert
     * will be set to the newly created vertex.
     *
     * @param rpos exact position of the vertex in the plane
     * @param conns list of existing vertices to connect to, by reference or id
     * @param vpos virtual position for simplfying non-square grids; can be
     * anything but recommended to be integer {x, y}
     * @returns new vertex
     */
    addVert(rpos, conns = [], vpos = rpos) {
        if (this.#finalized)
            throw new Error("Cannot modify a finalized grid");
        const newVert = new GridVertex(this, rpos, vpos);
        for (const conn of conns) {
            this.addEdge(conn, newVert);
        }
        return newVert;
    }
    /**
     * Creates an edge from one vertex to another, and creates a cell if the
     * new edge encloses a space on the plane and noCell is false/not provided.
     * this.lastEdge will be the newly created edge, and this.lastCell will be
     * the newly created cell, or null if none was created.
     *
     * @param vpos virtual position for simplfying non-square grids;
     * can be anything but recommended to be integer {x, y}
     * @param noCell prevents creating a new cell if this edge
     * encloses a space in the plane or splits an existing cell
     */
    addEdge(fromVert, toVert, vpos, noCell = false) {
        if (this.#finalized)
            throw new Error("Cannot modify a finalized grid");
        if (fromVert.adjacent.includes(toVert))
            throw new Error("Edge already exists between vertices " +
                fromVert.id +
                " and " +
                toVert.id);
        if (typeof vpos != "object") {
            noCell = vpos;
            vpos = undefined;
        }
        const newEdge = new GridEdge(this, fromVert, toVert, vpos);
        this.lastCell = null;
        this.#edgeMap.set(fromVert.id + ";" + toVert.id, newEdge);
        this.#edgeMap.set(toVert.id + ";" + fromVert.id, newEdge);
        toVert.addEdgeTo(fromVert, newEdge);
        fromVert.addEdgeTo(toVert, newEdge);
        // From here on out we just need to check if a new cell was created.
        // If the vertices were not previously connected, a loop cannot have
        // been created so we simply merge the vertices into one network
        if (toVert.netid != fromVert.netid) {
            toVert.setNetID(fromVert.netid);
            return newEdge;
        }
        // If an existing cell contains both vertices of this edge, that cell
        // needs to be split in two
        for (const cell of this.cells) {
            const fromInd = cell.verts.indexOf(fromVert);
            if (fromInd == -1)
                continue;
            const toInd = cell.verts.indexOf(toVert);
            if (toInd == -1)
                continue;
            this.#splitCell(cell, fromInd, toInd, noCell);
            return newEdge;
        }
        if (noCell)
            return newEdge;
        // If the vertices were previously connected and the new edge does not
        // split an existing cell, we must be creating a new cell
        if (this.#checkNewCell(fromVert, toVert))
            return newEdge;
        if (this.#checkNewCell(toVert, fromVert))
            return newEdge;
        throw new Error("Attempted to create invalid cell");
    }
    /**
     * Returns the edge connecting two vertices, if one exists.
     */
    getEdge(fromVert, toVert) {
        if (fromVert instanceof GridVertex)
            fromVert = fromVert.id;
        if (toVert instanceof GridVertex)
            toVert = toVert.id;
        return this.#edgeMap.get(fromVert + ";" + toVert);
    }
    /**
     * Split a cell in two. The old cell retains the vertex with the lowest ID.
     * If this vertex is connected to the new edge, the old cell keeps the
     * first few clockwise vertices.
     */
    #splitCell(oldCell, fromInd, toInd, noNewCell) {
        if (fromInd == 0 || (0 < toInd && toInd < fromInd))
            [fromInd, toInd] = [toInd, fromInd];
        const newCellVerts = oldCell.verts.slice(fromInd, toInd || oldCell.verts.length);
        if (toInd == 0)
            newCellVerts.push(oldCell.verts[0]);
        if (!noNewCell)
            this.#addCell(newCellVerts);
        oldCell.verts.splice(fromInd + 1, newCellVerts.length - 2);
    }
    /**
     * Check for a new cell produced by a new edge, by starting in one
     * direction and taking the clockwise-most turn at each vertex. Returns
     * true if a new cell is found and created.
     */
    #checkNewCell(fromVert, toVert) {
        const startVert = toVert;
        const allVerts = [], maxSides = 1000;
        let i = 0, totalAngle = 0;
        while (i++ < maxSides) {
            let maxAngle = -Math.PI, nextVert = null;
            for (const vert of toVert.adjacent)
                if (vert != fromVert) {
                    const newAngle = this.angleThroughVertex(fromVert, toVert, vert);
                    if (newAngle > maxAngle) {
                        maxAngle = newAngle;
                        nextVert = vert;
                    }
                }
            if (nextVert == null)
                return false;
            allVerts.push(nextVert);
            totalAngle += maxAngle;
            fromVert = toVert;
            toVert = nextVert;
            if (nextVert == startVert) {
                if (Math.PI < totalAngle && totalAngle < 3 * Math.PI) {
                    this.#addCell(allVerts);
                    return true;
                }
                return false;
            }
        }
        return false;
    }
    /**
     * Creates a cell from a given list of vertices. The list is rotated such
     * that the vertex with the lowest ID is placed first.
     */
    #addCell(verts) {
        let minVertInd = 0;
        for (let i = 1; i < verts.length; i++)
            if (verts[i].id < verts[minVertInd].id)
                minVertInd = i;
        verts = verts.slice(minVertInd).concat(verts.slice(0, minVertInd));
        const newCell = new GridCell(this, verts);
        this.lastCell = newCell;
        for (let i = 0; i < verts.length; i++) {
            const currVert = verts[i], nextVert = verts[i + 1] || verts[0];
            const vertInd = currVert.adjacent.indexOf(nextVert);
            currVert.cells[vertInd] = newCell;
            const currEdge = this.getEdge(currVert, nextVert);
            if (currEdge.fromVert == currVert)
                currEdge.rightCell = newCell;
            else
                currEdge.leftCell = newCell;
        }
        if (typeof this.onNewCell == "function")
            this.onNewCell(newCell);
    }
    /**
     * Calculates the angle between two edges that share a vertex.
     * @returns angle in [-pi, pi); straight = 0, cw > 0, ccw < 0
     */
    angleBetweenEdges(edge1, edge2) {
        if (edge1 == edge2)
            return -Math.PI;
        let vert1, pivot, vert2;
        if (edge1.fromVert == edge2.fromVert) {
            vert1 = edge1.toVert;
            pivot = edge1.fromVert;
            vert2 = edge2.toVert;
        }
        else if (edge1.toVert == edge2.fromVert) {
            vert1 = edge1.fromVert;
            pivot = edge1.toVert;
            vert2 = edge2.toVert;
        }
        else if (edge1.fromVert == edge2.toVert) {
            vert1 = edge1.toVert;
            pivot = edge1.fromVert;
            vert2 = edge2.fromVert;
        }
        else if (edge1.toVert == edge2.toVert) {
            vert1 = edge1.fromVert;
            pivot = edge1.toVert;
            vert2 = edge2.fromVert;
        }
        else
            throw new Error("Edges must share a vertex");
        return this.angleThroughVertex(vert1, pivot, vert2);
    }
    /**
     * Calculates the angle between two vertices through a pivot point.
     * @returns angle in [-pi, pi); straight = 0, cw > 0, ccw < 0
     */
    angleThroughVertex(vert1, pivot, vert2) {
        const slope1 = Math.atan2(pivot.rpos.y - vert1.rpos.y, pivot.rpos.x - vert1.rpos.x);
        const slope2 = Math.atan2(vert2.rpos.y - pivot.rpos.y, vert2.rpos.x - pivot.rpos.x);
        return ((slope2 - slope1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    }
    /**
     * Marks the grid as complete and ready to use.
     */
    finalize() {
        if (this.#finalized)
            return;
        this.#finalized = true;
        delete this.lastCell;
        for (const cell of this.cells)
            cell.finalize();
    }
    get width() {
        return this.#width;
    }
    get height() {
        return this.#height;
    }
    get finalized() {
        return this.#finalized;
    }
}

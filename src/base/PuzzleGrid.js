const Array2D = require('./Array2D.js');

class PuzzleGrid {
    #width;
    #height;
    #finalized = false;

    constructor(w, h = w) {
        if (!(w > 0) || !(h > 0))
            throw new Error("Grid dimensions must be positive");
        this.#width = w;
        this.#height = h;

        this.cells = [];
        this.verts = [];
        this.edges = [];

        this.lastCell = null;
        this.lastVert = null;
        this.lastEdge = null;
    }

    addVert(rpos, conns = [], vpos) {
        if (this.#finalized)
            throw new Error("Cannot modify a finalized grid");

        let newVert = new GridVertex(this, rpos, vpos);
        this.lastVert = newVert;
        for (let conn of conns) {
            if (typeof conn == 'number') conn = this.verts[conn];
            this.addEdge(conn, newVert);
        }
    }

    addEdge(fromVert, toVert, vpos, noCell) {
        if (this.#finalized)
            throw new Error("Cannot modify a finalized grid");

        if (fromVert.adjacent.includes(toVert)) return;

        if (typeof vpos != 'object' && typeof noCell == 'undefined')
            noCell = vpos, vpos = undefined;

        let newEdge = new GridEdge(this, fromVert, toVert, vpos);
        this.lastEdge = newEdge;
        this.lastCell = null;
        toVert.addEdgeTo(fromVert, newEdge);
        fromVert.addEdgeTo(toVert, newEdge);

        // From here on out we just need to check if a new cell was created.
        // If the vertices were not previously connected, a loop cannot have
        // been created so we simply merge the vertices into one network
        if (toVert.netid != fromVert.netid) {
            toVert.setNetID(fromVert.netid);
            return;
        }

        // If an existing cell contains both vertices of this edge, that cell
        // needs to be split in two
        for (let cell of this.cells) {
            let fromInd = cell.verts.indexOf(fromVert);
            if (fromInd == -1) continue;
            let toInd = cell.verts.indexOf(toVert);
            if (toInd == -1) continue;

            this.#splitCell(cell, fromInd, toInd, noCell);
            return;
        }

        if (noCell) return;

        // If the vertices were previously connected and the new edge does not
        // split an existing cell, we must be creating a new cell
        if (this.#checkNewCell(fromVert, toVert))
            return;
        if (this.#checkNewCell(toVert, fromVert))
            return;

        throw new Error("Attempted to create invalid cell");
    }

    // Split a cell in two. The old cell retains the vertex with the lowest ID.
    // If this vertex is connected to the new edge, the old cell keeps the
    // first few clockwise vertices.
    #splitCell(oldCell, fromInd, toInd, noNewCell) {
        if (fromInd == 0 || (0 < toInd && toInd < fromInd))
            [fromInd, toInd] = [toInd, fromInd];

        let newCellVerts = oldCell.verts.slice(fromInd, toInd || oldCell.verts.length);
        if (toInd == 0) newCellVerts.push(oldCell.verts[0]);

        if (!noNewCell)
            this.#addCell(newCellVerts);
        oldCell.verts.splice(fromInd + 1, newCellVerts.length - 2);
    }

    // Check for a new cell produced by a new edge, by starting in one direction
    // and taking the clockwise-most turn at each vertex.
    #checkNewCell(fromVert, toVert) {
        let startVert = toVert;
        let allVerts = [], totalAngle = 0;
        let maxSides = 1000, i = 0;
        while (i++ < maxSides) {
            let maxAngle = -Math.PI, nextVert = null;
            for (let vert of toVert.adjacent) if (vert != fromVert) {
                let newAngle = this.angleThroughVertex(fromVert, toVert, vert);
                if (newAngle > maxAngle) maxAngle = newAngle, nextVert = vert;
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

    #addCell(verts) {
        let minVertInd = 0;
        for (let i = 1; i < verts.length; i++)
            if (verts[i].id < verts[minVertInd].id)
                minVertInd = i;

        verts = verts.slice(minVertInd).concat(verts.slice(0, minVertInd));
        let newCell = new GridCell(this, verts);
        this.lastCell = newCell;

        // TODO: add cell to all relevant edges, vertices and adjacent cells

        if (typeof this.onNewCell == 'function')
            this.onNewCell(newCell);
    }

    // Calculate the angle between two edges that share a vertex.
    // Value is in [-pi, pi); straight = 0, clockwise > 0, ccw < 0.
    angleBetweenEdges(edge1, edge2) {
        if (edge1 == edge2) return -Math.PI;

        let vert1, pivot, vert2;
        if (edge1.fromVert == edge2.fromVert)
            vert1 = edge1.toVert, pivot = edge1.fromVert, vert2 = edge2.toVert;
        else if (edge1.toVert == edge2.fromVert)
            vert1 = edge1.fromVert, pivot = edge1.toVert, vert2 = edge2.toVert;
        else if (edge1.fromVert == edge2.toVert)
            vert1 = edge1.toVert, pivot = edge1.fromVert, vert2 = edge2.fromVert;
        else if (edge1.toVert == edge2.toVert)
            vert1 = edge1.fromVert, pivot = edge1.toVert, vert2 = edge2.fromVert;
        else
            throw new Error("Edges must share a vertex");

        return this.angleThroughVertex(vert1, pivot, vert2);
    }

    // Calculate the angle between two vertices through a pivot point.
    // Value is in [-pi, pi); straight = 0, clockwise > 0, ccw < 0.
    angleThroughVertex(vert1, pivot, vert2) {
        let slope1 = Math.atan2(pivot.rpos.y - vert1.rpos.y, pivot.rpos.x - vert1.rpos.x);
        let slope2 = Math.atan2(vert2.rpos.y - pivot.rpos.y, vert2.rpos.x - pivot.rpos.x);
        return (slope2 - slope1 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    }

    finalize() {
        this.#finalized = true;
        delete this.lastVert;
        delete this.lastEdge;
        delete this.lastCell;
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

class GridCell {
    constructor(grid, verts, vpos, value) {
        if (verts.length < 3)
            throw new Error("Cell must contain at least 3 vertices");

        this.grid = grid;
        this.verts = verts;
        // TODO: create list of edges
        this.vpos = vpos;
        this.value = value;

        this.id = grid.cells.length;
        grid.cells.push(this);
    }

    get adjacentAll() {

    }
    get adjacentEdge() {

    }
    get adjacentVert() {

    }

    get type() {
        return 'cell';
    }
}

class GridVertex {
    constructor(grid, rpos, vpos, value) {
        if (!(grid instanceof PuzzleGrid))
            throw new Error("new GridVertex() arg 0 must be a PuzzleGrid object");
        if (!(rpos && 'x' in rpos && 'y' in rpos))
            throw new Error("new GridVertex() arg 1 must be an object with 'x' and 'y' properties");

        this.grid = grid;
        this.rpos = rpos;
        this.vpos = vpos;
        this.value = value;

        this.id = grid.verts.length;
        grid.verts.push(this);
        this.netid = this.id;

        this.cells = [];
        this.edges = [];
        this.adjacent = [];
    }

    setNetID(id) {
        if (this.netid == id) return;
        this.netid = id;
        for (let vert of this.adjacent)
            vert.setNetID(id);
    }

    addEdgeTo(vert, edge) {
        if (typeof vert == 'number')
            vert = this.grid.verts[vert];

        let i = 0, dir = this.angleTo(vert);
        while (i < this.adjacent.length) {
            if (dir < this.angleTo(this.adjacent[i]))
                i++;
            else
                break;
        }
        this.adjacent.splice(i, 0, vert);
        this.edges.splice(i, 0, edge);
    }

    angleTo(vert) {
        if (typeof vert == 'number')
            vert = this.grid.verts[vert];

        return Math.atan2(vert.rpos.y - this.rpos.y, vert.rpos.x - this.rpos.x);
    }

    get isEdgeOfGrid() {
        return this.edges.some(e => e.isEdgeOfGrid);
    }
    get isCornerOfGrid() {
        return this.cells.length == 1;
    }

    get type() {
        return 'vertex';
    }
}

class GridEdge {
    constructor(grid, fromVert, toVert, vpos, value) {
        this.grid = grid;
        this.fromVert = fromVert;
        this.toVert = toVert;
        this.slope = fromVert.angleTo(toVert);
        this.vpos = vpos;
        this.value = value;

        this.id = grid.edges.length;
        grid.edges.push(this);

        this.leftCell = null;
        this.rightCell = null;
    }

    get isEdgeOfGrid() {
        return (this.leftCell == null) || (this.rightCell == null);
    }

    get type() {
        return 'edge';
    }
}

module.exports = PuzzleGrid;

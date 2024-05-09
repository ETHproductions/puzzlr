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
class PuzzleGrid {
    #width;
    #height;
    #finalized = false;
    #edgeMap = new Map();

    /**
     * Creates a new empty grid with a given width and height, which cannot be
     * changed.
     * @param {number} w width of puzzle
     * @param {number} h height of puzzle
     */
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

    /**
     * Creates a vertex at a given {x, y} position in the plane and optionally
     * adds edges to connect it to one or more existing vertices. this.lastVert
     * will be set to the newly created vertex.
     * 
     * @param {{x: number, y: number}} rpos exact position of the vertex in the
     * plane
     * @param {GridVertex[] | number[]} conns list of existing vertices to
     * connect to, by reference or id
     * @param {object} vpos virtual position for simplfying non-square grids;
     * can be anything but recommended to be integer {x, y}
     */
    addVert(rpos, conns = [], vpos = rpos) {
        if (this.#finalized)
            throw new Error("Cannot modify a finalized grid");

        let newVert = new GridVertex(this, rpos, vpos);
        this.lastVert = newVert;
        for (let conn of conns) {
            if (typeof conn == 'number') conn = this.verts[conn];
            this.addEdge(conn, newVert);
        }
    }

    /**
     * Creates an edge from one vertex to another, and creates a cell if the
     * new edge encloses a space on the plane and noCell is false/not provided.
     * this.lastEdge will be the newly created edge, and this.lastCell will be
     * the newly created cell, or null if none was created.
     * 
     * @param {GridVertex | number} fromVert one endpoint of the edge
     * @param {GridVertex | number} toVert other endpoint of the edge
     * @param {object} vpos virtual position for simplfying non-square grids;
     * can be anything but recommended to be integer {x, y}
     * @param {boolean} noCell prevents creating a new cell if this edge
     * encloses a space in the plane or splits an existing cell
     */
    addEdge(fromVert, toVert, vpos, noCell = false) {
        if (this.#finalized)
            throw new Error("Cannot modify a finalized grid");

        if (fromVert.adjacent.includes(toVert)) return;

        if (typeof vpos != 'object')
            noCell = vpos, vpos = undefined;

        let newEdge = new GridEdge(this, fromVert, toVert, vpos);
        this.lastEdge = newEdge;
        this.lastCell = null;
        this.#edgeMap.set(fromVert.id + ';' + toVert.id, newEdge);
        this.#edgeMap.set(toVert.id + ';' + fromVert.id, newEdge);
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

    /**
     * Returns the edge connecting two vertices, if one exists.
     * @param {GridVertex|Number} fromVert 
     * @param {GridVertex|Number} toVert 
     * @returns {GridEdge}
     */
    getEdge(fromVert, toVert) {
        if (fromVert instanceof GridVertex) fromVert = fromVert.id;
        if (toVert instanceof GridVertex) toVert = toVert.id;
        return this.#edgeMap.get(fromVert + ';' + toVert);
    }

    /**
     * Split a cell in two. The old cell retains the vertex with the lowest ID.
     * If this vertex is connected to the new edge, the old cell keeps the
     * first few clockwise vertices.
     */
    #splitCell(oldCell, fromInd, toInd, noNewCell) {
        if (fromInd == 0 || (0 < toInd && toInd < fromInd))
            [fromInd, toInd] = [toInd, fromInd];

        let newCellVerts = oldCell.verts.slice(fromInd, toInd || oldCell.verts.length);
        if (toInd == 0) newCellVerts.push(oldCell.verts[0]);

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
        let newCell = new GridCell(this, verts);
        this.lastCell = newCell;

        for (let i = 0; i < verts.length; i++) {
            let currVert = verts[i], nextVert = verts[i + 1] || verts[0];
            let vertInd = currVert.adjacent.indexOf(nextVert);
            currVert.cells[vertInd] = newCell;

            let currEdge = this.getEdge(currVert, nextVert);
            if (currEdge.fromVert == currVert)
                currEdge.rightCell = newCell;
            else
                currEdge.leftCell = newCell;
        }

        if (typeof this.onNewCell == 'function')
            this.onNewCell(newCell);
    }

    /**
     * Calculates the angle between two edges that share a vertex.
     * @param {GridEdge} edge1 
     * @param {GridEdge} edge2 
     * @returns {Number} angle in [-pi, pi); straight = 0, cw > 0, ccw < 0
     */
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

    /**
     * Calculates the angle between two vertices through a pivot point.
     * @param {GridVertex} vert1 
     * @param {GridVertex} pivot 
     * @param {GridVertex} vert2 
     * @returns {Number} angle in [-pi, pi); straight = 0, cw > 0, ccw < 0
     */
    angleThroughVertex(vert1, pivot, vert2) {
        let slope1 = Math.atan2(pivot.rpos.y - vert1.rpos.y, pivot.rpos.x - vert1.rpos.x);
        let slope2 = Math.atan2(vert2.rpos.y - pivot.rpos.y, vert2.rpos.x - pivot.rpos.x);
        return (slope2 - slope1 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    }

    /**
     * Marks the grid as complete and ready to use.
     */
    finalize() {
        if (this.#finalized) return;
        this.#finalized = true;
        delete this.lastVert;
        delete this.lastEdge;
        delete this.lastCell;
        for (let cell of this.cells) cell.finalize();
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
    // Cache of adjacent cells, in format { cell, type: 'edge' | 'vert' }
    #adjacent;

    /**
     * Creates a new grid cell out of a list of vertices.
     * @param {PuzzleGrid} grid the grid this cell belongs to
     * @param {GridVertex[]} verts vertices comprising the corners of the cell,
     * clockwise starting with the lowest ID
     * @param {Object} vpos virtual position for simplfying non-square grids;
     * can be anything but recommended to be integer {x, y}
     */
    constructor(grid, verts, vpos = null) {
        if (verts.length < 3)
            throw new Error("Cell must contain at least 3 vertices");

        this.grid = grid;
        this.verts = verts;
        this.edges = [];
        for (let i = 0; i < verts.length; i++)
            this.edges.push(this.grid.getEdge(verts[i], verts[i + 1] || verts[0]));

        this.vpos = vpos;

        this.id = grid.cells.length;
        grid.cells.push(this);
    }

    /**
     * Do anything required to finalize the grid, which currently includes:
     * - cache list of adjacent cells
     */
    finalize() {
        this.#adjacent = this.adjacent;
    }

    get adjacent() {
        if (this.#adjacent) return this.#adjacent;

        let adjacent = [];
        for (let v of this.verts) {
            let startInd = v.cells.indexOf(this);
            for (let i = 1; i < v.cells.length - 1; i++) {
                let cell = v.cells[(startInd + i) % v.cells.length];
                if (cell != null)
                    adjacent.push({ type: i == 1 ? 'edge' : 'vert', cell });
            }
        }
        return adjacent;
    }

    /**
     * List of all cells adjacent to this one by edge or vertex, starting in
     * the top left and moving clockwise.
     */
    get adjacentAll() {
        return this.adjacent.map(c => c.cell);
    }
    /**
     * List of all cells directly adjacent to this one, starting in the top
     * left and moving clockwise.
     */
    get adjacentEdge() {
        return this.adjacent.filter(c => c.type == 'edge').map(c => c.cell);
    }
    /**
     * List of all cells that share a corner with this one, starting in the
     * top-left and moving clockwise.
     */
    get adjacentVert() {
        return this.adjacent.filter(c => c.type == 'vert').map(c => c.cell);
    }

    get type() {
        return 'cell';
    }
}

class GridVertex {
    /**
     * Creates a new grid vertex at a point in the plane.
     * @param {PuzzleGrid} grid the grid this vertex belongs to
     * @param {{x: number, y: number}} rpos position of the vertex in the plane
     * @param {Object} vpos virtual position for simplfying non-square grids;
     * can be anything but recommended to be integer {x, y}
     */
    constructor(grid, rpos, vpos = rpos) {
        if (!(grid instanceof PuzzleGrid))
            throw new Error("new GridVertex() arg 0 must be a PuzzleGrid object");
        if (!(rpos && 'x' in rpos && 'y' in rpos))
            throw new Error("new GridVertex() arg 1 must be an object with 'x' and 'y' properties");

        this.grid = grid;
        this.rpos = rpos;
        this.vpos = vpos;

        this.id = grid.verts.length;
        grid.verts.push(this);
        this.netid = this.id;

        this.cells = [];
        this.edges = [];
        this.adjacent = [];
    }

    /**
     * Sets the ID for the network of vertices connected to this one.
     * @param {number} id 
     */
    setNetID(id) {
        if (this.netid == id) return;
        this.netid = id;
        for (let vert of this.adjacent)
            vert.setNetID(id);
    }

    /**
     * Adds a vertex to the list of those connected with this one.
     * @param {GridVertex} vert vertex to be connected
     * @param {GridEdge} edge edge connecting this vertex to the other
     */
    addEdgeTo(vert, edge) {
        if (this.grid.finalized)
            throw new Error("Cannot modify a finalized grid");

        if (typeof vert == 'number')
            vert = this.grid.verts[vert];

        let i = 0, dir = this.angleTo(vert);
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
     * @param {GridVertex} vert 
     * @returns {number} angle in (-pi, pi]
     */
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
    /**
     * Creates a new grid edge between two vertices.
     * @param {PuzzleGrid} grid the grid this edge belongs to
     * @param {GridVertex} fromVert 
     * @param {GridVertex} toVert 
     * @param {Object} vpos virtual position for simplfying non-square grids;
     * can be anything but recommended to be integer {x, y}
     */
    constructor(grid, fromVert, toVert, vpos = null) {
        this.grid = grid;
        this.fromVert = fromVert;
        this.toVert = toVert;
        this.slope = fromVert.angleTo(toVert);
        this.vpos = vpos;

        this.id = grid.edges.length;
        grid.edges.push(this);

        this.leftCell = null;
        this.rightCell = null;
    }

    /**
     * Takes an endpoint of this edge and returns the other endpoint. If the
     * vertex provided is not an endpoint of this edge, throws an error.
     * @param {GridVertex} vert one vertex on this edge
     * @returns the other vertex on this edge
     */
    otherVert(vert) {
        if (vert == this.fromVert)
            return this.toVert;
        if (vert == this.toVert)
            return this.fromVert;
        throw new Error('Vertex provided is not an endpoint of this edge');
    }

    get isEdgeOfGrid() {
        return (this.leftCell == null) || (this.rightCell == null);
    }

    get type() {
        return 'edge';
    }
}

export default PuzzleGrid;

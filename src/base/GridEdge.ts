import { PuzzleGrid, GridCell, GridVertex } from './';
import { Constraint } from './Constraint';
import { PuzzleVariable, PuzzleVariableValues } from './PuzzleVariable';

export default class GridEdge implements PuzzleVariable {
    grid: PuzzleGrid;
    fromVert: GridVertex;
    toVert: GridVertex;
    slope: number;
    vpos: any;
    id: number;
    leftCell: GridCell | null = null;
    rightCell: GridCell | null = null;

    var_id: number = -1;
    value: PuzzleVariableValues = [];
    constraints: Constraint[] = [];
    must_be_unique: boolean | undefined;

    /**
     * Creates a new grid edge between two vertices.
     * @param {PuzzleGrid} grid the grid this edge belongs to
     * @param {GridVertex} fromVert 
     * @param {GridVertex} toVert 
     * @param {Object} vpos virtual position for simplfying non-square grids;
     * can be anything but recommended to be integer {x, y}
     */
    constructor(grid: PuzzleGrid, fromVert: GridVertex, toVert: GridVertex, vpos: any = null) {
        this.grid = grid;
        this.fromVert = fromVert;
        this.toVert = toVert;
        this.slope = fromVert.angleTo(toVert);
        this.vpos = vpos;

        this.id = grid.edges.length;
        grid.edges.push(this);
    }

    /**
     * Takes an endpoint of this edge and returns the other endpoint. If the
     * vertex provided is not an endpoint of this edge, throws an error.
     * @param {GridVertex} vert one vertex on this edge
     * @returns the other vertex on this edge
     */
    otherVert(vert: GridVertex) {
        if (vert == this.fromVert)
            return this.toVert;
        if (vert == this.toVert)
            return this.fromVert;
        throw new Error('Vertex provided is not an endpoint of this edge');
    }

    /**
     * Takes one cell adjacent to this edge and returns the other. If the cell
     * provided is not adjacent to this edge, throws an error.
     * @param {GridCell} cell one cell on this edge
     * @returns the other cell on this edge
     */
    otherCell(cell: GridCell) {
        if (cell == this.leftCell)
            return this.rightCell;
        if (cell == this.rightCell)
            return this.leftCell;
        throw new Error('Cell provided is not adjacent to this edge');
    }

    get isEdgeOfGrid() {
        return (this.leftCell == null) || (this.rightCell == null);
    }

    get type() {
        return 'edge';
    }
}

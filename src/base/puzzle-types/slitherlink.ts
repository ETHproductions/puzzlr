import Puzzle from "../Puzzle.js";
import { PuzzleVariable } from "../PuzzleVariable.js";
import {
  SUM_EQUALS,
  SUM_EQUALS_ANY,
  CONTIG_EDGE_ALL,
} from "../generic-constraints.js";
import SquareGrid from "../grids/SquareGrid.js";

export default class SlitherlinkPuzzle extends Puzzle {
  static get type() {
    return "slitherlink";
  }
  get renderSettings() {
    return { defaultScale: 24, funcs: ["numhint", "edgedraw"] };
  }
  constructor({
    grid,
    task,
    color = false,
  }: {
    grid: { width: number; height: number };
    task: number[][];
    color: boolean;
  }) {
    super(SquareGrid.fromSize(grid.width, grid.height));

    function DIFF_EQUALS([
      edge,
      cell1,
      cell2 = new PuzzleVariable([0]),
    ]: PuzzleVariable[]) {
      if (edge.valueHas(0) && cell1.value.some((v) => cell2.valueHas(v)))
        return true;
      if (edge.valueHas(1) && cell1.value.some((v) => !cell2.valueIs(v)))
        return true;
      return false;
    }
    this.addConstraint(CONTIG_EDGE_ALL, this.grid.edges, 1);
    for (const edge of this.grid.edges) {
      this.addVariable(edge, [0, 1]);
      if (color)
        this.addConstraint(
          DIFF_EQUALS,
          [edge, edge.leftCell, edge.rightCell].filter((x) => x != null),
        );
    }
    for (const vert of this.grid.verts) {
      this.addConstraint(SUM_EQUALS_ANY, vert.edges, [0, 2]);
    }
    this.grid.cellmap.map((cell, { x, y }) => {
      if (color) this.addVariable(cell, [0, 1], false);
      const hint = task[y][x];
      if (hint != -1) {
        cell.hint = hint;
        this.addConstraint(SUM_EQUALS, cell.edges, hint);
      }
    });
  }
}

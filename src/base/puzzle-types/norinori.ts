import Puzzle from "../Puzzle";
import { SUM_EQUALS, SUM_EQUALS_IF } from "../generic-constraints";
import SquareGrid from "../grids/SquareGrid";

class NorinoriPuzzle extends Puzzle {
  static get type() {
    return "norinori";
  }
  get renderSettings() {
    return { defaultScale: 30, funcs: ["edgearea", "binarygrey"] };
  }

  grid: SquareGrid;
  areas: { x: number; y: number }[][];
  constructor({ areas }: { areas: { x: number; y: number }[][] }) {
    const grid = SquareGrid.fromAreas(areas);
    super(grid);
    this.grid = grid;
    this.areas = areas;

    for (const area of areas) {
      const cells = [];
      for (const pos of area) {
        const cell = this.grid.cellmap.get2D(pos.x, pos.y);
        cells.push(cell);
        this.addVariable(cell, [0, 1]);
        this.addConstraint(SUM_EQUALS_IF, [cell, ...cell.adjacentEdge], 1, 1);
      }
      this.addConstraint(SUM_EQUALS, cells, 2);
    }
  }
}

export default NorinoriPuzzle;

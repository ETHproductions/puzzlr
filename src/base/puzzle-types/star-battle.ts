import Puzzle from "../Puzzle.js";
import { SUM_EQUALS, SUM_EQUALS_IF } from "../generic-constraints.js";
import SquareGrid from "../grids/SquareGrid.js";

export default class StarBattlePuzzle extends Puzzle {
  static get type() {
    return "star-battle";
  }
  get renderSettings() {
    return { defaultScale: 30, funcs: ["edgearea", "binarystar"] };
  }

  areas: { x: number; y: number }[][];

  constructor({
    areas,
    star_count,
  }: {
    areas: { x: number; y: number }[][];
    star_count: number;
  }) {
    const _grid = SquareGrid.fromAreas(areas);
    super(_grid);
    this.areas = areas;

    for (const area of areas) {
      const cells = [];
      for (const pos of area) {
        const cell = _grid.cellmap.get2D(pos.x, pos.y);
        cells.push(cell);
        this.addVariable(cell, [0, 1]);
        this.addConstraint(SUM_EQUALS_IF, [cell, ...cell.adjacentAll], 1, 0);
      }
      this.addConstraint(SUM_EQUALS, cells, star_count);
    }

    for (const vars of [..._grid.cellCols, ..._grid.cellRows]) {
      this.addConstraint(SUM_EQUALS, vars, star_count);
    }
  }
}

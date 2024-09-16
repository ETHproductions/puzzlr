import GridCell from "../GridCell.js";
import Puzzle from "../Puzzle.js";
import { PuzzleVariable } from "../PuzzleVariable.js";
import { SUM_EQUALS } from "../generic-constraints.js";
import SquareGrid from "../grids/SquareGrid.js";

export default class ThermometersPuzzle extends Puzzle {
  static get type() {
    return "thermometers";
  }
  get renderSettings() {
    return { defaultScale: 30, funcs: ["edgeplain", "binarythermo"] };
  }

  areas: { x: number; y: number }[][];
  colHints: number[];
  rowHints: number[];
  structures: { thermo: Thermo[] };
  constructor({
    thermometers,
    sums,
  }: {
    thermometers: { x: number; y: number }[][];
    sums: number[];
  }) {
    const _grid = SquareGrid.fromAreas(thermometers);
    super(_grid);
    if (this.grid.width + this.grid.height != sums.length)
      throw new Error(
        "Task length must equal width of grid plus height of grid",
      );
    this.areas = thermometers;
    this.colHints = sums.slice(0, this.grid.width);
    this.rowHints = sums.slice(this.grid.width);
    this.structures = { thermo: [] };

    const THERMO_LENGTH = function (
      [thermo, cell]: PuzzleVariable[],
      target: number,
    ) {
      if (cell.value.includes(0) && thermo.value.some((v) => +v <= target))
        return true;
      if (cell.value.includes(1) && thermo.value.some((v) => +v > target))
        return true;
      return false;
    };
    for (const area of thermometers) {
      const thermo: Thermo = new Thermo();
      this.addVariable(thermo, [0], false);
      for (const pos of area) {
        const cell = _grid.cellmap.get2D(pos.x, pos.y);
        this.addVariable(cell, [0, 1]);

        thermo.vars.push(cell);
        thermo.value.push(thermo.vars.length);

        cell.thermoIndex = thermo.vars.length - 1;
        this.addConstraint(THERMO_LENGTH, [thermo, cell], cell.thermoIndex);
      }
      this.structures.thermo.push(thermo);
    }

    let i = 0;
    for (const vars of [..._grid.cellCols, ..._grid.cellRows]) {
      this.addConstraint(SUM_EQUALS, vars, sums[i++]);
    }
  }
}

export class Thermo extends PuzzleVariable {
  vars: GridCell[] = [];
}

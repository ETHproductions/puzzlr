import { GridCell } from ".";
import GridEdge from "./GridEdge";
import { PuzzleVariable, PuzzleVariableValue } from "./PuzzleVariable";

function find_sums(vars: PuzzleVariable[]) {
  let sums = new Set([0]);
  for (const v of vars) {
    const oldsums = sums;
    sums = new Set();
    for (const value of v.value)
      for (const prev of oldsums) sums.add(prev + Number(value));
  }
  return sums;
}
export function SUM_EQUALS(vars: PuzzleVariable[], target: number) {
  const sums = find_sums(vars);
  return sums.has(target);
}
export function SUM_EQUALS_ANY(vars: PuzzleVariable[], target: number[]) {
  const sums = find_sums(vars);
  return target.some((s) => sums.has(s));
}
export function SUM_EQUALS_IF(
  [var1, ...vars]: PuzzleVariable[],
  var_target: PuzzleVariableValue,
  sum_target: number
) {
  if (var1.value.length > 1 || var1.value[0] != var_target) return true;
  return SUM_EQUALS(vars, sum_target);
}

export function CONTAINS_ALL(
  vars: PuzzleVariable[],
  target: PuzzleVariableValue[]
) {
  let sets = new Set([0]);
  for (const v of vars) {
    const oldsets = sets;
    sets = new Set();
    for (const value of v.value) {
      const index = target.indexOf(value);
      for (const prev of oldsets) {
        sets.add(prev | (1 << index));
      }
    }
  }
  return sets.has(2 ** target.length - 1);
}

export function CONTIG_EDGE_ALL(
  edges: GridEdge[],
  target: PuzzleVariableValue,
  start: GridEdge
) {
  // Strategy: run this check every time an edge has its value changed.

  // If an edge had all non-target values removed, check to see if it is
  // still connected to at least one other edge with only the target value
  // (let's call this a "solid" edge).
  // Works because all existing solid edges must have been validated already.
  if (start.value.length == 1 && start.value[0] == target) {
    const found = new Set([start]);
    const check_queue = [start.fromVert, start.toVert];
    if (
      !edges.some(
        (e) => e.value.length == 1 && e.value[0] == target && e != start
      )
    )
      return true;

    // This branch only exists to rule out a potential loop in the puzzle
    // completely disconnected from the main loop, see: slitherlink/5x5-test
    // Otherwise a simple 'return true' would work fine
    while (check_queue.length > 0) {
      const nextVert = check_queue.pop()!;
      for (const edge of nextVert.edges) {
        if (!edges.includes(edge)) continue;
        if (found.has(edge)) continue;
        if (!edge.value.includes(target)) continue;
        if (edge.value.length == 1 && edge.value[0] == target) return true;
        found.add(edge);
        const otherVert = edge.otherVert(nextVert);
        if (!check_queue.includes(otherVert)) check_queue.push(otherVert);
      }
    }
    return false;
  }

  // If an edge had the target value removed, start at both vertices and
  // expand alternatingly until a connection is found between the branches.
  else if (!start.value.includes(target)) {
    // Future work: this will run multiple times if there are multiple non-target values
    const paths = [
      { check_queue: [start.fromVert], found: new Set<GridEdge>([]) },
      { check_queue: [start.toVert], found: new Set<GridEdge>([]) },
    ];
    while (paths[0].check_queue.length > 0) {
      const { check_queue, found } = paths.shift()!;
      const nextVert = check_queue.pop()!;
      for (const edge of nextVert.edges) {
        if (!edges.includes(edge)) continue;
        if (found.has(edge)) continue;
        if (!edge.value.includes(target)) continue;
        if (paths[0].found.has(edge)) return true;
        found.add(edge);
        const otherVert = edge.otherVert(nextVert);
        if (!check_queue.includes(otherVert)) check_queue.push(otherVert);
      }
      paths.push({ check_queue, found });
    }

    // If one of the two branches runs out of vertices before they meet,
    // it's not necessarily the end! If either branch contains none of the
    // remaining solid edges, we're still good (but that branch will need
    // to disappear).
    let edges_found = 0;
    for (const edge of paths[0].found)
      if (edge.value.length == 1 && edge.value[0] == target) edges_found++;
    return (
      edges_found == 0 ||
      edges_found ==
        edges.filter((e) => e.value.length == 1 && e.value[0] == target).length
    );
  } else return true;
}
CONTIG_EDGE_ALL.global = true;

export function CONTIG_CELL_ALL(
  cells: GridCell[],
  target: PuzzleVariableValue,
  start: GridCell
) {
  // Strategy: run this check every time an cell has its value changed.

  // If an cell had all non-target values removed, check to see if it is
  // still connected to at least one other cell with only the target value
  // (let's call this a "solid" cell).
  // Works because all existing solid cells must have been validated already.
  if (start.value.length == 1 && start.value[0] == target) {
    const found = new Set([start]);
    const check_queue = [...start.adjacentEdge];
    if (
      !cells.some(
        (c) => c.value.length == 1 && c.value[0] == target && c != start
      )
    )
      return true;

    // This branch exists to rule out islands
    while (check_queue.length > 0) {
      const nextCell = check_queue.pop()!;
      if (!cells.includes(nextCell)) continue;
      if (found.has(nextCell)) continue;
      if (!nextCell.value.includes(target)) continue;
      if (nextCell.value.length == 1 && nextCell.value[0] == target)
        return true;
      found.add(nextCell);
      for (const otherCell of nextCell.adjacentEdge) {
        if (!check_queue.includes(otherCell)) check_queue.push(otherCell);
      }
    }
    return false;
  }

  // If an cell had the target value removed, start at its adjacent and
  // expand alternatingly until a connection is found between the branches.
  else if (!start.value.includes(target)) {
    // Future work: this will run multiple times if there are multiple non-target values
    const paths = start.adjacentEdge.map((c) => ({
      check_queue: [c],
      found: new Set<GridCell>(),
    }));
    let found_branch = false;

    main: while (paths.length > 0) {
      const { check_queue, found } = paths.shift()!;
      if (check_queue.length == 0) {
        if (
          [...found].some(
            (cell) => cell.value.length == 1 && cell.value[0] == target
          )
        ) {
          if (
            found_branch ||
            paths.some((p) =>
              [...p.found].some(
                (c) => c.value.length == 1 && c.value[0] == target
              )
            )
          ) {
            // there are 2 separate branches with solid cells
            return false;
          } else {
            // this is the first branch with solid cells
            found_branch = true;
          }
        }
        if (paths.length == 0) {
          // this was the last branch and it has no solid cells
          return true;
        } else {
          // no solid cells but there are branches remaining
          continue;
        }
      }
      const nextCell = check_queue.pop()!;
      if (
        cells.includes(nextCell) &&
        !found.has(nextCell) &&
        nextCell.value.includes(target)
      ) {
        for (const branch of paths) {
          if (branch.found.has(nextCell)) {
            // if all branches have merged then we're good
            if (paths.length == 1) return !found_branch;
            // merge the two branches
            for (const c of found) branch.found.add(c);
            for (const c of check_queue)
              if (!branch.check_queue.includes(c)) branch.check_queue.push(c);
            continue main;
          }
        }

        found.add(nextCell);
        for (const otherCell of nextCell.adjacentEdge) {
          if (!check_queue.includes(otherCell)) check_queue.push(otherCell);
        }
      }
      paths.push({ check_queue, found });
    }
  } else return true;
}
CONTIG_CELL_ALL.global = true;

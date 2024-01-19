class Constraint {
    constructor(puzzle, check) {
        this.puzzle = null;
        this.id = puzzle.contraints.length;
        puzzle.contraints.push(this);
        this.target = null;
        this.check = check;
    }
}

// constraint that only involves a fixed set of variables
class FixedConstraint extends Constraint {
    /**
     * Create a FixedConstraint out of a check function.
     * The function should take params:
     * - vars: array of variable objects
     * - target: some value to be aimed for; up to the function what this means
     */
    constructor(puzzle, check) {
        super(puzzle, check);
        this.variables = [];
    }

    apply(puzzle, coords, targets) {
        this.variables.push(targets);
    }

    /**
     * Apply this FixedConstraint to a set of directed paths on a puzzle.
     * paths should be an array of arrays containing coordinates in {x, y}
     * format.
     */
    applyPaths(puzzle, paths, targets) {

    }

    /**
     * Apply this FixedConstraint to a disjoint set of regions on a puzzle.
     * The region_map should be the same dimensions as the puzzle and use
     * integers starting at 0 to indicate to which region each cell belongs,
     * or -1 for no region.
     */
    applyRegionMap(puzzle, region_map, targets) {

    }

    /**
     * Apply this FixedConstraint to each row of a puzzle.
     */
    applyRows(puzzle, targets) {

    }

    /**
     * Apply this FixedConstraint to each column of a puzzle.
     */
    applyColumns(puzzle, targets) {

    }

    /**
     * Apply this FixedConstraint to each 2x2 subregion of a puzzle.
     */
    apply2x2s(puzzle, targets) {

    }

    /**
     * Apply this FixedConstraint to each adjacent pair of variables in a puzzle.
     */
    applyAdjacentPairs(puzzle, targets) {

    }
}

// constraint that requires checking regions of uncertain boundaries, up to the full puzzle
/**
 * What does a FuzzyConstraint look like, exactly?
 * Some examples:
 * - Shakashaka: each unshaded area must be a rectangle
 * - Norinori: each shaded cell must touch exactly one other shaded cell
 * - Star battle: each star cannot be adjacent to another, even diagonally
 * - Any other puzzle that requires things placed to not be adjacent
 * - Nurikabe: each clue n belongs to an island of size n
 * - Galaxies: each galaxy must be rotationally symmetric
 * - Battleships: there must be exactly n 1-ships, m 2-ships, p 3-ships, etc.
 */
class FuzzyConstraint {
    /**
     * Create a FuzzyConstraint out of a check function.
     * The function should take params:
     * - 
     * - target: some value to be aimed for; up to the function what this means
     */
    constructor(puzzle, check) {
        super(puzzle, check);
    }
}

module.exports = { FixedConstraint, FuzzyConstraint };
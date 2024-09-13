import NorinoriPuzzle from "./norinori";

const puzzleTypes = [NorinoriPuzzle];
const puzzleMap = new Map(puzzleTypes.map((puzzle) => [puzzle.type, puzzle]));
export default puzzleMap;

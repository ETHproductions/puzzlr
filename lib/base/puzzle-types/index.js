import DominosaPuzzle from "./dominosa.js";
import NorinoriPuzzle from "./norinori.js";
import SlitherlinkPuzzle from "./slitherlink.js";
import StarBattlePuzzle from "./star-battle.js";
import StitchesPuzzle from "./stitches.js";
import SudokuPuzzle from "./sudoku.js";
import ThermometersPuzzle from "./thermometers.js";
import YinYangPuzzle from "./yin-yang.js";
const puzzleTypes = [
    DominosaPuzzle,
    NorinoriPuzzle,
    SlitherlinkPuzzle,
    StarBattlePuzzle,
    StitchesPuzzle,
    SudokuPuzzle,
    ThermometersPuzzle,
    YinYangPuzzle,
];
const puzzleMap = new Map(puzzleTypes.map((puzzle) => [puzzle.type, puzzle]));
export default puzzleMap;

let type, filename, mode = 'thorough', depth = 1;

if (process.argv.length < 4) return console.log(`
puzzlr <type> <file> <options>

Types supported: norinori, sudoku, thermometers
Filename can either be a path to a json file or the name of one of the files
in puzzlr/src/test/<type>/ (minus the .json)
Example: puzzlr sudoku 3x3-basic

Options:
  -m, --mode: 'fast' or 'thorough' (default='thorough')
  -d, --depth: depth of recursive search
`);

for (let i = 2; i < process.argv.length; i++) {
    let arg = process.argv[i];
    if (arg[0] == '-') {
        switch(arg) {
            case '-m':
            case '--mode':
                mode = process.argv[++i];
                break;
            case '-d':
            case '--depth':
                depth = +process.argv[++i];
                break;
            default:
                console.warn('Unsupported option:', arg);
        }
    }
    else {
        if (type === undefined) {
            type = arg;
        }
        else if (filename === undefined) {
            if (arg.includes('/') || arg.includes('.json'))
                filename = arg;
            else
                filename = `.\\src\\test\\${ type }\\${ arg }.json`;
        }
    }
}

let PuzzleType, puzzleData;
try {
    PuzzleType = require(`.\\src\\puzzles\\${type}`);
} catch(e) {
    console.error('Error: Invalid puzzle type:', type);
    return;
}

try {
    puzzleData = require(filename).puzzle;
} catch(e) {
    console.error('Error: Could not find puzzle data at', filename);
    return;
}

let testPuzzle = new PuzzleType(puzzleData);
testPuzzle.solve({ max_depth: depth, debug: 2, mode });
console.log('Stats:', testPuzzle.global_stats);

let format;
switch (type) {
    case 'sudoku':
        format = v => v.value.length > 1 ? "?" : v.value[0].toString(36).toUpperCase();
        break;
    default:
        format = v => v.value.length > 1 ? "?" : v.value[0] == 1 ? "#" : "."; 
}
for (let row of testPuzzle.grid.cellRows)
    console.log(row.map(format).join(" "));

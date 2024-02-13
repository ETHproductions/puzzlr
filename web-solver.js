let puzzleTypeCache = {};

onmessage = (e) => {
    console.log('Message received from parent:', e.data);
    if (typeof e.data == 'object' && 'puzzle' in e.data) loadPuzzle(e.data.puzzle);
}

function loadPuzzle(puzzle) {
    let type = puzzle.type;
    if (type in puzzleTypeCache) runPuzzle(puzzleTypeCache[type], puzzle);
    else import(`./src/puzzles/${type}.js`).then(data => {
        puzzleTypeCache[type] = data.default;
        runPuzzle(puzzleTypeCache[type], puzzle);
    });
}

function runPuzzle(puzzleType, puzzleData) {
    let puzz = new puzzleType(puzzleData);
    puzz.solve({ max_depth: 1, mode: 'fast' });
    console.log(puzz);
    let output = puzz.status == 'solved' ? "Solved!\n" : puzz.status == 'contradiction' ? "Contradiction found\n" : "Couldn't solve...\n";
    output += puzz.grid.cellRows.map(row => row.map(c => c.value.length > 1 ? "?" : puzzleData.type == 'sudoku' ? c.value[0].toString(36).toUpperCase() : ".#"[c.value[0]]).join(" ")).join("\n");
    postMessage(output);
}

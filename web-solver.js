let puzzleTypeCache = {};
let puzzleData = null;
let puzzleType = null;

onmessage = (e) => {
    console.log('Message received from parent:', e.data);
    switch(e.data.command) {
        case 'load':
            if (typeof e.data.data == 'object' && 'puzzle' in e.data.data)
                loadPuzzle(e.data.data.puzzle);
            else
                postMessage({ status: 'invalid' });
            break;
        case 'solve':
            runPuzzle();
            break;
    }
}

function loadPuzzle(puzzle) {
    let finishedLoading = () => {
        puzzleType = puzzleTypeCache[type];
        postMessage({ status: 'ready' });
    };
    
    puzzleData = puzzle;
    let type = puzzle.type;
    if (type in puzzleTypeCache) finishedLoading();
    else import(`./src/puzzles/${type}.js`).then(data => {
        puzzleTypeCache[type] = data.default;
        finishedLoading();
    });
}

function runPuzzle() {
    if (puzzleType == null || puzzleData == null) {
        postMessage({ status: 'invalid' });
        return;
    }
    let puzz = new puzzleType(puzzleData);
    puzz.solve({ max_depth: 1, mode: 'fast' });
    console.log(puzz);
    let output = puzz.status == 'solved' ? "Solved!\n" : puzz.status == 'contradiction' ? "Contradiction found\n" : "Couldn't solve...\n";
    output += puzz.grid.cellRows.map(row => row.map(c => c.value.length > 1 ? "?" : puzzleData.type == 'sudoku' ? c.value[0].toString(36).toUpperCase() : ".#"[c.value[0]]).join(" ")).join("\n");
    postMessage({ status: 'done', output });
}

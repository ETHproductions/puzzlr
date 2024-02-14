let puzzleTypeCache = {};
let puzzleData = null;
let puzzleType = null;
let options = { max_depth: 1, mode: 'fast' };

onmessage = (e) => {
    let message = e.data;
    console.log('Message received from parent:', message);
    switch(message.command) {
        case 'changemode':
            options.mode = message.data;
            break;
        case 'load':
            if (typeof message.data == 'object' && 'puzzle' in message.data)
                loadPuzzle(message.data.puzzle);
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
    let last_update = 0;
    options.on_value = (v) => {
        if (new Date - last_update < 17) return;
        last_update = new Date;
        let output = "Running...\n" + formatPuzzle(puzz);
        postMessage({ status: 'update', output });
    };
    options.on_value();
    puzz.solve(options);
    console.log(puzz);
    let output = puzz.status == 'solved' ? "Solved!\n" : puzz.status == 'contradiction' ? "Contradiction found.\n" : "Couldn't solve...\n";
    output += formatPuzzle(puzz);
    postMessage({ status: 'done', output });
}

function formatPuzzle(puzz) {
    return puzz.grid.cellRows.map(row => row.map(c => c.value.length > 1 ? "?" : puzzleData.type == 'sudoku' ? c.value[0].toString(36).toUpperCase() : ".#"[c.value[0]]).join(" ")).join("\n");
}

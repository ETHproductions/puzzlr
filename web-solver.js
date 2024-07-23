let puzzleTypeCache = {};
let puzzleData = null;
let puzzleType = null;
let livePuzzle = null;
let options = { max_depth: 2, mode: 'fast' };

onmessage = (e) => {
    let message = e.data;
    console.log('Message received from parent:', message);
    switch(message.command) {
        case 'changemode':
            options.mode = message.data;
            break;
        case 'load':
            if (typeof message.data == 'object' && 'type' in message.data)
                loadPuzzle(message.data);
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
        livePuzzle = new puzzleType(puzzleData);
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
    livePuzzle = new puzzleType(puzzleData);
    livePuzzle.initiate_solve(options);
    let last_update = 0, check_len = 1, start_time = Date.now();
    options.on_check = (v) => {
        if (new Date - last_update < 50) return;
        last_update = new Date;
        check_len = Math.max(check_len, ("" + livePuzzle.base_partsol.check_queue.length).length);
        let output = "Running... (" + livePuzzle.base_partsol.check_queue.length + " checks / " + livePuzzle.base_partsol.deduct_queue.length + " deducts / " + livePuzzle.partsols_by_depth.slice(-1)[0].length + " ps)";
        postMessage({ status: 'update', output, answer: livePuzzle.variables.map(v => v.value) });
    };
    options.on_check();
    livePuzzle.solve();
    console.log(livePuzzle);
    let output = livePuzzle.base_partsol.status == 'solved' ? "Solved!" : livePuzzle.base_partsol.status == 'contradiction' ? "Contradiction found." : "Couldn't solve...";
    output += ` (took ${ (Date.now() - start_time) / 1000 } seconds)`
    postMessage({ status: 'done', output, answer: livePuzzle.variables.map(v => v.value) });
}

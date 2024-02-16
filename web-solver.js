let formatPuzzle;
import(`./basic-format.js`).then(data => formatPuzzle = data.default);

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
    puzz.initiate_solve(options);
    let last_update = 0, check_len = 1;
    options.on_check = (v) => {
        if (new Date - last_update < 17) return;
        last_update = new Date;
        check_len = Math.max(check_len, ("" + puzz.base_partsol.check_queue.length).length);
        let output = "Running... (" + ("" + puzz.base_partsol.check_queue.length).padStart(check_len, "\xA0") + " checks / " + puzz.base_partsol.deduct_queue.length + " deducts / " + puzz.base_partsol.child_partsols.filter(ps => !ps.done).length + " ps)\n" + formatPuzzle(puzz);
        postMessage({ status: 'update', output });
    };
    options.on_check();
    puzz.solve();
    console.log(puzz);
    let output = puzz.base_partsol.status == 'solved' ? "Solved!\n" : puzz.base_partsol.status == 'contradiction' ? "Contradiction found.\n" : "Couldn't solve...\n";
    output += formatPuzzle(puzz);
    postMessage({ status: 'done', output });
}

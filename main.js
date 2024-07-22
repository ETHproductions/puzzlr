import { RenderedGrid } from "./svg-render.js";

const puzzleTypeCache = {};
let puzzleData = null;
let puzzleType = null;
let livePuzzle = null;
let renderedGrid = null;

document.getElementById("puzzfile").onchange = (e) => {
    let file = e.target.files[0];
    if (!file) return;
    document.getElementById("button-solve").disabled = true;
    console.log('Reading data from', file.name);

    let reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = e => {
        try {
            puzzleData = JSON.parse(e.target.result).puzzle;
        } catch (e) {
            console.log('Could not load data.');
            return;
        }
        
        console.log(puzzleData)
        let finishedLoading = () => {
            puzzleType = puzzleTypeCache[type];
            try {
                livePuzzle = new puzzleType(puzzleData);
                puzzleWorker.postMessage({ command: 'load', data: puzzleData });
                console.log('Data loaded.');
                console.log(livePuzzle)
            } catch (e) {
                console.log('Could not parse data.');
                return;
            }
            document.getElementById("button-solve").disabled = false;
            let puzzleOptions = {
                scale: ['yin-yang', 'dominosa'].includes(puzzleData.type) ? 20 : ['sudoku'].includes(puzzleData.type) ? 40 : 30,
                hintsTop: puzzleData.sums ? puzzleData.sums.slice(0, puzzleData.grid.width) : null,
                hintsLeft: puzzleData.sums ? puzzleData.sums.slice(puzzleData.grid.width) : null,
            };
            renderedGrid = new RenderedGrid(livePuzzle, puzzleOptions);
        };
            
        let type = puzzleData.type;
        if (type in puzzleTypeCache) finishedLoading();
        else import(`./src/puzzles/${type}.js`).then(data => {
            puzzleTypeCache[type] = data.default;
            finishedLoading();
        });
        
    }
};
document.getElementById("solvemode").onclick = (e) => {
    puzzleWorker.postMessage({ command: 'changemode', data: e.target.value });
};
document.getElementById("button-solve").onclick = (e) => {
    document.getElementById("status").innerText = "Running...";
    puzzleWorker.postMessage({ command: 'solve' });
};

const puzzleWorker = new Worker("web-solver.js");
puzzleWorker.onmessage = e => {
    // console.log("Message received from child:", e.data);
    switch (e.data.status) {
        case 'ready':
            document.getElementById("status").innerText = "Ready.";
            break;
        case 'update':
        case 'done':
            e.data.answer.forEach((v, i) => {
                livePuzzle.variables[i].value = v;
            });
            renderedGrid.renderPuzzle();
            document.getElementById("status").innerText = e.data.output;
            break;
        case 'invalid':
            document.getElementById("status").innerText = "Error processing puzzle";
            break;
    }
};

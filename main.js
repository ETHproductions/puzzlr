import { RenderedGrid } from "./svg-render.js";

const puzzleTypeCache = {};
let puzzleData = null;
let puzzleType = null;
let livePuzzle = null;
let renderedGrid = null;

const solveButton = document.getElementById("button-solve");
const statusText = document.getElementById("status");

document.getElementById("puzzfile").onchange = (e) => {
    let file = e.target.files[0];
    if (!file) return;
    solveButton.disabled = true;
    console.log('Reading data from', file.name);

    let reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = e => {
        try {
            puzzleData = JSON.parse(e.target.result).puzzle;
        } catch (e) {
            statusText.innerText = "Could not load JSON data.";
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
            } catch (e) {
                statusText.innerText = "Could not parse puzzle data.";
                console.log('Could not parse data.');
                return;
            }
            solveButton.disabled = false;
            let puzzleOptions = {
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
solveButton.onclick = (e) => {
    statusText.innerText = "Running...";
    puzzleWorker.postMessage({ command: 'solve' });
};

const puzzleWorker = new Worker("web-solver.js");
puzzleWorker.onmessage = e => {
    // console.log("Message received from child:", e.data);
    switch (e.data.status) {
        case 'ready':
            statusText.innerText = "Ready.";
            break;
        case 'update':
        case 'done':
            e.data.answer.forEach((v, i) => {
                livePuzzle.variables[i].value = v;
            });
            renderedGrid.renderPuzzle();
            statusText.innerText = e.data.output;
            break;
        case 'invalid':
            statusText.innerText = "Error processing puzzle";
            break;
    }
};

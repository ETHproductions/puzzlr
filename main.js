document.getElementById("puzzfile").onchange = (e) => {
    document.getElementById("button-solve").disabled = true;
    let file = e.target.files[0];
    if (!file) return;
    console.log('Reading data from', file.name);

    let reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = e => {
        try {
            let puzzleData = JSON.parse(e.target.result);
            puzzleWorker.postMessage({ command: 'load', data: puzzleData });
            console.log('Data loaded.');
            document.getElementById("solution").innerText = "Ready.";
            document.getElementById("button-solve").disabled = false;
        } catch (e) {
            console.log('Could not load data.');
            document.getElementById("solution").innerText = "No JSON data found";
        }
    }
};
document.getElementById("solvemode").onclick = (e) => {
    puzzleWorker.postMessage({ command: 'changemode', data: e.target.value });
};
document.getElementById("button-solve").onclick = (e) => {
    document.getElementById("solution").innerText = "Running...";
    puzzleWorker.postMessage({ command: 'solve' });
};

const puzzleWorker = new Worker("web-solver.js");
puzzleWorker.onmessage = e => {
    // console.log("Message received from child:", e.data);
    switch (e.data.status) {
        case 'done':
        case 'update':
            document.getElementById("solution").innerText = e.data.output.replace(/ /g, '\xA0');
            break;
        case 'invalid':
            document.getElementById("solution").innerText = "Error processing puzzle";
            break;
    }
};

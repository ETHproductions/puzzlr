let puzzleData = null;
document.getElementById("puzzfile").onchange = (e) => {
    document.getElementById("button-solve").disabled = true;
    let file = e.target.files[0];
    if (!file) return;
    console.log('Reading data from', file.name);

    let reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = e => {
        try {
            puzzleData = JSON.parse(e.target.result);
            console.log('Data loaded.');
            document.getElementById("solution").innerText = "Ready.";
            document.getElementById("button-solve").disabled = false;
        } catch (e) {
            console.log('Could not load data.');
            document.getElementById("solution").innerText = "No JSON data found";
        }
    }
}
document.getElementById("button-solve").onclick = (e) => {
    document.getElementById("solution").innerText = "Running...";
    puzzleWorker.postMessage(puzzleData);
}

const puzzleWorker = new Worker("web-solver.js");
puzzleWorker.onmessage = e => {
    console.log("Message received from child:", e.data);
    document.getElementById("solution").innerText = e.data;
};

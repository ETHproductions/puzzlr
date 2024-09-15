import Puzzle from "@/base/Puzzle";
import puzzleTypes from "@/base/puzzle-types";

let puzzleData: any = null;
let puzzleType: any = null;
let livePuzzle: Puzzle | null = null;
const options: any = { max_depth: 2, mode: "fast" };

onmessage = (e) => {
  const message = e.data;
  console.log("Message received from parent:", message);
  switch (message.command) {
    case "changemode":
      options.mode = message.data;
      break;
    case "load":
      if (typeof message.data == "object" && "type" in message.data)
        loadPuzzle(message.data);
      else postMessage({ status: "invalid" });
      break;
    case "solve":
      runPuzzle();
      break;
  }
};

function loadPuzzle(puzzle: Puzzle) {
  puzzleData = puzzle;
  const type = puzzle.type;
  puzzleType = puzzleTypes.get(type);
  livePuzzle = new puzzleType(puzzleData);
  postMessage({ status: "ready" });
}

function runPuzzle() {
  if (puzzleType == null || puzzleData == null) {
    postMessage({ status: "invalid" });
    return;
  }
  livePuzzle = new puzzleType(puzzleData);
  if (livePuzzle == null) return;
  let last_update = 0,
    check_len = 1;
  const start_time = Date.now();
  options.on_check = () => {
    if (livePuzzle == null) return;
    if (Date.now() - last_update < 17) return;
    last_update = Date.now();
    check_len = Math.max(
      check_len,
      ("" + livePuzzle.base_partsol.check_queue.length).length,
    );
    const output =
      "Running... (" +
      livePuzzle.base_partsol.check_queue.length +
      " checks / " +
      livePuzzle.base_partsol.deduct_queue.length +
      " deducts / " +
      livePuzzle.partsols_by_depth.slice(-1)[0]?.length +
      " ps)";
    postMessage({
      status: "update",
      output,
      answer: livePuzzle.variables.map((v) => v.value),
    });
  };
  options.on_check();
  livePuzzle.solve(options);
  console.log(livePuzzle);
  let output =
    livePuzzle.base_partsol.status == "solved"
      ? "Solved!"
      : livePuzzle.base_partsol.status == "contradiction"
        ? "Contradiction found."
        : "Couldn't solve...";
  output += ` (took ${(Date.now() - start_time) / 1000} seconds)`;
  postMessage({
    status: "done",
    output,
    answer: livePuzzle.variables.map((v) => v.value),
  });
}

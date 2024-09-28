import Puzzle from "@/base/Puzzle";
import puzzleTypes from "@/base/puzzle-types";

let puzzleData: any = null;
let puzzleType: any = null;
let livePuzzle: Puzzle | null = null;
let options: any = { max_depth: 2, mode: "fast" };

onmessage = (e) => {
  const message = e.data;
  //console.log("Message received from parent:", message);
  switch (message.command) {
    case "changemode":
      options.mode = message.data;
      break;
    case "load":
      livePuzzle = null;
      if (typeof message.data == "object" && "type" in message.data)
        loadPuzzle(message.data);
      else postMessage({ status: "invalid" });
      break;
    case "solve":
      runPuzzle();
      break;
    case "analyze":
      analyzePuzzle();
      break;
    case "applydeduction":
      applyDeduction(message.deduct_id);
      break;
    case "applyall":
      applyAllDeductions();
      break;
  }
};

function loadPuzzle(puzzle: Puzzle) {
  puzzleData = puzzle;
  const type = puzzle.type;
  puzzleType = puzzleTypes.get(type);
  livePuzzle = new puzzleType(puzzleData);
  if (!livePuzzle) return;
  options = { max_depth: 2, mode: "fast" };
  livePuzzle.initiate_solve(options);
  postMessage({ status: "ready" });
}

function runPuzzle() {
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
  livePuzzle.solve();
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

function analyzePuzzle() {
  if (livePuzzle == null) return;
  let depth = 0;
  if (livePuzzle.ps.check_queue.length == 0) {
    depth = 1;
    livePuzzle.current_depth = 1;
    livePuzzle.prepare_next_depth();

    const base_partsol = livePuzzle.ps;
    const current_partsols = livePuzzle.partsols_by_depth[1];
    for (const new_partsol of current_partsols) {
      new_partsol.merge_from_parents();
      new_partsol.restore(true);
      livePuzzle.simplify();
      new_partsol.done = true;

      for (const parent of new_partsol.parents) {
        parent.find_child_agreements(new_partsol.assumptions);
      }
    }
    base_partsol.restore(true);
  } else {
    while (livePuzzle.ps.check_queue.length > 0) livePuzzle.next_check();
  }
  postMessage({
    status: "analysis",
    depth,
    deductions: livePuzzle.ps.deduct_queue.map((d, i) => ({
      variable: d.variable.var_id,
      value: d.value,
      index: i,
    })),
  });
}
function applyDeduction(deduct_id: number) {
  if (livePuzzle == null) return;
  livePuzzle.ps.deduct_queue.unshift(
    ...livePuzzle.ps.deduct_queue.splice(deduct_id, 1),
  );
  livePuzzle.next_deduct();
}
function applyAllDeductions() {
  if (livePuzzle == null) return;
  while (livePuzzle.ps.deduct_queue.length > 0) livePuzzle.next_deduct();
  analyzePuzzle();
}

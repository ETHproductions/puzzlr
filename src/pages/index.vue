<template>
  Download examples from
  <a target="_blank" href="https://github.com/ETHproductions/puzzlr/tree/main/src/test">
    GitHub
  </a>
  <br />
  <label for="puzzfile">Load puzzle:</label>
  <input type="file" name="puzzfile" @change="changeFile" />
  <br />
  <label for="solvemode">Solve mode:</label>
  <select name="solvemode" @change="changeSolveMode">
    <option value="fast" default>fast (deductions before checks)</option>
    <option value="thorough">thorough (checks before deductions)</option>
  </select>
  <br />
  <button type="button" :disabled="!puzzleReady" @click="startSolve">
    Solve
  </button>
  <br />
  <span>{{ statusText }}</span>
  <br />
  <RenderedGrid ref="renderedGrid" v-if="livePuzzle" :puzzle="livePuzzle" :options="puzzleOptions" />
</template>

<script lang="ts" setup>
import Puzzle from "@/base/Puzzle";
import { PuzzleVariableValues } from "@/base/PuzzleVariable";
import puzzleTypes from "@/base/puzzle-types";
import { ref } from "vue";

let puzzleData: any = null;
let puzzleType: any = null;
const livePuzzle = ref<Puzzle | null>(null);
let puzzleOptions: object = {};
let renderMessage: any = null;
let puzzleReady = ref<boolean>(false);
let renderedGrid = ref();

const statusText = ref<string>("");

const changeFile = (e: any) => {
  let file: File = e.target.files[0];
  if (!file) return;
  puzzleReady.value = false;
  console.log("Reading data from", file.name);

  let reader = new FileReader();
  reader.readAsText(file, "UTF-8");
  reader.onload = (e) => {
    if (
      !e.target ||
      !e.target.result ||
      e.target.result instanceof ArrayBuffer
    ) {
      statusText.value = "Could not load file.";
      console.log("Could not load file.");
      return;
    }
    try {
      puzzleData = JSON.parse(e.target.result).puzzle;
    } catch (e) {
      statusText.value = "Could not load JSON data.";
      console.log("Could not load JSON data.");
      return;
    }

    if (puzzleData == null) {
      statusText.value = "Could not load puzzle data.";
      console.log("Could not load puzzle data.");
      return;
    }
    let type = puzzleData.type;

    puzzleType = puzzleTypes.get(type);
    if (!puzzleType) {
      statusText.value = "Could not determine puzzle type.";
      console.log("Could not determine puzzle type.");
      return;
    }

    try {
      livePuzzle.value = new puzzleType(puzzleData);
      puzzleWorker.postMessage({ command: "load", data: puzzleData });
      console.log("Data loaded.");
    } catch (e) {
      statusText.value = "Could not parse puzzle data.";
      console.log("Could not parse puzzle data.");
      return;
    }

    puzzleReady.value = true;
    puzzleOptions = {
      hintsTop: puzzleData.sums
        ? puzzleData.sums.slice(0, puzzleData.grid.width)
        : null,
      hintsLeft: puzzleData.sums
        ? puzzleData.sums.slice(puzzleData.grid.width)
        : null,
    };
  };
};
const changeSolveMode = (e: any) => {
  puzzleWorker.postMessage({ command: "changemode", data: e.target.value });
};
const startSolve = () => {
  statusText.value = "Running...";
  puzzleWorker.postMessage({ command: "solve" });
};

const puzzleWorker = new Worker(new URL("../web-solver.ts", import.meta.url), {
  type: "module",
});
const renderPuzzle = () => {
  if (!renderMessage) return;
  let e = renderMessage;
  renderMessage = null;
  let answer: PuzzleVariableValues[] = e.data.answer;
  answer.forEach((v, i) => {
    livePuzzle.value!.variables[i].value = v;
  });
  renderedGrid.value.renderPuzzle();
  statusText.value = e.data.output;
};
puzzleWorker.onmessage = (e) => {
  // console.log("Message received from child:", e.data);
  switch (e.data.status) {
    case "ready":
      statusText.value = "Ready.";
      break;
    case "update":
    case "done":
      renderMessage = e;
      setTimeout(renderPuzzle, 1);
      break;
    case "invalid":
      statusText.value = "Error processing puzzle";
      break;
  }
};
</script>

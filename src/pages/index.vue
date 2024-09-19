<template>
  <v-container class="d-flex flex-column align-center">
    <v-sheet elevation="2" class="v-col-12 mb-4" style="max-width: 720px;">
      <v-row>
        <v-col cols="6">
          <v-file-input label="Puzzle input" accept=".json" v-model="puzzleFile" />
        </v-col>
        <v-col cols="6">
          <v-select label="Solve mode" :items="['fast', 'thorough']" v-model="solveMode" />
        </v-col>
      </v-row>
      <div class="d-flex justify-space-between align-center">
        <div class="d-flex ga-2">
          <v-btn :disabled="!puzzleReady" @click="startSolve"> Solve </v-btn>
          <v-btn :disabled="!puzzleReady" @click="analyzePuzzle"> Analyze </v-btn>
        </div>
        <div>
          Need puzzles? Download examples from
          <a target="_blank" href="https://github.com/ETHproductions/puzzlr/tree/main/src/test">
            GitHub
          </a>
        </div>
      </div>
    </v-sheet>
    <div class="d-flex justify-center ga-4">
      <v-sheet elevation="2">
        <RenderedGrid ref="renderedGrid" />
      </v-sheet>
      <v-sheet elevation="2" class="pa-4" style="width: 480px">
        <p>{{ statusText }}</p>
        <v-list density="compact">
          <v-list-item v-for="deduction in deductions" :key="deduction.index"
            :title="livePuzzle?.variables[deduction.variable] + ' =/> ' + deduction.value"
            @click="applyDeduction(deduction.index)" />
        </v-list>
      </v-sheet>
    </div>
  </v-container>
</template>

<script lang="ts" setup>
import Puzzle from "@/base/Puzzle";
import { PuzzleVariableValue, PuzzleVariableValues } from "@/base/PuzzleVariable";
import puzzleTypes from "@/base/puzzle-types";
import { ref, watch } from "vue";

let puzzleData: any = null;
let puzzleType: any = null;
let livePuzzle: Puzzle | null = null;
let puzzleOptions: object = {};
let renderMessage: any = null;
let puzzleReady = ref<boolean>(false);
let renderedGrid = ref();
const solveMode = ref("fast");
const puzzleFile = ref<File | null>(null);
const deductions = ref<{ variable: number, value: PuzzleVariableValue, index: number }[]>([]);
const statusText = ref<string>("");

watch(puzzleFile, (file) => {
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
      livePuzzle = new puzzleType(puzzleData);
      console.log("RenderedGrid should have reset by now");
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
    renderedGrid.value?.resetPuzzle(livePuzzle, puzzleOptions);
  };
});
watch(solveMode, () => {
  puzzleWorker.postMessage({ command: "changemode", data: solveMode.value });
});
const startSolve = () => {
  statusText.value = "Running...";
  puzzleWorker.postMessage({ command: "solve" });
};
const analyzePuzzle = () => {
  statusText.value = "Analyzing...";
  puzzleWorker.postMessage({ command: "analyze" });
}
const applyDeduction = (deduct_id: number) => {
  if (!livePuzzle) return;

  const [deduction] = deductions.value.splice(deduct_id, 1);
  deductions.value = deductions.value.map((d, i) => ({ ...d, index: i }));

  const variable = livePuzzle.variables[deduction.variable];
  variable.value.splice(variable.value.indexOf(deduction.value), 1);
  renderedGrid.value.renderPuzzle();

  puzzleWorker.postMessage({ command: "applydeduction", deduct_id });
}

const puzzleWorker = new Worker(new URL("../web-solver.ts", import.meta.url), {
  type: "module",
});
const renderPuzzle = () => {
  if (!renderMessage) return;
  let data = renderMessage;
  renderMessage = null;
  let answer: PuzzleVariableValues[] = data.answer;
  answer.forEach((v, i) => {
    livePuzzle!.variables[i].value = v;
  });
  renderedGrid.value.renderPuzzle();
  statusText.value = data.output;
};
puzzleWorker.onmessage = (e) => {
  // console.log("Message received from child:", e.data);
  switch (e.data.status) {
    case "ready":
      statusText.value = "Ready.";
      break;
    case "update":
    case "done":
      renderMessage = e.data;
      setTimeout(renderPuzzle, 1);
      break;
    case "invalid":
      statusText.value = "Error processing puzzle";
      break;
    case "analysis":
      statusText.value = "Found " + e.data.deductions.length + " deductions";
      deductions.value = e.data.deductions;
      break;
  }
};
</script>

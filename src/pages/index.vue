<template>
  Download examples from
  <a target="_blank" href="https://github.com/ETHproductions/puzzlr/tree/main/src/test">GitHub</a>
  <br>
  <label for="puzzfile">Load puzzle:</label>
  <input type="file" name="puzzfile" id="puzzfile">
  <br>
  <label for="solvemode">Solve mode:</label>
  <select name="solvemode" id="solvemode">
    <option value="fast" default>fast (deductions before checks)</option>
    <option value="thorough">thorough (checks before deductions)</option>
  </select>
  <br>
  <button type="button" id="button-solve" disabled>Solve</button>
  <br>
  <span id="status">Load a puzzle...</span>
  <br>
  <svg id="solution"></svg>
</template>

<script lang="ts" setup>

</script>

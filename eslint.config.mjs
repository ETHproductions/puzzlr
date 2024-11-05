// @ts-check
import globals from "globals";
import eslint from "@eslint/js";
import tsEslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import eslintConfigPrettier from "eslint-config-prettier";

export default tsEslint.config({
  extends: [
    eslint.configs.recommended,
    ...tsEslint.configs.recommended,
    ...pluginVue.configs["flat/recommended"],
    eslintConfigPrettier,
  ],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    globals: globals.node,
    parserOptions: {
      parser: tsEslint.parser,
      project: "./tsconfig.json",
      extraFileExtensions: [".vue"],
      sourceType: "module",
    },
  },
  files: ["**/*.ts", "**/*.vue"],
  ignores: ["**/dist", "**/lib", "**/node_modules", "**/*.d.ts"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        caughtErrors: "none",
      },
    ],

    "@typescript-eslint/no-explicit-any": "off",

    "vue/multi-word-component-names": "off",
  },
});

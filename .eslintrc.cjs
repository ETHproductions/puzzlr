/**
 * .eslint.js
 *
 * ESLint configuration file.
 */

module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: "module"
  },
  rules: {
    'vue/multi-word-component-names': 'off',
  },
}

# puzzlr

A puzzling toolkit designed around a rudimentary universal solver.

[**Try it online**](https://ethproductions.github.io/puzzlr)

## Install

```
npm i -g puzzlr
```

Or download the repo and run `npm i -g` in the base directory.

## Usage

```
puzzlr <type> <file> <options>

Filename can either be a path to a json file or a built-in example.
See /src/test/<type> for examples (or run 'puzzlr <type>')
Example: puzzlr sudoku 3x3-basic

Options:
  -m, --mode: 'fast' or 'thorough' (default='thorough')
  -d, --depth: depth of recursive search (default=1)
  -l, --log: level of detail in debug log (default=0)
```

## TODO

- Support search depths beyond 1
- Support multi-valued variables
- Generalize implementation of rules
- Add more puzzle types
- Add more grid types (see src/PuzzleGrid.js)
- Interactive renderer?

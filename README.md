# puzzlr

A puzzling toolkit designed around a rudimentary universal solver.

## Usage

```
puzzlr\index.js <type> <file> <options>

Filename can either be a path to a json file or the name of one of the files
in puzzlr/src/test/<type>/ (minus the .json)
Example: puzzlr sudoku 3x3-basic

Options:
  -m, --mode: 'fast' or 'thorough' (default='thorough')
  -d, --depth: depth of recursive search
```

npm support coming soon.

## TODO

- Generalize rules
- Add more puzzle types
- Add more grid types (see src/PuzzleGrid.js)
- Interactive renderer?

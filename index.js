#!/usr/bin/env node
import { readdirSync, readFileSync } from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import formatPuzzle from "./src/base/basic-format.js";

let type, filename, mode = 'thorough', max_depth = 1, debug = 0;

for (let i = 2; i < process.argv.length; i++) {
    let arg = process.argv[i];
    if (arg[0] == '-') {
        switch(arg) {
            case '-m':
            case '--mode':
                mode = process.argv[++i];
                break;
            case '-d':
            case '--depth':
                max_depth = process.argv[++i] | 0;
                break;
            case '-l':
            case '--log':
                debug = process.argv[++i] | 0;
                break;
            case '--help':
                break;
            default:
                console.warn('Unsupported option:', arg);
        }
    }
    else {
        if (type === undefined) {
            type = arg;
        }
        else if (filename === undefined) {
            if (arg.includes('/') || arg.includes('.json'))
                filename = arg;
            else
                filename = `${ __dirname }\\src\\test\\${ type }\\${ arg }.json`;
        }
    }
}

let PuzzleType, puzzleData;
if (type === undefined) {
    console.log(`puzzlr <type> <file> <options>\n`);

    let puzzletypes = [];
    readdirSync(__dirname + `\\src\\puzzles`).forEach(file => {
        if (/\.js$/i.test(file)) puzzletypes.push(file.slice(0, -3));
    });
    let output = ['Types supported: '];
    for (let ptype of puzzletypes) {
        if (output[output.length - 1].length + ptype.length + 1 > 80)
            output.push(' '.repeat(17));
        output[output.length - 1] += ptype + ', ';
    }
    console.log(output.join('\n').slice(0, -2));
    console.log(`Filename can either be a path to a json file or a built-in example.
Enter 'puzzlr <type>' to see available examples for that puzzle type.

Options:
    -m, --mode: 'fast' or 'thorough' (default='thorough')
    -d, --depth: depth of recursive search (default=1)
    -l, --log: level of detail in debug log (default=0)`);

    process.exit(0);
}

try {
    PuzzleType = (await import('file:\\\\' + __dirname + `\\src\\puzzles\\${type}.js`)).default;
} catch(e) {
    console.error('Error: Invalid puzzle type:', type);
    process.exit(1);
}

if (filename === undefined) {
    console.log(`Available ${type} examples:`);
    readdirSync(__dirname + `\\src\\test\\${type}`).forEach(file => {
        if (/\.json$/i.test(file)) console.log('- ' + file.slice(0, -5));
    });
    process.exit(0);
}

try {
    puzzleData = JSON.parse(readFileSync(filename, 'utf8')).puzzle;
} catch(e) {
    console.error('Error: Could not find puzzle data at', filename);
    process.exit(1);
}

let puzzle = new PuzzleType(puzzleData);
puzzle.solve({ max_depth, debug, mode });
console.log(formatPuzzle(puzzle));
console.log('Stats:', puzzle.global_stats);

#!/usr/bin/env node
import { readdirSync, readFileSync } from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let puzzletypes = [], test_cases = {};

let type, filename, max_depth = 2, mode = 'fast';

for (let i = 2; i < process.argv.length; i++) {
    let arg = process.argv[i];
    if (arg[0] == '-') {
        switch(arg) {
            default:
                console.warn('Unsupported option:', arg);
        }
    }
    else {
        if (puzzletypes.length == 0) {
            puzzletypes.push(arg);
        }
        else if (filename === undefined) {
            if (arg.includes('/') || arg.includes('.json'))
                filename = arg;
            else
                filename = `${ __dirname }\\src\\test\\${ type }\\${ arg }.json`;
        }
    }
}

if (puzzletypes.length == 0) {
    readdirSync(__dirname).forEach(folder => {
        if (/\.js$/i.test(folder)) return;
        puzzletypes.push(folder);
    });
    console.log('Found', puzzletypes.length, 'puzzle types');
}
for (let type of puzzletypes) {
    test_cases[type] = [];
    readdirSync(__dirname + '\\' + type).forEach(file => {
        test_cases[type].push(file);
    });
    test_cases[type].sort((a, b) => {
        let sa = a.match(/\d+/g).slice(0, 2).reduce((p, c) => p * c, 1);
        let sb = b.match(/\d+/g).slice(0, 2).reduce((p, c) => p * c, 1);
        return sa - sb;
    })
}
let puzzle_stats = { total: 0, solved: 0 };
function failPuzzle(name, reason) {
    if (!(reason in puzzle_stats))
        puzzle_stats[reason] = [];
    puzzle_stats[reason].push(name);
}
for (let type of puzzletypes) {
    console.log('Testing', type);
    let PuzzleType;
    try {
        PuzzleType = (await import('file:\\\\' + __dirname + `\\..\\puzzles\\${type}.js`)).default;
    } catch(e) {
        console.error('Error: Invalid puzzle type:', type);
        continue;
    }

    for (let test_case of test_cases[type]) {
        console.log('  Testing', test_case);
        puzzle_stats.total++;
        let filename = __dirname + '\\' + type + '\\' + test_case;
        let puzzleData;
        try {
            puzzleData = JSON.parse(readFileSync(filename, 'utf8')).puzzle;
        } catch (e) {
            console.error('  \x1b[31m\u2718 Invalid JSON data at ' + filename + '\x1b[0m');
            failPuzzle(type + '/' + test_case, 'invalid');
            continue;
        }

        let start_time = process.hrtime.bigint(), puzzle;
        try {
            puzzle = new PuzzleType(puzzleData);
        } catch(e) {
            console.error('  \x1b[31m\u2718 Could not build puzzle from ' + filename + '\x1b[0m');
            failPuzzle(type + '/' + test_case, 'invalid');
            continue;
        }
        let end_time = process.hrtime.bigint();
        console.log('    Built puzzle in', (Number(end_time - start_time)/1e6).toFixed(3), 'ms:', puzzle.variables.length, 'variables,', puzzle.constraints.length, 'constraints');
        
        start_time = process.hrtime.bigint();
        puzzle.solve({ max_depth, debug: -1, mode });
        end_time = process.hrtime.bigint();
        if (puzzle.ps.status == 'solved') {
            console.log('  \x1b[32m\u2713 Solved puzzle\x1b[0m in', (Number(end_time - start_time)/1e9).toFixed(4), 'sec');
            puzzle_stats.solved++;
        }
        else {
            console.log('  \x1b[31m\u2718 Status ' + puzzle.ps.status + '\x1b[0m:', (Number(end_time - start_time)/1e9).toFixed(4), 'sec');
            failPuzzle(type + '/' + test_case, puzzle.ps.status);
        }
    }
}
if (puzzle_stats.total == puzzle_stats.solved)
    console.log('Solved \x1b[32m' + puzzle_stats.solved + '/' + puzzle_stats.total, 'puzzles\x1b[0m');
else {
    let fail_reasons = Object.keys(puzzle_stats).filter(x => x != 'total' && x != 'solved');
    console.log('Solved \x1b[31m' + puzzle_stats.solved + '/' + puzzle_stats.total, 'puzzles\x1b[0m');
    for (let reason of fail_reasons) {
        let failed = puzzle_stats[reason];
        console.log('-', failed.length, reason);
        for (let name of failed)
            console.log('  -', name);
    }
}

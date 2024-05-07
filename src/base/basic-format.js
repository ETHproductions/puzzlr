/**
 * Renders a SquareGrid puzzle in plain text by representing each cell with a
 * single character.
 */
export default function formatPuzzle(puzz) {
    let format;
    let width = puzz.grid.width, height = puzz.grid.height;
    function formatCells(f) {
        return puzz.grid.cellRows.map(row => row.map(format).join(" ")).join("\n");
    }
    switch (puzz.type) {
        case 'slitherlink':
            let output = '';
            for (let row = 0; row <= height * 2; row++) {
                for (let col = 0; col <= width * 2; col++) {
                    if (row % 2 == 0 && col % 2 == 0) {
                        output += '*';
                    }
                    else if (row % 2 == 0 && col % 2 == 1) {
                        let e = puzz.grid.edgemap.horiz.get2D((col - 1) / 2, row / 2);
                        output += e.value.length != 1 ? ' ? ' : e.value[0] == 1 ? '---' : '   ';
                    }
                    else if (row % 2 == 1 && col % 2 == 0) {
                        let e = puzz.grid.edgemap.vert.get2D(col / 2, (row - 1) / 2);
                        output += e.value.length != 1 ? '?' : e.value[0] == 1 ? '|' : ' ';
                    }
                    else {
                        let c = puzz.grid.cellmap.get2D((col - 1) / 2, (row - 1) / 2);
                        output += c.value > -1 ? ' ' + c.value + ' ' : '   ';
                    }
                }
                output += '\n';
            }
            return output;
        case 'dominosa':
        case 'stitches':
            format = c => {
                let dir = -1;
                for (let i = 0; i < 4; i++) {
                    if (c.edges[i].value == 1)
                        dir = dir == -1 ? i : -2;
                    else if (c.edges[i].value?.length > 1)
                        dir = -2;
                }
                return "?.^>v<"[dir + 2];
            };
            return formatCells(format);
        case 'sudoku':
            format = c => c.value.length > 1 ? "?" : c.value[0].toString(36).toUpperCase();
            return formatCells(format);
        default:
            format = c => c.value.length > 1 ? "?" : c.value[0] == 1 ? "#" : "."; 
            return formatCells(format);
    }
}

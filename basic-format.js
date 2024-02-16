/**
 * Renders a SquareGrid puzzle in plain text by representing each cell with a
 * single character.
 */
export default function formatPuzzle(puzz) {
    let format;
    switch (puzz.type) {
        case 'dominosa':
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
            break;
        case 'sudoku':
            format = c => c.value.length > 1 ? "?" : c.value[0].toString(36).toUpperCase();
            break;
        default:
            format = c => c.value.length > 1 ? "?" : c.value[0] == 1 ? "#" : "."; 
    }
    return puzz.grid.cellRows.map(row => row.map(format).join(" ")).join("\n");
}

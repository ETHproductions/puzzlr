/**
 * Renders a SquareGrid puzzle in plain text by representing each cell with a
 * single character.
 */
export function formatFull(puzz) {
    let width = puzz.grid.width, height = puzz.grid.height;
    
    let formatCell = c => c.value.length != 1 ? ' ? ' : c.value[0] == 1 ? '(#)' : '   ';
    let formatEdgeHoriz = e => e.isEdgeOfGrid || e.leftCell.area_id != e.rightCell.area_id ? '---' : '   ';
    let formatEdgeVert = e => e.isEdgeOfGrid || e.leftCell.area_id != e.rightCell.area_id ? '|' : ' ';
    let formatVertex = v => '+';
    
    switch (puzz.type) {
        case 'slitherlink':
            formatCell = c => c.hint > -1 ? ' ' + c.hint + ' ' : '   ';
            formatEdgeHoriz = e => e.value.length != 1 ? ' ? ' : e.value[0] == 1 ? '---' : '   ';
            formatEdgeVert = e => e.value.length != 1 ? '?' : e.value[0] == 1 ? '|' : ' ';
            break;
        case 'dominosa':
            formatCell = c => (' ' + c.value + ' ').slice(-3);
            formatEdgeHoriz = e => e.isEdgeOfGrid ? '---' : e.value.length != 1 ? ' ? ' : e.value[0] == 1 ? '   ' : '---';
            formatEdgeVert = e => e.isEdgeOfGrid ? '|' : e.value.length != 1 ? '?' : e.value[0] == 1 ? ' ' : '|';
            break;
        case 'stitches':
            formatCell = c => {
                let dir = -1;
                for (let i = 0; i < 4; i++) {
                    if (c.edges[i].value == 1)
                        dir = dir == -1 ? i : -2;
                    else if (c.edges[i].value?.length > 1)
                        dir = -2;
                }
                return [" ? ","   ","(^)","(>)","(v)","(<)"][dir + 2];
            };
            formatEdgeHoriz = e => e.isEdgeOfGrid ? '---' : e.leftCell.area_id == e.rightCell.area_id ? '   ' : e.value.length != 1 ? '-?-' : e.value[0] == 1 ? '-|-' : '---';
            formatEdgeVert = e => e.isEdgeOfGrid ? '|' : e.leftCell.area_id == e.rightCell.area_id ? ' ' : e.value.length != 1 ? '?' : e.value[0] == 1 ? '\u2013' : '|';
            break;
        case 'sudoku':
            formatCell = c => c.value.length != 1 ? " ? " : " " + c.value[0].toString(36).toUpperCase() + " ";
            break;
        case 'thermometers':
            formatCell = c => c.value.length != 1 ? ' ? ' : c.value[0] == 1 ? c.thermoIndex == 0 ? '(@)' : '(#)' : c.thermoIndex == 0 ? ' * ' : '   ';
            formatEdgeHoriz = e => e.isEdgeOfGrid || e.leftCell.area_id != e.rightCell.area_id || Math.abs(e.leftCell.thermoIndex - e.rightCell.thermoIndex) != 1 ? '---' : '   ';
            formatEdgeVert = e => e.isEdgeOfGrid || e.leftCell.area_id != e.rightCell.area_id || Math.abs(e.leftCell.thermoIndex - e.rightCell.thermoIndex) != 1 ? '|' : ' ';
            break;
    }

    let output = '';
    if ('colHints' in puzz) {
        if ('rowHints' in puzz) {
            output += '   ';
        }
        for (let col = 0; col < width; col++) {
            output += ('  ' + puzz.colHints[col] + ' ').slice(-4);
        }
        output += '\n';
    }
    for (let row = 0; row <= height * 2; row++) {
        if ('rowHints' in puzz) {
            output += row % 2 == 1 ? (' ' + puzz.rowHints[(row - 1) / 2] + ' ').slice(-3) : '   ';
        }
        for (let col = 0; col <= width * 2; col++) {
            if (row % 2 == 0 && col % 2 == 0) {
                output += '+';
            }
            else if (row % 2 == 0 && col % 2 == 1) {
                let e = puzz.grid.edgemap.horiz.get2D((col - 1) / 2, row / 2);
                output += formatEdgeHoriz(e);
            }
            else if (row % 2 == 1 && col % 2 == 0) {
                let e = puzz.grid.edgemap.vert.get2D(col / 2, (row - 1) / 2);
                output += formatEdgeVert(e);
            }
            else {
                let c = puzz.grid.cellmap.get2D((col - 1) / 2, (row - 1) / 2);
                output += formatCell(c);
            }
        }
        output += '\n';
    }
    return output;
}

export function formatSimple(puzz) {
    let format;
    let width = puzz.grid.width, height = puzz.grid.height;
    function formatCells(f) {
        return puzz.grid.cellRows.map(row => row.map(format).join(" ")).join("\n");
    }
    switch (puzz.type) {
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

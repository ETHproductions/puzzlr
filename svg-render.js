const ns = "http://www.w3.org/2000/svg";
const svg = document.getElementById('solution');

export function renderGrid(grid, scale) {
    while (svg.firstChild) {
        svg.removeChild(svg.lastChild);
    }
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (let vert of grid.verts) {
        if (vert.rpos.x < minX) minX = vert.rpos.x;
        if (vert.rpos.x > maxX) maxX = vert.rpos.x;
        if (vert.rpos.y < minY) minY = vert.rpos.y;
        if (vert.rpos.y > maxY) maxY = vert.rpos.y;
    }

    let width  = (maxX - minX + 1) * scale,
        height = (maxY - minY + 1) * scale;

    let originX =  width / 2 - (minX + maxX) / 2 * scale,
        originY = height / 2 - (minY + maxY) / 2 * scale;

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    console.log(grid.verts);

    for (let edge of grid.edges) {
        let line = document.createElementNS(ns, "line");
        line.setAttributeNS(null, "stroke", "black");
        line.setAttributeNS(null, "stroke-width", edge.isEdgeOfGrid || (edge.leftCell != null && edge.rightCell != null && grid.cells[edge.leftCell].area_id != grid.cells[edge.rightCell].area_id) ? 3 : 1);
        line.setAttributeNS(null, "stroke-linecap", "square");
        let vert1 = grid.verts[edge.fromVert];
        line.setAttributeNS(null, "x1", originX + vert1.rpos.x * scale);
        line.setAttributeNS(null, "y1", originY + vert1.rpos.y * scale);
        let vert2 = grid.verts[edge.toVert];
        line.setAttributeNS(null, "x2", originX + vert2.rpos.x * scale);
        line.setAttributeNS(null, "y2", originY + vert2.rpos.y * scale);
        svg.appendChild(line);
    }
}

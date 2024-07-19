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
    
    const cellsBase = document.createElementNS(ns, "g");
    cellsBase.setAttribute("id", "cells-base");
    svg.appendChild(cellsBase);

    const edgesBase = document.createElementNS(ns, "g");
    edgesBase.setAttribute("id", "edges-base");
    svg.appendChild(edgesBase);

    const edgesHitbox = document.createElementNS(ns, "g");
    edgesHitbox.setAttribute("id", "edges-hitbox");
    svg.appendChild(edgesHitbox);

    console.log(grid.cells);

    for (let edge of grid.edges) {
        let vert1 = grid.verts[edge.fromVert];
        let vert2 = grid.verts[edge.toVert];

        let line = document.createElementNS(ns, "line");
        line.setAttributeNS(null, "stroke", "black");
        line.setAttributeNS(null, "stroke-width", edge.isEdgeOfGrid || (edge.leftCell != null && edge.rightCell != null && grid.cells[edge.leftCell].area_id != grid.cells[edge.rightCell].area_id) ? 3 : 1);
        line.setAttributeNS(null, "stroke-linecap", "square");
        line.setAttributeNS(null, "x1", originX + vert1.rpos.x * scale);
        line.setAttributeNS(null, "y1", originY + vert1.rpos.y * scale);
        line.setAttributeNS(null, "x2", originX + vert2.rpos.x * scale);
        line.setAttributeNS(null, "y2", originY + vert2.rpos.y * scale);
        edgesBase.appendChild(line);
        
        let hitbox = document.createElementNS(ns, "line");
        hitbox.setAttributeNS(null, "stroke", "transparent");
        hitbox.setAttributeNS(null, "stroke-width", 5);
        hitbox.setAttributeNS(null, "x1", originX + vert1.rpos.x * scale);
        hitbox.setAttributeNS(null, "y1", originY + vert1.rpos.y * scale);
        hitbox.setAttributeNS(null, "x2", originX + vert2.rpos.x * scale);
        hitbox.setAttributeNS(null, "y2", originY + vert2.rpos.y * scale);

        hitbox.onmouseover = (e) => line.setAttributeNS(null, "stroke", "red");
        hitbox.onmouseout = (e) => line.setAttributeNS(null, "stroke", "black");
        edgesHitbox.appendChild(hitbox);
    }

    for (let cell of grid.cells) {
        let path = document.createElementNS(ns, "path");
        path.setAttributeNS(null, "fill", "white");
        path.setAttributeNS(null, "d", cell.verts.map((v, i) => {
            let {x, y} = grid.verts[v].rpos;
            return (i > 0 ? "L " : "M ") + [originX + x * scale, originY + y * scale]
        }).join(" ") + " Z");
        path.onmouseover = (e) => path.setAttributeNS(null, "fill", "lightgrey");
        path.onmouseout = (e) => path.setAttributeNS(null, "fill", "white");
        cellsBase.appendChild(path);
    }
}

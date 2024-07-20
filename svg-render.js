const ns = "http://www.w3.org/2000/svg";
const svg = document.getElementById('solution');

export class RenderedGrid {
    constructor(grid, options) {
        while (svg.firstChild) {
            svg.removeChild(svg.lastChild);
        }

        const scale = this.scale = options.scale || 30;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (let vert of grid.verts) {
            if (vert.rpos.x < minX) minX = vert.rpos.x;
            if (vert.rpos.x > maxX) maxX = vert.rpos.x;
            if (vert.rpos.y < minY) minY = vert.rpos.y;
            if (vert.rpos.y > maxY) maxY = vert.rpos.y;
        }
        this.minX = minX, this.maxX = maxX;
        this.minY = minY, this.maxY = maxY;

        let width  = (maxX - minX + 1) * scale,
            height = (maxY - minY + 1) * scale;

        let originX =  width / 2 - (minX + maxX) / 2 * scale,
            originY = height / 2 - (minY + maxY) / 2 * scale;

        if (options.hintsLeft) width += scale, originX += scale;
        if (options.hintsRight) width += scale;
        if (options.hintsTop) height += scale, originY += scale;
        if (options.hintsBottom) height += scale;

        this.width = width, this.height = height;
        this.originX = originX, this.originY = originY;

        svg.setAttribute("width", width);
        svg.setAttribute("height", height);

        svg.cellsBase = document.createElementNS(ns, "g");
        svg.cellsBase.setAttribute("id", "cells-base");
        svg.appendChild(svg.cellsBase);
        
        svg.edgesBase = document.createElementNS(ns, "g");
        svg.edgesBase.setAttribute("id", "edges-base");
        svg.appendChild(svg.edgesBase);

        svg.edgesHitbox = document.createElementNS(ns, "g");
        svg.edgesHitbox.setAttribute("id", "edges-hitbox");
        svg.appendChild(svg.edgesHitbox);

        svg.hintsGroup = document.createElementNS(ns, "g");
        svg.hintsGroup.setAttribute("id", "hints");
        svg.appendChild(svg.hintsGroup);

        svg.answerGroup = document.createElementNS(ns, "g");
        svg.answerGroup.setAttribute("id", "answer");
        svg.appendChild(svg.answerGroup);

        for (let edge of grid.edges) {
            let vert1 = edge.fromVert;
            let vert2 = edge.toVert;

            let line = this.createSVGElement("line", svg.edgesBase, {
                "stroke": "black",
                "stroke-width": edge.isEdgeOfGrid || (edge.leftCell != null && edge.rightCell != null && edge.leftCell.area_id != edge.rightCell.area_id) ? 3 : 1,
                "stroke-linecap": "square",
                "x1": originX + vert1.rpos.x * scale,
                "y1": originY + vert1.rpos.y * scale,
                "x2": originX + vert2.rpos.x * scale,
                "y2": originY + vert2.rpos.y * scale
            });
            
            let hitbox = this.createSVGElement("line", svg.edgesHitbox, {
                "stroke": "transparent",
                "stroke-width": 5,
                "x1": originX + vert1.rpos.x * scale,
                "y1": originY + vert1.rpos.y * scale,
                "x2": originX + vert2.rpos.x * scale,
                "y2": originY + vert2.rpos.y * scale
            });

            hitbox.onmouseover = (e) => line.setAttributeNS(null, "stroke", "red");
            hitbox.onmouseout = (e) => line.setAttributeNS(null, "stroke", "black");
        }

        for (let cell of grid.cells) {
            let path = this.createSVGElement("path", svg.cellsBase, {
                "fill": "white",
                "d": cell.verts.map((v, i) => {
                    let {x, y} = v.rpos;
                    return (i > 0 ? "L " : "M ") + [originX + x * scale, originY + y * scale]
                }).join(" ") + " Z"
            });
            path.onmouseover = (e) => path.setAttributeNS(null, "fill", "lightgrey");
            path.onmouseout = (e) => path.setAttributeNS(null, "fill", "white");
        }

        if (options.hintsLeft) {
            let x = originX + (minX - 0.5) * scale;
            let y = originY + (minY + 0.5) * scale;
            for (let hint of options.hintsLeft) {
                if (hint != -1) this.addHint(hint, x, y);
                y += scale;
            }
        }
        if (options.hintsRight) {
            let x = originX + (maxX + 0.5) * scale;
            let y = originY + (minY + 0.5) * scale;
            for (let hint of options.hintsRight) {
                if (hint != -1) this.addHint(hint, x, y);
                y += scale;
            }
        }
        if (options.hintsTop) {
            let x = originX + (minX + 0.5) * scale;
            let y = originY + (minY - 0.5) * scale;
            for (let hint of options.hintsTop) {
                if (hint != -1) this.addHint(hint, x, y);
                x += scale;
            }
        }
        if (options.hintsBottom) {
            let x = originX + (minX + 0.5) * scale;
            let y = originY + (maxY + 0.5) * scale;
            for (let hint of options.hintsTop) {
                if (hint != -1) this.addHint(hint, x, y);
                x += scale;
            }
        }
    }
    
    convertX(x) {
        return this.originX + x * this.scale;
    }
    convertY(y) {
        return this.originY + y * this.scale;
    }

    createSVGElement(name, group, attributes) {
        let elem = document.createElementNS(ns, name);
        for (let prop in attributes) {
            elem.setAttributeNS(null, prop, attributes[prop]);
        }
        group.appendChild(elem);
        return elem;
    }
    addHint(hint, x, y) {
        let text = this.createSVGElement("text", svg.hintsGroup, {
            "fill": "black",
            "style": "font: bold " + (this.scale / 2) + "px sans-serif",
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            "x": x,
            "y": y
        });
        text.textContent = hint;
    }

    renderElements = {
        "cellhint": function(cell, hint) {
            let { x, y } = cell.midpoint;
            addHint(hint, x, y);
        },
        "stitch": function(edge, value) {
            if (value == 1) {
                let mid1 = edge.leftCell.midpoint;
                let mid2 = edge.rightCell.midpoint;
    
                this.createSVGElement("line", svg.answerGroup, {
                    "stroke": "black",
                    "stroke-width": 5,
                    "stroke-linecap": "round",
                    "x1": this.convertX(mid1.x),
                    "y1": this.convertY(mid1.y),
                    "x2": this.convertX(mid2.x),
                    "y2": this.convertY(mid2.y)
                });
            }
        },
        "stitchhole": function (cell, value) {
            if (value == 1) {
                let mid = cell.midpoint;
                
                this.createSVGElement("circle", svg.answerGroup, {
                    "stroke": "black",
                    "stroke-width": "5",
                    "cx": this.convertX(mid.x),
                    "cy": this.convertY(mid.y),
                    "r": this.scale / 3
                });
            }
            else if (value == 0) {
                let mid = cell.midpoint;
    
                this.createSVGElement("line", svg.answerGroup, {
                    "stroke": "darkred",
                    "stroke-width": "3",
                    "x1": this.convertX(mid.x - 0.2),
                    "y1": this.convertY(mid.y - 0.2),
                    "x2": this.convertX(mid.x + 0.2),
                    "y2": this.convertY(mid.y + 0.2)
                });
    
                this.createSVGElement("line", svg.answerGroup, {
                    "stroke": "darkred",
                    "stroke-width": "3",
                    "x1": this.convertX(mid.x - 0.2),
                    "y1": this.convertY(mid.y + 0.2),
                    "x2": this.convertX(mid.x + 0.2),
                    "y2": this.convertY(mid.y - 0.2)
                });
            }
        }
    };
}

const ns = "http://www.w3.org/2000/svg";
const svg = document.getElementById('solution');

export class RenderedGrid {
    constructor(puzzle, options) {
        while (svg.firstChild) {
            svg.removeChild(svg.lastChild);
        }

        this.puzzle = puzzle, this.options = options;
        const grid = this.grid = puzzle.grid;

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

        svg.hintsGroup = document.createElementNS(ns, "g");
        svg.hintsGroup.setAttribute("id", "hints");
        svg.appendChild(svg.hintsGroup);

        svg.answerGroup = document.createElementNS(ns, "g");
        svg.answerGroup.setAttribute("id", "answer");
        svg.appendChild(svg.answerGroup);

        svg.cellsHitbox = document.createElementNS(ns, "g");
        svg.cellsHitbox.setAttribute("id", "cells-hitbox");
        svg.appendChild(svg.cellsHitbox);

        svg.edgesHitbox = document.createElementNS(ns, "g");
        svg.edgesHitbox.setAttribute("id", "edges-hitbox");
        svg.appendChild(svg.edgesHitbox);

        /*
        for (let cell of grid.cells) {
            let hitbox = this.createSVGElement("path", svg.cellsBase, {
                "fill": "transparent",
                "d": cell.verts.map((v, i) => {
                    let {x, y} = v.rpos;
                    return (i > 0 ? "L " : "M ") + [originX + x * scale, originY + y * scale]
                }).join(" ") + " Z"
            });
            hitbox.onmouseover = (e) => {};
            hitbox.onmouseout = (e) => {};
        }

        for (let edge of grid.edges) {
            let hitbox = this.createSVGElement("line", svg.edgesHitbox, {
                "stroke": "transparent",
                "stroke-width": 5,
                "x1": originX + edge.fromVert.rpos.x * scale,
                "y1": originY + edge.fromVert.rpos.y * scale,
                "x2": originX + edge.toVert.rpos.x * scale,
                "y2": originY + edge.toVert.rpos.y * scale
            });

            hitbox.onmouseover = (e) => {};
            hitbox.onmouseout = (e) => {};
        }
        */

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

        this.edgecache = [];
        this.cellcache = [];

        this.renderPuzzle();
    }

    renderPuzzle() {
        let renderfuncs = {
            "sudoku": ["edgearea", "numhint", "sudoku"],
            "stitches": ["edgestitch", "stitchhole"],
            "slitherlink": ["numhint", "edgedraw"],
            "dominosa": ["numhint", "edgedomino"],
        }[this.puzzle.type] || ["edgearea", "binarygrey"];

        let edgefuncs = renderfuncs.map(f => this.renderElements.edge[f]).filter(f => f);
        let cellfuncs = renderfuncs.map(f => this.renderElements.cell[f]).filter(f => f);

        function render(objects, cache, funcs) {
            for (let i in objects) {
                let cached = cache[i];
                if (!cached)
                    cached = cache[i] = { elems: [], value: [] };
                let obj = objects[i];
                if (obj.value == cached.value) continue;
                for (let elem of cached.elems)
                    elem.parentElement.removeChild(elem);
                cached.elems = [];
                for (let func of funcs) {
                    let result = func(obj);
                    if (result instanceof Array) cached.elems.push(...result);
                    else if (result instanceof Element) cached.elems.push(result);
                }
                cached.value = obj.value;
            }
        }

        render(this.grid.edges, this.edgecache, edgefuncs);
        render(this.grid.cells, this.cellcache, cellfuncs);
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
    addHint(hint, x, y, color = "black", size = this.scale / 2) {
        let text = this.createSVGElement("text", svg.hintsGroup, {
            "fill": color,
            "style": "font: bold " + size + "px sans-serif",
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            "x": x,
            "y": y + size / 8
        });
        text.textContent = hint;
        return text;
    }

    renderElements = {
        edge: {
            "edgearea": (edge) => {
                return this.createSVGElement("line", svg.edgesBase, {
                    "stroke": "black",
                    "stroke-width": edge.isEdgeOfGrid || (edge.leftCell != null && edge.rightCell != null && edge.leftCell.area_id != edge.rightCell.area_id) ? 3 : 1,
                    "stroke-linecap": "square",
                    "x1": this.convertX(edge.fromVert.rpos.x),
                    "y1": this.convertY(edge.fromVert.rpos.y),
                    "x2": this.convertX(edge.toVert.rpos.x),
                    "y2": this.convertY(edge.toVert.rpos.y)
                });
            },
            "edgedraw": (edge) => {
                return this.createSVGElement("line", svg.edgesBase, {
                    "stroke": edge.value == 0 ? "transparent" : "black",
                    "stroke-width": edge.value == 1 ? 3 : 1,
                    "stroke-linecap": "square",
                    "stroke-dasharray": edge.value.length != 1 ? "3 4" : "",
                    "x1": this.convertX(edge.fromVert.rpos.x),
                    "y1": this.convertY(edge.fromVert.rpos.y),
                    "x2": this.convertX(edge.toVert.rpos.x),
                    "y2": this.convertY(edge.toVert.rpos.y)
                });
            },
            "edgedomino": (edge) => {
                return this.createSVGElement("line", svg.edgesBase, {
                    "stroke": edge.isEdgeOfGrid || edge.value != 1 ? "black" : "transparent",
                    "stroke-width": edge.isEdgeOfGrid ? 3 : edge.value == 0 ? 2 : 1,
                    "stroke-linecap": "square",
                    "stroke-dasharray": edge.isEdgeOfGrid || edge.value.length == 1 ? "" : "3 4",
                    "x1": this.convertX(edge.fromVert.rpos.x),
                    "y1": this.convertY(edge.fromVert.rpos.y),
                    "x2": this.convertX(edge.toVert.rpos.x),
                    "y2": this.convertY(edge.toVert.rpos.y)
                });
            },
            "edgestitch": (edge) => {
                let elems = [this.createSVGElement("line", svg.edgesBase, {
                    "stroke": edge.value == 0 ? "#B00" : "black",
                    "stroke-width": edge.isEdgeOfGrid || (edge.leftCell != null && edge.rightCell != null && edge.leftCell.area_id != edge.rightCell.area_id) ? 3 : 1,
                    "stroke-linecap": "square",
                    "x1": this.convertX(edge.fromVert.rpos.x),
                    "y1": this.convertY(edge.fromVert.rpos.y),
                    "x2": this.convertX(edge.toVert.rpos.x),
                    "y2": this.convertY(edge.toVert.rpos.y)
                })];
                if (edge.value == 1) {
                    let mid1 = edge.leftCell.midpoint;
                    let mid2 = edge.rightCell.midpoint;
        
                    elems.push(this.createSVGElement("line", svg.answerGroup, {
                        "stroke": "black",
                        "stroke-width": 5,
                        "stroke-linecap": "round",
                        "x1": this.convertX(mid1.x),
                        "y1": this.convertY(mid1.y),
                        "x2": this.convertX(mid2.x),
                        "y2": this.convertY(mid2.y)
                    }));
                }
                else if (edge.value == 0) {
                    elems.push(this.createSVGElement("line", svg.answerGroup, {
                        "stroke": "#D00",
                        "stroke-width": 3,
                        "stroke-linecap": "square",
                        "x1": this.convertX(edge.fromVert.rpos.x),
                        "y1": this.convertY(edge.fromVert.rpos.y),
                        "x2": this.convertX(edge.toVert.rpos.x),
                        "y2": this.convertY(edge.toVert.rpos.y)
                    }));
                }
                return elems;
            },
        },
        cell: {
            "binarygrey": (cell) => {
                this.createSVGElement("path", svg.cellsBase, {
                    "fill": cell.value.length != 1 ? "#CCC" : cell.value[0] == 1 ? "#555" : "#FFF",
                    "d": cell.verts.map((v, i) => {
                        let {x, y} = v.rpos;
                        return (i > 0 ? "L " : "M ") + [this.convertX(x), this.convertY(y)]
                    }).join(" ") + " Z"
                });
            },
            "numhint": (cell) => {
                if (cell.hint === undefined || cell.hint == -1) return;
                let { x, y } = cell.midpoint;
                return this.addHint(cell.hint, this.convertX(x), this.convertY(y));
            },
            "sudoku": (cell) => {
                if (cell.hint !== undefined && cell.hint != -1) return;
                let { x, y } = cell.midpoint;
                if (cell.value.length == 1) {
                    return this.addHint(cell.value[0].toString(36).toUpperCase(), this.convertX(x), this.convertY(y), "#60B");
                }
                let maxvals = this.grid.width;
                let numacross = Math.ceil(maxvals ** 0.5);
                let numdown = Math.ceil(maxvals / numacross);
                let fontsize = this.scale / numacross;
                let elems = [];
                for (let i = 0; i < maxvals; i++) {
                    let val = (i + 1).toString(36).toUpperCase();
                    if (cell.value.includes(i + 1)) {
                        elems.push(this.addHint(val, this.convertX(x - 0.5 + (i % numacross + 0.5) / numacross), this.convertY(y - 0.5 + ((i / numacross | 0) + 0.5) / numdown), "#60B", fontsize))
                    }
                }
                return elems;
            },
            "stitchhole": (cell) => {
                if (cell.value.length != 1) return;
                if (cell.value[0] == 1) {
                    let mid = cell.midpoint;
                    
                    return this.createSVGElement("circle", svg.answerGroup, {
                        "stroke": "black",
                        "stroke-width": 4,
                        "fill": "transparent",
                        "cx": this.convertX(mid.x),
                        "cy": this.convertY(mid.y),
                        "r": this.scale / 4
                    });
                }
                else if (cell.value[0] == 0) {
                    let mid = cell.midpoint;
        
                    return [
                        this.createSVGElement("line", svg.answerGroup, {
                            "stroke": "#B00",
                            "stroke-width": 2,
                            "x1": this.convertX(mid.x - 0.15),
                            "y1": this.convertY(mid.y - 0.15),
                            "x2": this.convertX(mid.x + 0.15),
                            "y2": this.convertY(mid.y + 0.15)
                        }),
                        this.createSVGElement("line", svg.answerGroup, {
                            "stroke": "#B00",
                            "stroke-width": 2,
                            "x1": this.convertX(mid.x - 0.15),
                            "y1": this.convertY(mid.y + 0.15),
                            "x2": this.convertX(mid.x + 0.15),
                            "y2": this.convertY(mid.y - 0.15)
                        })
                    ];
                }
            }
        }
    };
}

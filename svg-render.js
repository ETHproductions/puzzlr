const ns = "http://www.w3.org/2000/svg";
const svg = document.getElementById('solution');

export class RenderedGrid {
    #elemBuffer = [];

    constructor(puzzle, options) {
        while (svg.firstChild) {
            svg.removeChild(svg.lastChild);
        }
        
        const { defaultScale: scale, funcs: renderfuncs } = puzzle.renderSettings;
        this.scale = scale, this.renderfuncs = renderfuncs;

        this.puzzle = puzzle, this.options = options;
        const grid = this.grid = puzzle.grid;

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

        const width  = (maxX - minX + 3) * scale;
        const height = (maxY - minY + 3) * scale;
        const originX =  width / 2 - (minX + maxX) / 2 * scale;
        const originY = height / 2 - (minY + maxY) / 2 * scale;

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

        /* hitboxes for mouse detection. will need for editor functionality
        svg.cellsHitbox = document.createElementNS(ns, "g");
        svg.cellsHitbox.setAttribute("id", "cells-hitbox");
        svg.appendChild(svg.cellsHitbox);

        svg.edgesHitbox = document.createElementNS(ns, "g");
        svg.edgesHitbox.setAttribute("id", "edges-hitbox");
        svg.appendChild(svg.edgesHitbox);

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

        const addEdgeHints = (hints, x, y, dir) => {
            if (!hints) return;
            for (let hint of hints) {
                if (hint > -1) this.addHint(hint, this.convertX(x), this.convertY(y));
                dir ? y += 1 : x += 1;
            }
        }

        addEdgeHints(options.hintsLeft, minX - 0.5, minY + 0.5, 1);
        addEdgeHints(options.hintsRight, maxX + 0.5, minY + 0.5, 1);
        addEdgeHints(options.hintsTop, minX + 0.5, minY - 0.5, 0);
        addEdgeHints(options.hintsBottom, minX + 0.5, maxY + 0.5, 0);

        this.edgecache = [];
        this.cellcache = [];

        this.renderPuzzle();
    }

    renderPuzzle() {
        this.#elemBuffer = [];

        let edgefuncs = this.renderfuncs.map(f => this.renderElements.edge[f]).filter(f => f);
        let cellfuncs = this.renderfuncs.map(f => this.renderElements.cell[f]).filter(f => f);

        let render = (objects, cache, funcs) => {
            for (let i in objects) {
                let cached = cache[i];
                if (!cached)
                    cached = cache[i] = { elems: [], value: [] };
                let obj = objects[i];
                if (obj.value == cached.value) continue;
                for (let elem of cached.elems)
                    elem.parentElement.removeChild(elem);

                for (let func of funcs) {
                    func(obj);
                }
                cached.elems = this.#elemBuffer;
                this.#elemBuffer = [];
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
        this.#elemBuffer.push(elem);
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
            "edgeplain": (edge) => {
                this.createSVGElement("line", svg.edgesBase, {
                    "stroke": "black",
                    "stroke-width": edge.isEdgeOfGrid ? 3 : 1,
                    "stroke-linecap": "square",
                    "x1": this.convertX(edge.fromVert.rpos.x),
                    "y1": this.convertY(edge.fromVert.rpos.y),
                    "x2": this.convertX(edge.toVert.rpos.x),
                    "y2": this.convertY(edge.toVert.rpos.y)
                });
            },
            "edgearea": (edge) => {
                this.createSVGElement("line", svg.edgesBase, {
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
                this.createSVGElement("line", svg.edgesBase, {
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
                this.createSVGElement("line", svg.edgesBase, {
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
                this.createSVGElement("line", svg.edgesBase, {
                    "stroke": edge.value == 0 ? "#B00" : "black",
                    "stroke-width": edge.isEdgeOfGrid || (edge.leftCell != null && edge.rightCell != null && edge.leftCell.area_id != edge.rightCell.area_id) ? 3 : 1,
                    "stroke-linecap": "square",
                    "x1": this.convertX(edge.fromVert.rpos.x),
                    "y1": this.convertY(edge.fromVert.rpos.y),
                    "x2": this.convertX(edge.toVert.rpos.x),
                    "y2": this.convertY(edge.toVert.rpos.y)
                });
                if (edge.value == 1) {
                    let mid1 = edge.leftCell.midpoint;
                    let mid2 = edge.rightCell.midpoint;
        
                    this.createSVGElement("line", svg.answerGroup, {
                        "stroke": "black",
                        "stroke-width": this.scale / 6,
                        "stroke-linecap": "round",
                        "x1": this.convertX(mid1.x),
                        "y1": this.convertY(mid1.y),
                        "x2": this.convertX(mid2.x),
                        "y2": this.convertY(mid2.y)
                    });
                }
                else if (edge.value == 0) {
                    this.createSVGElement("line", svg.answerGroup, {
                        "stroke": "#D00",
                        "stroke-width": 3,
                        "stroke-linecap": "square",
                        "x1": this.convertX(edge.fromVert.rpos.x),
                        "y1": this.convertY(edge.fromVert.rpos.y),
                        "x2": this.convertX(edge.toVert.rpos.x),
                        "y2": this.convertY(edge.toVert.rpos.y)
                    });
                }
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
                this.addHint(cell.hint, this.convertX(x), this.convertY(y), "#000", this.scale / 1.5);
            },
            "sudoku": (cell) => {
                if (cell.hint !== undefined && cell.hint != -1) return;
                let { x, y } = cell.midpoint;
                if (cell.value.length == 1) {
                    this.addHint(cell.value[0].toString(36).toUpperCase(), this.convertX(x), this.convertY(y), "#60B", this.scale / 1.5);
                    return;
                }
                let maxvals = this.grid.width;
                let numacross = Math.ceil(maxvals ** 0.5);
                let numdown = Math.ceil(maxvals / numacross);
                let fontsize = this.scale / numacross;
                for (let i = 0; i < maxvals; i++) {
                    let val = (i + 1).toString(36).toUpperCase();
                    if (cell.value.includes(i + 1)) {
                        this.addHint(val, this.convertX(x - 0.5 + (i % numacross + 0.5) / numacross), this.convertY(y - 0.5 + ((i / numacross | 0) + 0.5) / numdown), "#60B", fontsize);
                    }
                }
            },
            "stitchhole": (cell) => {
                if (cell.value.length != 1) return;
                if (cell.value[0] == 1) {
                    let mid = cell.midpoint;
                    
                    this.createSVGElement("circle", svg.answerGroup, {
                        "stroke": "black",
                        "stroke-width": this.scale / 7,
                        "fill": "transparent",
                        "cx": this.convertX(mid.x),
                        "cy": this.convertY(mid.y),
                        "r": this.scale / 4
                    });
                }
                else if (cell.value[0] == 0) {
                    let mid = cell.midpoint;
        
                    this.createSVGElement("line", svg.answerGroup, {
                        "stroke": "#B00",
                        "stroke-width": 2,
                        "x1": this.convertX(mid.x - 0.15),
                        "y1": this.convertY(mid.y - 0.15),
                        "x2": this.convertX(mid.x + 0.15),
                        "y2": this.convertY(mid.y + 0.15)
                    });
                    this.createSVGElement("line", svg.answerGroup, {
                        "stroke": "#B00",
                        "stroke-width": 2,
                        "x1": this.convertX(mid.x - 0.15),
                        "y1": this.convertY(mid.y + 0.15),
                        "x2": this.convertX(mid.x + 0.15),
                        "y2": this.convertY(mid.y - 0.15)
                    });
                }
            },
            "binarythermo": (cell) => {
                let prevCell = cell.adjacentEdge.find(c => c.area_id == cell.area_id && c.thermoIndex == cell.thermoIndex - 1);
                let nextCell = cell.adjacentEdge.find(c => c.area_id == cell.area_id && c.thermoIndex == cell.thermoIndex + 1);
                let prevDir = prevCell ? prevCell.vpos.x > cell.vpos.x ? 0 : prevCell.vpos.y > cell.vpos.y ? 1 : prevCell.vpos.x < cell.vpos.x ? 2 : 3 : -1;
                let nextDir = nextCell ? nextCell.vpos.x > cell.vpos.x ? 0 : nextCell.vpos.y > cell.vpos.y ? 1 : nextCell.vpos.x < cell.vpos.x ? 2 : 3 : -1;
                // 0 -> right, 1 -> down, 2 -> left, 3 -> up, -1 -> none
                
                // each cell will have at least one direction (in or out) so
                // let's make sure that's always known as dir1
                let dir1 = prevDir == -1 ? nextDir : prevDir;
                // dir2 will just be the other direction if there is one;
                // if not, -1 represents start of thermo, -2 is end of thermo
                let dir2 = prevDir == -1 ? -1 : nextDir == -1 ? -2 : nextDir;

                let mid = cell.midpoint;
                // takes a list of [x, y] points where x/y are in [-0.5, 0.5],
                // rotates based on dir1, and scales and translates to the real
                // location of the cell in the render
                const xyConversion = a => [
                    this.convertX(mid.x + a[dir1 % 2] * [1,-1,-1,1][dir1]),
                    this.convertY(mid.y + a[dir1 % 2 ^ 1] * [1,1,-1,-1][dir1])
                ];

                const tw = 0.16; // thermo width, as ratio of cell width from center to edge of thermo
                const fill = cell.value == 1 ? "#D14" : cell.value == 0 ? "#FFF" : "#CCC";
                const stroke = "#333";
                const swidth = this.scale / 12;

                // simplest case first: straight line (2 directions)
                if (dir2 >= 0 && Math.abs(dir1 - dir2) == 2) {
                    let p = [ [0.5, -tw], [-0.5, -tw], [-0.5, tw], [0.5, tw] ].map(xyConversion);
                    this.createSVGElement("path", svg.answerGroup, {
                        "fill": fill,
                        "d": `M ${ p[0] } L ${ p[1] } L ${ p[2] } L ${ p[3] } Z`,
                    });
                    this.createSVGElement("path", svg.answerGroup, {
                        "stroke": stroke,
                        "stroke-width": swidth,
                        "d": `M ${ p[0] } L ${ p[1] } M ${ p[2] } L ${ p[3] }`,
                    });
                    return;
                }

                // now for the thermo ends (4 directions, 2 sizes)
                if (dir2 < 0) {
                    const bw = dir2 == -2 ? tw : tw + 0.12; // bulb width
                    const bo = (bw ** 2 - tw ** 2) ** 0.5; // bulb offset of intersection
                    let p = [ [0.5, -tw], [bo, -tw], [bo, tw], [0.5, tw] ].map(xyConversion);

                    this.createSVGElement("path", svg.answerGroup, {
                        "fill": fill,
                        "stroke": stroke,
                        "stroke-width": swidth,
                        "d": `M ${ p[0] } L ${ p[1] } A ${ bw * this.scale } ${ bw * this.scale } 0 1 0 ${ p[2] } L ${ p[3] }`
                    });
                    return;
                }
                
                // finally we take care of the most complex shape: curves
                // need to be very careful which direction it turns:
                //   [0, 1], [1, 0] -> bottom-right
                //   [1, 2], [2, 1] -> bottom-left
                //   [2, 3], [3, 2] -> top-left
                //   [3, 0], [0, 3] -> top-right
                // we convert these into a single number 0-3 in this order
                dir1 = Math.abs(dir1 - dir2) == 3 ? 3 : Math.min(dir1, dir2);
                
                let p = [ [0.5, -tw], [0, -tw], [-tw, 0], [-tw, 0.5], [tw, 0.5], [tw, tw], [0.5, tw] ].map(xyConversion);

                this.createSVGElement("path", svg.answerGroup, {
                    "fill": fill,
                    "d": `M ${ p[0] } L ${ p[1] } A ${ tw * this.scale } ${ tw * this.scale } 0 0 0 ${ p[2] } L ${ p[3] } L ${ p[4] } L ${ p[5] } L ${ p[6] }`
                });
                this.createSVGElement("path", svg.answerGroup, {
                    "fill": "transparent",
                    "stroke": stroke,
                    "stroke-width": swidth,
                    "d": `M ${ p[0] } L ${ p[1] } A ${ tw * this.scale } ${ tw * this.scale } 0 0 0 ${ p[2] } L ${ p[3] } M ${ p[4] } L ${ p[5] } L ${ p[6] }`
                });
            }
        }
    };
}

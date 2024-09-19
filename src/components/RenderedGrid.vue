<template>
  <svg ref="solution"></svg>
</template>

<style>
svg {
  user-select: none;
}
</style>

<script setup lang="ts">
import { GridCell, GridEdge, PuzzleGrid } from "@/base";
import Puzzle from "@/base/Puzzle";
import { PuzzleVariable, PuzzleVariableValues } from "@/base/PuzzleVariable";
import { onMounted, ref } from "vue";

const ns = "http://www.w3.org/2000/svg";

export type Options = {
  hintsLeft?: number[];
  hintsTop?: number[];
  hintsRight?: number[];
  hintsBottom?: number[];
};

let puzzle: Puzzle | null;

let solution = ref();
let svg: SVGSVGElement;
let grid: PuzzleGrid;
let scale: number, renderfuncs: string[];
let elemBuffer: SVGElement[] = [];
let edgecache: { elems: SVGElement[]; value: PuzzleVariableValues }[] = [];
let cellcache: { elems: SVGElement[]; value: PuzzleVariableValues }[] = [];
let width: number,
  height: number,
  originX: number,
  originY: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number;
let groups = new Map<string, SVGGElement>();

function resetPuzzle(newPuzzle: Puzzle, options: Options) {
  while (svg.lastChild) svg.removeChild(svg.lastChild);

  if (!newPuzzle) return;
  puzzle = newPuzzle;

  ({ defaultScale: scale, funcs: renderfuncs } = puzzle.renderSettings);
  grid = puzzle.grid;

  (minX = Infinity), (maxX = -Infinity);
  (minY = Infinity), (maxY = -Infinity);
  for (let vert of grid.verts) {
    if (vert.rpos.x < minX) minX = vert.rpos.x;
    if (vert.rpos.x > maxX) maxX = vert.rpos.x;
    if (vert.rpos.y < minY) minY = vert.rpos.y;
    if (vert.rpos.y > maxY) maxY = vert.rpos.y;
  }

  width = (maxX - minX + 3) * scale;
  height = (maxY - minY + 3) * scale;
  originX = width / 2 - ((minX + maxX) / 2) * scale;
  originY = height / 2 - ((minY + maxY) / 2) * scale;

  svg.setAttribute("width", width.toString());
  svg.setAttribute("height", height.toString());

  for (let groupName of [
    "cells-base",
    "edges-base",
    "hints",
    "answer",
    /*
    "cells-hitbox",
    "edges-hitbox",
    */
  ]) {
    let group = document.createElementNS(ns, "g");
    groups.set(groupName, group);
    group.setAttribute("id", groupName);
    svg.appendChild(group);
  }

  /* hitboxes for mouse detection. will need for editor functionality
    for (let cell of grid.cells) {
        let hitbox = createSVGElement("path", "cells-hitbox", {
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
        let hitbox = createSVGElement("line", "edges-hitbox", {
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

  const addEdgeHints = (hints: number[], x: number, y: number, dir: number) => {
    if (!hints) return;
    for (let hint of hints) {
      if (hint > -1) addHint(hint.toString(), convertX(x), convertY(y));
      dir ? (y += 1) : (x += 1);
    }
  };

  addEdgeHints(options.hintsLeft ?? [], minX - 0.5, minY + 0.5, 1);
  addEdgeHints(options.hintsRight ?? [], maxX + 0.5, minY + 0.5, 1);
  addEdgeHints(options.hintsTop ?? [], minX + 0.5, minY - 0.5, 0);
  addEdgeHints(options.hintsBottom ?? [], minX + 0.5, maxY + 0.5, 0);

  edgecache = [];
  cellcache = [];

  renderPuzzle();
}

function renderPuzzle() {
  elemBuffer = [];

  let edgefuncs = renderfuncs
    .map((f) => renderElements.edge[f])
    .filter((f) => f);
  let cellfuncs = renderfuncs
    .map((f) => renderElements.cell[f])
    .filter((f) => f);

  let render = (
    objects: PuzzleVariable[],
    cache: { elems: SVGElement[]; value: PuzzleVariableValues }[],
    funcs: RenderFunc<any>[],
  ) => {
    for (let i in objects) {
      let obj = objects[i];
      let cached = cache[i];
      if (!cached) cached = cache[i] = { elems: [], value: [] };
      else if (obj.value + "" == cached.value + "") continue;
      for (let elem of cached.elems) elem.parentElement?.removeChild(elem);

      for (let func of funcs) {
        func(obj);
      }
      cached.elems = elemBuffer;
      elemBuffer = [];
      cached.value = obj.value.slice();
    }
  };

  render(grid.edges, edgecache, edgefuncs);
  render(grid.cells, cellcache, cellfuncs);
}

function convertX(x: number) {
  return originX + x * scale;
}
function convertY(y: number) {
  return originY + y * scale;
}

function createSVGElement(name: string, groupName: string, attributes: any) {
  let elem = document.createElementNS(ns, name);
  for (let prop in attributes) {
    elem.setAttributeNS(null, prop, attributes[prop]);
  }
  let group = groups.get(groupName);
  if (!group)
    throw new Error("Could not find SVG group with name " + groupName);
  group.appendChild(elem);
  elemBuffer.push(elem);
  return elem;
}
function addHint(
  hint: string,
  x: number,
  y: number,
  color = "black",
  size = scale / 2,
) {
  let text = createSVGElement("text", "hints", {
    fill: color,
    style: "font: bold " + size + "px sans-serif",
    "text-anchor": "middle",
    "dominant-baseline": "middle",
    x: x,
    y: y + size / 8,
  });
  text.textContent = hint;
  return text;
}

type RenderFunc<T> = (a: T) => void;
type RenderFuncCollection<T> = { [k: string]: RenderFunc<T> };

const renderElements: {
  edge: RenderFuncCollection<GridEdge>;
  cell: RenderFuncCollection<GridCell>;
} = {
  edge: {
    edgeplain: (edge) => {
      createSVGElement("line", "edges-base", {
        stroke: "black",
        "stroke-width": edge.isEdgeOfGrid ? 3 : 1,
        "stroke-linecap": "square",
        x1: convertX(edge.fromVert.rpos.x),
        y1: convertY(edge.fromVert.rpos.y),
        x2: convertX(edge.toVert.rpos.x),
        y2: convertY(edge.toVert.rpos.y),
      });
    },
    edgearea: (edge) => {
      createSVGElement("line", "edges-base", {
        stroke: "black",
        "stroke-width":
          edge.isEdgeOfGrid ||
            (edge.leftCell != null &&
              edge.rightCell != null &&
              edge.leftCell.area_id != edge.rightCell.area_id)
            ? 3
            : 1,
        "stroke-linecap": "square",
        x1: convertX(edge.fromVert.rpos.x),
        y1: convertY(edge.fromVert.rpos.y),
        x2: convertX(edge.toVert.rpos.x),
        y2: convertY(edge.toVert.rpos.y),
      });
    },
    edgedraw: (edge) => {
      createSVGElement("line", "edges-base", {
        stroke: edge.valueIs(0) ? "transparent" : "black",
        "stroke-width": edge.valueIs(1) ? 3 : 1,
        "stroke-linecap": "square",
        "stroke-dasharray": edge.value.length != 1 ? "3 4" : "",
        x1: convertX(edge.fromVert.rpos.x),
        y1: convertY(edge.fromVert.rpos.y),
        x2: convertX(edge.toVert.rpos.x),
        y2: convertY(edge.toVert.rpos.y),
      });
    },
    edgedomino: (edge) => {
      createSVGElement("line", "edges-base", {
        stroke:
          edge.isEdgeOfGrid || edge.value.length > 1 || edge.value[0] != 1
            ? "black"
            : "transparent",
        "stroke-width": edge.isEdgeOfGrid ? 3 : edge.valueIs(0) ? 2 : 1,
        "stroke-linecap": "square",
        "stroke-dasharray":
          edge.isEdgeOfGrid || edge.value.length == 1 ? "" : "3 4",
        x1: convertX(edge.fromVert.rpos.x),
        y1: convertY(edge.fromVert.rpos.y),
        x2: convertX(edge.toVert.rpos.x),
        y2: convertY(edge.toVert.rpos.y),
      });
    },
    edgestitch: (edge) => {
      createSVGElement("line", "edges-base", {
        stroke: edge.valueIs(0) ? "#B00" : "black",
        "stroke-width":
          edge.isEdgeOfGrid ||
            (edge.leftCell != null &&
              edge.rightCell != null &&
              edge.leftCell.area_id != edge.rightCell.area_id)
            ? 3
            : 1,
        "stroke-linecap": "square",
        x1: convertX(edge.fromVert.rpos.x),
        y1: convertY(edge.fromVert.rpos.y),
        x2: convertX(edge.toVert.rpos.x),
        y2: convertY(edge.toVert.rpos.y),
      });
      if (edge.valueIs(1)) {
        let mid1 = edge.leftCell?.midpoint;
        let mid2 = edge.rightCell?.midpoint;
        if (!mid1 || !mid2) return;

        createSVGElement("line", "answer", {
          stroke: "black",
          "stroke-width": scale / 6,
          "stroke-linecap": "round",
          x1: convertX(mid1.x),
          y1: convertY(mid1.y),
          x2: convertX(mid2.x),
          y2: convertY(mid2.y),
        });
      } else if (edge.valueIs(0)) {
        createSVGElement("line", "answer", {
          stroke: "#D00",
          "stroke-width": 3,
          "stroke-linecap": "square",
          x1: convertX(edge.fromVert.rpos.x),
          y1: convertY(edge.fromVert.rpos.y),
          x2: convertX(edge.toVert.rpos.x),
          y2: convertY(edge.toVert.rpos.y),
        });
      }
    },
  },
  cell: {
    binarygrey: (cell) => {
      createSVGElement("path", "cells-base", {
        fill:
          cell.value.length != 1
            ? "#CCC"
            : cell.value[0] == 1
              ? "#555"
              : "#FFF",
        d:
          cell.verts
            .map((v, i) => {
              let { x, y } = v.rpos;
              return (i > 0 ? "L " : "M ") + [convertX(x), convertY(y)];
            })
            .join(" ") + " Z",
      });
    },
    binarystar: (cell) => {
      createSVGElement("path", "cells-base", {
        fill: cell.valueIs(1)
          ? "#333"
          : cell.value.length != 1
            ? "#CCC"
            : "#FFF",
        d: cell.valueIs(1)
          ? [...Array(10)]
            .map((_, i) => {
              let { x, y } = cell.midpoint;
              let angle = i * (Math.PI / 5) - Math.PI / 2;
              let r = [0.3, 0.15][i % 2];
              return (
                (i > 0 ? "L " : "M ") +
                [
                  convertX(x + Math.cos(angle) * r),
                  convertY(y + Math.sin(angle) * r),
                ]
              );
            })
            .join(" ") + " Z"
          : cell.verts.map((v, i) => {
            let { x, y } = v.rpos;
            return (i > 0 ? "L " : "M ") + [convertX(x), convertY(y)];
          }),
      });
    },
    numhint: (cell) => {
      if (cell.hint === undefined || cell.hint == -1) return;
      let { x, y } = cell.midpoint;
      addHint(
        cell.hint.toString(),
        convertX(x),
        convertY(y),
        "#000",
        scale / 1.5,
      );
    },
    sudoku: (cell) => {
      if (cell.hint !== undefined && cell.hint != -1) return;
      let { x, y } = cell.midpoint;
      if (cell.value.length == 1) {
        addHint(
          cell.value[0].toString(36).toUpperCase(),
          convertX(x),
          convertY(y),
          "#60B",
          scale / 1.5,
        );
        return;
      }
      let maxvals = grid.width;
      let numacross = Math.ceil(maxvals ** 0.5);
      let numdown = Math.ceil(maxvals / numacross);
      let fontsize = scale / numacross;
      for (let i = 0; i < maxvals; i++) {
        let val = (i + 1).toString(36).toUpperCase();
        if (cell.valueHas(i + 1)) {
          addHint(
            val,
            convertX(x - 0.5 + ((i % numacross) + 0.5) / numacross),
            convertY(y - 0.5 + (((i / numacross) | 0) + 0.5) / numdown),
            "#60B",
            fontsize,
          );
        }
      }
    },
    stitchhole: (cell) => {
      if (cell.value.length != 1) return;
      if (cell.value[0] == 1) {
        let mid = cell.midpoint;

        createSVGElement("circle", "answer", {
          stroke: "black",
          "stroke-width": scale / 7,
          fill: "transparent",
          cx: convertX(mid.x),
          cy: convertY(mid.y),
          r: scale / 4,
        });
      } else if (cell.value[0] == 0) {
        let mid = cell.midpoint;

        createSVGElement("line", "answer", {
          stroke: "#B00",
          "stroke-width": 2,
          x1: convertX(mid.x - 0.15),
          y1: convertY(mid.y - 0.15),
          x2: convertX(mid.x + 0.15),
          y2: convertY(mid.y + 0.15),
        });
        createSVGElement("line", "answer", {
          stroke: "#B00",
          "stroke-width": 2,
          x1: convertX(mid.x - 0.15),
          y1: convertY(mid.y + 0.15),
          x2: convertX(mid.x + 0.15),
          y2: convertY(mid.y - 0.15),
        });
      }
    },
    binarythermo: (cell: GridCell) => {
      let prevCell = cell.adjacentEdge.find(
        (c) =>
          c.area_id == cell.area_id &&
          c.thermoIndex == (cell.thermoIndex ?? 0) - 1,
      );
      let nextCell = cell.adjacentEdge.find(
        (c) =>
          c.area_id == cell.area_id &&
          c.thermoIndex == (cell.thermoIndex ?? 0) + 1,
      );
      let prevDir = prevCell
        ? prevCell.vpos.x > cell.vpos.x
          ? 0
          : prevCell.vpos.y > cell.vpos.y
            ? 1
            : prevCell.vpos.x < cell.vpos.x
              ? 2
              : 3
        : -1;
      let nextDir = nextCell
        ? nextCell.vpos.x > cell.vpos.x
          ? 0
          : nextCell.vpos.y > cell.vpos.y
            ? 1
            : nextCell.vpos.x < cell.vpos.x
              ? 2
              : 3
        : -1;
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
      const xyConversion = (a: number[]) => [
        convertX(mid.x + a[dir1 % 2] * [1, -1, -1, 1][dir1]),
        convertY(mid.y + a[dir1 % 2 ^ 1] * [1, 1, -1, -1][dir1]),
      ];

      const tw = 0.16; // thermo width, as ratio of cell width from center to edge of thermo
      const fill =
        cell.value.length > 1 ? "#CCC" : cell.value[0] == 1 ? "#D14" : "#FFF";
      const stroke = "#333";
      const swidth = scale / 12;

      // simplest case first: straight line (2 directions)
      if (dir2 >= 0 && Math.abs(dir1 - dir2) == 2) {
        let p = [
          [0.5, -tw],
          [-0.5, -tw],
          [-0.5, tw],
          [0.5, tw],
        ].map(xyConversion);
        createSVGElement("path", "answer", {
          fill: fill,
          d: `M ${p[0]} L ${p[1]} L ${p[2]} L ${p[3]} Z`,
        });
        createSVGElement("path", "answer", {
          stroke: stroke,
          "stroke-width": swidth,
          d: `M ${p[0]} L ${p[1]} M ${p[2]} L ${p[3]}`,
        });
        return;
      }

      // now for the thermo ends (4 directions, 2 sizes)
      if (dir2 < 0) {
        const bw = dir2 == -2 ? tw : tw + 0.12; // bulb width
        const bo = (bw ** 2 - tw ** 2) ** 0.5; // bulb offset of intersection
        let p = [
          [0.5, -tw],
          [bo, -tw],
          [bo, tw],
          [0.5, tw],
        ].map(xyConversion);

        createSVGElement("path", "answer", {
          fill: fill,
          stroke: stroke,
          "stroke-width": swidth,
          d: `M ${p[0]} L ${p[1]} A ${bw * scale} ${bw * scale} 0 1 0 ${p[2]
            } L ${p[3]}`,
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

      let p = [
        [0.5, -tw],
        [0, -tw],
        [-tw, 0],
        [-tw, 0.5],
        [tw, 0.5],
        [tw, tw],
        [0.5, tw],
      ].map(xyConversion);

      createSVGElement("path", "answer", {
        fill: fill,
        d: `M ${p[0]} L ${p[1]} A ${tw * scale} ${tw * scale} 0 0 0 ${p[2]} L ${p[3]
          } L ${p[4]} L ${p[5]} L ${p[6]}`,
      });
      createSVGElement("path", "answer", {
        fill: "transparent",
        stroke: stroke,
        "stroke-width": swidth,
        d: `M ${p[0]} L ${p[1]} A ${tw * scale} ${tw * scale} 0 0 0 ${p[2]} L ${p[3]
          } M ${p[4]} L ${p[5]} L ${p[6]}`,
      });
    },
  },
};

defineExpose({ renderPuzzle, resetPuzzle });

onMounted(() => {
  if (!solution.value) {
    console.log("No SVG found!");
    return;
  }
  svg = solution.value;
});
</script>

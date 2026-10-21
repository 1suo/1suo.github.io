// repeat/along drift: copies of one body share structure and promoted
// expressions, but their literal genes draw a seeded per-copy variation.
// A const-driven palette index makes the divergence directly observable in
// the emitted fill attributes.
const test = require("node:test");
const assert = require("node:assert/strict");
const { genomeToSvg, normIds } = require("./evo-harness");

// 0 const .55 (palette-index driver)   4 pal  ← 0     (fill)
// 1 const .5   (cx)                    5 pal  ← 0     (stroke color)
// 2 const .5   (cy)                    6 const 2      (stroke width)
// 3 poly       ← 1,2                   7 style ← 3,4,5,6
// 9 const .55  (promotion target)      8 repeat ← 7    (root)
function buildGenome(drift, opts = {}) {
  const nodes = [
    { op: "const", params: { v: 0.55 }, in: [], ...(opts.frozen ? { paramIns: { v: 9 } } : {}) },
    { op: "const", params: { v: 0.5 }, in: [] },
    { op: "const", params: { v: 0.5 }, in: [] },
    { op: "poly", params: { pts: [[-0.08, -0.08], [0.08, -0.08], [0, 0.08]], bulge: [0, 0, 0], skew: [0.5, 0.5, 0.5], round: [0, 0, 0], closed: 1, bulgeSrc: 0 }, in: [1, 2] },
    { op: "pal", params: {}, in: [0] },
    { op: "pal", params: {}, in: [0] },
    { op: "const", params: { v: 2 }, in: [] },
    { op: "style", params: { fillOn: 1, strokeOn: 0 }, in: [3, 4, 5, 6] },
    { op: "repeat", params: { n: 6, mode: 1, radius: 0.35, spread: 0.2, rot0: 0, spin: 0, grow: 0, mirror: 0, pivot: 0, drift }, in: [7] },
    { op: "const", params: { v: 0.55 }, in: [] },
  ];
  return { ver: 2, seed: 424242, palette: [[10, 90, 55, 1], [200, 90, 55, 1]], bg: 0, bg2: 0, bgGrad: 0, bgA: 0, nodes, root: 8 };
}

function paths(svg) {
  const out = [];
  const walk = (n) => {
    if (n.tag === "path") out.push(n);
    n.children.forEach(walk);
  };
  walk(svg);
  return out;
}
// bin style genes (fillOn…) drift too — a copy may legitimately render as an
// outline; colour divergence is asserted among the filled copies only
const fills = (svg) => paths(svg).filter((p) => p.attrs.fill && p.attrs.fill.startsWith("hsl")).map((p) => p.attrs.fill);

test("drift 0: every copy is an exact clone", function () {
  const svg = genomeToSvg(buildGenome(0));
  assert.equal(paths(svg).length, 6);
  assert.equal(fills(svg).length, 6);
  assert.equal(new Set(fills(svg)).size, 1);
});

test("drift .9: copies diverge on the shared literal's theme", function () {
  const svg = genomeToSvg(buildGenome(0.9));
  assert.equal(paths(svg).length, 6);
  const f = fills(svg);
  assert.ok(f.length >= 1, "at least one filled copy");
  assert.ok(new Set(f).size >= 2, `expected divergent fills, got ${[...new Set(f)].join(", ")}`);
  // divergence is seeded: same genome, same swarm
  assert.deepEqual(f, fills(genomeToSvg(buildGenome(0.9))));
});

test("a promoted gene is exempt from drift (freezes per copy)", function () {
  const svg = genomeToSvg(buildGenome(0.9, { frozen: true }));
  assert.equal(paths(svg).length, 6);
  const f = fills(svg);
  assert.ok(f.length >= 1, "at least one filled copy");
  assert.equal(new Set(f).size, 1, `promoted driver should freeze, got ${[...new Set(f)].join(", ")}`);
});

test("drifted genomes still render deterministically, nested included", function () {
  const g = buildGenome(0.9);
  const a = normIds(genomeToSvg(g).serialize());
  const b = normIds(genomeToSvg(g).serialize());
  assert.equal(a, b);

  // nest: drift-bearing repeat inside another drift-bearing repeat
  const nested = buildGenome(0.5);
  nested.nodes[8].drift = 0.5;
  const outer = {
    ...nested,
    nodes: [...nested.nodes, { op: "repeat", params: { n: 3, mode: 0, radius: 0.3, spread: 1, drift: 0.7 }, in: [8] }],
    root: 10,
  };
  assert.equal(normIds(genomeToSvg(outer).serialize()), normIds(genomeToSvg(outer).serialize()));
});

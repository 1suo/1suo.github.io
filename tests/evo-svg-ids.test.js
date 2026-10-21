// Child must become the next parent 1:1. All grid cells are inline SVGs in
// ONE document, and url(#id) resolves document-wide — so gradient/clip/mask
// ids generated per-render (g0, c0, bgg…) collided across cells and every
// url() in a later cell resolved to the parent cell's defs. A child painted
// with the parent's gradient then changed appearance on selection. These ids
// must be unique across a whole grid render.
const test = require("node:test");
const assert = require("node:assert/strict");
const { sampleGenome, mutate, genomeToSvg, normIds } = require("./evo-harness");

const TEMPS = [0.1, 0.1, 0.1, 0.3, 0.3, 0.5, 0.5];

test("svg ids are unique across a parent + children grid", function () {
  for (let i = 0; i < 100; i++) {
    const parent = sampleGenome();
    parent.bgGrad = 2; // force the background gradient id into play
    const svgs = [genomeToSvg(parent)];
    for (const t of TEMPS) svgs.push(genomeToSvg(mutate(parent, t)));

    const ids = [];
    const walk = (n) => {
      if (n.attrs.id !== undefined) ids.push(n.attrs.id);
      n.children.forEach(walk);
    };
    svgs.forEach((s) => walk(s));

    assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids.join(",")}`);
  }
});

test("same genome renders identically (child becomes parent 1:1)", function () {
  for (let i = 0; i < 50; i++) {
    const g = mutate(sampleGenome(), 0.3);
    assert.equal(normIds(genomeToSvg(g).serialize()), normIds(genomeToSvg(g).serialize()));
  }
});

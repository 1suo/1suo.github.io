// Shared fake-DOM harness: loads evo.html's <script> in Node so tests can
// drive the sampler/mutator/renderer directly.
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "evo.html"), "utf8");
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
if (!src) throw new Error("evo.html script block not found");

function fakeEl(tag) {
  return {
    tag,
    children: [],
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = String(v);
    },
    appendChild(c) {
      this.children.push(c);
      return c;
    },
    querySelectorAll(sel) {
      const out = [];
      const walk = (n) => n.children.forEach((c) => {
        if (c.tag === sel) out.push(c);
        walk(c);
      });
      walk(this);
      return out;
    },
    serialize() {
      const a = Object.entries(this.attrs).map(([k, v]) => ` ${k}="${v}"`).join("");
      return `<${this.tag}${a}>${this.children.map((c) => c.serialize()).join("")}</${this.tag}>`;
    },
  };
}

global.document = { createElementNS: (_ns, tag) => fakeEl(tag), getElementById: () => null };
global.performance = { now: () => Date.now() };

new Function(`${src}\n;globalThis.__evo = { sampleGenome, mutate, genomeToSvg };`)();

// ids only need document-uniqueness; strip them when comparing render output
const normIds = (s) =>
  s.replace(/\d+bg/g, "BG").replace(/\d+g\d+/g, "G").replace(/\d+c\d+/g, "C");

module.exports = { ...globalThis.__evo, fakeEl, normIds };

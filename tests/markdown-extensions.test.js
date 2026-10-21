const test = require("node:test");
const assert = require("node:assert/strict");
const { transform } = require("../js/markdown-extensions.js");

test("renders hashtags without changing headings, URLs, or code", function () {
  const markdown = [
    "# Heading",
    "### Heading {#custom-id}",
    "A #tag and #тег-name.",
    "https://example.com/#fragment",
    "`#inline H~2~O`",
    "```txt",
    "#code X^2^",
    "```",
  ].join("\n");
  const result = transform(markdown);

  assert.match(result, /<button class="hashtag" type="button" data-hashtag="#tag">#tag<\/button>/);
  assert.match(result, /data-hashtag="#тег-name">#тег-name<\/button>/);
  assert.match(result, /^# Heading/m);
  assert.match(result, /\{#custom-id\}/);
  assert.match(result, /https:\/\/example\.com\/#fragment/);
  assert.match(result, /`#inline H~2~O`/);
  assert.match(result, /#code X\^2\^/);
});

test("renders definition lists", function () {
  const result = transform("term\n: first definition\n: second definition");

  assert.equal(
    result,
    "<dl>\n<dt>term</dt>\n<dd>first definition</dd>\n<dd>second definition</dd>\n</dl>"
  );
});

test("renders referenced footnotes with a backlink", function () {
  const result = transform("Text[^note].\n\n[^note]: More #detail.", {
    route: "#/md/page",
  });

  assert.match(result, /<sup class="footnote-ref" id="footnote-ref-note-1">/);
  assert.match(result, /href="#\/md\/page\?id=footnote-note"/);
  assert.match(result, /<li id="footnote-note">More <button class="hashtag"[^>]+>#detail<\/button>\./);
  assert.match(result, /href="#\/md\/page\?id=footnote-ref-note-1"/);
  assert.doesNotMatch(result, /\[\^note\]:/);
});

test("leaves undefined footnote references alone", function () {
  assert.equal(transform("Text[^missing]."), "Text[^missing].");
});

test("renders subscript and superscript without consuming strikethrough", function () {
  assert.equal(
    transform("H~2~O, X^2^, and ~~deleted~~"),
    "H<sub>2</sub>O, X<sup>2</sup>, and ~~deleted~~"
  );
});

test("does not swallow heading lines into footnotes or definition lists", function () {
  const markdown = [
    "Text[^note].",
    "",
    "[^note]: A footnote.",
    "  #### Nested heading",
    "",
    "##",
    ": definition",
  ].join("\n");
  const result = transform(markdown);

  assert.match(result, /^ {2}#### Nested heading$/m);
  assert.match(result, /<li id="footnote-note">/);
  assert.doesNotMatch(result, /<dt>##<\/dt>/);
});

test("rewrites bare wiki embeds note-relative (paste flow, both vaults)", function () {
  const nested = transform("![[Pasted image 20251028173323.png]]", { route: "#/md/note" });
  const root = transform("![[shot.png]]", { route: "#/" });

  assert.equal(nested, "![](Pasted%20image%2020251028173323.png)");
  assert.equal(root, "![](shot.png)");
});

test("normalizes explicit wiki paths, including parent-vault prefixed forms", function () {
  const up = transform("![[../img/path13280.png]]", { route: "#/md/note" });
  const fromParent = transform("![[1suo.github.io/img/path13282.png]]", { route: "#/md/note" });
  const rootNote = transform("![[img/path13280.png]]", { route: "#/" });

  assert.equal(up, "![](../img/path13280.png)");
  assert.equal(fromParent, "![](../img/path13282.png)");
  assert.equal(rootNote, "![](img/path13280.png)");
});

test("turns Obsidian resize pipes into width/height attributes", function () {
  const w = transform("![[shot.png|300]]", { route: "#/md/note" });
  const wh = transform("![[img/shot.png|640x480]]", { route: "#/md/note" });

  assert.equal(w, '<img src="/md/shot.png" width="300" alt="">');
  assert.equal(wh, '<img src="/img/shot.png" width="640" height="480" alt="">');
});

test("leaves non-image wiki links and code untouched", function () {
  const markdown = [
    "[[Some note]]",
    "![[document.pdf]]",
    "`![[code block.png]]`",
    "```txt",
    "![[fenced.png]]",
    "```",
  ].join("\n");
  const result = transform(markdown, { route: "#/md/note" });

  assert.match(result, /\[\[Some note\]\]/);
  assert.match(result, /!\[\[document\.pdf\]\]/);
  assert.doesNotMatch(result, /\/img\//);
});

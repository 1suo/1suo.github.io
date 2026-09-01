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
  const result = transform("Text[^note].\n\n[^note]: More #detail.");

  assert.match(result, /<sup class="footnote-ref" id="footnote-ref-note-1">/);
  assert.match(result, /<li id="footnote-note">More <button class="hashtag"[^>]+>#detail<\/button>\./);
  assert.match(result, /href="#footnote-ref-note-1"/);
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

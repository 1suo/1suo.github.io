(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MarkdownExtensions = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function transform(markdown) {
    const protectedParts = [];
    let source = protectFencedCode(markdown, protectedParts);

    source = protect(source, /(`+)[\s\S]*?\1/g, protectedParts);
    source = protect(source, /(\]\()([^\n)]*)(\))/g, protectedParts);
    source = renderDefinitionLists(source);
    source = renderFootnotes(source);
    source = protect(source, /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g, protectedParts);
    source = renderInlineExtensions(source);

    return source.replace(/\u0000MDX(\d+)\u0000/g, function (_, index) {
      return protectedParts[Number(index)];
    });
  }

  function protectFencedCode(source, parts) {
    const lines = source.split("\n");
    const output = [];

    for (let i = 0; i < lines.length; i += 1) {
      const opening = lines[i].match(/^ {0,3}(`{3,}|~{3,})/);
      if (!opening) {
        output.push(lines[i]);
        continue;
      }

      const fence = opening[1][0];
      const length = opening[1].length;
      const block = [lines[i]];
      while (++i < lines.length) {
        block.push(lines[i]);
        if (new RegExp("^ {0,3}" + fence + "{" + length + ",}\\s*$").test(lines[i])) break;
      }
      output.push(stash(block.join("\n"), parts));
    }

    return output.join("\n");
  }

  function protect(source, pattern, parts) {
    return source.replace(pattern, function (match) {
      return stash(match, parts);
    });
  }

  function stash(value, parts) {
    const placeholder = "\u0000MDX" + parts.length + "\u0000";
    parts.push(value);
    return placeholder;
  }

  function renderDefinitionLists(source) {
    const lines = source.split("\n");
    const output = [];

    for (let i = 0; i < lines.length; i += 1) {
      if (!isDefinition(lines, i)) {
        output.push(lines[i]);
        continue;
      }

      const entries = [];
      while (isDefinition(lines, i)) {
        const term = lines[i].trim();
        const definitions = [];
        while (i + 1 < lines.length) {
          const match = lines[i + 1].match(/^ {0,3}:\s+(.+)$/);
          if (!match) break;
          definitions.push(match[1]);
          i += 1;
        }
        entries.push({ term: term, definitions: definitions });

        if (!isDefinition(lines, i + 1)) break;
        i += 1;
      }

      output.push(
        "<dl>\n" +
          entries
            .map(function (entry) {
              return (
                "<dt>" +
                entry.term +
                "</dt>\n" +
                entry.definitions.map(function (definition) {
                  return "<dd>" + definition + "</dd>";
                }).join("\n")
              );
            })
            .join("\n") +
          "\n</dl>"
      );
    }

    return output.join("\n");
  }

  function isDefinition(lines, index) {
    if (index < 0 || index + 1 >= lines.length) return false;
    const term = lines[index].trim();
    return (
      term !== "" &&
      !/^(?:#{1,6}|[-+*>]|\d+[.)])\s/.test(term) &&
      /^ {0,3}:\s+\S/.test(lines[index + 1])
    );
  }

  function renderFootnotes(source) {
    const definitions = new Map();
    const lines = source.split("\n");
    const body = [];

    for (let i = 0; i < lines.length; i += 1) {
      const match = lines[i].match(/^ {0,3}\[\^([^\]\s]+)\]:\s*(.*)$/);
      if (!match) {
        body.push(lines[i]);
        continue;
      }

      const content = [match[2]];
      while (i + 1 < lines.length && /^(?: {2,}|\t)\S/.test(lines[i + 1])) {
        content.push(lines[++i].trim());
      }
      definitions.set(match[1], content.join(" "));
    }

    const referenceCounts = new Map();
    let rendered = body.join("\n").replace(/\[\^([^\]\s]+)\]/g, function (match, label) {
      if (!definitions.has(label)) return match;
      const count = (referenceCounts.get(label) || 0) + 1;
      referenceCounts.set(label, count);
      const id = footnoteId(label);
      return (
        '<sup class="footnote-ref" id="footnote-ref-' +
        id +
        "-" +
        count +
        '"><a href="#footnote-' +
        id +
        '" aria-label="Footnote ' +
        escapeHtml(label) +
        '">' +
        escapeHtml(label) +
        "</a></sup>"
      );
    });

    const used = Array.from(definitions).filter(function (entry) {
      return referenceCounts.has(entry[0]);
    });
    if (used.length === 0) return rendered;

    rendered +=
      '\n\n<section class="footnotes" aria-label="Footnotes">\n<hr>\n<ol>\n' +
      used
        .map(function (entry) {
          const label = entry[0];
          const id = footnoteId(label);
          return (
            '<li id="footnote-' +
            id +
            '">' +
            entry[1] +
            ' <a class="footnote-backref" href="#footnote-ref-' +
            id +
            '-1" aria-label="Back to content">↩</a></li>'
          );
        })
        .join("\n") +
      "\n</ol>\n</section>";

    return rendered;
  }

  function footnoteId(label) {
    return encodeURIComponent(label).replace(/%/g, "-");
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderInlineExtensions(source) {
    return source
      .replace(
        /(^|[\s(["'“‘])#([\p{L}\p{N}_][\p{L}\p{N}_-]*)/gu,
        '$1<button class="hashtag" type="button" data-hashtag="#$2">#$2</button>'
      )
      .replace(/(^|[^~])~([^~\s](?:[^~\n]*[^~\s])?)~(?!~)/g, "$1<sub>$2</sub>")
      .replace(/(^|[^\^])\^([^\^\s](?:[^\^\n]*[^\^\s])?)\^(?!\^)/g, "$1<sup>$2</sup>");
  }

  return { transform: transform };
});

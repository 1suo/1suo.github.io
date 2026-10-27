// Newspaper pagination for wide screens.
//
// One continuous grid: fixed-measure columns, as many as fit, grouped
// into screen-tall rows. Text flows down a column, jumps to the next
// column, then continues in the next row — the reading order of a real
// paper. Paragraphs split at line boundaries like print does; lists and
// quotes split between their children; code, tables, figures, headings
// and the footnotes block move whole.
//
// Nodes are moved, never copied, so heading ids, the sidebar outline,
// photoswipe hooks and hashtag buttons keep working. Any error or a
// viewport below MIN_VIEWPORT restores the original single-column DOM.
//
// Load after js/docsify.js (this file appends itself to $docsify.plugins
// so its doneEach runs after the other plugins' — content must be final).

(function () {
  "use strict";

  // ---- tunables ---------------------------------------------------

  var MIN_COL = 640; // 40rem reading measure — columns never narrower
  var GAP = 64; // 4rem gutter (keep in sync with .mrow's gap in style.css)
  var VOID_MIN = 160; // minimum side void ≈ ¼ of a column — free space the
                      // grid must leave on each side before adding a column
  var VOID_MAX = 260; // widest side void before columns take the rest
  var VOID_SHARE = 0.07; // void ≈ 7% of the content area, clamped above
  var MIN_COLS = 2; // engage only where a second column fits
  var MIN_VIEWPORT = 1700;
  var ROW_SHARE = 0.75; // column height ≤ ¾ of the screen: comfortable scan
  var ROW_MIN = 480; // floor for short viewports
  var SLIVER_LINES = 2.5; // a final column/row under this many text lines is
                          // a sliver: its neighbours wrap those lines and
                          // run a touch taller instead (≤ the sliver's
                          // share + a line), rather than popping a
                          // near-empty column or a whole extra row

  // Blocks we may divide. Text leaves split at a line boundary;
  // containers split between their children. Everything else is atomic.
  var TEXT_LEAVES = { P: true };
  var CONTAINERS = { BLOCKQUOTE: true, UL: true, OL: true, DL: true };

  var article = null;
  var original = []; // this route's blocks, in source order
  var source = null; // fragment parking unconsumed blocks mid-paginate
  var active = false;

  // ---- geometry ---------------------------------------------------

  function grid(width) {
    // Carve symmetric ornament voids out of the content area, fill the
    // rest with columns: count from the measure, then stretch. The
    // article is centered by style.css's margin: 0 auto (body article),
    // so the free space from the container's left edge to the first
    // column equals the free space from the last column to the right
    // edge.
    var voidSide = Math.max(
      VOID_MIN,
      Math.min(VOID_MAX, Math.round(width * VOID_SHARE))
    );
    var inner = width - 2 * voidSide;
    var n = Math.floor((inner + GAP) / (MIN_COL + GAP));
    if (n < MIN_COLS) return null;
    // A tighter void that admits one more column wins: reading measure
    // over ornament air.
    var innerTight = width - 2 * VOID_MIN;
    var nTight = Math.floor((innerTight + GAP) / (MIN_COL + GAP));
    if (nTight > n) {
      inner = innerTight;
      voidSide = VOID_MIN;
      n = nTight;
    }
    return {
      n: n,
      inner: inner,
      col: (inner - (n - 1) * GAP) / n,
      void: voidSide,
    };
  }

  // ---- measurement helpers ----------------------------------------

  // One reusable range — creating a Range per probe showed up in the
  // profile; setStart/setEnd fully reset it, so the rects are identical.
  var charRange = null;

  function charBottom(node, off) {
    if (!charRange) charRange = document.createRange();
    charRange.setStart(node, off);
    charRange.setEnd(node, Math.min(off + 1, node.nodeValue.length));
    var rects = charRange.getClientRects();
    return rects.length ? rects[rects.length - 1].bottom : null;
  }

  // Index of the first character whose visual line's bottom passes
  // `limit`, −1 if the whole node fits, 0 if the first line already
  // overflows. Line bottoms are non-decreasing, so binary search works.
  function firstOverflow(node, limit) {
    var len = node.nodeValue.length;
    var first = charBottom(node, 0);
    if (first === null || first > limit) return 0;
    if (charBottom(node, len - 1) <= limit) return -1;
    var lo = 0;
    var hi = len - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (charBottom(node, mid) <= limit) lo = mid;
      else hi = mid;
    }
    return hi;
  }

  function textNodes(root) {
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue.trim()) out.push(n);
    }
    return out;
  }

  // Strip inline wrappers the split left empty on either side.
  // One leaf-to-root pass instead of a live querySelector + textContent
  // (which joins the whole subtree) per element. An element is dropped
  // iff its ORIGINAL subtree holds no media and no visible text — which
  // is exactly what the per-element form evaluated: ancestors iterate
  // before descendants, so each element's live queries always saw its
  // subtree intact. (Quirk preserved: media must be a DESCENDANT — a
  // bare <img> matches nothing below itself and its textContent is
  // blank, so it drops, exactly as before.)
  function pruneEmpty(root) {
    var drop = [];
    var visit = function (el) {
      var media = false, text = false;
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) {
          if (n.nodeValue.trim()) text = true;
        } else if (n.nodeType === 1) {
          var res = visit(n);
          var tag = n.nodeName.toLowerCase();
          if (tag === "img" || tag === "br" || tag === "svg" || tag === "hr" || res.media)
            media = true;
          if (res.text) text = true;
        }
      }
      if (!media && !text) drop.push(el);
      return { media: media, text: text };
    };
    for (var k = root.firstElementChild; k; k = k.nextElementSibling)
      visit(k);
    // drop[] is leaf-to-root; reversing walks it in document order like
    // the per-element form did (removal order cannot change the result,
    // but there is no reason to diverge)
    for (var i = drop.length - 1; i >= 0; i--) drop[i].remove();
  }

  // ---- splitting --------------------------------------------------
  // Every splitter runs on a node that is appended in the live layout
  // and overflows `limit`. It mutates the node into the head (stays in
  // place) and returns the tail node, or null when it must move whole.

  function tailFrom(container, node, offset) {
    var range = document.createRange();
    range.setStart(node, offset);
    range.setEnd(container, container.childNodes.length);
    var tail = container.cloneNode(false);
    tail.appendChild(range.extractContents());
    pruneEmpty(container);
    pruneEmpty(tail);
    if (!(tail.textContent.trim() || tail.querySelector("img"))) {
      // Nothing meaningful came out: undo the extraction so `container`
      // stays whole, and report "cannot split".
      while (tail.firstChild) container.appendChild(tail.firstChild);
      return null;
    }
    // Link head→tail so restore() can rejoin them (reflows would
    // otherwise drop every split tail).
    container.__mcolTail = tail;
    return tail;
  }

  function splitTextLeaf(p, limit) {
    var nodes = textNodes(p);
    for (var i = 0; i < nodes.length; i++) {
      var k = firstOverflow(nodes[i], limit);
      if (k === -1) continue;
      if (k === 0 && i === 0) return null; // not even one line fits
      // k === 0 on a later node is a fresh line (a previous node's last
      // line fit), so breaking before it is a clean word boundary.
      return tailFrom(p, nodes[i], k);
    }
    return null; // text fits; the block overflows for another reason
  }

  function splitContainer(node, limit) {
    var kids = Array.prototype.slice.call(node.childNodes);
    var keep = 0;
    while (keep < kids.length) {
      var k = kids[keep];
      if (k.nodeType === 1 && k.getBoundingClientRect().bottom > limit + 0.5)
        break;
      keep++; // fitted children and inter-tag whitespace
    }
    if (keep === 0) return null;
    var rest = kids.slice(keep);
    var sub = rest[0] && rest[0].nodeType === 1 ? splitBlock(rest[0], limit) : null;
    var tail = node.cloneNode(false);
    if (sub) tail.appendChild(sub);
    for (var j = sub ? 1 : 0; j < rest.length; j++) tail.appendChild(rest[j]);
    if (!tail.children.length) return null; // only padding crossed: move whole
    if (node.tagName === "OL" && tail.children.length)
      tail.setAttribute(
        "start",
        String((parseInt(node.getAttribute("start"), 10) || 1) + keep)
      );
    node.__mcolTail = tail; // linked so restore() can rejoin
    return tail;
  }

  function splitBlock(node, limit) {
    if (!node || node.nodeType !== 1) return null;
    if (TEXT_LEAVES[node.tagName]) return splitTextLeaf(node, limit);
    if (CONTAINERS[node.tagName]) return splitContainer(node, limit);
    return null;
  }

  // ---- flow -------------------------------------------------------

  function isHeading(el) {
    return el.nodeType === 1 && /^H[1-6]$/.test(el.tagName);
  }

  function fillColumn(col, queue, limit) {
    var placed = [];
    while (queue.length) {
      var node = queue[0];
      col.appendChild(node);
      if (node.getBoundingClientRect().bottom <= limit + 0.5) {
        queue.shift();
        placed.push(node);
        continue;
      }
      var tail = splitBlock(node, limit);
      if (tail) {
        queue.shift();
        queue.unshift(tail);
        placed.push(node); // the mutated head stays in this column
        continue; // tail won't fit and moves on next pass
      }
      col.removeChild(node);
      if (!placed.length) {
        // An unsplittable block taller than the column gets the column
        // to itself; the row stretches to match.
        col.style.height = "auto";
        col.appendChild(node);
        queue.shift();
        return;
      }
      // Keep headings with the text that follows them — but only when
      // the column actually placed prose (otherwise a lone heading
      // before an unsplittable block would bounce forever).
      var placedProse = placed.some(function (p) {
        return !isHeading(p);
      });
      if (placedProse) {
        while (placed.length && isHeading(placed[placed.length - 1])) {
          var h = placed.pop();
          col.removeChild(h);
          queue.unshift(h);
        }
      }
      return;
    }
  }

  // ---- pagination drivers -----------------------------------------

  // Height the remaining blocks would occupy in one column-width.
  // Lays them out in a hidden off-screen column, then returns them to
  // the parking fragment untouched.
  function measureRemaining(queue, colW) {
    var probe = document.createElement("div");
    probe.className = "mcol";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.left = "-9999px";
    probe.style.top = "0";
    probe.style.width = Math.round(colW) + "px";
    article.appendChild(probe);
    queue.forEach(function (b) {
      probe.appendChild(b);
    });
    var h = probe.scrollHeight;
    queue.forEach(function (b) {
      source.appendChild(b);
    });
    probe.remove();
    return h;
  }

  // Fingerprint of the text and images under an element — used to prove
  // pagination lost nothing.
  function fingerprint(root) {
    return {
      len: (root.textContent || "").replace(/\s+/g, " ").trim().length,
      imgs: root.querySelectorAll("img").length,
    };
  }

  function paginate() {
    var cs = getComputedStyle(article);
    var padX =
      parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    // style.css caps body article at 40rem — lift the cap to measure the
    // width actually available, then set our own.
    article.style.maxWidth = "none";
    article.style.marginLeft = "";
    var width = article.clientWidth - padX;
    var g = grid(width);
    if (!g) {
      article.style.maxWidth = "";
      return false;
    }
    var rowH = Math.round(
      Math.max(ROW_MIN, window.innerHeight * ROW_SHARE)
    );

    // Column count from screen AND content: measure the article at the
    // reading measure, single column, and take only as many columns as
    // the text can fill to roughly a screen each (capped by width).
    // Short texts get one or two columns; long texts fill the grid and
    // take extra rows. No column is ever created empty.
    article.style.maxWidth = Math.round(MIN_COL + padX) + "px";
    var contentH = Math.max(
      1,
      article.scrollHeight -
        Math.round(parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom))
    );
    var n = Math.min(g.n, Math.max(1, Math.ceil(contentH / rowH)));
    // A short article keeps measure-width columns; only a full grid
    // stretches its columns into the carved width.
    var colW = n < g.n ? MIN_COL : (g.inner - (n - 1) * GAP) / n;

    active = true;
    article.classList.add("paginated");

    // Park the source blocks in a fragment so the article holds only the
    // rows being built: columns then measure against stable offsets
    // instead of shifting up as their source blocks are consumed.
    var expected = fingerprint(article);
    source = document.createDocumentFragment();
    original.forEach(function (block) {
      source.appendChild(block);
    });
    var queue = original.slice();

    // one text line at the column measure — the unit for sliver accounting
    var lineProbe = document.createElement("div");
    lineProbe.className = "mcol";
    lineProbe.style.position = "absolute";
    lineProbe.style.visibility = "hidden";
    lineProbe.style.left = "-9999px";
    lineProbe.style.top = "0";
    lineProbe.style.width = Math.round(colW) + "px";
    var lineP = document.createElement("p");
    lineP.textContent = "x";
    lineProbe.appendChild(lineP);
    article.appendChild(lineProbe);
    var lineH = lineP.getBoundingClientRect().height || 21;
    lineProbe.remove();

    while (queue.length) {
      var row = document.createElement("div");
      row.className = "mrow";
      article.appendChild(row);
      // Last-page balance: when the remaining text is less than a full
      // row (plus a couple of sliver lines), spread it evenly across
      // only as many columns as it fills — every column at least half
      // full, none popped for a leftover. The sliver pad folds a dangle
      // of a line or two into this row's columns (they run a touch
      // taller) instead of spawning a whole extra row for it, and the
      // seam slack lets the columns actually meet the remainder: each
      // split hands a line to the next column, so the bare average
      // strands exactly the lines this exists to absorb.
      var colsN = n;
      var limitH = rowH;
      var remaining = measureRemaining(queue, colW);
      var lastPage = remaining <= n * rowH + SLIVER_LINES * lineH;
      if (lastPage) {
        colsN = Math.min(n, Math.max(1, Math.ceil(remaining / rowH)));
        limitH = Math.min(
          rowH + SLIVER_LINES * lineH,
          remaining / colsN + 0.6 * SLIVER_LINES * lineH
        );
      }
      // Columns are created lazily, one at a time, only while text
      // remains — the row never ends with empty columns.
      var fillRow = function (count, lim) {
        for (var i = 0; i < count && queue.length; i++) {
          var col = document.createElement("div");
          col.className = "mcol";
          col.style.width = Math.round(colW) + "px";
          col.style.height = rowH + "px";
          row.appendChild(col);
          fillColumn(col, queue, col.getBoundingClientRect().top + lim);
          // lim is a flow limit, not a rendered height: after filling,
          // let the column shrink to its content.
          col.style.height = "auto";
        }
      };
      fillRow(colsN, limitH);
      // Sliver guard (last page only): a final column of a couple of
      // lines, or a couple of lines that spilled past the balanced fill,
      // is not worth its own column or row. Rejoin the row and refill it
      // once with the budget grown by the sliver's share plus a line of
      // seam slack — the neighbours wrap those lines instead. Bounded:
      // one refill per row, growth capped in lines.
      if (lastPage) {
        var leftoverH = queue.length ? measureRemaining(queue, colW) : 0;
        var lastCol = row.children[row.children.length - 1];
        var lastH = lastCol ? lastCol.scrollHeight : 0;
        var colSliver = row.children.length > 1 && lastH > 0 && lastH <= SLIVER_LINES * lineH;
        var rowSliver = leftoverH > 0 && leftoverH <= SLIVER_LINES * lineH;
        if (colSliver || rowSliver) {
          var keep = row.children.length - (colSliver ? 1 : 0);
          var extra = (colSliver ? lastH : 0) + (rowSliver ? leftoverH : 0);
          var grow = extra / Math.max(1, keep) + lineH;
          // undo this row's splits: every __mcolTail link alive in the
          // row's columns was created while filling it (queued blocks
          // are always chain leaves), so rejoining the heads restores
          // the pre-fill blocks; emptied tail shells drop out below
          Array.prototype.forEach.call(row.children, function (colEl) {
            Array.prototype.forEach.call(colEl.children, function (b) {
              if (b.__mcolTail) rejoin(b);
            });
          });
          var oldQueue = queue.slice();
          queue = [];
          Array.prototype.forEach.call(row.children, function (colEl) {
            Array.prototype.forEach.call(colEl.children, function (b) {
              if ((b.textContent || "").trim() || b.querySelector("img"))
                queue.push(b);
            });
          });
          oldQueue.forEach(function (b) {
            if ((b.textContent || "").trim() || b.querySelector("img"))
              queue.push(b);
          });
          while (row.firstChild) row.removeChild(row.firstChild);
          fillRow(keep, Math.min(rowH + 4 * SLIVER_LINES * lineH, limitH + grow));
        }
      }
    }
    // Shrink the article to the columns that actually exist: a short
    // article builds one narrow row, and the box must wrap it — then
    // style.css's margin: 0 auto (body article) gives equal free space
    // on both sides and the ornament hugs the ink instead of empty air.
    var blockW = 0;
    Array.prototype.forEach.call(
      article.querySelectorAll(":scope > .mrow"),
      function (r) {
        var w = (r.children.length - 1) * GAP;
        Array.prototype.forEach.call(r.children, function (c) {
          w += c.offsetWidth;
        });
        blockW = Math.max(blockW, w);
      }
    );
    if (blockW) article.style.maxWidth = Math.round(blockW + padX) + "px";
    // Prove nothing was lost: same text, same images. If a splitter edge
    // case ever eats content, restore the untouched single column rather
    // than ship a truncated article.
    var got = fingerprint(article);
    if (got.len + 2 < expected.len || got.imgs !== expected.imgs) {
      throw new Error(
        "pagination dropped content (" +
          expected.len +
          "→" +
          got.len +
          " chars, " +
          expected.imgs +
          "→" +
          got.imgs +
          " imgs)"
      );
    }
    watchSettle();
    source = null;
    return true;
  }

  // Undo every split: move each tail's children (and its tail's
  // children, recursively) back into the head, restoring the block to
  // one piece. Adjacent inline wrappers may remain un-nested (…</em><em>…)
  // — that renders identically.
  function rejoin(head) {
    var chain = [];
    for (var t = head.__mcolTail; t; t = t.__mcolTail) chain.push(t);
    for (var i = 0; i < chain.length; i++) {
      while (chain[i].firstChild) head.appendChild(chain[i].firstChild);
      chain[i].__mcolTail = null;
    }
    head.__mcolTail = null;
  }

  function restore() {
    if (!article) return;
    if (settleRO) settleRO.disconnect();
    settleSize = null;
    // Rejoin split blocks, then move the originals back (out of any
    // rows or the parking fragment), then drop the empty row shells.
    // Orphaned nodes from a previous route are left alone: this capture
    // is stale for them.
    original.forEach(function (n) {
      if (n.__mcolTail) rejoin(n);
      if (n.parentNode === source) article.appendChild(n);
      else if (n.isConnected && n.parentNode !== article)
        article.appendChild(n);
    });
    Array.prototype.forEach.call(
      article.querySelectorAll(":scope > .mrow"),
      function (r) {
        r.remove();
      }
    );
    article.style.maxWidth = "";
    article.style.marginLeft = "";
    article.classList.remove("paginated");
    active = false;
    source = null;
  }

  function run() {
    article =
      document.querySelector("article.markdown-section") ||
      document.querySelector(".markdown-section");
    if (!article) return;
    // If a previous pagination is still standing (double doneEach, or a
    // re-render that kept the DOM), unwind it before capturing, so the
    // capture sees the full original block list.
    if (article.querySelector(":scope > .mrow")) restore();
    // Fresh capture for this route (docsify replaced the children).
    // SVG tagName is lowercase in HTML documents — case-sensitive
    // comparison once let the ornament's frame in as a "block", which
    // wasted columns and re-anchored the drawing mid-DOM. The breadcrumb
    // trail (js/breadcrumbs.js) stays out too: it sits above the columns,
    // never inside one.
    original = Array.prototype.filter.call(article.children, function (c) {
      return (
        c.nodeType === 1 &&
        c.tagName.toUpperCase() !== "SVG" &&
        !c.classList.contains("mrow") &&
        !c.classList.contains("breadcrumbs")
      );
    });
    active = false;
    article.style.maxWidth = "";
    article.style.marginLeft = "";
    article.classList.remove("paginated");
    if (window.innerWidth < MIN_VIEWPORT) return;
    try {
      paginate();
    } catch (err) {
      try {
        restore();
      } catch (e2) {
        /* keep the original error visible below */
      }
      if (window.console) console.warn("columns: falling back to one column,", err);
    }
  }

  function reflow() {
    if (!article || !article.isConnected)
      article =
        document.querySelector("article.markdown-section") ||
        document.querySelector(".markdown-section");
    if (!article) return;
    restore();
    run();
  }

  // Late layout (font swap, image decode, highlighting) changes the
  // article's box after pagination — watch it and re-flow, like a reload
  // would, until it settles.
  var settleRO = null;
  var settleTimer = null;
  var settleSize = null;

  function watchSettle() {
    if (typeof ResizeObserver === "undefined") return;
    if (!settleRO) {
      settleRO = new ResizeObserver(function (entries) {
        var e = entries[entries.length - 1];
        var size = [
          Math.round(e.contentRect.width),
          Math.round(e.contentRect.height),
        ];
        if (!settleSize) {
          settleSize = size; // first report after (re)observing: baseline
          return;
        }
        if (size[0] === settleSize[0] && size[1] === settleSize[1]) return;
        settleSize = size;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(reflow, 150);
      });
    }
    settleSize = null;
    settleRO.disconnect();
    settleRO.observe(article);
  }

  // ---- reflow triggers --------------------------------------------

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (!article || !original.length) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reflow, 200);
  });

  // Late-decoding images change column heights after pagination.
  var imgTimer = null;
  document.addEventListener(
    "load",
    function (ev) {
      var t = ev.target;
      if (!t || t.tagName !== "IMG") return;
      if (!active || !article || !article.contains(t)) return;
      clearTimeout(imgTimer);
      imgTimer = setTimeout(reflow, 150);
    },
    true
  );

  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(function () {
      if (active) reflow();
    });

  // Console handle for on-site debugging: SiteColumns.state(), .run(), .reflow().
  window.SiteColumns = {
    run: run,
    reflow: reflow,
    state: function () {
      return {
        active: active,
        viewport: window.innerWidth,
        eligible: window.innerWidth >= MIN_VIEWPORT,
        rows: article
          ? article.querySelectorAll(":scope > .mrow").length
          : 0,
      };
    },
  };

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(
    function (hook) {
      hook.doneEach(function () {
        run();
      });
    }
  );
})();

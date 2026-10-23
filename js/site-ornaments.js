/*
  Site ornament — the demo's CA frame, fitted to the real free space.

  Layout facts (verified against awsm.css + docsify v4 DOM):
  docsify renders <main><article class="markdown-section">. awsm gives
  `body article` max-width 40rem + margin auto + position:relative — the
  640px column, centered in a full-width main. Nothing overrides it.
  So the free space is the void on BOTH sides of the article (between the
  fixed sidebar card and the column; and from the column to the viewport
  edge), the 5rem paddings above/below the text, and the gap before the
  centered footer.

  The frame is ONE generator call, exactly like the studio demo: a single
  field whose hole is the text block, whose box fills the measured void on
  every side (no invented widths). Sides without room collapse onto the
  text — bands emerge by themselves. The SVG lives inside the article
  (awsm positions it relatively) and overflows into the voids.

  Static (nothing animates), lazy (drawn once when near the viewport).
  All tuning lives in SETTINGS below — same names as the studio sliders.
*/
(function () {
  "use strict";
  if (!window.Ornament) return;

  /* =====================================================================
     SETTINGS — everything the site ornament obeys, in one place.
     Ranges are [min, max] rolled once per page load (random genome).
     Names match the studio panel in ornament.html 1:1.
     VALUES DERIVED FROM A RATED SURVEY (64 samples, ornament.html survey
     mode, ink pinned to this file): winners had 16–141 lines on the demo
     stage; dead draws (≤2 lines) came from dens > 0.9, standoff > 33px
     and thin drawable bands (standoff > 0.2 × strip).
     ===================================================================== */
  var SETTINGS = {
    // -- how many lines survive --
    maxlinesPerArea: 99999, // twin-safe contour budget per 820×267 of frame area (winners 69–145; unlimited never won)
    minlen: 0,    // drop contours shorter than this × cell px (winners' absolute gates 2–35px)
    // -- stroke --
    matchDivider: true, // take width + color from the page's <hr> (tracks theme and restyles)
    weight: 1, // stroke width in px when matchDivider is off (the site draws uniform ink — genCA's body/hair tiers are never read here)
    color: null,     // stroke color when matchDivider is off; null = currentColor
    // -- line character --
    smooth: 2,        // curve samples per segment, 2–8 (studio: smooth)
    organic: 0,       // 0 geometric · 1 crisp · 2 soft · 3 organic (studio: style)
    sym: 'none',         // ring symmetry: 'v' left≡right · 'h' top≡bottom · 'both' · 'none' (one wrap seam)
    readout: 'shards',   // how the plane reads the CA: null = roll per load · 'ray' radiates from the text · 'noise' smooth warp (distributes, but shears the texture) · 'shards' marquetry — pure CA inside each shard, offsets distribute
    // -- readout tuning, rolled per load (ray ignores all of these) --
    kSlope: [0.3, 0.75],  // noise: angular warp budget, ring px per plane px — how hard the courses meander
    gSlope: [0.06, 0.22], // noise: radial warp budget, generations per plane px — how hard the banding scrambles
    shardN: [6, 16],      // shards: how many pieces the marquetry cuts
    shardDk: [-30, 30],   // shards: per-shard ring offset span, cells — where on the ring each piece reads
    shardDg: [-5, 9],     // shards: per-shard generation offset span — negative regrows young lace mid-frame
    seedProc: 'noise',   // seed-row procedure: null = roll per load · harm/fm/square/chirp/noise/walk/pulse to pin
    // -- borders: REAL gaps in px (one-cell moats — the ornament between them
    //    is untouched; replaces the old distanding standoff window) --
    padInner: 48,                            // gap between ink and the text block
    padOuter: { l: 16, r: 16, t: 32, b: 32 },   // gaps from the container bounds: left/right sides, top, bottom
    opacity: 1,    // ink strength of the ornament, 0–1
    // -- random genome per load --
    dens: [0.4, 0.9],  // CA seed density (studio: density) — dead draws averaged 0.77
    detail: [4, 16],   // grid cell in px, ABSOLUTE (winners 4.5–10, mean 7.1) — the frame-relative scaler is gone, it only pinned genCA's 10px clamp
    rate: [5.3, 10.5],    // pattern phases per z unit (studio: gen rate) — winners averaged 0.92
    z: [20, 100],        // phase slice — winners averaged 54, extremes leaned dead
    // -- generation depth --
    depth: [36, 56],    // CA generations before the field folds back triangle-wave — deep voids re-wear young lace instead of degenerating
    // -- fit --
    sideMin: 0,        // px of void a side needs before it gets a strip
    edgePad: 0,        // breathing room from the viewport edge
    bottomMax: 240     // cap on the tail strip below the article
  };

  function roll() {
    var r = Ornament.mulberry32((Math.random() * 4294967296) >>> 0);
    // a setting may be [min, max] (rolled per load) or a single pinned value
    var span = function (s) {
      return Array.isArray(s) ? s[0] + r() * (s[1] - s[0]) : s;
    };
    return {
      seed: (Math.random() * 4294967296) >>> 0,
      weight: span(SETTINGS.weight),
      dens: span(SETTINGS.dens),
      detail: span(SETTINGS.detail),
      rate: span(SETTINGS.rate),
      minlen: span(SETTINGS.minlen),
      depth: span(SETTINGS.depth),
      z: span(SETTINGS.z),
      kSlope: span(SETTINGS.kSlope),
      gSlope: span(SETTINGS.gSlope),
      shardN: span(SETTINGS.shardN),
      // shardDk/shardDg stay RANGES — genCA rolls once per shard
    };
  }

  var svg = null;
  var io = null;
  var resizeTimer = null;
  var P = null; // genome — rolls ONCE per page load; rebuilds (resize, late
                // layout, theme flip, route change) reuse it, as documented
  var ro = null;
  var roTimer = null;
  var roSize = null;

  function teardown() {
    if (io) io.disconnect();
    io = null;
    if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
    svg = null;
  }

  // measure the page's own divider: the ornament should wear exactly the
  // ink the <hr> wears (1px #77777777 today — measured, not hardcoded, so
  // restyles and themes carry over)
  function dividerStroke(art) {
    if (!SETTINGS.matchDivider) return null;
    var probe = document.createElement("hr");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    art.appendChild(probe);
    var cs = getComputedStyle(probe);
    var width =
      parseFloat(cs.height) ||
      parseFloat(cs.borderTopWidth) ||
      parseFloat(cs.borderBottomWidth) ||
      0;
    var color = cs.backgroundColor;
    var valid =
      color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent";
    art.removeChild(probe);
    if (!width || !valid) return null;
    return { width: width, color: color };
  }

  function build() {
    teardown();
    var art = document.querySelector("article.markdown-section") ||
      document.querySelector(".markdown-section");
    if (!art) return;
    if (getComputedStyle(art).position === "static")
      art.style.position = "relative";
    if (!P) P = roll();
    var divider = dividerStroke(art);
    var strokeW = divider ? divider.width : P.weight;
    var strokeC = divider
      ? divider.color
      : SETTINGS.color || "currentColor";

    var ar = art.getBoundingClientRect();
    var cs = getComputedStyle(art);
    var padL = parseFloat(cs.paddingLeft) || 0;
    var padR = parseFloat(cs.paddingRight) || 0;
    var padT = parseFloat(cs.paddingTop) || 0;
    var padB = parseFloat(cs.paddingBottom) || 0;

    // the text block, in article-relative coordinates
    var text = {
      x0: padL,
      x1: ar.width - padR,
      y0: padT,
      y1: ar.height - padB,
    };

    // measured voids (viewport coordinates):
    // left — clear the sidebar card only when it actually sits left of the
    // column (on mobile it is a hidden centered overlay, not a left card)
    var doc = document.documentElement;
    var leftLimit = SETTINGS.edgePad;
    var sidebar = document.querySelector(".sidebar");
    if (sidebar) {
      var sr = sidebar.getBoundingClientRect();
      if (sr.width > 0 && sr.right > 0 && sr.right < ar.left)
        leftLimit = sr.right + SETTINGS.edgePad;
    }
    var leftRoom = ar.left - leftLimit;
    var rightRoom = doc.clientWidth - SETTINGS.edgePad - ar.right;

    // below: the gap between the article and the centered footer
    var bottomRoom = 0;
    var footer = document.querySelector("body > footer");
    if (footer) {
      var fr = footer.getBoundingClientRect();
      var gap = fr.top - ar.bottom - SETTINGS.edgePad;
      if (gap > 0) bottomRoom = Math.min(gap, SETTINGS.bottomMax);
    }

    // the frame box: fill every side's measured void; sides without room
    // collapse onto the text block (bands behaviour emerges by itself)
    var boxX0 = leftRoom >= SETTINGS.sideMin ? -leftRoom : text.x0 - 2;
    var boxX1 = rightRoom >= SETTINGS.sideMin ? ar.width + rightRoom : text.x1 + 2;
    var boxY0 = 0;
    var boxY1 = art.scrollHeight + (bottomRoom >= SETTINGS.sideMin ? bottomRoom : 0);
    var W = Math.round(boxX1 - boxX0);
    var H = Math.round(boxY1 - boxY0);
    // never let the frame cross the viewport's right edge: the frame's
    // left is placed with float arithmetic (a − (a − b) ≠ b exactly), so
    // it can sit an ulp PAST leftLimit — the 1px slack absorbs that and
    // scrollHeight/rounding, or the page gets a scrollbar for a hair
    W = Math.max(1, Math.min(W, Math.floor(doc.clientWidth - SETTINGS.edgePad - leftLimit) - 1));
    // same discipline at the page bottom: scrollHeight is an integer and
    // Math.round rounds the span UP — a sub-pixel tail past the footer
    // makes the whole page scrollable by a hair. teardown() already
    // removed the previous SVG, so doc.scrollHeight is the page's own
    // budget; the 1px slack covers every rounding mode
    var artTopDoc = ar.top + (window.scrollY || window.pageYOffset || 0);
    H = Math.max(1, Math.min(H, Math.floor(doc.scrollHeight - artTopDoc) - 1));
    if (W < 80 || H < 60) return;

    var inner = {
      x0: text.x0 - boxX0,
      y0: text.y0 - boxY0,
      x1: text.x1 - boxX0,
      y1: text.y1 - boxY0,
    };

    // one field for the whole page. Survey verdict: the rated cells are
    // absolute px (4.5–10), so no frame-relative scaling — the old scaler
    // multiplied detail by max(W,H)/1100, which on page-sized frames only
    // ever landed on genCA's 10px clamp.
    var detail = P.detail;
    // twin-safe contour budget, area-scaled from the rated 820×267 stage
    var maxlines = Math.max(
      40,
      Math.round((SETTINGS.maxlinesPerArea * W * H) / (820 * 267))
    );

    var NS = "http://www.w3.org/2000/svg";
    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.style.left = boxX0 + "px";
    svg.style.top = boxY0 + "px";
    svg.style.width = W + "px";
    svg.style.height = H + "px";
    svg.style.pointerEvents = "none";
    svg.style.color = "inherit";
    // the divider's own color already carries its alpha — don't dim it twice
    svg.style.opacity = String(divider ? 1 : SETTINGS.opacity);
    // self-heal: the clamps above model the layout, but fractional zoom,
    // borders we didn't see coming, or float placement can still leave a
    // hair of overflow. The ornament must never be what makes the page
    // scrollable — measure the page immediately before and after the
    // frame lands (same task, so nothing else can change layout between
    // the reads) and shrink the frame by exactly what it grew, plus 1px.
    var baseW = doc.scrollWidth, baseH = doc.scrollHeight;
    art.appendChild(svg);
    var grewW = doc.scrollWidth - baseW, grewH = doc.scrollHeight - baseH;
    if (grewW > 0 || grewH > 0) {
      W = Math.max(1, W - grewW - 1);
      H = Math.max(1, H - grewH - 1);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.style.width = W + "px";
      svg.style.height = H + "px";
    }

    function draw() {
      var res = null;
      // ~1 draw in 10 rests (≤2 contours: rule lottery × high dens) — the
      // survey's dead draws. Re-roll the genome rather than ship a dead frame.
      for (var attempt = 0; attempt < 3 && (!res || (res.paths || []).length <= 2); attempt++) {
        try {
          res = Ornament.make("ca", W, H, P.seed, {
            variant: "frame",
            z: P.z,
            inner: inner,
            maxlines: maxlines,
            minlen: P.minlen,
            dens: P.dens,
            rate: P.rate,
            detail: detail,
            depth: P.depth,
            sym: SETTINGS.sym,
            readout: SETTINGS.readout,
            kSlope: P.kSlope,
            gSlope: P.gSlope,
            shardN: P.shardN,
            shardDk: SETTINGS.shardDk,
            shardDg: SETTINGS.shardDg,
            standoff: 0,
            seedProc: SETTINGS.seedProc,
            smooth: SETTINGS.smooth,
            organic: SETTINGS.organic,
            padInner: SETTINGS.padInner,
            padOuter: SETTINGS.padOuter,
          });
        } catch (e) {
          console.error("ornament failed", e);
          return;
        }
        if ((res.paths || []).length <= 2) {
          P.seed = (Math.random() * 4294967296) >>> 0;
          P.dens = P.dens * 0.75;
        }
      }
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      for (var i = 0; i < (res.paths || []).length; i++) {
        var p = res.paths[i];
        var el = document.createElementNS(NS, "path");
        el.setAttribute("d", p.d);
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", strokeC);
        el.setAttribute("stroke-width", String(strokeW));
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("stroke-linejoin", "round");
        svg.appendChild(el);
      }
    }

    // late layout (images, embeds, highlighting) grows the page after the
    // first measure — the ornament used to draw short until a manual reload.
    // Watch the article's box: any later size change re-measures and redraws,
    // same genome.
    if (typeof ResizeObserver !== "undefined") {
      if (!ro)
        ro = new ResizeObserver(function (entries) {
          var e = entries[entries.length - 1];
          var size = [Math.round(e.contentRect.width), Math.round(e.contentRect.height)];
          if (!roSize) { roSize = size; return; }
          if (size[0] === roSize[0] && size[1] === roSize[1]) return;
          roSize = size;
          clearTimeout(roTimer);
          roTimer = setTimeout(build, 150);
        });
      ro.observe(art);
    }

    if (typeof IntersectionObserver === "undefined") return draw();
    io = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          io.disconnect();
          requestAnimationFrame(draw);
        }
      },
      { rootMargin: "320px 0px" }
    );
    io.observe(svg);
  }

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 250);
  });
  // re-measure when the theme flips (divider color could become themed)
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(function () { build(); }).observe(
      document.documentElement,
      { attributes: true, attributeFilter: ["data-theme"] }
    );
  }
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(function () { build(); });

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(
    function (hook) {
      hook.doneEach(function () {
        build();
      });
    }
  );
})();

/*
  Ornament runtime for the site — the CA frame generator.
  Extracted from ornament.html (studio GEN block, infra + species A only).
  Keep in sync with the studio when genCA changes there.
  Contract: Ornament.make(width, height, seed, opts) -> { paths: [{d, sw}], meta }
  opts: { variant: frame|bands, z, inner: {x0,y0,x1,y1}, rule, dens, rate,
          standoff, padInner, padOuter, detail, smooth, organic, bodyW,
          minlen, maxlines, readout (ray|noise|shards|slab|kaleido|prism),
          kSlope/gSlope (noise warp budgets), shardN + shardDk/shardDg
          [lo,hi] shard offset spans, as fractions (of the ring / of
          the generation span) }
  padInner/padOuter: border PADDING in px — padInner grows the text hole,
  padOuter pulls the frame in; each is a number or {l,r,t,b}. The field
  fills the padded region as ONE surface (no suppression); standoff only
  seals the edges. Output stays in the original coordinate system.
*/
const TAU = Math.PI * 2;
const f2 = n => Math.round(n * 100) / 100;

function fnv1a(str){ let h = 0x811c9dc5; for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function mulberry32(a){ return function(){ a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const rrange = (r, a, b) => a + r() * (b - a);
const irange = (r, a, b) => Math.floor(rrange(r, a, b + 0.999));

function dPts(pts, closed){
  if (pts.length < 2) return '';
  let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += `L${f2(pts[i][0])} ${f2(pts[i][1])}`;
  return closed ? d + 'Z' : d;
}
function chaikin(pts, it, closed){
  let p = pts;
  for (let k = 0; k < it; k++){
    const n = p.length, q = [];
    if (!closed) q.push(p[0]);
    const step = closed ? n : n - 1;
    for (let i = 0; i < step; i++){
      const a = p[i], b = p[(i + 1) % n];
      q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]);
      q.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    if (!closed) q.push(p[n - 1]);
    p = q;
  }
  return p;
}
const keyOf = p => p[0].toFixed(1) + ',' + p[1].toFixed(1);
// chain open segments [[a,b],...] into polylines; endpoints with equal keys
// close. mirrorX makes junction tie-breaks mirror-invariant: candidates are
// ordered by min(x, mirrorX−x), so a junction and its mirror make exactly
// mirrored choices even when several segment ends share one bucket.
function chainSegs(segs, mirrorX = Infinity){
  const nkey = p => Math.round(p[0] * 10) * 4194304 + Math.round(p[1] * 10);
  const farKey = c => {
    const p = segs[c.i][c.end ? 0 : 1];
    return [Math.min(p[0], mirrorX - p[0]), p[1]];
  };
  const map = new Map();
  segs.forEach((s, i) => { for (const end of [0, 1]) { const k = nkey(s[end]); if (!map.has(k)) map.set(k, []); map.get(k).push({ i, end }); } });
  const used = new Array(segs.length).fill(false);
  const cands = [];
  const out = [];
  for (let i = 0; i < segs.length; i++){
    if (used[i]) continue;
    used[i] = true;
    const line = [segs[i][0], segs[i][1]];
    const k0 = nkey(line[0]);
    let guard = segs.length + 2;
    let closed = false;
    while (guard--){
      const k = nkey(line[line.length - 1]);
      const bucket = map.get(k);
      if (!bucket) break;
      // first unused candidate — the common case is a lone one, and the
      // sort below only ever matters when several ends share the bucket
      let c = null;
      for (let q = 0; q < bucket.length; q++)
        if (!used[bucket[q].i]){ if (c) { c = null; break; } c = bucket[q]; }
      if (!c){
        if (bucket.length < 2) break;             // one end, already used
        cands.length = 0;
        for (let q = 0; q < bucket.length; q++) if (!used[bucket[q].i]) cands.push(bucket[q]);
        if (!cands.length) break;
        cands.sort((A, B) => {
          const a = farKey(A), b = farKey(B);
          return a[0] - b[0] || a[1] - b[1];
        });
        c = cands[0];
      }
      used[c.i] = true;
      const nxt = segs[c.i][c.end ? 0 : 1];
      if (nkey(nxt) === k0) { closed = true; break; }
      line.push(nxt);
    }
    out.push({ pts: line, closed });
  }
  return out;
}

/* ---------- shared craft layer -------------------------------------- */
/* optical weight: strokes belong to the format, not to a global setting */
const ornBody = (w, h) => Math.max(0.6, Math.min(2.0, Math.min(w, h) / 140));
function circleD(cx, cy, rr){
  return `M${f2(cx - rr)} ${f2(cy)}a${f2(rr)} ${f2(rr)} 0 1 0 ${f2(2 * rr)} 0a${f2(rr)} ${f2(rr)} 0 1 0 ${f2(-2 * rr)} 0Z`;
}
/* coin rim + pip: every medallion device gets the same frame language */
function ornFrame(paths, w, h, body){
  const Rf = Math.min(w, h) / 2 - 3;
  paths.push({ d: circleD(w / 2, h / 2, Rf), sw: body * 1.45 });
  paths.push({ d: circleD(w / 2, h / 2, Rf - 3.4), sw: body * 0.5 });
  paths.push({ d: circleD(w / 2, h / 2, 1.9 * body), sw: 0, fill: true });
  return Rf - 7.5;
}
/* Catmull-Rom through the points — interpolating (crossings stay sharp),
   damped (k<1) so uneven spacing does not wobble */
function crSample(pts, closed, k = 0.85, per = 3){
  const n = pts.length, out = [];
  if (n < 3) return pts.slice();
  const idx = i => closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i));
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++){
    const p0 = pts[idx(i - 1)], p1 = pts[idx(i)], p2 = pts[idx(i + 1)], p3 = pts[idx(i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) * k / 6, c1y = p1[1] + (p2[1] - p0[1]) * k / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) * k / 6, c2y = p2[1] - (p3[1] - p1[1]) * k / 6;
    for (let j = 0; j < per; j++){
      const t = j / per, u = 1 - t, t2 = t * t, t3 = t2 * t;
      out.push([u*u*u*p1[0] + 3*u*u*t*c1x + 3*u*t*t*c2x + t3*p2[0],
                u*u*u*p1[1] + 3*u*u*t*c1y + 3*u*t*t*c2y + t3*p2[1]]);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}

/* ------------------------------------------------------------------ */
/* A · CA frame — a Wolfram automaton, sliced.                          */
/* Any elementary rule 0–255 (hashed from the seed); symmetry comes    */
/* from folded column sampling, not rule isotropy, so chaotic rules    */
/* work too. Depth z morphs the SEED ROW through a smooth trig family  */
/* — cells flip in place, the automaton amplifies them, the lace       */
/* restructures. frame: band on all four sides; bands: top & bottom.   */
/* All lines close with standoff from the text and the frame edge.     */
/* ------------------------------------------------------------------ */
function genCA(w, h, seed, o){
  const r = mulberry32((seed ^ 0xA17CA) >>> 0);
  const bands = o.variant === 'bands';
  const z = +o.z || 0;
  const paths = [];

  // the hole = the text block (caller may pass measured bounds; pieces with
  // the hole OUTSIDE the box — rails and bands — are clamped in, so their
  // band thickness reads as the far side)
  let inner = o.inner || (bands
    ? { x0: 0, y0: h * 0.36, x1: w, y1: h * 0.64 }
    : { x0: w * 0.235, y0: h * 0.26, x1: w * 0.765, y1: h * 0.74 });
  // ---- padding: the borders THEMSELVES, never a field suppression -------
  // padInner grows the text hole; padOuter pulls the frame in. The ornament
  // then fills the padded region as ONE surface — no moats, no windows, no
  // chopped lace; the small standoff window below only closes line ends.
  // A pad is one px number, or {l,r,t,b} (long names left/right/top/bottom
  // read too; sides missing from an object default to 0).
  const padSides = v => {
    if (v == null) return { l: 0, r: 0, t: 0, b: 0 };
    if (typeof v === 'object'){
      const g = (a, b) => Math.max(0, v[a] != null ? +v[a] : v[b] != null ? +v[b] : 0);
      return { l: g('l', 'left'), r: g('r', 'right'), t: g('t', 'top'), b: g('b', 'bottom') };
    }
    const n = Math.max(0, +v || 0);
    return { l: n, r: n, t: n, b: n };
  };
  const pinS = padSides(o.padInner);
  const poutS = padSides(o.padOuter);
  const ox = poutS.l, oy = poutS.t;
  if (ox || oy || poutS.r || poutS.b || pinS.l || pinS.r || pinS.t || pinS.b){
    w = Math.max(20, w - poutS.l - poutS.r);
    h = Math.max(20, h - poutS.t - poutS.b);
    inner = { x0: inner.x0 - pinS.l - ox, x1: inner.x1 + pinS.r - ox,
              y0: inner.y0 - pinS.t - oy, y1: inner.y1 + pinS.b - oy };
  }
  const fmtPad = s => s.l === s.r && s.r === s.t && s.t === s.b ? `${Math.round(s.l)}` : `${Math.round(s.l)}|${Math.round(s.r)}|${Math.round(s.t)}|${Math.round(s.b)}`;
  const padTag = (pinS.l || pinS.r || pinS.t || pinS.b || poutS.l || poutS.r || poutS.t || poutS.b)
    ? ` · pad I${fmtPad(pinS)}·O${fmtPad(poutS)}` : '';
  const cx0 = Math.min(Math.max(inner.x0, 0), w);
  const cx1 = Math.min(Math.max(inner.x1, 0), w);
  const cy0 = Math.min(Math.max(inner.y0, 0), h);
  const cy1 = Math.min(Math.max(inner.y1, 0), h);
  const strip = Math.max(cx0, w - cx1, cy0, h - cy1);
  if (strip < 10) return { paths: [], meta: 'no room for a frame' };
  const margin = o.standoff != null
    ? Math.max(2, Math.min(o.standoff, strip * 0.45))
    : Math.max(4.5, strip * 0.3);

  const cell = o.detail != null
    ? Math.max(2.4, Math.min(10, o.detail))
    : Math.max(4, Math.min(10, strip / 3.4));
  // ONE square unit: the marching cells are exactly cell × cell — the
  // same length the CA readout divides by (ring step AND generation
  // step) — so the automaton is sampled at its own pitch, 1:1 in both
  // axes: no anisotropic sx×sy rectangles, no skipped or doubled cells
  // (the resampling smear the noise-readout notes warn about). cell
  // rarely divides w or h exactly, so the remainder is split to both
  // edges (gx0 = r/2): node positions stay mirror-symmetric about the
  // frame centre, which the twin discipline (canonical crossings,
  // mirror-invariant chaining, twin-safe caps) stands on. The grid then
  // stops r/2 short of the frame edges, so the window seals against the
  // GRID extent (gx0…gx1, gy0…gy1), not the frame — every contour still
  // closes inside the evaluated area, nothing dangles at the boundary.
  const nx = Math.floor(w / cell) + 1, ny = Math.floor(h / cell) + 1;
  // node coordinates precomputed once — gx/gy were pure functions of the
  // index, evaluated nx·ny times per pass (field, window, crossings)
  const XS = new Float64Array(nx), YS = new Float64Array(ny);
  const gx0 = (w - (nx - 1) * cell) / 2, gx1 = w - gx0;
  const gy0 = (h - (ny - 1) * cell) / 2, gy1 = h - gy0;
  for (let i = 0; i < nx; i++) XS[i] = gx0 + i * cell;
  for (let j = 0; j < ny; j++) YS[j] = gy0 + j * cell;

  // ---- the field IS a cellular automaton (Wolfram rule on a cylinder) ----
  // z does NOT advance the generation window — that would merely pan the
  // texture in y (generation g+1 is the same picture one row up). Instead z
  // morphs the SEED ROW through a smooth mirrored trigonometric family:
  // cells flip in place, the automaton amplifies the perturbation, and the
  // lace restructures — a genuine slice, never a translation.
  // any of the 256 elementary rules — no curation. Symmetry comes from
  // FOLDED SAMPLING (columns read through min(k, n−1−k)), not from rule
  // isotropy, so chaotic rules like 30 work in the frame too.
  const rule = o.rule != null ? (Math.round(o.rule) & 255) : Math.floor(r() * 256);
  const dens = o.dens != null ? o.dens : rrange(r, 0.3, 0.5);
  const rate = o.rate != null ? o.rate : rrange(r, 0.25, 0.6);
  // line style: 0 raw geometric (no blur, straight segments, sharp corners)
  //             1 crisp (no blur, smoothed curves)
  //             2 soft (one blur pass)   3 organic (two blur passes)
  const organic = o.organic != null ? Math.max(0, Math.min(3, Math.round(o.organic))) : 3;
  const p = z * rate;                      // pattern phase — continuous
  const rbit = (l, c, rr2) => (rule >> ((l << 2) | (c << 1) | rr2)) & 1;
  // ring geometry, needed early: the seed row's length IS the ring
  const sym = o.sym || 'v';
  const hw = (cx1 - cx0) / 2, hh = (cy1 - cy0) / 2, midX = (cx0 + cx1) / 2, midY = (cy0 + cy1) / 2;
  const symMul = sym === 'both' ? 1 : sym === 'none' ? 4 : 2;
  // the row covers the TEXT ring's folded span (symMul quarter-arcs)
  const ringN = Math.max(24, Math.round((symMul * (hw + hh)) / cell) + 1);
  // ---- procedural seed rows ------------------------------------------
  // the seed row (the automaton's initial condition, and the ornament's
  // macro structure — rule-independent) is synthesized by a PROCEDURE the
  // genome picks from a small library: harm (the original sinusoid sum),
  // fm, square, chirp, noise, walk, pulse. Every procedure obeys the same
  // wavelength discipline — carriers 260–900 px, texture down to ~3.5
  // cells — so no genome can regrow page-sized lobes (the old whirl: the
  // fixed 1–4 low carriers were page-sized on site rings). u ∈ [0,1] is
  // the mirrored ring coordinate; procedures see only u, so the row stays
  // mirror-symmetric and wrap-continuous by construction. Pin via
  // o.seedProc; null rolls one per genome. An eighth source, draw,
  // bypasses the library: o.drawnRow (the studio stylus pad) supplies the
  // seed curve directly, M samples of it over u ∈ [0,1].
  const cycPx = ringN * cell;                    // ring circumference in px
  const wl = (a, b) => cycPx / rrange(r, a, b);  // wavelength px → cycles
  const PROCS = ['harm', 'fm', 'square', 'chirp', 'noise', 'walk', 'pulse'];
  const proc = o.drawnRow && o.drawnRow.length >= 8 ? 'draw'
             : PROCS.includes(o.seedProc) ? o.seedProc : pick(r, PROCS);
  const ihash = (a, b) => { let x = Math.imul(a ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(b + 0x6D2B79F5, 0xC2B2AE35); x = Math.imul(x ^ (x >>> 15), 0x27D4EB2F); return ((x ^ (x >>> 13)) >>> 0) / 4294967296; };
  const sstep01 = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  // periodic value noise, 4 octaves, seeded; slides with pp so z drifts it
  const vnoise = (seed) => {
    const f0 = wl(500, 900), f1 = wl(120, 300), f2 = wl(30, 90), f3 = wl(3.5 * cell, 24);
    const dr = rrange(r, 0.05, 0.3) * (r() < 0.5 ? 1 : -1);
    return (u, pp) => {
      let v = 0, amp = 0.55;
      for (const f of [f0, f1, f2, f3]){
        const m = Math.max(2, Math.round(f));
        const x = (((u + pp * dr) % 1 + 1) % 1) * m, i = Math.floor(x) % m, t = sstep01(x - Math.floor(x));
        const a = ihash(seed + i * 7349 + m, m), b = ihash(seed + ((i + 1) % m) * 7349 + m, m);
        v += amp * (2 * ((1 - t) * a + t * b) - 1);
        amp *= 0.62;
      }
      return v / 1.6;
    };
  };
  let rowEval;
  if (proc === 'draw'){
    // your own hand: o.drawnRow = the seed curve sampled over u ∈ [0,1]
    // (pad top = +1, bottom = −1 — the same waveform the procedures
    // synthesize). Linear interpolation between samples; drift slides the
    // read window with a triangle fold, so the curve travels the ring and
    // ping-pongs at the pad's edges — continuous and mirrored by
    // construction, like every other source.
    const D = o.drawnRow, M = D.length;
    const dr = rrange(r, 0.05, 0.25) * (r() < 0.5 ? 1 : -1);
    const tri = t => { const fr = ((t % 2) + 2) % 2; return fr <= 1 ? fr : 2 - fr; };
    rowEval = (u, pp) => {
      const x = tri(u + pp * dr) * (M - 1), i = Math.floor(x), t = x - i;
      return D[i] * (1 - t) + D[Math.min(M - 1, i + 1)] * t;
    };
  } else if (proc === 'noise'){
    rowEval = vnoise((r() * 1e9) | 0);
  } else if (proc === 'walk'){
    const kn = Math.max(3, Math.round(wl(60, 160))), vs = [], vs2 = [];
    for (let k = 0; k <= kn; k++){ vs.push(rrange(r, -1, 1)); vs2.push(rrange(r, -1, 1)); }
    const fine = vnoise((r() * 1e9) | 0);
    rowEval = (u, pp) => {
      const x = u * kn, i = Math.floor(x), t = sstep01(x - i);
      const w = vs[i] * (1 - t) + vs[Math.min(kn, i + 1)] * t;
      const w2 = vs2[i] * (1 - t) + vs2[Math.min(kn, i + 1)] * t;
      return 0.75 * (w * (0.5 - 0.5 * Math.sin(pp)) + w2 * (0.5 + 0.5 * Math.sin(pp))) + 0.25 * fine(u, pp);
    };
  } else if (proc === 'pulse'){
    const kn = Math.max(4, Math.round(wl(40, 120))), pk = [];
    for (let k = 0; k < kn; k++) pk.push({ v: r() < 0.5 ? -1 : 1, w: rrange(r, 0.2, 0.8) });
    const dr = rrange(r, 0.05, 0.25);
    rowEval = (u, pp) => {
      const x = (((u + pp * dr) % 1 + 1) % 1) * kn, i = Math.floor(x) % kn, t = x - Math.floor(x);
      const a = pk[i], b = pk[(i + 1) % kn];
      const gate = sstep01((t - (1 - b.w)) / b.w);   // plateau, then transition
      return a.v * (1 - gate) + b.v * gate;
    };
  } else if (proc === 'fm'){
    const ac = wl(260, 900), m1 = wl(3.5 * cell, 60), m2 = wl(30, 200);
    const i1 = rrange(r, 0.5, 3), i2 = rrange(r, 0.3, 2), ph = r() * TAU, az = rrange(r, 0.3, 1.2);
    rowEval = (u, pp) => 0.9 * Math.sin(Math.PI * ac * u + i1 * Math.sin(Math.PI * m1 * u + az * pp) + i2 * Math.sin(Math.PI * m2 * u + ph));
  } else if (proc === 'square'){
    const f0 = wl(260, 900), nh = irange(r, 2, 5), ph = r() * TAU, az = rrange(r, 0.3, 1.2);
    rowEval = (u, pp) => { let s = 0, n = 0; for (let h = 1; h <= nh; h++){ const hh = 2 * h - 1; s += Math.sin(hh * (Math.PI * f0 * u + az * pp) + ph) / hh; n += 1 / hh; } return s / n; };
  } else if (proc === 'chirp'){
    const a0 = wl(600, 900), a1 = wl(260, 500), ph = r() * TAU, az = rrange(r, 0.3, 1.2);
    const tx = wl(3.5 * cell, 60), tp = r() * TAU, ta = rrange(r, 0.1, 0.3);
    rowEval = (u, pp) => 0.8 * Math.sin((a0 + (a1 - a0) * u) * Math.PI * u + az * pp + ph) + ta * Math.sin(Math.PI * tx * u + tp);
  } else { // harm — the original sinusoid family
    const fam = [];
    const nF = 7 + Math.floor(r() * 5);
    for (let k = 0; k < nF; k++){
      const lo = k < 2;
      fam.push({ ax: lo ? wl(260, 900) : wl(3.5 * cell, 260),
                 az: rrange(r, 0.3, 1.2) * (r() < 0.5 ? 1 : -1), ph: r() * TAU,
                 amp: lo ? rrange(r, 0.4, 0.8) : rrange(r, 0.5, 1) });
    }
    rowEval = (u, pp) => { let s = 0; for (const f of fam) s += f.amp * Math.sin(f.ax * Math.PI * u + f.az * pp + f.ph); return s / nF; };
  }
  const bias = (0.5 - dens) * 1.5;         // density slider biases the threshold
  const seedRow = (pp, n) => {
    const row = new Array(n);
    for (let i = 0; i < n; i++){
      const u = Math.min(i, n - 1 - i) / (n / 2);   // 0..1, mirrored
      row[i] = rowEval(u, pp) > bias ? 1 : 0;
    }
    if (row.every(v => !v)){ row[n >> 1] = 1; if ((n & 1) === 0) row[(n >> 1) - 1] = 1; }  // on the fold axis
    return row;
  };
  // the ornament radiates from the text: generation 0 is the ring around
  // the hole, later generations live farther out — the automaton literally
  // grows away from the words, and z morphs its seed in place.
  // ONE cylinder: read around the ring at distance d from the text (below).
  const runCA = (row0, rows) => {
    let S = row0;
    const out = [];
    const n = row0.length;
    for (let g = 0; g < rows; g++){
      out.push(S);
      const N = new Array(n);
      for (let i = 0; i < n; i++) N[i] = rbit(S[(i - 1 + n) % n], S[i], S[(i + 1) % n]);
      S = N;
    }
    return out;
  };
  // depth fold: generation = distance from the text ÷ cell. Frames much
  // larger than their text (page voids) run past the young generations the
  // lace lives in — out there elementary rules degenerate to flat or noise.
  // Opt-in (o.depth): fold the index triangle-wave so deep frames repeat
  // the young regime in concentric bands. Default Infinity = never folds,
  // so default genomes are bit-identical to the original generator.
  const depth = o.depth != null ? Math.max(8, Math.round(o.depth)) : Infinity;
  // the depth fold, inlined in int32 in the node loop below (the index it
  // folds is a small integer; fmod of two integers is the integer
  // remainder, so the closure it replaces agreed bit for bit)
  const foldInf = depth === Infinity;
  const depth2 = foldInf ? 0 : 2 * depth;
  const gNeed = Math.min(Math.ceil(Math.hypot(w, h) / 2 / cell) + 2, depth + 2);
  // ONE cylinder, read around the ring — L∞ (square) rings. The field is
  // a single surface; a closed ring must wrap the cylinder somewhere, and
  // the fold that hides the wrap is a MIRROR, settable via sym:
  //   sym 'v'    left ≡ right (fold lines at top/bottom centres)  [default]
  //   sym 'h'    top ≡ bottom (fold lines at the side-mids)
  //   sym 'both' fourfold — every quadrant reads the same quarter
  //   sym 'none' full texture, but the wrap shows as one seam at top-centre
  // SQUARE rings matter: the earlier Euclidean rings parameterized each
  // corner as an arc (position d·φ), which focuses at the hole's corners
  // and swirls every texture into the same seed-independent WHIRL there.
  // Square rings are piecewise linear in x and y — no singularity, no
  // swirl — and the four quarter-arcs stay equal (c = hw + hh + 2d), so
  // the folds keep their exact mirror behaviour.
  const gens = runCA(seedRow(p, ringN), gNeed);
  // ---- readout: how a plane point finds its ring cell -----------------
  // ray   the original — every structure radiates from one centre.
  // noise TWO independent displacement fields, applied to both readout
  //       coordinates:
  //       · kOff (angular): bends where around the ring a point reads.
  //         Alone it only makes the rays wavy — the concentric
  //         generation bands still radiate from the text.
  //       · gOff (radial, amplitude in GENERATIONS): scrambles WHICH
  //         generation a point reads. This is what distributes the
  //         lace — no banding, no centre, young and old texture
  //         interleaved in patches across the frame.
  //       Guarantees both: zero mean (no net rotation — the old swirl
  //       rail cannot regrow; no net generation drift either), and
  //       mirror discipline — the arc coordinate flips sign under a
  //       mirror, so kOff is ODD under every fold axis; the generation
  //       coordinate is a distance (even), so gOff is EVEN. Mirror
  //       pairs then read the same cell and sym survives both warps.
  //       Slope budgets (kOff: S ring-px per plane-px; gOff: SG
  //       generations per plane-px) keep the meander scale-free and
  //       neighbouring nodes never reading far-apart cells — contours
  //       stay chainable. Wavelength discipline as everywhere.
  //       BUT a smooth warp has gradient everywhere: adjacent nodes
  //       step ≠ 1 generation and shear kk, so the automaton's own
  //       texture is resampled non-uniformly — skipped/doubled
  //       generations, smeared triangles — and the warp's own shapes
  //       organise everything (a softer square-swirl rail). Which is
  //       what shards exists to avoid.
  // shards a marquetry of 6–16 Voronoi shards; each shard reads the
  //       cylinder through its OWN rotated frame (angle + constant
  //       offsets dk/dg, in FRACTIONS of the ring / of the drawable
  //       span — scale-free, unlike the original absolute cells, which
  //       only fit the studio stage). The frame is the point: every
  //       readout that keeps ring position tied to the RAY from the
  //       text — ray, noise, and shards shifted by constants — shares
  //       one skeleton; the automaton's long-lived verticals ARE rays
  //       and its generations ARE rings, so on a page-sized ring the
  //       whole picture reads as one burst from the text, offsets or
  //       no. A local frame keeps the read pure — unit rate in both
  //       axes, no shear, no skipped or doubled generations, texture
  //       exactly as crisp as ray mode — while the stripes point where
  //       the shard points: nothing radiates any more. The only imposed
  //       geometry is the shard EDGES — hard splices (softened by one
  //       blur pass at organic ≥ 1), seed-rolled every genome, nothing
  //       to ride. Symmetry: sites live on the folded plane and frames
  //       are evaluated in folded coordinates, so mirror pairs fold to
  //       the same site and the same reads — the marquetry mirrors.
  // slab   ONE rigid frame for the whole void — the cylinder unrolled
  //        as straight wallpaper at a genome angle. The austerity
  //        option: no partition, no centre, pure automaton at a slant.
  // kaleido mirror tiles: the plane triangle-folds against a genome
  //        tile in both axes, every tile reading the same patch of
  //        cylinder, bookmatched at the folds. Folds are isometries —
  //        the read stays pure — and the palindromic row makes the
  //        k-folds seamless in value, so the mirrors show as ink, not
  //        seams. Generations run up and down from each fold line:
  //        the young lace lives ON the seams, like growth from a
  //        bookmatch spine.
  // prism  many centres: Voronoi sites, each cell reading RAY geometry
  //        around its own small square. The radiating character of
  //        ray, distributed — every piece grows from its own little
  //        text, kinks only at the cell edges, as with shards.
  // zones  frames within frames: concentric rectangular bands around
  //        the text (Chebyshev distance from the hole), each band pure
  //        CA in its own rotated frame. The partition echoes the text
  //        block — border, field, border — while no texture radiates:
  //        the bands are cut, not grown.
  // courses banded frames: straight parallel bands — columns or strata
  //        by a genome roll — each band pure CA at its own angle (free
  //        rolls, or a chevron alternating ±A), windows stepped around
  //        the ring by the golden cut.
  // orbit  ray with the axes swapped: ring position grows with
  //        DISTANCE from the words, generation marches AROUND them.
  //        Pure — the ray readout's own geometry, exchanged — but the
  //        light cones now spiral about the text, and if every genome
  //        reads as the same swirl that is the old rail in new clothes:
  //        rate it honestly and delete it if it rides.
  const READOUTS = ['ray', 'noise', 'shards', 'slab', 'kaleido', 'prism', 'zones', 'courses', 'orbit'];
  const readout = READOUTS.includes(o.readout) ? o.readout : pick(r, READOUTS);
  // the two warp fields, evaluated ONTO THE GRID up front (null = ray):
  // the field loop below reads them by node index. Noise fields are
  // separable (see mkField.grid). The frame readouts — shards, slab,
  // kaleido, prism — bypass the ray readout: their scans store the
  // cylinder reads themselves (KK/GG, null = ray/noise) and the field
  // loop takes the cell straight from them.
  // gfold: depth-fold a generation index — triangle over [0, depth),
  // wrapping negatives (local frames run both ways), never clamping (a
  // clamp would paint flat dead gen-0 patches); no depth mirrors at 0
  const gfold = gr => {
    if (foldInf) gr = Math.abs(gr);
    else { gr %= depth2; if (gr < 0) gr += depth2; if (gr >= depth) gr = depth2 - gr; }
    return Math.min(gr, gNeed - 1);
  };
  let KOFF = null, GV = null, KK = null, GG = null;
  // orbit rides the ray path in the field loop, swapping the axes at
  // the last moment (see the readout notes)
  let ORBIT = false, oDk = 0, oDg = 0, oStep = 0;
  if (readout === 'noise'){
    // mkField precomputes each octave's value-noise LATTICE once (ihash
    // per lattice corner, corners shared by every node in a cell) and the
    // returned sampler only interpolates — the per-node ihash storm of
    // the original inline form was the generator's dominant cost. Same
    // rolls, same ihash arguments, same interpolation arithmetic: the
    // output is bit-identical.
    const mkField = (seed, octdef, S, xlo, xhi, ylo, yhi) => {
      const octs = octdef.map(([lo, hi, sh]) => {
        const wl = rrange(r, lo, hi);
        return { wl, m: Math.max(3, Math.round(wl)), k: sh * rrange(r, 0.6, 1.4) };
      });
      const ksum = octs.reduce((s, t) => s + t.k, 0);
      for (const t of octs) t.a = t.wl * t.k * (S / ksum);
      // lattice covers [xlo,xhi]×[ylo,yhi] plus one ring of corners; the
      // sampler below falls back to a direct ihash (the original inline
      // form) if a query ever lands outside — unreachable, but never wrong
      for (const t of octs){
        t.x0 = Math.floor(xlo / t.wl) - 1; t.y0 = Math.floor(ylo / t.wl) - 1;
        const x1 = Math.floor(xhi / t.wl) + 1, y1 = Math.floor(yhi / t.wl) + 1;
        t.w = x1 - t.x0 + 1;
        const L = new Float64Array(t.w * (y1 - t.y0 + 1));
        for (let b = 0; b * t.w < L.length; b++)
          for (let a = 0; a < t.w; a++)
            L[b * t.w + a] = ihash(seed + (a + t.x0) * 7349 + t.m, seed + (b + t.y0) * 2657 - t.m);
        t.L = L;
      }
      // field(x, y) — the general sampler (kept for reference parity; the
      // field loop below only reads grids). Interpolation arithmetic is the
      // original's, term for term.
      const field = (x, y) => {
        let v = 0;
        for (let t = 0; t < octs.length; t++){
          const o = octs[t];
          const wl = o.wl, L = o.L, W = o.w;
          const fx = x / wl, fy = y / wl;
          const xi = Math.floor(fx), yi = Math.floor(fy);
          // frac parts are in [0,1) by construction — the clamp inside
          // sstep01 is a no-op here, so the hermite is inlined without it
          const ftx = fx - xi, fty = fy - yi;
          const tx = ftx * ftx * (3 - 2 * ftx), ty = fty * fty * (3 - 2 * fty);
          const ax = xi - o.x0, ay = yi - o.y0;
          let v00, v10, v01, v11;
          if (ax >= 0 && ax + 1 < W && ay >= 0 && (ay + 1) * W <= L.length){
            const b = ay * W + ax;
            v00 = L[b]; v10 = L[b + 1]; v01 = L[b + W]; v11 = L[b + W + 1];
          } else { // unreachable — queries provably stay inside the lattice
            v00 = ihash(seed + xi * 7349 + o.m, seed + yi * 2657 - o.m); // pragma: nocov
            v10 = ihash(seed + (xi + 1) * 7349 + o.m, seed + yi * 2657 - o.m); // pragma: nocov
            v01 = ihash(seed + xi * 7349 + o.m, seed + (yi + 1) * 2657 - o.m); // pragma: nocov
            v11 = ihash(seed + (xi + 1) * 7349 + o.m, seed + (yi + 1) * 2657 - o.m); // pragma: nocov
          }
          v += o.a * (2 * ((v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty) - 1);
        }
        return v;
      };
      // field.grid(xs, ys) — the same field on the node grid, computed
      // SEPARABLY: the bilinear form is (v00·(1−tx)+v10·tx)·(1−ty) +
      // (v01·(1−tx)+v11·tx)·ty, so each lattice row can first be
      // interpolated at the grid COLUMNS (one pass per row), and each node
      // then blends the two rows it straddles. Every division, floor and
      // hermite runs once per column/row per octave instead of once per
      // node; the arithmetic per node is literally the same expression on
      // the same operands, so results are bit-identical to field(x, y).
      // Octave contributions still accumulate in octave order.
      field.grid = (xs, ys) => {
        const out = new Float64Array(nx * ny);
        for (let t = 0; t < octs.length; t++){
          const o = octs[t], wl = o.wl, L = o.L, W = o.w;
          const xi = new Int32Array(nx), tx = new Float64Array(nx), otx = new Float64Array(nx);
          for (let i = 0; i < nx; i++){
            const fx = xs[i] / wl, xf = Math.floor(fx), f = fx - xf;
            xi[i] = xf - o.x0;
            const hx = f * f * (3 - 2 * f);
            tx[i] = hx; otx[i] = 1 - hx;
          }
          const yi = new Int32Array(ny), ty = new Float64Array(ny), oty = new Float64Array(ny);
          for (let j = 0; j < ny; j++){
            const fy = ys[j] / wl, yf = Math.floor(fy), f = fy - yf;
            yi[j] = yf - o.y0;
            const hy = f * f * (3 - 2 * f);
            ty[j] = hy; oty[j] = 1 - hy;
          }
          // rolling pair of row buffers: lattice row indices are
          // non-decreasing along j, so at most two rows are ever live
          let ra = -2, rb = -2;
          let B0 = new Float64Array(nx), B1 = new Float64Array(nx);
          const rowAt = (r, buf) => {
            const o0 = r * W;
            for (let i = 0; i < nx; i++){
              const b = o0 + xi[i];
              buf[i] = L[b] * otx[i] + L[b + 1] * tx[i];
            }
          };
          for (let j = 0; j < ny; j++){
            const r0 = yi[j], r1 = r0 + 1;
            if (r0 !== ra){
              if (r0 === rb){ const tmp = B0; B0 = B1; B1 = tmp; ra = rb; rb = -2; }
              else { rowAt(r0, B0); ra = r0; rb = -2; }
            }
            if (r1 !== rb){ rowAt(r1, B1); rb = r1; }
            const oj = j * nx, omt = oty[j], tj = ty[j], a = o.a;
            for (let i = 0; i < nx; i++)
              out[oj + i] += a * (2 * (B0[i] * omt + B1[i] * tj) - 1);
          }
        }
        return out;
      };
      return field;
    };
    // slope budgets are genome knobs: o.kSlope (ring-px) / o.gSlope
    // (generations) per plane-px, null = the internal rolls. Seeds are
    // drawn in the same positions as the original inline rolls, so
    // pinned and default genomes share one r-stream shape
    const mx2 = 2 * midX, my2 = 2 * midY;
    // every coordinate the mirrored samplers below can query: x and its
    // mirror mx2−x, y and my2−y — the lattices must cover the union
    const mxv = sym === 'v' || sym === 'both', myv = sym === 'h' || sym === 'both';
    const qx0 = Math.min(0, mxv ? mx2 - w : 0), qx1 = Math.max(w, mxv ? mx2 : w);
    const qy0 = Math.min(0, myv ? my2 - h : 0), qy1 = Math.max(h, myv ? my2 : h);
    const kW = (r() * 1e9) | 0;
    const kS = o.kSlope != null ? +o.kSlope : rrange(r, 0.3, 0.75);
    const kbase = mkField(kW, [[500, 900, 1], [120, 300, 0.55], [26, 80, 0.3]], kS, qx0, qx1, qy0, qy1);
    const gW = (r() * 1e9) | 0;
    const gS = o.gSlope != null ? +o.gSlope : rrange(r, 0.06, 0.22);
    const gbase = mkField(gW, [[260, 700, 1], [80, 220, 0.5], [26, 70, 0.25]], gS, qx0, qx1, qy0, qy1);
    // mirror axes as coordinate arrays, so mirrored reads go through the
    // same separable grid path
    const MXS = new Float64Array(nx), MYS = new Float64Array(ny);
    if (mxv) for (let i = 0; i < nx; i++) MXS[i] = mx2 - XS[i];
    if (myv) for (let j = 0; j < ny; j++) MYS[j] = my2 - YS[j];
    // the warp grids, composed per symmetry exactly as the warp closures
    // they replace (odd k-warp, even g-warp — see the discipline notes
    // above); element-wise ops in the same order the closures used them
    const zip2 = (A, B, f) => { const O = new Float64Array(A.length); for (let n = 0; n < A.length; n++) O[n] = f(A[n], B[n]); return O; };
    if (sym === 'v'){
      KOFF = zip2(kbase.grid(XS, YS), kbase.grid(MXS, YS), (a, b) => a - b);
      GV = zip2(gbase.grid(XS, YS), gbase.grid(MXS, YS), (a, b) => 0.5 * (a + b));
    } else if (sym === 'h'){
      KOFF = zip2(kbase.grid(XS, YS), kbase.grid(XS, MYS), (a, b) => a - b);
      GV = zip2(gbase.grid(XS, YS), gbase.grid(XS, MYS), (a, b) => 0.5 * (a + b));
    } else if (sym === 'both'){
      const k1 = kbase.grid(XS, YS), k2 = kbase.grid(MXS, YS), k3 = kbase.grid(XS, MYS), k4 = kbase.grid(MXS, MYS);
      const g1 = gbase.grid(XS, YS), g2 = gbase.grid(MXS, YS), g3 = gbase.grid(XS, MYS), g4 = gbase.grid(MXS, MYS);
      KOFF = new Float64Array(k1.length); GV = new Float64Array(k1.length);
      for (let n = 0; n < k1.length; n++){
        KOFF[n] = k1[n] - k2[n] - k3[n] + k4[n];
        GV[n] = 0.25 * (g1[n] + g2[n] + g3[n] + g4[n]);
      }
    } else { // 'none' — the plain fields
      KOFF = kbase.grid(XS, YS);
      GV = gbase.grid(XS, YS);
    }
  } else if (readout === 'shards'){
    // sites live on the FOLDED plane, so the partition itself mirrors;
    // dk sign-flips across each fold axis (the arc coordinate is odd
    // under mirrors), dg is even (a distance) — same discipline as noise
    const fw = sym === 'v' || sym === 'both' ? midX : w;
    const fh = sym === 'h' || sym === 'both' ? midY : h;
    const nS = o.shardN != null ? Math.max(1, Math.round(+o.shardN)) : irange(r, 6, 16);
    // offset spans are [lo, hi] genome knobs (one roll per shard, so the
    // site passes the RANGE, not a value), in FRACTIONS — dk of the ring,
    // dg of the drawable span — so the marquetry keeps its strength at
    // any frame size (the original absolute cells only fit the studio
    // stage: on a page-sized ring ±30 cells is a few percent)
    const dkR = Array.isArray(o.shardDk) ? o.shardDk : [-0.3, 0.3];   // ring fraction
    const dgR = Array.isArray(o.shardDg) ? o.shardDg : [-0.3, 0.3];   // span fraction
    // Each shard reads the cylinder through its OWN rotated frame (see
    // the readout notes above for why constants alone cannot de-centre
    // the field). The frame is a rigid isometry of the plane: unit rate
    // in both axes, so the automaton is never sheared, skipped or
    // stretched — its texture stays exactly as crisp as ray mode —
    // while the stripes point where the shard points.
    const sites = [];
    for (let i = 0; i < nS; i++){
      const th = rrange(r, 0, TAU);
      sites.push({
        x: rrange(r, 0, fw), y: rrange(r, 0, fh),
        ct: Math.cos(th), st: Math.sin(th),
        dk: Math.round(rrange(r, dkR[0], dkR[1]) * ringN),
        dg: Math.round(rrange(r, dgR[0], dgR[1]) * gNeed),
      });
    }
    // one fused scan per node: shard search and frame read in one pass,
    // in FOLDED coordinates — mirror pairs fold to the same site and
    // the same local (u, v), so partition and frames mirror together
    KK = new Int32Array(nx * ny);
    GG = new Int32Array(nx * ny);
    const foldX = fw < w, foldY = fh < h;
    for (let j = 0; j < ny; j++){
      const y = YS[j];
      const qy = foldY ? midY - Math.abs(y - midY) : y;
      for (let i = 0; i < nx; i++){
        const x = XS[i];
        const qx = foldX ? midX - Math.abs(x - midX) : x;
        let best = sites[0], bd = Infinity;
        for (let q = 0; q < sites.length; q++){
          const s = sites[q];
          const d = (s.x - qx) * (s.x - qx) + (s.y - qy) * (s.y - qy);
          if (d < bd){ bd = d; best = s; }
        }
        const oj = j * nx + i;
        const dx = qx - best.x, dy = qy - best.y;
        let kk = Math.round((dx * best.ct + dy * best.st) / cell) + best.dk;
        KK[oj] = ((kk % ringN) + ringN) % ringN;
        GG[oj] = gfold(Math.round((-dx * best.st + dy * best.ct) / cell) + best.dg);
      }
    }
  } else if (readout === 'slab'){
    // ONE rigid frame for the whole void: the cylinder unrolled as
    // straight wallpaper at a genome angle (see the readout notes).
    // Folded coordinates keep mirror pairs on identical cells — the
    // slab mirrors exactly under every sym
    const th = rrange(r, 0, TAU), ct = Math.cos(th), st = Math.sin(th);
    const dk = Math.round(rrange(r, -0.3, 0.3) * ringN);
    const dg = Math.round(rrange(r, -0.3, 0.3) * gNeed);
    // window discipline: a page-sized ring is ~4× any slab's traversal,
    // and one contiguous slice can sit on a dead stretch of the row —
    // so the traversal is cut into windows that step around the ring by
    // the golden cut: the slab reads SEVERAL spread windows, not one
    // slice (the studio stage spans the whole ring and keeps nW = 1,
    // no windows, exactly the single-frame look)
    const spanC = Math.ceil((w * Math.abs(ct) + h * Math.abs(st)) / cell) + 1;
    const nW = Math.max(1, Math.min(4, Math.round(ringN / spanC)));
    const P = Math.max(24, Math.min(ringN, Math.ceil(spanC / nW) + 1));
    const stepC = Math.round(ringN * 0.6180339887);
    const mxv = sym === 'v' || sym === 'both', myv = sym === 'h' || sym === 'both';
    KK = new Int32Array(nx * ny);
    GG = new Int32Array(nx * ny);
    for (let j = 0; j < ny; j++){
      const y = YS[j], qy = myv ? midY - Math.abs(y - midY) : y;
      for (let i = 0; i < nx; i++){
        const x = mxv ? midX - Math.abs(XS[i] - midX) : XS[i];
        const oj = j * nx + i;
        const uu = x * ct + qy * st;
        let kk = Math.round(uu / cell) + Math.floor(uu / (P * cell)) * stepC + dk;
        KK[oj] = ((kk % ringN) + ringN) % ringN;
        GG[oj] = gfold(Math.round((-x * st + qy * ct) / cell) + dg);
      }
    }
  } else if (readout === 'kaleido'){
    // mirror tiles: triangle-fold the plane against a genome tile in
    // both axes; every tile reads the same patch of cylinder through
    // the same constant offsets, bookmatched at the fold lines (see
    // the readout notes). Folds are isometries — the read stays pure
    const tw = rrange(r, 180, 420), thh = rrange(r, 180, 420);   // tile px, both axes
    const dk = Math.round(rrange(r, -0.3, 0.3) * ringN);
    const dg = Math.round(rrange(r, -0.3, 0.3) * gNeed);
    // a tile reads its own tw-wide window of the row; tile COLUMNS step
    // around the ring by the golden cut (wrap at ringN, NEVER at the
    // window span — a window-span wrap pins every column to the same
    // slice, and one quiet slice empties the whole readout)
    const stepC = Math.round(ringN * 0.6180339887);
    const trif = (z, p) => { z = ((z % (2 * p)) + 2 * p) % (2 * p); return z < p ? z : 2 * p - z; };
    const mxv = sym === 'v' || sym === 'both', myv = sym === 'h' || sym === 'both';
    KK = new Int32Array(nx * ny);
    GG = new Int32Array(nx * ny);
    for (let j = 0; j < ny; j++){
      const y = YS[j], qy = myv ? midY - Math.abs(y - midY) : y;
      for (let i = 0; i < nx; i++){
        const x = mxv ? midX - Math.abs(XS[i] - midX) : XS[i];
        const oj = j * nx + i;
        const col = Math.floor(x / tw);
        let kk = Math.round(trif(x, tw) / cell) + dk + col * stepC;
        KK[oj] = ((kk % ringN) + ringN) % ringN;
        GG[oj] = gfold(Math.round(trif(qy, thh) / cell) + dg);
      }
    }
  } else if (readout === 'prism'){
    // many centres: Voronoi sites, each cell reading ray geometry
    // around its own small square (see the readout notes). The per-cell
    // math is the ray readout's own — foot on the square by ray, arc
    // around it, Chebyshev generation — so each piece is as pure as
    // ray; kinks live only at the cell edges, as with shards
    const fw = sym === 'v' || sym === 'both' ? midX : w;
    const fh = sym === 'h' || sym === 'both' ? midY : h;
    const nS = o.shardN != null ? Math.max(1, Math.round(+o.shardN)) : irange(r, 6, 16);
    const dkR = Array.isArray(o.shardDk) ? o.shardDk : [-0.3, 0.3];
    const dgR = Array.isArray(o.shardDg) ? o.shardDg : [-0.3, 0.3];
    const sites = [];
    for (let i = 0; i < nS; i++) sites.push({
      x: rrange(r, 0, fw), y: rrange(r, 0, fh),
      // the square's perimeter is its ring window — wide enough to
      // hold the row's alive/dead mixture (tiny squares read all-alive
      // stretches flat and the cell draws blank on dense genomes)
      hw: rrange(r, 6, 16) * cell, hh: rrange(r, 6, 16) * cell,
      dk: Math.round(rrange(r, dkR[0], dkR[1]) * ringN),
      dg: Math.round(rrange(r, dgR[0], dgR[1]) * gNeed),
    });
    // one loop around a square spans 4·(hw+hh) of ring — that IS the
    // site's window, and dk places it on the row (wrap at ringN, never
    // at the window span: a window-span wrap pins every site to the
    // same slice, and one quiet slice empties the whole readout)
    KK = new Int32Array(nx * ny);
    GG = new Int32Array(nx * ny);
    const foldX = fw < w, foldY = fh < h;
    for (let j = 0; j < ny; j++){
      const y = YS[j];
      const qy = foldY ? midY - Math.abs(y - midY) : y;
      for (let i = 0; i < nx; i++){
        const x = XS[i];
        const qx = foldX ? midX - Math.abs(x - midX) : x;
        let best = sites[0], bd = Infinity;
        for (let q = 0; q < sites.length; q++){
          const s = sites[q];
          const d = (s.x - qx) * (s.x - qx) + (s.y - qy) * (s.y - qy);
          if (d < bd){ bd = d; best = s; }
        }
        const oj = j * nx + i;
        const dx = qx - best.x, dy = qy - best.y;
        const ax = dx < 0 ? -dx : dx, ay = dy < 0 ? -dy : dy;
        const tx = best.hw / (ax || 1e-9), ty = best.hh / (ay || 1e-9);
        const t = tx < ty ? tx : ty;
        let arc;
        if (ty <= tx)                                   // exits through top/bottom of the square
          arc = dy <= 0 ? t * dx : 2 * (best.hw + best.hh) - t * dx;
        else
          arc = dx > 0 ? best.hw + best.hh + t * dy : -(best.hw + best.hh + t * dy);
        let kk = Math.round(arc / cell) + best.dk;
        KK[oj] = ((kk % ringN) + ringN) % ringN;
        GG[oj] = gfold(Math.round(Math.max(ax - best.hw, ay - best.hh, 0) / cell) + best.dg);
      }
    }
  } else if (readout === 'zones'){
    // frames within frames: concentric rectangular bands around the
    // text (Chebyshev distance from the hole), each band pure CA in
    // its own rotated frame (see the readout notes). The distance is
    // the ray readout's own — computed inline, mirror-symmetric per
    // column/row exactly like DXX/DYY below
    const nZ = irange(r, 2, 5);
    const edges = [];
    for (let e = rrange(r, 60, 200), i = 1; i < nZ; i++){ edges.push(e); e += rrange(r, 80, 260); }
    const dkR = Array.isArray(o.shardDk) ? o.shardDk : [-0.3, 0.3];
    const dgR = Array.isArray(o.shardDg) ? o.shardDg : [-0.3, 0.3];
    const zs = [];
    for (let i = 0; i < nZ; i++){
      const th = rrange(r, 0, TAU);
      zs.push({ ct: Math.cos(th), st: Math.sin(th),
        dk: Math.round(rrange(r, dkR[0], dkR[1]) * ringN),
        dg: Math.round(rrange(r, dgR[0], dgR[1]) * gNeed) });
    }
    const mxv = sym === 'v' || sym === 'both', myv = sym === 'h' || sym === 'both';
    KK = new Int32Array(nx * ny);
    GG = new Int32Array(nx * ny);
    for (let j = 0; j < ny; j++){
      const y = YS[j], qy = myv ? midY - Math.abs(y - midY) : y;
      for (let i = 0; i < nx; i++){
        const x = mxv ? midX - Math.abs(XS[i] - midX) : XS[i];
        const oj = j * nx + i;
        const xr = XS[i], yr = YS[j];
        const dI = Math.max(inner.x0 - xr, 0, xr - inner.x1, inner.y0 - yr, 0, yr - inner.y1);
        let b = 0; while (b < edges.length && dI > edges[b]) b++;
        const s = zs[b];
        let kk = Math.round((x * s.ct + qy * s.st) / cell) + s.dk;
        KK[oj] = ((kk % ringN) + ringN) % ringN;
        GG[oj] = gfold(Math.round((-x * s.st + qy * s.ct) / cell) + s.dg);
      }
    }
  } else if (readout === 'courses'){
    // banded frames: straight parallel bands, columns or strata by a
    // genome roll; per-band angle free or a chevron alternating ±A,
    // per-band window stepped around the ring by the golden cut (see
    // the readout notes). Band index is a pure per-column/per-row
    // function, so the per-band rolls are hashed, not stored
    const vert = r() < 0.5;                       // columns vs strata
    const bw = rrange(r, 120, 380);               // band width px
    const chev = r() < 0.5, A = rrange(r, 0.26, 1.31);   // 15°–75°
    const wS = (r() * 1e9) | 0;
    const dk0 = Math.round(rrange(r, -0.3, 0.3) * ringN);
    const dg0 = Math.round(rrange(r, -0.3, 0.3) * gNeed);
    const stepC = Math.round(ringN * 0.6180339887);
    const nB = Math.ceil((vert ? w : h) / bw) + 2;
    const BC = new Float64Array(nB), BS = new Float64Array(nB), BD = new Int32Array(nB);
    for (let b = 0; b < nB; b++){
      const th = chev ? (b & 1 ? -A : A) : ihash(wS + b * 7919, 3) * TAU;
      BC[b] = Math.cos(th); BS[b] = Math.sin(th);
      BD[b] = Math.round((ihash(wS + b * 104729, 5) * 2 - 1) * 0.3 * gNeed);
    }
    const mxv = sym === 'v' || sym === 'both', myv = sym === 'h' || sym === 'both';
    KK = new Int32Array(nx * ny);
    GG = new Int32Array(nx * ny);
    for (let j = 0; j < ny; j++){
      const y = YS[j], qy = myv ? midY - Math.abs(y - midY) : y;
      for (let i = 0; i < nx; i++){
        const x = mxv ? midX - Math.abs(XS[i] - midX) : XS[i];
        const oj = j * nx + i;
        const b = Math.max(0, Math.min(nB - 1, Math.floor((vert ? x : qy) / bw)));
        let kk = Math.round((x * BC[b] + qy * BS[b]) / cell) + dk0 + b * stepC;
        KK[oj] = ((kk % ringN) + ringN) % ringN;
        GG[oj] = gfold(Math.round((-x * BS[b] + qy * BC[b]) / cell) + dg0 + BD[b]);
      }
    }
  } else if (readout === 'orbit'){
    // ray, axes swapped — computed in the field loop, which owns the
    // ray geometry; this branch only rolls the offsets (see notes)
    ORBIT = true;
    oDk = Math.round(rrange(r, -0.3, 0.3) * ringN);
    oDg = Math.round(rrange(r, -0.3, 0.3) * gNeed);
    oStep = Math.round(ringN * 0.6180339887);
  }
  // Ring position = where the RAY from the text centre through (x, y)
  // leaves the text rectangle. Constant-position curves are straight rays,
  // so the automaton's structures stay put and grow radially away from the
  // words. The old sArc measured arc length along each L∞ ring; its d-terms
  // (2·d on the sides, 4·d at the bottom) slid the readout 2–4 cells around
  // the ring every generation — a fixed square-swirl rail that every seed,
  // rule and density was forced to wrap along. Rays kill the rail; texture
  // magnifies projectively with distance from the text instead.
  //
  // The loop below inlines footArc with its halves cached: sx/tx are pure
  // functions of the column, sy/ty of the row, so the two divisions run
  // once per column/row instead of once per node. Same expressions, same
  // operands, same order — bit-identical to the per-node function call.
  const FSX = new Float64Array(nx), FTX = new Float64Array(nx);
  for (let i = 0; i < nx; i++){
    const sx = XS[i] - midX;
    FSX[i] = sx;
    FTX[i] = hw / (Math.abs(sx) || 1e-9);
  }
  const FSY = new Float64Array(ny), FTY = new Float64Array(ny);
  for (let j = 0; j < ny; j++){
    const sy = YS[j] - midY;
    FSY[j] = sy;
    FTY[j] = hh / (Math.abs(sy) || 1e-9);
  }
  // same caching for the generation-distance halves of the readout
  const DXX = new Float64Array(nx), DYY = new Float64Array(ny);
  for (let i = 0; i < nx; i++){ const x = XS[i]; DXX[i] = Math.max(inner.x0 - x, 0, x - inner.x1); }
  for (let j = 0; j < ny; j++){ const y = YS[j]; DYY[j] = Math.max(inner.y0 - y, 0, y - inner.y1); }
  // folded arc position — folds sit on fixed rays, not ring diagonals;
  // the noise readout warps the arc BEFORE the fold, so mirror pairs
  // (odd warp) fold to the same cell. All constants, hoisted out of the
  // loop the closures used to live in.
  const cArc = hw + hh + 1e-9;                     // quarter-arc of the TEXT ring (constant)
  const perArc = sym === 'both' ? 2 * cArc : 4 * cArc; // texture repeat around the ring
  const spanArc = sym === 'both' ? cArc : sym === 'none' ? 4 * cArc : 2 * cArc;
  const symH = sym === 'h';
  const hh2 = 2 * (hw + hh);
  // separable [1 2 1] blur: binary states become engraved lines. Zero passes
  // keeps the raw geometric contour — the character of the original CA lace.
  // (Hoisted above the loop: constant per call, and the loop below fuses
  // the window pass in when no blur follows.)
  const blurPasses = [0, 0, 1, 2][organic];
  // the automaton as one flat byte grid — hot per-node reads become one
  // typed-array index instead of a double array lookup
  const GEN = new Uint8Array(gNeed * ringN);
  for (let g = 0; g < gNeed; g++){
    const S = gens[g];
    for (let q = 0; q < ringN; q++) GEN[g * ringN + q] = S[q];
  }
  // isolevel sits at +0.03, not 0: the blur's discrete arithmetic produces
  // exact zeros often, and a zero node puts crossings exactly ON the node —
  // several edges then share one chain key, spawning degenerate segments
  // and asymmetric pairing. Off the node, every crossing is its own point.
  const LEVEL = 0.03;
  const NNODE = nx * ny;
  let V = new Float64Array(NNODE);
  const G = new Float64Array(NNODE);
  // the studio pad's stylus stencil: o.ink (x, y) → ink density in [0,1],
  // sampled once onto the node grid. The gate multiplies the window, so
  // contours live only where you drew — the automaton supplies the lines,
  // the hand supplies the placement. Hooked HERE, not at the seed: every
  // readout only chooses which cells a stroke's interior reads, so no
  // readout can re-place or wipe the drawing. null = no gate, bit-for-bit
  // the site behaviour.
  let INKG = null;
  if (typeof o.ink === 'function'){
    INKG = new Float64Array(NNODE);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) INKG[j * nx + i] = o.ink(XS[i], YS[j]);
  }
  for (let j = 0; j < ny; j++){
    const sy = FSY[j], ty = FTY[j], dy = DYY[j];
    const gvRow = GV ? j * nx : 0, rowBase = j * nx, y = YS[j];
    for (let i = 0; i < nx; i++){
      const n = rowBase + i;
      let kk, gen;
      if (KK){
        // shards: the frame scan above already read the cylinder — no
        // ray foot, no distance, nothing that radiates enters here
        kk = KK[n]; gen = GG[n];
      } else {
        // footArc(XS[i], YS[j]) — ray's foot on the text rect
        const sx = FSX[i], tx = FTX[i];
        const t = Math.min(tx, ty);
        const fx = midX + t * sx, fy = midY + t * sy;
        let arc;
        if (ty <= tx)                                 // leaves through top/bottom edge
          arc = sy <= 0 ? fx - midX : hh2 - (fx - midX);
        else
          arc = sx > 0 ? hw + (fy - cy0) : -(hw + (fy - cy0));
        if (KOFF) arc += KOFF[gvRow + i];
        // foldAt: wrap into the ring period, mirror into the span. The
        // bare-mod fast paths are exact: for X in [per, 2·per) fmod(X, per)
        // is X−per (Sterbenz-exact subtract), for X in (−per, 0) fmod
        // returns X itself and the code adds per once — the identical add.
        // Only genuinely out-of-range excursions (the warp's) pay the mod.
        let m = symH ? arc - cArc : arc;
        if (m < 0){
          if (m > -perArc) m += perArc;
          else { m %= perArc; if (m < 0) m += perArc; }
        } else if (m >= perArc){
          if (m < 2 * perArc) m -= perArc;
          else m %= perArc;
        }
        const foldV = m < spanArc ? m : 2 * spanArc - m;   // mirror fold ('none' = plain arc)
        // wrap, not clamp: the row is a palindrome (row[i] = row[n−1−i]),
        // so cell 0 ≡ cell ringN−1 and the mod never changes a value the
        // old clamp read — it just survives the warp's excursions. The
        // round() result is a small integer: int32 arithmetic is exact
        // where the double fmods were exact, so the wrap is bit-identical.
        kk = Math.round(foldV / cell) | 0;
        kk = ((kk % ringN) + ringN) % ringN;
        const dg = Math.max(DXX[i], dy) / cell;
        // radial warp clamps at 0: the innermost lace stays youngest at
        // the hole (the ornament still grows from the words, just unevenly).
        // Math.round yields a small integer, so the depth fold runs in
        // int32 — identical to fold() on integral doubles (fmod of two
        // integers is the integer remainder).
        const genRaw = (GV ? Math.max(0, Math.round(dg + GV[gvRow + i])) : Math.round(dg)) | 0;
        if (foldInf) gen = genRaw;
        else {
          const m2 = genRaw % depth2;
          gen = m2 < depth ? m2 : depth2 - m2;
        }
        if (ORBIT){
          // swap the axes: ring position grows with distance from the
          // words, the generation marches around them. The arc enters
          // through foldV (the palindrome fold) — the bare arc is ODD
          // under mirrors and would break sym; and the ring window is
          // only as wide as the distance range, so each foldV sector
          // steps it around the row by the golden cut or a dense row
          // reads one all-alive stretch flat
          kk = ((Math.round(dg / cell) + oDk + Math.floor(foldV / (cell * 24)) * oStep) % ringN + ringN) % ringN;
          gen = gfold(Math.round(foldV / cell) + oDg);
        }
      }
      const val = GEN[Math.min(gen, gNeed - 1) * ringN + kk] - 0.5;
      V[n] = val;
      // window: force the field below the isolevel near every boundary, so
      // all contours close inside the strip with a clean standoff — nothing
      // touches the text, nothing touches the frame, no dangling ends, ever.
      // Spacing is NOT done here (see padding above); this only seals the
      // edges. Fused into the node pass when no blur follows (the common
      // raw/crisp styles); the blurred styles window separately below.
      if (!blurPasses){
        const x = XS[i], dx = DXX[i];
        // dIn: only the four corner regions of the box have both offsets
        // nonzero; everywhere else one is 0 and hypot(x, 0) = |x| exactly,
        // so the hypot (measurably the slow call here) is skipped for most
        // nodes with bit-identical results
        const dI = dx === 0 || dy === 0 ? dx + dy : Math.hypot(dx, dy);
        const tA = Math.min(x - gx0, y - gy0, gx1 - x, gy1 - y) / margin;
        const sA = tA >= 1 ? 1 : tA * tA * (3 - 2 * tA);
        const tB = dI / margin;
        const sB = tB >= 1 ? 1 : tB * tB * (3 - 2 * tB);
        const win = Math.min(sA, sB) * (INKG ? INKG[n] : 1);
        G[n] = (win >= 1 ? val : val - (1 - win) * 0.9) - LEVEL;
      }
    }
  }
  for (let pass = 0; pass < blurPasses; pass++){
    const H = new Float64Array(NNODE);
    for (let j = 0; j < ny; j++){
      const rb = j * nx;
      for (let i = 0; i < nx; i++){
        const im = Math.max(0, i - 1), ip = Math.min(nx - 1, i + 1);
        H[rb + i] = (V[rb + im] + 2 * V[rb + i] + V[rb + ip]) / 4;
      }
    }
    const N = new Float64Array(NNODE);
    for (let j = 0; j < ny; j++){
      const rb = j * nx, rm = Math.max(0, j - 1) * nx, rp = Math.min(ny - 1, j + 1) * nx;
      for (let i = 0; i < nx; i++)
        N[rb + i] = (H[rm + i] + 2 * H[rb + i] + H[rp + i]) / 4;
    }
    V = N;
  }
  if (blurPasses){
    for (let j = 0; j < ny; j++){
      const rb = j * nx, y = YS[j], dy = DYY[j];
      for (let i = 0; i < nx; i++){
        const x = XS[i], dx = DXX[i];
        const dI = dx === 0 || dy === 0 ? dx + dy : Math.hypot(dx, dy);
        const tA = Math.min(x - gx0, y - gy0, gx1 - x, gy1 - y) / margin;
        const sA = tA >= 1 ? 1 : tA * tA * (3 - 2 * tA);
        const tB = dI / margin;
        const sB = tB >= 1 ? 1 : tB * tB * (3 - 2 * tB);
        const win = Math.min(sA, sB) * (INKG ? INKG[rb + i] : 1);
        const v = V[rb + i];
        G[rb + i] = (win >= 1 ? v : v - (1 - win) * 0.9) - LEVEL;
      }
    }
  }

  // canonical edge crossings: each grid edge's crossing is computed exactly
  // once (mirrored cells then share the literal same point — no float-order
  // drift, no chain-pairing divergence between the two sides of the frame)
  const hE = [], vE = [];
  for (let j = 0; j < ny; j++){ hE.push(new Array(nx).fill(null)); if (j < ny - 1) vE.push(new Array(nx).fill(null)); }
  for (let j = 0; j < ny; j++){
    const Gj = j * nx, yj = YS[j], hEj = hE[j], vEj = j < ny - 1 ? vE[j] : null, yj1 = j < ny - 1 ? YS[j + 1] : 0, Gj1 = Gj + nx;
    for (let i = 0; i < nx; i++){
      const a = G[Gj + i];
      if (i < nx - 1){
        const b = G[Gj + i + 1];
        if ((a > 0) !== (b > 0)){ const t = a / (a - b); hEj[i] = [XS[i] + (XS[i + 1] - XS[i]) * t, yj]; }
      }
      if (vEj){
        const d = G[Gj1 + i];
        if ((a > 0) !== (d > 0)){ const t = a / (a - d); vEj[i] = [XS[i], yj + (yj1 - yj) * t]; }
      }
    }
  }
  // marching squares at 0; saddles by centre value
  const segs = [];
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++){
      const rb = j * nx, rb1 = rb + nx;
      const a = G[rb + i], b = G[rb + i + 1], c = G[rb1 + i + 1], d = G[rb1 + i];
      const idx = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = hE[j][i], R = vE[j][i + 1], B = hE[j + 1][i], L = vE[j][i];
      const cv = (a + b + c + d) / 4;
      let pr;
      switch (idx){
        case 1: case 14: pr = [[L, T]]; break;
        case 2: case 13: pr = [[T, R]]; break;
        case 3: case 12: pr = [[L, R]]; break;
        case 4: case 11: pr = [[R, B]]; break;
        case 6: case 9:  pr = [[T, B]]; break;
        case 7: case 8:  pr = [[L, B]]; break;
        case 5:  pr = cv > 0 ? [[L, T], [R, B]] : [[T, R], [L, B]]; break;
        case 10: pr = cv > 0 ? [[T, R], [L, B]] : [[L, T], [R, B]]; break;
      }
      for (const [e1, e2] of pr) segs.push([e1, e2]);
    }

  // craft: drop lint, cap the count, weight by scale — all by THRESHOLDS
  // (never by rank: mirror twins have equal length and must share a tier)
  let lines = chainSegs(segs, w);
  // internal quality gates: drop sub-cellular lint (minlen × cell), cap the
  // count when asked (0 / null = unlimited). Lengths are quantised BEFORE
  // any comparison: mirror twins are equal only to float precision, and a
  // 1e-12 straddle across a threshold would drop one twin and keep the
  // other — an instant one-sided loop on one side of the frame.
  const qlen = L => Math.round((() => { let s = 0; for (let i = 1; i < L.pts.length; i++) s += Math.hypot(L.pts[i][0] - L.pts[i-1][0], L.pts[i][1] - L.pts[i-1][1]); return s; })() * 8) / 8;
  const minLenPx = cell * (o.minlen != null ? o.minlen : 2.2);
  lines = lines.filter(L => qlen(L) > minLenPx && L.pts.length > 3);
  if (!lines.length) return { paths, meta: `rule ${rule} · seed ${proc} · read ${readout} · phase ${p.toFixed(2)} · resting at this depth` };
  const lens = lines.map(qlen);
  const sorted = [...lens].sort((a, b) => b - a);
  // twin-safe ceiling: admit whole groups of equal length (mirror twins
  // share a length), stop before a group would overflow the budget;
  // maxlines 0 or null keeps every contour
  const capN = o.maxlines != null ? o.maxlines : 40;
  let keep = sorted.length;
  if (capN > 0){
    keep = 0;
    for (let i = 0; i < sorted.length; ){
      let j = i;
      while (j < sorted.length && Math.abs(sorted[j] - sorted[i]) < 1e-9) j++;
      if (keep > 0 && keep + (j - i) > capN) break;
      keep += j - i;
      i = j;
    }
  }
  const capLen = keep > 0 ? sorted[keep - 1] - 1e-9 : -1;
  const medLen = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.62))] || 0;
  // stroke: absolute px when given (site SETTINGS), else the scale-derived
  // default × optional multiplier; hair = the short-line tier ratio
  const body = o.weight != null
    ? Math.max(0.2, +o.weight)
    : Math.max(0.7, Math.min(1.5, strip * 0.05)) * (o.bodyW != null ? o.bodyW : 1);
  const hair = o.hair != null ? Math.max(0.2, Math.min(1, o.hair)) : 0.55;
  const per = organic === 0
    ? 0                                                     // raw: straight segments, sharp corners
    : Math.max(2, Math.round(o.smooth != null ? o.smooth : (cell < 5 ? 4 : 3)));
  lines.forEach((L, i) => {
    if (lens[i] < capLen - 1e-9) return;
    const sw = lens[i] >= medLen ? body : body * hair;   // figure / ground
    const pts = ox || oy ? L.pts.map(p => [p[0] + ox, p[1] + oy]) : L.pts;   // undo the padding shift
    paths.push({ d: per === 0 ? dPts(pts, L.closed) : dPts(crSample(pts, L.closed, 0.8, per), L.closed), sw });
  });
  return { paths, meta: `rule ${rule} · seed ${proc} · read ${readout} · phase ${p.toFixed(2)} · ${paths.length} lines · strip ${strip.toFixed(0)}px · cell ${cell.toFixed(1)}${padTag}` };
}


const makeOrnament = (species, w, h, seed, opts) => genCA(w, h, seed >>> 0, opts);

(function (root, factory) {
  const api = { make: makeOrnament, genCA, fnv1a, mulberry32 };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.Ornament = api;
})(typeof window !== "undefined" ? window : globalThis);

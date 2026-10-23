/*
  Ornament runtime for the site — the CA frame generator.
  Extracted from ornament.html (studio GEN block, infra + species A only).
  Keep in sync with the studio when genCA changes there.
  Contract: Ornament.make(width, height, seed, opts) -> { paths: [{d, sw}], meta }
  opts: { variant: frame|bands, z, inner: {x0,y0,x1,y1}, rule, dens, rate,
          standoff, padInner, padOuter, detail, smooth, organic, bodyW,
          minlen, maxlines, readout (ray|noise) }
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
      let cands = (map.get(k) || []).filter(c => !used[c.i]);
      if (!cands.length) break;
      if (cands.length > 1)
        cands.sort((A, B) => {
          const a = farKey(A), b = farKey(B);
          return a[0] - b[0] || a[1] - b[1];
        });
      const c = cands[0];
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
  const nx = Math.floor(w / cell) + 2, ny = Math.floor(h / cell) + 2;
  const gx = i => Math.min(w, i * (w / (nx - 1))), gy = j => Math.min(h, j * (h / (ny - 1)));

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
  // o.seedProc; null rolls one per genome.
  const cycPx = ringN * cell;                    // ring circumference in px
  const wl = (a, b) => cycPx / rrange(r, a, b);  // wavelength px → cycles
  const PROCS = ['harm', 'fm', 'square', 'chirp', 'noise', 'walk', 'pulse'];
  const proc = PROCS.includes(o.seedProc) ? o.seedProc : pick(r, PROCS);
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
  if (proc === 'noise'){
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
  const fold = g => { const m = g % (2 * depth); return m < depth ? m : 2 * depth - m; };
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
  const READOUTS = ['ray', 'noise'];
  const readout = READOUTS.includes(o.readout) ? o.readout : pick(r, READOUTS);
  let kOff = null, gOff = null;
  if (readout === 'noise'){
    const mkField = (seed, octdef, S) => {
      const octs = octdef.map(([lo, hi, sh]) => {
        const wl = rrange(r, lo, hi);
        return { wl, m: Math.max(3, Math.round(wl)), k: sh * rrange(r, 0.6, 1.4) };
      });
      const ksum = octs.reduce((s, t) => s + t.k, 0);
      for (const t of octs) t.a = t.wl * t.k * (S / ksum);
      return (x, y) => {
        let v = 0;
        for (const t of octs){
          const fx = x / t.wl, fy = y / t.wl;
          const xi = Math.floor(fx), yi = Math.floor(fy);
          const tx = sstep01(fx - xi), ty = sstep01(fy - yi);
          const g = (a, b) => ihash(seed + a * 7349 + t.m, seed + b * 2657 - t.m);
          const v00 = g(xi, yi), v10 = g(xi + 1, yi), v01 = g(xi, yi + 1), v11 = g(xi + 1, yi + 1);
          v += t.a * (2 * ((v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty) - 1);
        }
        return v;
      };
    };
    const kbase = mkField((r() * 1e9) | 0, [[500, 900, 1], [120, 300, 0.55], [26, 80, 0.3]], rrange(r, 0.3, 0.75));
    const gbase = mkField((r() * 1e9) | 0, [[260, 700, 1], [80, 220, 0.5], [26, 70, 0.25]], rrange(r, 0.06, 0.22));
    const mx2 = 2 * midX, my2 = 2 * midY;
    kOff = sym === 'v'    ? (x, y) => kbase(x, y) - kbase(mx2 - x, y)
         : sym === 'h'    ? (x, y) => kbase(x, y) - kbase(x, my2 - y)
         : sym === 'both' ? (x, y) => kbase(x, y) - kbase(mx2 - x, y) - kbase(x, my2 - y) + kbase(mx2 - x, my2 - y)
         : kbase;
    gOff = sym === 'v'    ? (x, y) => 0.5 * (gbase(x, y) + gbase(mx2 - x, y))
         : sym === 'h'    ? (x, y) => 0.5 * (gbase(x, y) + gbase(x, my2 - y))
         : sym === 'both' ? (x, y) => 0.25 * (gbase(x, y) + gbase(mx2 - x, y) + gbase(x, my2 - y) + gbase(mx2 - x, my2 - y))
         : gbase;
  }
  // Ring position = where the RAY from the text centre through (x, y)
  // leaves the text rectangle. Constant-position curves are straight rays,
  // so the automaton's structures stay put and grow radially away from the
  // words. The old sArc measured arc length along each L∞ ring; its d-terms
  // (2·d on the sides, 4·d at the bottom) slid the readout 2–4 cells around
  // the ring every generation — a fixed square-swirl rail that every seed,
  // rule and density was forced to wrap along. Rays kill the rail; texture
  // magnifies projectively with distance from the text instead.
  const footArc = (x, y) => {
    const sx = x - midX, sy = y - midY;
    const tx = hw / (Math.abs(sx) || 1e-9), ty = hh / (Math.abs(sy) || 1e-9);
    const t = Math.min(tx, ty);
    const fx = midX + t * sx, fy = midY + t * sy;   // ray's foot on the text rect
    if (ty <= tx)                                   // leaves through top/bottom edge
      return sy <= 0 ? fx - midX : 2 * (hw + hh) - (fx - midX);
    return sx > 0 ? hw + (fy - cy0) : -(hw + (fy - cy0));
  };
  // folded arc position — folds sit on fixed rays, not ring diagonals;
  // the noise readout warps the arc BEFORE the fold, so mirror pairs
  // (odd warp) fold to the same cell
  const ringAt = kOff ? (x, y) => footArc(x, y) + kOff(x, y) : footArc;
  const foldAt = (x, y) => {
    const c = hw + hh + 1e-9;                       // quarter-arc of the TEXT ring (constant)
    const per = sym === 'both' ? 2 * c : 4 * c;     // texture repeat around the ring
    const span = sym === 'both' ? c : sym === 'none' ? 4 * c : 2 * c;
    let m = (sym === 'h' ? ringAt(x, y) - c : ringAt(x, y)) % per;
    if (m < 0) m += per;
    return m < span ? m : 2 * span - m;             // mirror fold ('none' = plain arc)
  };
  let V = [];
  for (let j = 0; j < ny; j++){
    const y = gy(j);
    const row = new Array(nx);
    for (let i = 0; i < nx; i++){
      const x = gx(i);
      // wrap, not clamp: the row is a palindrome (row[i] = row[n−1−i]),
      // so cell 0 ≡ cell ringN−1 and the mod never changes a value the
      // old clamp read — it just survives the warp's excursions
      const kk = ((Math.round(foldAt(x, y) / cell) % ringN) + ringN) % ringN;
      const dx = Math.max(inner.x0 - x, 0, x - inner.x1);
      const dy = Math.max(inner.y0 - y, 0, y - inner.y1);
      const dg = Math.max(dx, dy) / cell;
      // radial warp clamps at 0: the innermost lace stays youngest at
      // the hole (the ornament still grows from the words, just unevenly)
      const gen = fold(gOff ? Math.max(0, Math.round(dg + gOff(x, y))) : Math.round(dg));
      row[i] = gens[Math.min(gen, gNeed - 1)][((kk % ringN) + ringN) % ringN] - 0.5;
    }
    V.push(row);
  }
  // separable [1 2 1] blur: binary states become engraved lines. Zero passes
  // keeps the raw geometric contour — the character of the original CA lace.
  const blurPasses = [0, 0, 1, 2][organic];
  for (let pass = 0; pass < blurPasses; pass++){
    const H = V.map(row => row.map((v, i) => (row[Math.max(0, i - 1)] + 2 * v + row[Math.min(nx - 1, i + 1)]) / 4));
    V = [];
    for (let j = 0; j < ny; j++){
      const a = H[Math.max(0, j - 1)], b = H[j], c = H[Math.min(ny - 1, j + 1)];
      V.push(b.map((v, i) => (a[i] + 2 * v + c[i]) / 4));
    }
  }


  // window: force the field below the isolevel near every boundary, so all
  // contours close inside the strip with a clean standoff — nothing touches
  // the text, nothing touches the frame, no dangling ends, ever. Spacing is
  // NOT done here (see padding above); this only seals the edges.
  const smoo = t => t >= 1 ? 1 : t * t * (3 - 2 * t);
  const dIn = (x, y) => {
    const dx = Math.max(inner.x0 - x, 0, x - inner.x1);
    const dy = Math.max(inner.y0 - y, 0, y - inner.y1);
    return Math.hypot(dx, dy);
  };
  const G = [];
  // isolevel sits at +0.03, not 0: the blur's discrete arithmetic produces
  // exact zeros often, and a zero node puts crossings exactly ON the node —
  // several edges then share one chain key, spawning degenerate segments
  // and asymmetric pairing. Off the node, every crossing is its own point.
  const LEVEL = 0.03;
  for (let j = 0; j < ny; j++){
    const row = [];
    for (let i = 0; i < nx; i++){
      const x = gx(i), y = gy(j);
      const win = Math.min(smoo(Math.min(x, y, w - x, h - y) / margin), smoo(dIn(x, y) / margin));
      row.push((win >= 1 ? V[j][i] : V[j][i] - (1 - win) * 0.9) - LEVEL);
    }
    G.push(row);
  }

  // canonical edge crossings: each grid edge's crossing is computed exactly
  // once (mirrored cells then share the literal same point — no float-order
  // drift, no chain-pairing divergence between the two sides of the frame)
  const hE = [], vE = [];
  for (let j = 0; j < ny; j++){ hE.push(new Array(nx).fill(null)); if (j < ny - 1) vE.push(new Array(nx).fill(null)); }
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++){
      const a = G[j][i];
      if (i < nx - 1){
        const b = G[j][i + 1];
        if ((a > 0) !== (b > 0)){ const t = a / (a - b); hE[j][i] = [gx(i) + (gx(i + 1) - gx(i)) * t, gy(j)]; }
      }
      if (j < ny - 1){
        const d = G[j + 1][i];
        if ((a > 0) !== (d > 0)){ const t = a / (a - d); vE[j][i] = [gx(i), gy(j) + (gy(j + 1) - gy(j)) * t]; }
      }
    }
  // marching squares at 0; saddles by centre value
  const segs = [];
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++){
      const a = G[j][i], b = G[j][i + 1], c = G[j + 1][i + 1], d = G[j + 1][i];
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

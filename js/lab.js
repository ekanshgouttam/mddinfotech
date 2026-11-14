// The lab: a bright room where each service is a live engineering diagram.
// Diagrams draw themselves in, then keep running. At the end the room breaks up
// into tiles and the machine room shows through.

const LAB = '#F1F3F6';
const INK = 'rgba(7, 8, 11, .82)';
const FAINT = 'rgba(7, 8, 11, .06)';
const BLUE = '#3D57A6';
const ORANGE = '#DF6826';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - (1 - t) ** 3;
// Element i of n draws in during its slice of the overall reveal.
const part = (r, i, n, span = 0.45) => ease(clamp((r - (i / n) * (1 - span)) / span));

function rand(seed) { // small deterministic generator: diagrams look the same every visit
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Partial-stroke primitives: r is how much of the line is drawn (0–1).
function seg(x, x1, y1, x2, y2, r) {
  if (r <= 0) return;
  x.beginPath(); x.moveTo(x1, y1); x.lineTo(x1 + (x2 - x1) * r, y1 + (y2 - y1) * r); x.stroke();
}
function poly(x, pts, r) {
  if (r <= 0 || pts.length < 2) return;
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let left = total * r;
  x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay), k = Math.min(1, left / len);
    x.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k);
    left -= len;
  }
  x.stroke();
}
const box = (x, l, t, w, h, r) => poly(x, [[l, t], [l + w, t], [l + w, t + h], [l, t + h], [l, t]], r);
function ring(x, cx, cy, rx, ry, rot, r) {
  if (r <= 0) return;
  x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * r); x.stroke();
}
function dot(x, cx, cy, rad, fill) { x.fillStyle = fill; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill(); }
function label(x, text, lx, ly, a = 1, align = 'left') {
  const g = x.globalAlpha;
  x.globalAlpha = g * a; x.fillStyle = INK; x.textAlign = align; x.fillText(text, lx, ly);
  x.globalAlpha = g;
}
// A point travelling along an orthogonal route (for packets).
function along(pts, k) {
  const lens = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(l); total += l; }
  let d = k * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) { const f = d / lens[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; }
    d -= lens[i];
  }
  return pts[pts.length - 1];
}

/* ---------- The six diagrams. Each gets (ctx, width, height, reveal, time, alive). ---------- */

// Websites: a page assembling itself, then being used.
function construct(x, w, h, r, t, live) {
  const blocks = [
    [.09, .21, .82, .05], [.09, .31, .44, .3], [.57, .31, .34, .3],
    [.09, .66, .26, .2], [.37, .66, .26, .2], [.65, .66, .26, .2],
  ];
  x.strokeStyle = INK;
  box(x, w * .04, h * .06, w * .92, h * .86, part(r, 0, 9));
  seg(x, w * .04, h * .15, w * .96, h * .15, part(r, 1, 9));
  for (let i = 0; i < 3; i++) if (part(r, 1, 9) > .5) dot(x, w * .07 + i * 13, h * .105, 3.5, INK);
  box(x, w * .2, h * .085, w * .46, h * .04, part(r, 2, 9));
  x.strokeStyle = BLUE;
  blocks.forEach(([l, tp, bw, bh], i) => box(x, w * l, h * tp, w * bw, h * bh, part(r, 3 + i, 9)));
  // copy lines and an image cross
  const k = part(r, 6, 9);
  [.37, .42, .47].forEach((y, i) => seg(x, w * .12, h * y, w * (.45 - i * .08), h * y, k));
  seg(x, w * .57, h * .31, w * .91, h * .61, k); seg(x, w * .91, h * .31, w * .57, h * .61, k);
  if (live <= 0) return;
  x.globalAlpha = live;
  // load line runs across the top bar
  x.strokeStyle = ORANGE; x.lineWidth = 2;
  const lp = (t * .32) % 1;
  seg(x, w * .04, h * .15, w * (.04 + .92 * ease(lp)), h * .15, 1);
  // focus moves block to block, the pointer follows and clicks
  const n = blocks.length, step = t / 1.6, i0 = Math.floor(step) % n, i1 = (i0 + 1) % n, f = ease(clamp((step % 1) * 1.6));
  const c = (b) => [w * (b[0] + b[2] / 2), h * (b[1] + b[3] / 2)];
  const [ax, ay] = c(blocks[i0]), [bx, by] = c(blocks[i1]);
  const b = blocks[i1];
  x.globalAlpha = live * f;
  box(x, w * b[0] - 4, h * b[1] - 4, w * b[2] + 8, h * b[3] + 8, 1);
  x.globalAlpha = live;
  const px = ax + (bx - ax) * f, py = ay + (by - ay) * f;
  dot(x, px, py, 5, ORANGE);
  if (f >= 1) { const rp = (step % 1) * 1.6 - 1; x.lineWidth = 1.25; x.globalAlpha = live * clamp(1 - rp * 1.6); ring(x, px, py, 6 + rp * 40, 6 + rp * 40, 0, 1); }
  x.globalAlpha = 1; x.lineWidth = 1.25;
}

// Software: a system of services passing data.
function system(x, w, h, r, t, live) {
  const N = {
    App: [.1, .24], Web: [.1, .7], API: [.42, .47], Auth: [.72, .16], Payments: [.72, .47], Data: [.72, .78], Admin: [.92, .62],
  };
  const E = [['App', 'API'], ['Web', 'API'], ['API', 'Auth'], ['API', 'Payments'], ['API', 'Data'], ['Payments', 'Data'], ['Data', 'Admin']];
  const nw = Math.min(w * .15, 128), nh = Math.min(h * .1, 46);
  const P = (k) => [w * N[k][0], h * N[k][1]];
  const route = ([a, b]) => {
    const [ax, ay] = P(a), [bx, by] = P(b);
    if (Math.abs(ax - bx) < 5) return [[ax, ay + nh / 2], [bx, by - nh / 2]];
    const mx = (ax + bx) / 2;
    return [[ax + nw / 2, ay], [mx, ay], [mx, by], [bx - nw / 2, by]];
  };
  x.strokeStyle = BLUE;
  E.forEach((e, i) => poly(x, route(e), part(r, 2 + i * .5, 7)));
  x.font = '500 12px Archivo, system-ui, sans-serif';
  Object.keys(N).forEach((k, i) => {
    const [cx, cy] = P(k), a = part(r, i * .6, 7);
    x.strokeStyle = INK;
    box(x, cx - nw / 2, cy - nh / 2, nw, nh, a);
    if (a > .6) label(x, k, cx, cy + 4, (a - .6) / .4, 'center');
  });
  if (live <= 0) return;
  x.globalAlpha = live;
  E.forEach((e, i) => {
    const pts = route(e);
    for (let j = 0; j < 2; j++) {
      const k = (t * (.28 + (i % 3) * .07) + i * .37 + j * .5) % 1;
      const [px, py] = along(pts, k);
      x.fillStyle = ORANGE; x.fillRect(px - 3.5, py - 3.5, 7, 7);
      if (k > .93) { // the receiving node lights up
        const [cx, cy] = P(e[1]);
        x.strokeStyle = ORANGE; x.globalAlpha = live * (1 - (k - .93) / .07);
        box(x, cx - nw / 2 - 3, cy - nh / 2 - 3, nw + 6, nh + 6, 1);
        x.globalAlpha = live;
      }
    }
  });
  x.globalAlpha = 1;
}

// Digital marketing: channels in orbit, people drawn in to the core.
function orbit(x, w, h, r, t, live) {
  const cx = w * .5, cy = h * .5, S = Math.min(w, h * 1.6) * .5, rot = -.22;
  const orbits = [[.34, 'Email', 5, .5], [.6, 'Content', 8, .32], [.9, 'Search', 12, .2]];
  x.strokeStyle = BLUE;
  orbits.forEach(([rad], i) => ring(x, cx, cy, S * rad, S * rad * .42, rot, part(r, i, 4)));
  if (part(r, 3, 4) > 0) dot(x, cx, cy, S * .07 * part(r, 3, 4), ORANGE);
  x.font = '500 12px Archivo, system-ui, sans-serif';
  const pos = (rad, a) => {
    const ex = Math.cos(a) * S * rad, ey = Math.sin(a) * S * rad * .42;
    return [cx + ex * Math.cos(rot) - ey * Math.sin(rot), cy + ex * Math.sin(rot) + ey * Math.cos(rot)];
  };
  orbits.forEach(([rad, name], i) => { const [lx, ly] = pos(rad, -.2); label(x, name, lx + 10, ly - 8, part(r, i, 4)); });
  if (live <= 0) return;
  x.globalAlpha = live;
  orbits.forEach(([rad, , n, sp], i) => {
    for (let j = 0; j < n; j++) { const [px, py] = pos(rad, t * sp + (j / n) * Math.PI * 2 + i); dot(x, px, py, 3, INK); }
  });
  // captures: every 0.9 s someone spirals in from an outer orbit
  for (let k = 0; k < 3; k++) {
    const age = ((t + k * .9) % 2.7) / 2.7, seed = Math.floor((t + k * .9) / 2.7) * 3 + k;
    const rad = orbits[1 + (seed % 2)][0] * (1 - ease(age)), a = seed * 2.1 + age * 5;
    const [px, py] = pos(Math.max(rad, .05), a);
    x.globalAlpha = live * (1 - age * .6);
    dot(x, px, py, 4.5, ORANGE);
  }
  x.globalAlpha = 1;
}

// Social media: one post spreading through a network.
const net = new Map();
function network(x, w, h, r, t, live) {
  const key = `${w | 0}x${h | 0}`;
  if (!net.has(key)) {
    const rnd = rand(7), pts = [];
    for (let tries = 0; pts.length < 46 && tries < 4000; tries++) {
      const p = [w * (.06 + rnd() * .88), h * (.08 + rnd() * .84)];
      if (pts.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > Math.min(w, h) * .08)) pts.push(p);
    }
    const adj = pts.map(() => new Set());
    pts.forEach((p, i) => {
      pts.map((q, j) => [j, Math.hypot(q[0] - p[0], q[1] - p[1])]).filter(([j]) => j !== i)
        .sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(([j]) => { adj[i].add(j); adj[j].add(i); });
    });
    net.set(key, { pts, adj: adj.map((s) => [...s]) });
  }
  const { pts, adj } = net.get(key);
  x.strokeStyle = BLUE;
  pts.forEach((p, i) => adj[i].forEach((j) => { if (j > i) seg(x, p[0], p[1], pts[j][0], pts[j][1], part(r, (i % 12) * .4, 6)); }));
  pts.forEach((p, i) => { const a = part(r, (i % 12) * .4, 6); if (a > 0) dot(x, p[0], p[1], 3 * a, INK); });
  if (live <= 0) return;
  // a wave from a new starting post every 3.2 s
  const cycle = Math.floor(t / 3.2), age = t % 3.2, seed = (cycle * 17) % pts.length;
  const dist = new Array(pts.length).fill(Infinity); dist[seed] = 0;
  const queue = [seed];
  while (queue.length) { const i = queue.shift(); adj[i].forEach((j) => { if (dist[j] === Infinity) { dist[j] = dist[i] + 1; queue.push(j); } }); }
  x.globalAlpha = live;
  x.strokeStyle = ORANGE; x.lineWidth = 2;
  pts.forEach((p, i) => adj[i].forEach((j) => {
    const a = age - dist[i] * .22;
    if (dist[j] === dist[i] + 1 && a > 0 && a < 1.2) seg(x, p[0], p[1], pts[j][0], pts[j][1], clamp(a / .22));
  }));
  pts.forEach((p, i) => {
    const a = age - dist[i] * .22;
    if (a > 0) { const k = Math.exp(-a * 1.6); dot(x, p[0], p[1], 3 + k * 5, ORANGE); }
  });
  x.globalAlpha = 1; x.lineWidth = 1.25;
}

// Performance marketing: two campaigns on a live chart, budget following the winner.
function telemetry(x, w, h, r, t, live) {
  const L = w * .08, R = w * .96, T = h * .08, B = h * .7;
  x.strokeStyle = INK;
  poly(x, [[L, T], [L, B], [R, B]], part(r, 0, 6));
  x.strokeStyle = FAINT;
  for (let i = 1; i < 5; i++) seg(x, L, T + (B - T) * i / 5, R, T + (B - T) * i / 5, part(r, 1, 6));
  x.font = '500 12px Archivo, system-ui, sans-serif';
  label(x, 'Return', L, T - 10, part(r, 1, 6));
  label(x, 'Weeks', R, B + 22, part(r, 1, 6), 'right');
  const curve = (fn, jitter) => {
    const pts = [];
    for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([L + (R - L) * u, T + (B - T) * (1 - fn(u) - Math.sin(u * 40 + t * jitter) * .012)]); }
    return pts;
  };
  const A = curve((u) => .32 + .06 * Math.sin(u * 5), 1.4);
  const Bc = curve((u) => .28 + .5 * ease(clamp((u - .25) / .7)), 1.8);
  x.lineWidth = 1.6;
  x.strokeStyle = BLUE; poly(x, A, part(r, 2, 6));
  x.strokeStyle = ORANGE; poly(x, Bc, part(r, 3, 6));
  x.lineWidth = 1.25;
  label(x, 'Campaign A', R - 4, A[60][1] + 18, part(r, 4, 6), 'right');
  label(x, 'Campaign B', R - 4, Bc[60][1] - 10, part(r, 4, 6), 'right');
  // budget split bars
  const k = part(r, 5, 6);
  const scan = live > 0 ? (t * .12) % 1 : 1;
  const share = .5 + .4 * ease(clamp((scan - .25) / .7));
  const by = h * .82, bw = R - L;
  x.fillStyle = BLUE; x.fillRect(L, by, bw * (1 - share) * k, 10);
  x.fillStyle = ORANGE; x.fillRect(L + bw * (1 - share) * k, by, bw * share * k, 10);
  label(x, 'Budget', L, by + 30, k);
  if (live <= 0) return;
  x.globalAlpha = live;
  const sx = L + (R - L) * scan, i = Math.round(scan * 60);
  x.strokeStyle = INK; seg(x, sx, T, sx, B, 1);
  dot(x, sx, A[i][1], 4, BLUE); dot(x, sx, Bc[i][1], 5, ORANGE);
  x.globalAlpha = 1;
}

// Creator growth: a post goes out, the audience answers and grows.
const crowd = new Map();
function broadcast(x, w, h, r, t, live) {
  const cx = w * .5, cy = h * .5, S = Math.min(w, h) * .5;
  const key = `${w | 0}x${h | 0}`;
  if (!crowd.has(key)) {
    const rnd = rand(11), pts = [];
    for (let i = 0; i < 160; i++) { const a = rnd() * Math.PI * 2, d = .42 + rnd() * .55; pts.push([cx + Math.cos(a) * S * d * 1.5, cy + Math.sin(a) * S * d, d]); }
    crowd.set(key, pts);
  }
  const pts = crowd.get(key);
  const pw = S * .62, ph = S * .3;
  x.strokeStyle = INK;
  box(x, cx - pw / 2, cy - ph / 2, pw, ph, part(r, 0, 4));
  seg(x, cx - pw / 2, cy + ph / 2 - 10, cx + pw / 2, cy + ph / 2 - 10, part(r, 1, 4));
  const bars = 26, a = part(r, 1, 4);
  x.fillStyle = ORANGE;
  for (let i = 0; i < bars; i++) {
    const v = live > 0 ? Math.abs(Math.sin(i * .7 + t * 3.1) * Math.sin(i * .23 + t * 1.3)) : .3;
    const bh = (ph * .55) * (.15 + .85 * v) * a;
    x.fillRect(cx - pw / 2 + 12 + i * ((pw - 24) / bars), cy - bh / 2 - 4, (pw - 24) / bars - 3, bh);
  }
  // audience grows over time
  const shown = Math.floor(50 + (live > 0 ? ((t * 6) % 110) : 0));
  const rev = part(r, 2, 4);
  const rings = [];
  if (live > 0) for (let k = 0; k < 3; k++) rings.push(((t + k * .8) % 2.4) / 2.4);
  x.strokeStyle = BLUE;
  rings.forEach((k) => { x.globalAlpha = live * (1 - k); ring(x, cx, cy, (pw / 2) + k * S * 1.3, (ph / 2) + k * S * .9, 0, 1); });
  x.globalAlpha = 1;
  pts.slice(0, shown).forEach(([px, py, d], i) => {
    if (i / pts.length > rev) return;
    let hit = 0;
    rings.forEach((k) => { hit = Math.max(hit, Math.exp(-(((d - .35) / 1.1 - k) ** 2) * 220) * (1 - k)); });
    dot(x, px, py, 2.5 + hit * 2.5, hit > .3 ? ORANGE : INK);
  });
}

const DIAGRAMS = [construct, system, orbit, network, telemetry, broadcast];

export class Lab {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = canvas.getContext('2d');
    this.tiles = null;
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, d = Math.min(devicePixelRatio || 1, 2);
    this.w = w; this.h = h; this.dpr = d;
    this.canvas.width = Math.round(w * d); this.canvas.height = Math.round(h * d);
    // tile grid for the break-up; each tile gets its own moment
    const size = w < 700 ? 44 : 64, rnd = rand(3);
    const cols = Math.ceil(w / size), rows = Math.ceil(h / size);
    this.tiles = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      this.tiles.push([i * size, j * size, size, (i / cols) * .55 + (1 - j / rows) * .25 + rnd() * .2]);
    }
  }

  // index: active diagram. since: seconds since it became active. area: {x,y,w,h} for the diagram.
  // breakup: 0 = solid room, 1 = gone. time: seconds.
  draw({ index, since, area, breakup, time }) {
    const x = this.x;
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    x.clearRect(0, 0, this.w, this.h);
    x.fillStyle = LAB;
    if (breakup <= 0) x.fillRect(0, 0, this.w, this.h);
    else {
      for (const [l, t, s, delay] of this.tiles) {
        const k = 1 - ease(clamp((breakup - delay * .75) / .25));
        if (k <= 0) continue;
        const g = s * k;
        x.fillRect(l + (s - g) / 2, t + (s - g) / 2, g, g);
      }
    }
    const fade = clamp(1 - breakup * 5);
    if (fade <= 0 || index < 0) return;
    // the lab's drawing paper
    x.globalAlpha = fade;
    x.strokeStyle = FAINT; x.lineWidth = 1;
    x.beginPath();
    for (let gx = 0; gx < this.w; gx += 48) { x.moveTo(gx + .5, 0); x.lineTo(gx + .5, this.h); }
    for (let gy = 0; gy < this.h; gy += 48) { x.moveTo(0, gy + .5); x.lineTo(this.w, gy + .5); }
    x.stroke();
    // the diagram
    const reveal = clamp(since / 1.6), live = clamp((since - 1.2) / .6) * fade;
    x.save();
    x.translate(area.x, area.y);
    x.lineWidth = 1.25; x.lineCap = 'round'; x.lineJoin = 'round';
    x.globalAlpha = fade;
    DIAGRAMS[index](x, area.w, area.h, reveal, time, live);
    x.restore();
    x.globalAlpha = 1;
  }
}

// The machine room: a full-screen 2D canvas behind the dark sections. It draws a blueprint grid,
// the growth engine (the logo's orange disc as its core) and the project models, all as
// precise line drawings in the same language as the services lab.

const BG = [7, 11, 20];          // #070B14
const LAB = [241, 243, 246];     // #F1F3F6, the lab
const LINE = '205, 216, 240';    // pale line colour (rgb, alpha added per use)
const BLUE = '123, 147, 255';    // logo blue, lifted for dark
const ORANGE = '223, 104, 38';   // logo orange

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - (1 - t) ** 3;
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgba = (rgb, a) => `rgba(${rgb}, ${a})`;
function rand(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/* ---------- 3D helpers (model space: y up, unit size) ---------- */
const rotY = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const rotX = ([x, y, z], a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const CAM = 3.6;
const project = ([x, y, z], cx, cy, R) => { const k = CAM / (CAM - z); return [cx + x * R * k, cy - y * R * k, z]; };

const ring3 = (r, y, n = 48) => { // a horizontal circle as segments
  const s = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, b = ((i + 1) / n) * TAU;
    s.push([[Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(b) * r, y, Math.sin(b) * r]]);
  }
  return s;
};
const box = (cx, cy, cz, w, h, d) => {
  const X = [cx - w / 2, cx + w / 2], Y = [cy - h / 2, cy + h / 2], Z = [cz - d / 2, cz + d / 2], s = [];
  for (const y of Y) for (const z of Z) s.push([[X[0], y, z], [X[1], y, z]]);
  for (const x of X) for (const z of Z) s.push([[x, Y[0], z], [x, Y[1], z]]);
  for (const x of X) for (const y of Y) s.push([[x, y, Z[0]], [x, y, Z[1]]]);
  return s;
};
const line = (a, b) => [[a, b]];
const poly = (pts) => pts.slice(1).map((p, i) => [pts[i], p]);

/* ---------- The four project models ---------- */

// Saffron & Salt: a serving bowl, heaped, with steam.
function bowl() {
  const prof = [[1, .32], [.97, .22], [.9, .04], [.77, -.16], [.6, -.33], [.47, -.44], [.46, -.52], [.52, -.58]];
  const s = [];
  for (let m = 0; m < 24; m++) {
    const a = (m / 24) * TAU;
    s.push(...poly(prof.map(([r, y]) => [Math.cos(a) * r, y, Math.sin(a) * r])));
  }
  for (const i of [0, 2, 4, 6, 7]) s.push(...ring3(prof[i][0], prof[i][1]));
  const dome = [[.95, .32], [.8, .44], [.55, .54], [.25, .6], [0, .62]];
  for (let m = 0; m < 24; m += 3) {
    const a = (m / 24) * TAU;
    s.push(...poly(dome.map(([r, y]) => [Math.cos(a) * r, y, Math.sin(a) * r])));
  }
  s.push(...ring3(.55, .54, 36), ...ring3(.8, .44, 40));
  return s;
}
const bowlLive = (t) => { // steam rising off the rice
  const s = [];
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let j = 0; j <= 12; j++) pts.push([(k - 1) * .28 + .07 * Math.sin(j * .8 + t * 2.2 + k * 2), .66 + j * .065, (k - 1) * .1]);
    s.push(...poly(pts).map((sg, j) => [...sg, 1 - j / 12]));
  }
  return s;
};

// Kavya Rao: a camera.
function camera() {
  const s = [...box(0, 0, 0, 1.5, .9, .7), ...box(-.32, .56, 0, .44, .22, .44), ...box(.5, .5, 0, .24, .1, .3)];
  const zs = [.35, .52, .72, .92], rs = [.36, .38, .34, .3];
  zs.forEach((z, i) => {
    const r = rs[i];
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * TAU, b = ((k + 1) / 32) * TAU;
      s.push([[Math.cos(a) * r, Math.sin(a) * r, z], [Math.cos(b) * r, Math.sin(b) * r, z]]);
    }
  });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    s.push(...poly(zs.map((z, i) => [Math.cos(a) * rs[i], Math.sin(a) * rs[i], z])));
  }
  for (let k = 0; k < 24; k++) { // front glass
    const a = (k / 24) * TAU, b = ((k + 1) / 24) * TAU;
    s.push([[Math.cos(a) * .19, Math.sin(a) * .19, .92], [Math.cos(b) * .19, Math.sin(b) * .19, .92]]);
  }
  return s;
}
const cameraLive = (t) => (Math.sin(t * 4) > 0 ? [[[.6, .3, .36], [.6, .3, .36], 1, 'rec']] : []); // record light

// Northfold: a lounge chair.
function chair() {
  const s = [];
  for (const x of [-.7, .7]) {
    s.push(...line([x, -.95, .55], [x, -.08, .55]));          // front post
    s.push(...line([x, -.95, -.45], [x, .78, -.78]));         // back post, leaning back
    s.push(...line([x, -.08, .62], [x, -.08, -.52]));         // armrest
    s.push(...line([x, -.32, .55], [x, -.32, -.47]));         // seat rail
    s.push(...line([x, -.75, .55], [x, -.75, -.45]));         // stretcher
  }
  s.push(...line([-.7, -.32, .55], [.7, -.32, .55]), ...line([-.7, -.32, -.47], [.7, -.32, -.47]));
  const sag = (u) => -.32 - .13 * Math.sin(Math.PI * u);
  for (let j = 0; j <= 5; j++) { // the slung seat
    const u = j / 5, z = .55 - u * 1.02;
    s.push(...line([-.7, sag(u), z], [.7, sag(u), z]));
  }
  for (let i = 1; i < 6; i++) {
    const x = -.7 + i * .28, pts = [];
    for (let j = 0; j <= 5; j++) pts.push([x, sag(j / 5), .55 - (j / 5) * 1.02]);
    s.push(...poly(pts));
  }
  for (let j = 0; j <= 4; j++) { // back canvas
    const y = .02 + j * .17, z = -.5 - j * .065;
    s.push(...line([-.7, y, z], [.7, y, z]));
  }
  return s;
}

// Ledgerly: a laptop with a live chart.
const LAP = { w: 1.7, d: 1.15, y: -.46, tilt: .26, h: 1.05 };
function laptop() {
  const { w, d, y, tilt, h } = LAP, s = [...box(0, y - .04, 0, w, .08, d)];
  for (let r = 0; r <= 4; r++) s.push(...line([-.7, y, -.45 + r * .12], [.7, y, -.45 + r * .12]));
  for (let c = 0; c <= 10; c++) s.push(...line([-.7 + c * .14, y, -.45], [-.7 + c * .14, y, .03]));
  s.push(...poly([[-.3, y, .15], [.3, y, .15], [.3, y, .45], [-.3, y, .45], [-.3, y, .15]]));
  const top = (u, v) => [-w / 2 + u * w, y + v * h * Math.cos(tilt), -d / 2 - v * h * Math.sin(tilt)];
  s.push(...poly([top(0, 0), top(1, 0), top(1, 1), top(0, 1), top(0, 0)]));
  s.push(...poly([top(.04, .06), top(.96, .06), top(.96, .94), top(.04, .94), top(.04, .06)]));
  return s;
}
const laptopLive = (t) => {
  const { w, d, y, tilt, h } = LAP;
  const top = (u, v) => [-w / 2 + u * w, y + v * h * Math.cos(tilt), -d / 2 - v * h * Math.sin(tilt) + .01];
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    pts.push(top(.1 + u * .8, .18 + .6 * (u * u * .8 + .1 * Math.sin(u * 9 + t * 2) * (1 - u) + .1 * u)));
  }
  return poly(pts).map((sg) => [...sg, 1, 'chart']);
};

const MODELS = [
  { build: bowl, live: bowlLive },
  { build: camera, live: cameraLive },
  { build: chair, live: () => [] },
  { build: laptop, live: laptopLive },
].map((m, k) => {
  const segs = m.build(), rnd = rand(31 + k);
  // each segment flies in from its own direction during assembly
  const scatter = segs.map(() => { const a = rnd() * TAU, e = rnd() * 2 - 1; return [Math.cos(a) * 2.4, e * 1.6, Math.sin(a) * 2.4, rnd() * .5]; });
  return { segs, scatter, live: m.live };
});

/* ---------- The engine ---------- */

function makeParticles(n, seed) {
  const rnd = rand(seed);
  return Array.from({ length: n }, () => ({
    a: rnd() * TAU, r: .35 + rnd() * 1.9, v: .1 + rnd() * .12, w: .25 + rnd() * .35, hot: rnd() < .16, size: 1.2 + rnd() * 1.3, rnd,
  }));
}

export class Engine {
  constructor(canvas) {
    this.c = canvas;
    this.x = canvas.getContext('2d');
    this.machines = new Map();
    const rnd = rand(5);
    this.segRing = Array.from({ length: 22 }, () => [rnd() * TAU, .04 + rnd() * .22]);
  }

  resize() {
    const w = this.c.clientWidth, h = this.c.clientHeight, d = Math.min(devicePixelRatio || 1, 2);
    this.w = w; this.h = h; this.dpr = d;
    this.c.width = Math.round(w * d); this.c.height = Math.round(h * d);
  }

  // s: { time, dt, white, gridShift, mouse, machines: [{id, x, y, r, amt, intro, pingAge}], models: [{x, y, r, amt, type, assemble}] }
  render(s) {
    const x = this.x;
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    x.fillStyle = `rgb(${mix(BG, LAB, s.white)})`;
    x.fillRect(0, 0, this.w, this.h);
    this.grid(s);
    for (const m of s.models) if (m.amt > 0 && m.r > 0) this.model(m, s.time);
    for (const m of s.machines) if (m.amt > 0 && m.r > 0) this.machine(m, s);
  }

  grid(s) {
    const x = this.x, g = 48, off = ((-s.gridShift % g) + g) % g;
    x.strokeStyle = rgba(LINE, .05 * (1 - s.white));
    x.lineWidth = 1;
    x.beginPath();
    for (let gx = .5; gx < this.w; gx += g) { x.moveTo(gx, 0); x.lineTo(gx, this.h); }
    for (let gy = off + .5; gy < this.h; gy += g) { x.moveTo(0, gy); x.lineTo(this.w, gy); }
    x.stroke();
  }

  machine(m, s) {
    const x = this.x, R = m.r, cx = m.x, cy = m.y;
    if (!this.machines.has(m.id)) this.machines.set(m.id, { rot: [0, 0, 0, 0], tilt: [0, 0], parts: makeParticles(m.id === 'hero' ? 150 : 70, m.id.length * 7) });
    const st = this.machines.get(m.id);
    const ping = m.pingAge >= 0 && m.pingAge < 1.4 ? m.pingAge : -1;
    const spin = 1 + (ping >= 0 ? 5 * Math.exp(-ping * 1.6) : 0);
    const dt = s.dt;
    st.rot[0] += dt * .035 * spin; st.rot[1] -= dt * .1 * spin; st.rot[2] += dt * .38 * spin; st.rot[3] += dt * .29 * spin;
    // the machine leans toward the pointer
    const tx = clamp((s.mouse.y - cy) / this.h, -.5, .5) * .7, ty = clamp((s.mouse.x - cx) / this.w, -.5, .5) * .7;
    st.tilt[0] += (tx - st.tilt[0]) * .06; st.tilt[1] += (ty - st.tilt[1]) * .06;
    const k = (i, n = 5, span = .45) => ease(clamp((m.intro - (i / n) * (1 - span)) / span));
    const fade = 1 - m.white;

    x.save();
    x.globalAlpha = m.amt;
    x.lineCap = 'round';

    // particles drawn in toward the core
    const pa = clamp((m.intro - .7) / .3) * fade;
    if (pa > 0) {
      const wave = ping >= 0 ? .27 + ping * 1.5 : -1;
      for (const p of st.parts) {
        p.r -= p.v * dt * (1 + (spin - 1) * .3);
        p.a += (p.w * dt * spin) / Math.max(p.r, .3);
        if (wave > 0 && p.r < wave) p.r = wave + .02;
        if (p.r < .3) { p.r = 1.4 + p.rnd() * 1.1; p.a = p.rnd() * TAU; }
        let px = cx + Math.cos(p.a) * p.r * R, py = cy + Math.sin(p.a) * p.r * R * .92;
        const dx = px - s.mouse.x, dy = py - s.mouse.y, dd = Math.hypot(dx, dy);
        if (dd < 70) { px += (dx / (dd || 1)) * (70 - dd) * .6; py += (dy / (dd || 1)) * (70 - dd) * .6; }
        x.fillStyle = p.hot ? rgba(ORANGE, .9 * pa) : rgba(LINE, .5 * pa * clamp((2.6 - p.r) / .8));
        x.beginPath(); x.arc(px, py, p.size, 0, TAU); x.fill();
      }
    }

    // gimbal rings turning in 3D: back halves first, front halves after the core
    const gimbals = [[.7, (p) => rotY(rotX(p, st.rot[2]), .35)], [.6, (p) => rotX(rotY(p, st.rot[3]), .55)]];
    const tilt = (p) => rotY(rotX(p, st.tilt[0]), st.tilt[1]);
    const gpts = gimbals.map(([rho, rot]) => [rho - .02, rho + .02].map((rr) => {
      const out = [];
      for (let j = 0; j <= 96; j++) { const a = (j / 96) * TAU; out.push(project(tilt(rot([Math.cos(a) * rr, Math.sin(a) * rr, 0])), cx, cy, R)); }
      return out;
    }));
    const drawGimbals = (front) => {
      gpts.forEach((band, gi) => {
        const reveal = k(2 + gi * .4);
        x.lineWidth = 1.2;
        band.forEach((pts) => {
          for (let j = 0; j < 96 * reveal; j++) {
            const [ax, ay, az] = pts[j], [bx, by] = pts[j + 1];
            if ((az >= 0) !== front) continue;
            x.strokeStyle = rgba(LINE, (front ? .75 : .22) * fade);
            x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
          }
        });
        for (let j = 0; j < 96 * reveal; j += 4) { // cross ticks make it a machined band
          const a = band[0][j], b = band[1][j];
          if ((a[2] >= 0) !== front) continue;
          x.strokeStyle = rgba(LINE, (front ? .55 : .15) * fade);
          x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
        }
      });
    };
    drawGimbals(false);

    // outer dial with ticks and degree marks
    const d0 = k(0);
    x.strokeStyle = rgba(LINE, .45 * fade); x.lineWidth = 1;
    x.beginPath(); x.arc(cx, cy, R, st.rot[0], st.rot[0] + TAU * d0); x.stroke();
    x.beginPath();
    for (let i = 0; i < 180 * d0; i++) {
      const a = st.rot[0] + (i / 180) * TAU, len = i % 15 === 0 ? .06 : i % 5 === 0 ? .035 : .018;
      x.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      x.lineTo(cx + Math.cos(a) * R * (1 - len), cy + Math.sin(a) * R * (1 - len));
    }
    x.stroke();
    if (d0 > .8 && R < 900) {
      x.fillStyle = rgba(LINE, .35 * fade * (d0 - .8) * 5);
      x.font = `500 ${Math.max(9, Math.min(13, R * .03))}px Archivo, system-ui, sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) {
        const a = st.rot[0] + (i / 12) * TAU;
        x.fillText(String(i * 30), cx + Math.cos(a) * R * .9, cy + Math.sin(a) * R * .9);
      }
    }

    // segmented ring in the logo's blue
    const d1 = k(1);
    x.strokeStyle = rgba(BLUE, .8 * fade); x.lineWidth = Math.max(2, R * .012);
    for (const [start, len] of this.segRing) {
      x.beginPath(); x.arc(cx, cy, R * .82, st.rot[1] + start, st.rot[1] + start + len * d1); x.stroke();
    }

    // inner rings and spokes
    const d3 = k(3);
    x.lineWidth = 1; x.strokeStyle = rgba(LINE, .3 * fade);
    for (const rr of [.4, .35]) { x.beginPath(); x.arc(cx, cy, R * rr, 0, TAU * d3); x.stroke(); }
    x.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = -st.rot[1] * .5 + (i / 24) * TAU;
      x.moveTo(cx + Math.cos(a) * R * .42, cy + Math.sin(a) * R * .42);
      x.lineTo(cx + Math.cos(a) * R * (.42 + .08 * d3), cy + Math.sin(a) * R * (.42 + .08 * d3));
    }
    x.stroke();

    // the core: the orange disc from the logo
    const pop = easeOutBack(clamp((m.intro - .5) / .5));
    const rc = R * .27 * pop * (1 + .015 * Math.sin(s.time * 2.2));
    if (rc > 0) {
      const g = x.createRadialGradient(cx - rc * .3, cy - rc * .3, rc * .1, cx, cy, rc);
      g.addColorStop(0, `rgb(${mix([255, 184, 128], LAB, m.white)})`);
      g.addColorStop(.55, `rgb(${mix([223, 104, 38], LAB, m.white)})`);
      g.addColorStop(1, `rgb(${mix([170, 70, 18], LAB, m.white)})`);
      x.save();
      x.shadowColor = rgba(ORANGE, .8 * fade);
      x.shadowBlur = Math.min(90, rc * .9) * fade;
      x.fillStyle = g;
      x.beginPath(); x.arc(cx, cy, rc, 0, TAU); x.fill();
      x.restore();
      x.strokeStyle = `rgba(255, 255, 255, ${.22 * fade})`; x.lineWidth = 1;
      for (const f of [.75, .52, .3]) { x.beginPath(); x.arc(cx, cy, rc * f, 0, TAU); x.stroke(); }
    }

    drawGimbals(true);

    // the pulse after a click
    if (ping >= 0) {
      x.strokeStyle = rgba(ORANGE, (1 - ping / 1.4) * fade); x.lineWidth = 2;
      x.beginPath(); x.arc(cx, cy, R * (.27 + ping * 1.5), 0, TAU); x.stroke();
    }
    x.restore();
  }

  model(md, t) {
    const x = this.x, M = MODELS[md.type], R = md.r, cx = md.x, cy = md.y;
    const yaw = t * .35 + md.type * 1.3, pitch = -.38;
    const view = (p) => project(rotX(rotY(p, yaw), pitch), cx, cy, R);
    const scanY = Math.sin(t * .9) * .9;
    x.save();
    x.globalAlpha = md.amt;
    x.lineCap = 'round';

    // turntable under the model
    const tt = clamp(md.assemble * 2);
    for (const [rr, a] of [[1.2, .4], [1.34, .18]]) {
      const pts = [];
      for (let j = 0; j <= 72 * tt; j++) { const b = (j / 72) * TAU; pts.push(view([Math.cos(b) * rr, -1.02, Math.sin(b) * rr])); }
      x.strokeStyle = rgba(LINE, a); x.lineWidth = 1;
      x.beginPath(); pts.forEach(([px, py], j) => (j ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
    }
    x.beginPath();
    for (let j = 0; j < 36 * tt; j++) {
      const b = (j / 36) * TAU, [ax, ay] = view([Math.cos(b) * 1.2, -1.02, Math.sin(b) * 1.2]), [bx, by] = view([Math.cos(b) * 1.27, -1.02, Math.sin(b) * 1.27]);
      x.moveTo(ax, ay); x.lineTo(bx, by);
    }
    x.strokeStyle = rgba(LINE, .3); x.stroke();

    // the model, assembling from scattered parts
    x.lineWidth = 1.1;
    M.segs.forEach(([a, b], i) => {
      const [sx, sy, sz, delay] = M.scatter[i];
      const f = ease(clamp((md.assemble - delay) / .5));
      if (f <= 0) return;
      const off = (p) => [p[0] + sx * (1 - f), p[1] + sy * (1 - f), p[2] + sz * (1 - f)];
      const pa = view(off(a)), pb = view(off(b));
      const depth = .3 + .7 * clamp((pa[2] + pb[2] + 2.2) / 4);
      const scan = Math.exp(-((((a[1] + b[1]) / 2 - scanY) / .07) ** 2)) * f;
      x.strokeStyle = scan > .15 ? rgba(ORANGE, Math.min(1, .5 + scan)) : rgba(LINE, depth * .8 * f);
      x.beginPath(); x.moveTo(pa[0], pa[1]); x.lineTo(pb[0], pb[1]); x.stroke();
    });

    // live details: steam, the chart, the record light
    const live = clamp((md.assemble - .8) / .2);
    if (live > 0) {
      for (const [a, b, w = 1, kind] of M.live(t)) {
        const pa = view(a), pb = view(b);
        if (kind === 'rec') { x.fillStyle = rgba(ORANGE, live); x.beginPath(); x.arc(pa[0], pa[1], Math.max(3, R * .02), 0, TAU); x.fill(); continue; }
        x.strokeStyle = kind === 'chart' ? rgba(ORANGE, .95 * live) : rgba(LINE, .5 * w * live);
        x.lineWidth = kind === 'chart' ? 2 : 1.2;
        x.beginPath(); x.moveTo(pa[0], pa[1]); x.lineTo(pb[0], pb[1]); x.stroke();
      }
    }

    // the scan plane
    if (md.assemble > .5) {
      const pts = [];
      for (let j = 0; j <= 48; j++) { const b = (j / 48) * TAU; pts.push(view([Math.cos(b) * 1.1, scanY, Math.sin(b) * 1.1])); }
      x.strokeStyle = rgba(ORANGE, .35 * clamp((md.assemble - .5) * 2)); x.lineWidth = 1;
      x.beginPath(); pts.forEach(([px, py], j) => (j ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
    }
    x.restore();
  }
}

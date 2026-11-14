// The machine room: a full-screen 2D canvas behind the dark sections. It draws a blueprint grid that
// is ruled as you read, the circuit growing in the hero, the logo-disc spec on the contact section and
// the project models, in the same precise language as the services lab.

const BG = [7, 11, 20];          // #070B14
const LINE = '205, 216, 240';    // pale line colour (rgb, alpha added per use)
const ORANGE = '223, 104, 38';   // logo orange

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - (1 - t) ** 3;
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

const LAB = [241, 243, 246];    // the lab's paper
const DIM = '123, 147, 255';     // dimension lines and the second copper layer, in the logo's blue
const hash01 = (v) => { const s = Math.sin(v) * 43758.5453; return s - Math.floor(s); };

/* ---------- The growing circuit ---------- */
// The hero is a circuit board routing itself. A chip sits on the board with the logo's orange disc as
// its die. A trace leaves every pin, fans out and routes itself at 45° and 90°, branching, keeping
// clear of other traces and of the headline, and ending in a pad or a via. Signals then run out along
// the finished traces. The pointer steers the growth, a click starts new branches, and every visit
// grows a different board.

const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]; // clockwise from east, y down
const FREE = 0, BLOCK = 1, TRACE = 2;
const SPEED = 15; // cells a trace grows per second
// a translucent colour flattened onto the board, so overlapping segment ends don't darken
const flat = (rgb, a) => `rgb(${rgb.split(',').map((v, i) => Math.round(BG[i] + (v - BG[i]) * a)).join(', ')})`;
const COPPER = [flat(LINE, .34), flat(DIM, .55)]; // the top and bottom layers
const chance = (p) => Math.random() < p;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const toward = (dx, dy) => ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8; // nearest of the 8 directions

export class Circuit {
  // w, h: the hero in CSS px; g: grid pitch; keep: [{x, y, w, h}] areas to stay clear of; chip: {x, y, r}
  layout(w, h, g, keep, chip, dpr) {
    Object.assign(this, { w, h, g, traces: [], heads: [], ends: [], signals: [], flashes: [], clock: 0, nextSignal: 0, nextSprout: 0, filled: 0 });
    const C = (this.C = Math.floor(w / g) + 1), R = (this.R = Math.floor(h / g) + 1);
    this.cell = new Uint8Array(C * R);  // FREE, BLOCK or TRACE
    this.own = new Int32Array(C * R);   // the trace a cell belongs to
    this.idx = new Int32Array(C * R);   // and how far along that trace it is
    this.diag = new Uint8Array(C * R);  // a diagonal crosses the square to the right of and below this point
    const block = (c0, r0, c1, r1) => {
      for (let r = Math.max(0, r0); r <= Math.min(R - 1, r1); r++) for (let c = Math.max(0, c0); c <= Math.min(C - 1, c1); c++) this.cell[r * C + c] = BLOCK;
    };
    for (const k of keep) block(Math.floor(k.x / g), Math.floor(k.y / g), Math.ceil((k.x + k.w) / g), Math.ceil((k.y + k.h) / g));
    const c0 = Math.round(chip.x / g), r0 = Math.round(chip.y / g), H = Math.max(3, Math.round((chip.r * 1.4) / g));
    block(c0 - H, r0 - H, c0 + H, r0 + H);
    this.chip = { H, x: c0 * g, y: r0 * g, rad: chip.r };
    this.space = this.cell.filter((v) => v === FREE).length;

    this.board = document.createElement('canvas'); // finished copper is drawn once, here
    this.board.width = Math.round(w * dpr);
    this.board.height = Math.round(h * dpr);
    this.b = this.board.getContext('2d');
    this.b.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.b.lineCap = 'round';
    this.drawChip();

    // a trace leaves every pin; the outer ones fan out first, as in a real breakout
    let n = 0;
    for (let d = 0; d < 8; d += 2) {
      const [dx, dy] = DIRS[d], [sx, sy] = DIRS[(d + 2) % 8];
      for (let o = 1 - H; o < H; o += 2) {
        const c = c0 + dx * (H + 1) + sx * o, r = r0 + dy * (H + 1) + sy * o;
        if (c < 0 || r < 0 || c >= C || r >= R || this.cell[r * C + c] !== FREE) continue;
        const fan = Array(Math.round(Math.abs(o) * 1.5)).fill((d + (o > 0 ? 1 : 7)) % 8);
        const t = this.add(c, r, d, null, 0, [d, d, ...fan, d], n++ * .03 + Math.random() * .15);
        t.max += 30; // the first traces run furthest
        this.take(c, r, t);
      }
    }
  }

  add(c, r, dir, parent, at, plan = [], delay = 0) {
    const t = {
      id: this.traces.length, pts: [[c, r]], dir, plan, parent, base: parent ? parent.base + at : 0,
      run: 0, acc: 0, delay: this.clock + delay, max: 12 + Math.floor(Math.random() * 50), speed: .8 + Math.random() * .4,
      layer: parent ? parent.layer : 0, done: false,
    };
    this.traces.push(t);
    this.heads.push(t);
    return t;
  }

  take(c, r, t) {
    const i = r * this.C + c;
    this.cell[i] = TRACE; this.own[i] = t.id; this.idx[i] = t.pts.length - 1;
    this.filled++;
  }

  // can trace t step from (c, r) in direction d?
  free(t, c, r, d) {
    const { C, R } = this, [dx, dy] = DIRS[d], nc = c + dx, nr = r + dy;
    if (nc < 0 || nr < 0 || nc >= C || nr >= R || this.cell[nr * C + nc] !== FREE) return false;
    if (dx && dy && this.diag[Math.min(r, nr) * C + Math.min(c, nc)]) return false; // never cross another diagonal
    // keep a clear cell between this trace and every other one
    for (let y = Math.max(0, nr - 1); y <= Math.min(R - 1, nr + 1); y++) {
      for (let x = Math.max(0, nc - 1); x <= Math.min(C - 1, nc + 1); x++) {
        const j = y * C + x;
        if (this.cell[j] !== TRACE) continue;
        const o = this.traces[this.own[j]];
        if (o === t ? this.idx[j] >= t.pts.length - 3                                  // its own last few cells
          : (o === t.parent && t.pts.length < 4) || (o.parent === t && this.idx[j] < 3)) continue; // where a branch leaves
        return false;
      }
    }
    return true;
  }

  move(t, d) {
    const [c, r] = t.pts[t.pts.length - 1], [dx, dy] = DIRS[d], nc = c + dx, nr = r + dy, g = this.g, b = this.b;
    if (dx && dy) this.diag[Math.min(r, nr) * this.C + Math.min(c, nc)] = 1;
    t.run = d === t.dir ? t.run + 1 : 0;
    t.dir = d;
    t.pts.push([nc, nr]);
    this.take(nc, nr, t);
    b.strokeStyle = COPPER[t.layer]; b.lineWidth = 1.5;
    b.beginPath(); b.moveTo(c * g, r * g); b.lineTo(nc * g, nr * g); b.stroke();
  }

  step(t) {
    const [c, r] = t.pts[t.pts.length - 1], n = t.pts.length;
    if (n > t.max) return this.end(t);
    let d = t.dir;
    if (t.plan.length) d = t.plan.shift();
    else if (t.run >= 2) {
      if (chance(d % 2 ? .3 : .07)) d = (d + pick([1, 7])) % 8; // long straight runs, short 45° jogs
      const p = this.pointer;
      if (p) { // lean toward the pointer
        const px = p.x - c * this.g, py = p.y - r * this.g, dist = Math.hypot(px, py);
        if (dist > 16 && dist < 320 && chance(.35)) {
          const turn = ((toward(px, py) - t.dir + 12) % 8) - 4;
          if (turn) d = (t.dir + Math.sign(turn) + 8) % 8;
        }
      }
      if (t.run > 4 && chance(.012)) { this.via(c, r, t.layer); t.layer ^= 1; } // drop through to the other layer
    }
    // branch now and then, until the board is busy enough
    if (n > 2 && chance(.055) && this.filled < this.space * .2 && this.heads.length < 90) this.add(c, r, (t.dir + pick([2, 6, 2, 6, 1, 7])) % 8, t, n - 1);
    const tries = [d, t.dir, ...(chance(.5) ? [t.dir + 1, t.dir + 7] : [t.dir + 7, t.dir + 1])];
    for (const o of tries) if (this.free(t, c, r, o % 8)) return this.move(t, o % 8);
    this.end(t);
  }

  end(t) {
    t.done = true;
    this.heads.splice(this.heads.indexOf(t), 1);
    if (t.pts.length < 2) return; // a branch that found no room
    const [c, r] = t.pts[t.pts.length - 1];
    t.edge = c === 0 || r === 0 || c === this.C - 1 || r === this.R - 1; // it carries on off the board
    if (!t.edge) chance(.6) ? this.via(c, r, t.layer) : this.pad(c, r, t.layer);
    t.route = this.route(t);
    this.ends.push(t);
  }

  // every cell from the chip to the end of trace t
  route(t) { return t.parent ? this.route(t.parent).slice(0, t.base).concat(t.pts) : t.pts.slice(); }

  pad(c, r, layer) {
    this.b.fillStyle = COPPER[layer];
    this.b.fillRect(c * this.g - 3, r * this.g - 3, 6, 6);
  }

  via(c, r, layer) { // a plated hole
    const b = this.b, x = c * this.g, y = r * this.g;
    b.fillStyle = COPPER[layer]; b.beginPath(); b.arc(x, y, 3.2, 0, TAU); b.fill();
    b.fillStyle = `rgb(${BG})`; b.beginPath(); b.arc(x, y, 1.4, 0, TAU); b.fill();
  }

  drawChip() {
    const b = this.b, g = this.g, { x, y, H } = this.chip, s = H * g;
    b.strokeStyle = COPPER[0]; b.lineWidth = 1.5;
    b.beginPath();
    for (let d = 0; d < 8; d += 2) { // the pins
      const [dx, dy] = DIRS[d], [sx, sy] = DIRS[(d + 2) % 8];
      for (let o = 1 - H; o < H; o += 2) {
        b.moveTo(x + dx * s + sx * o * g, y + dy * s + sy * o * g);
        b.lineTo(x + dx * (s + g) + sx * o * g, y + dy * (s + g) + sy * o * g);
      }
    }
    b.stroke();
    b.fillStyle = 'rgb(13, 18, 30)'; b.fillRect(x - s, y - s, 2 * s, 2 * s);
    b.strokeStyle = flat(LINE, .5); b.lineWidth = 1; b.strokeRect(x - s + .5, y - s + .5, 2 * s - 1, 2 * s - 1);
    // the pin-1 dot and the reference designator, as printed on a real board
    b.fillStyle = flat(LINE, .45);
    b.beginPath(); b.arc(x - s + 6, y - s + 6, 1.5, 0, TAU); b.fill();
    b.font = '600 9px Archivo, system-ui, sans-serif'; b.textAlign = 'right';
    b.fillText('U1', x + s - 5, y + s - 5);
  }

  // grow up to n branches from the traces nearest to (x, y), heading for it
  sprout(x, y, n, reach) {
    if (this.filled > this.space * .4 || this.heads.length > 120) return;
    const { C, R, g } = this, cc = Math.round(x / g), cr = Math.round(y / g), k = Math.ceil(reach / g), found = [];
    for (let r = Math.max(0, cr - k); r <= Math.min(R - 1, cr + k); r++) {
      for (let c = Math.max(0, cc - k); c <= Math.min(C - 1, cc + k); c++) if (this.cell[r * C + c] === TRACE) found.push([Math.hypot(c - cc, r - cr), r * C + c]);
    }
    found.sort((a, b) => a[0] - b[0]);
    let made = 0;
    for (const [dist, j] of found) {
      if (made >= n || dist * g > reach) break;
      if (dist < 1.5) continue; // right on top of it: nowhere to head for
      const t = this.traces[this.own[j]], i = this.idx[j], [c, r] = t.pts[i], d = toward(x - c * g, y - r * g);
      if (!this.free({ pts: [t.pts[i]], parent: t }, c, r, d)) continue;
      this.add(c, r, d, t, i, [d, d]);
      made++;
    }
  }

  branchAt(x, y) {
    this.sprout(x, y, 3, 240);
    this.flashes.push({ x, y, t: this.clock, r: 18 });
  }

  // dt in seconds; pointer: {x, y, active} in hero px, or null
  update(dt, pointer) {
    this.clock += dt;
    this.pointer = pointer;
    for (const t of [...this.heads]) {
      if (this.clock < t.delay) continue;
      t.acc += dt * SPEED * t.speed;
      while (t.acc >= 1 && !t.done) { t.acc -= 1; this.step(t); }
    }
    if (pointer && pointer.active && this.clock > this.nextSprout) {
      this.nextSprout = this.clock + .35;
      this.sprout(pointer.x, pointer.y, 1, 130);
    }
    // signals run out from the chip along finished traces
    if (this.ends.length && this.clock > this.nextSignal && this.signals.length < 24) {
      this.nextSignal = this.clock + .08 + Math.random() * .14;
      const t = pick(this.ends);
      this.signals.push({ route: t.route, edge: t.edge, at: 0, speed: 30 + Math.random() * 24 });
    }
    for (const s of this.signals) {
      s.at += dt * s.speed;
      if (!s.hit && s.at >= s.route.length - 1) {
        s.hit = true;
        const [c, r] = s.route[s.route.length - 1];
        if (!s.edge) this.flashes.push({ x: c * this.g, y: r * this.g, t: this.clock, r: 9 });
      }
    }
    this.signals = this.signals.filter((s) => s.at < s.route.length + 10);
    this.flashes = this.flashes.filter((f) => this.clock - f.t < .6);
  }

  // grow the whole board at once (reduced motion, or a new layout after the opening)
  finish() {
    for (let k = 0; k < 5000 && this.heads.length; k++) for (const t of [...this.heads]) if (!t.done) this.step(t);
  }

  draw(x, ox, oy) {
    const g = this.g, { x: cx, y: cy, rad } = this.chip;
    x.drawImage(this.board, ox, oy, this.w, this.h);
    x.save();
    x.translate(ox, oy);
    if (this.lit) { x.fillStyle = '#DF6826'; x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.fill(); } // the die, flat as in the logo
    x.lineCap = 'round';

    // the growing ends: a hot tail and a bright tip
    for (const t of this.heads) {
      if (this.clock < t.delay) continue;
      const n = t.pts.length, [c, r] = t.pts[n - 1], [dx, dy] = DIRS[t.dir], e = Math.min(1, t.acc);
      const hx = (c + dx * e) * g, hy = (r + dy * e) * g;
      const tail = [...t.pts.slice(Math.max(0, n - 6)).map(([pc, pr]) => [pc * g, pr * g]), [hx, hy]];
      x.lineWidth = 1.6;
      for (let k = 1; k < tail.length; k++) {
        x.strokeStyle = rgba(ORANGE, k / tail.length);
        x.beginPath(); x.moveTo(tail[k - 1][0], tail[k - 1][1]); x.lineTo(tail[k][0], tail[k][1]); x.stroke();
      }
      x.fillStyle = rgba(ORANGE, .25); x.beginPath(); x.arc(hx, hy, 6, 0, TAU); x.fill();
      x.fillStyle = '#FFD2AE'; x.fillRect(hx - 2, hy - 2, 4, 4);
    }

    // signals
    for (const s of this.signals) {
      const R = s.route, last = R.length - 1, head = Math.min(s.at, last), tail = Math.max(0, s.at - 10);
      if (tail >= last) continue;
      const at = (u) => {
        const i = Math.min(last - 1, Math.floor(u)), f = u - i;
        return [(R[i][0] + (R[i + 1][0] - R[i][0]) * f) * g, (R[i][1] + (R[i + 1][1] - R[i][1]) * f) * g];
      };
      const us = [tail];
      for (let u = Math.floor(tail) + 1; u < head; u++) us.push(u);
      us.push(head);
      x.lineWidth = 2;
      for (let k = 1; k < us.length; k++) {
        const [ax, ay] = at(us[k - 1]), [bx, by] = at(us[k]);
        x.strokeStyle = rgba(ORANGE, .9 * ((us[k] - tail) / 10));
        x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      }
      if (s.at < last) {
        const [hx, hy] = at(head);
        x.fillStyle = rgba(ORANGE, .3); x.beginPath(); x.arc(hx, hy, 5, 0, TAU); x.fill();
        x.fillStyle = '#FFD2AE'; x.beginPath(); x.arc(hx, hy, 1.8, 0, TAU); x.fill();
      }
    }

    // a ring where a signal lands, or where a click started new branches
    x.lineWidth = 1.5;
    for (const f of this.flashes) {
      const k = (this.clock - f.t) / .6;
      x.strokeStyle = rgba(ORANGE, 1 - k);
      x.beginPath(); x.arc(f.x, f.y, 3 + f.r * ease(k), 0, TAU); x.stroke();
    }
    x.restore();
  }
}

// The logo's orange disc as a specification drawing, drawn in stages as k goes from 0 to 1:
// construction circle, centre lines, the disc, then its diameter.
export function drawMark(x, cx, cy, r, t, k = 1) {
  if (k <= 0) return;
  const a = ease(clamp(k / .35)), b = ease(clamp((k - .2) / .3)), f = ease(clamp((k - .4) / .3)), d = ease(clamp((k - .65) / .35));
  x.save();
  x.lineWidth = 1;
  x.strokeStyle = rgba(LINE, .3);
  x.setLineDash([6, 6]); x.lineDashOffset = -t * 8;
  x.beginPath(); x.arc(cx, cy, r * 1.25, -Math.PI / 2, -Math.PI / 2 + TAU * a); x.stroke();
  x.setLineDash([]);
  if (b > 0) { // centre lines, from the centre out
    const L = r * 1.5 * b;
    x.beginPath();
    x.moveTo(cx - L, cy + .5); x.lineTo(cx + L, cy + .5);
    x.moveTo(cx + .5, cy - L); x.lineTo(cx + .5, cy + L);
    x.stroke();
  }
  if (f > 0) { // the disc, swept round; flat, exactly as in the logo
    x.fillStyle = '#DF6826';
    x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * f); x.closePath(); x.fill();
  }
  if (d > 0) { // diameter dimension below the disc, in the logo's blue
    const y = cy + r * 1.5 + 14, half = r * d;
    x.globalAlpha = d;
    x.strokeStyle = rgba(DIM, .8); x.fillStyle = rgba(DIM, .9);
    x.beginPath();
    x.moveTo(cx - r + .5, cy + r * .2); x.lineTo(cx - r + .5, y + 6); x.moveTo(cx + r + .5, cy + r * .2); x.lineTo(cx + r + .5, y + 6);
    x.moveTo(cx - half, y + .5); x.lineTo(cx + half, y + .5);
    if (d > .95) { x.moveTo(cx - r - 4, y + 4); x.lineTo(cx - r + 4, y - 4); x.moveTo(cx + r - 4, y + 4); x.lineTo(cx + r + 4, y - 4); }
    x.stroke();
    x.font = '500 12px Archivo, system-ui, sans-serif'; x.textAlign = 'center';
    x.fillText(`Ø ${Math.round(r * 2)} px`, cx, y + 20);
  }
  x.restore();
}

/* ---------- The engine ---------- */

export class Engine {
  constructor(canvas) {
    this.c = canvas;
    this.x = canvas.getContext('2d');
    this.pens = 0;   // how far down the sheet the grid has been ruled, in page px
    this.born = [];  // when each horizontal grid line was ruled, in seconds
  }

  resize() {
    const w = this.c.clientWidth, h = this.c.clientHeight, d = Math.min(devicePixelRatio || 1, 2);
    this.w = w; this.h = h; this.dpr = d;
    this.c.width = Math.round(w * d); this.c.height = Math.round(h * d);
  }

  // s: { time, dt, scroll, still, rule, models: [{x, y, r, amt, type, assemble}],
  //      circuit: { c, x, y } | null, wave: { k, x, y, w, h } | null, mark: { x, y, r, k } | null }
  render(s) {
    const x = this.x;
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    x.fillStyle = `rgb(${BG})`;
    x.fillRect(0, 0, this.w, this.h);
    this.grid(s);
    for (const m of s.models) if (m.amt > 0 && m.r > 0) this.model(m, s.time);
    if (s.mark) drawMark(x, s.mark.x, s.mark.y, s.mark.r, s.time, s.mark.k);
    if (s.circuit) s.circuit.c.draw(x, s.circuit.x, s.circuit.y);
    if (s.wave) this.tiles(s.wave, s.scroll);
  }

  // The blueprint grid is ruled as the page is read. A row of pens comes down the sheet behind the
  // reader, drawing the vertical lines, and each horizontal line is ruled across as the pens pass it,
  // alternately left to right and right to left. Ruled lines stay ruled.
  grid(s) {
    const x = this.x, G = 48, top = s.scroll, w = this.w, h = this.h;
    x.lineWidth = 1;
    x.strokeStyle = rgba(LINE, .05);
    x.beginPath();
    if (s.still) {
      for (let gx = .5; gx < w; gx += G) { x.moveTo(gx, 0); x.lineTo(gx, h); }
      for (let gy = (((-top % G) + G) % G) + .5; gy < h; gy += G) { x.moveTo(0, gy); x.lineTo(w, gy); }
      x.stroke();
      return;
    }
    if (s.rule && this.pens < top - G) this.pens = top - G; // after a jump, the pens start again just above the screen
    const gap = top + h - this.pens;
    if (s.rule && gap > 0) this.pens += Math.min(gap, Math.max(gap * (1 - Math.exp(-s.dt * 2.2)), s.dt * 260));
    while (this.born.length * G <= this.pens) this.born.push(s.time);
    const pen = this.pens - top; // where the pens are on screen
    if (pen > 0) for (let gx = .5; gx < w; gx += G) { x.moveTo(gx, 0); x.lineTo(gx, Math.min(h, pen)); }
    const tips = [];
    for (let k = Math.max(0, Math.floor(top / G)); k < this.born.length && k * G < top + h; k++) {
      const p = ease(clamp((s.time - this.born[k]) / .9)), y = k * G - top + .5;
      if (p <= 0) continue;
      const a = k % 2 ? w * (1 - p) : 0, b = k % 2 ? w : w * p;
      x.moveTo(a, y); x.lineTo(b, y);
      if (p < 1) tips.push([k % 2 ? a : b, y]);
    }
    x.stroke();
    x.fillStyle = rgba(ORANGE, .8);
    if (pen > 0 && pen < h && gap > 1) for (let gx = .5; gx < w; gx += G) x.fillRect(gx - 1.5, pen - 1.5, 3, 3);
    for (const [px, py] of tips) x.fillRect(px - 2, py - 2, 4, 4);
  }

  // White tiles sweep across the blueprint grid and print the hero into the lab's paper
  tiles(wv, scroll) {
    const x = this.x, G = 48;
    x.fillStyle = `rgb(${LAB})`;
    if (wv.k >= 1.12) { x.fillRect(wv.x, wv.y, wv.w, wv.h); return; }
    const off = ((((-scroll % G) + G) % G - wv.y) % G + G) % G; // keep the tiles on the grid
    const cols = Math.ceil(wv.w / G), rows = Math.ceil(wv.h / G) + 1;
    x.save();
    x.translate(wv.x, wv.y);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const ty = off + (r - 1) * G, at = (c / cols) * .55 + (1 - r / rows) * .25 + hash01(c * 12.9 + Math.round((ty + scroll) / G) * 78.2) * .15;
      const k = ease(clamp((wv.k - at) / .12));
      if (k <= 0) continue;
      const z = G * k;
      x.fillRect(c * G + (G - z) / 2, ty + (G - z) / 2, z + .5, z + .5);
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

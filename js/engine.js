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

/* ---------- The project models, one per project under "Selected work", in the same order ---------- */

const ringXY = (r, z, n = 40, cx = 0, cy = 0) => { // an upright circle facing the viewer
  const s = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, b = ((i + 1) / n) * TAU;
    s.push([[cx + Math.cos(a) * r, cy + Math.sin(a) * r, z], [cx + Math.cos(b) * r, cy + Math.sin(b) * r, z]]);
  }
  return s;
};
const rectXY = (x0, y0, x1, y1, z) => poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z]]);

// Rupankan Archo Interiors: a lounge chair.
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

// Pam Fincap: a laptop with a live chart.
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

// Sanjay Udhyog: bolts of fabric, one stacked on another, with cloth unrolling from the front one.
function bolt(cy, cz, R, len) { // a roll of fabric lying along x: end spirals, the cloth's surface, the cardboard core
  const s = [], x0 = -len / 2, x1 = len / 2, at = (x, a, r) => [x, cy + Math.sin(a) * r, cz + Math.cos(a) * r];
  for (const x of [x0, x1]) {
    const sp = []; // the layers of cloth seen on the end, as a spiral
    for (let j = 0; j <= 96; j++) { const u = j / 96, a = u * TAU * 4; sp.push(at(x, a, R * (.28 + .72 * u))); }
    s.push(...poly(sp));
    const core = [];
    for (let j = 0; j <= 20; j++) core.push(at(x, (j / 20) * TAU, R * .2));
    s.push(...poly(core));
  }
  for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU; s.push(...line(at(x0, a, R), at(x1, a, R))); }
  for (const x of [x0 * .5, 0, x1 * .5]) { const ring = []; for (let j = 0; j <= 36; j++) ring.push(at(x, (j / 36) * TAU, R)); s.push(...poly(ring)); }
  return s;
}
const CLOTH = { cy: -.4, cz: -.12, R: .55, len: 1.7 };
const clothAt = (x, u) => { // the cloth leaving the bottom roll at its front and settling on the floor in soft folds
  const { cy, cz, R } = CLOTH, y0 = cy - R * .8, floor = -.95; // it leaves the roll low on its front face
  const fall = Math.sin(Math.min(1, u * 2.2) * Math.PI / 2);
  return [x, y0 + (floor - y0) * fall + .045 * (1 + Math.sin(x * 5 + u * 9)) * u, cz + R * .6 + u * .95];
};
function fabric() {
  const { cy, cz, R, len } = CLOTH, s = [...bolt(cy, cz, R, len), ...bolt(cy + R + .36, cz - .18, .36, len * .82)];
  const w = len * .44;
  for (let i = 0; i <= 8; i++) { // warp threads, running out of the roll
    const x = -w + (i / 8) * 2 * w, pts = [];
    for (let j = 0; j <= 14; j++) pts.push(clothAt(x, j / 14));
    s.push(...poly(pts));
  }
  for (let j = 1; j <= 7; j++) { // weft threads, across the cloth
    const u = j / 7, pts = [];
    for (let i = 0; i <= 16; i++) pts.push(clothAt(-w + (i / 16) * 2 * w, u));
    s.push(...poly(pts));
  }
  return s;
}
const fabricLive = (t) => { // a thread of orange runs down the cloth as it unrolls
  const u = (t * .35) % 1, w = CLOTH.len * .44, pts = [];
  for (let i = 0; i <= 16; i++) pts.push(clothAt(-w + (i / 16) * 2 * w, u));
  return poly(pts).map((sg) => [...sg, 1, 'chart']);
};

// Silver Giftz: a gift box with a ribbon and a bow.
function bow(y, sz) { // two loops and the knot, on top of a lid
  const s = [];
  for (const side of [-1, 1]) {
    const pts = [];
    for (let j = 0; j <= 16; j++) {
      const u = (j / 16) * TAU;
      pts.push([side * (sz * .55 + Math.cos(u) * sz * .5), y + sz * .35 + Math.sin(u) * sz * .32, 0]);
    }
    s.push(...poly(pts));
  }
  s.push(...box(0, y + .05, 0, sz * .22, .1, sz * .22));
  return s;
}
function ribbon(y, w, d) { // a cross over the top of a box at height y
  return [...line([-w / 2, y + .002, 0], [w / 2, y + .002, 0]), ...line([0, y + .002, -d / 2], [0, y + .002, d / 2])];
}
function giftBox() {
  const s = [...box(0, -.45, 0, 1.2, 1.1, 1.2), ...box(0, .21, 0, 1.32, .22, 1.32)];
  s.push(...ribbon(.32, 1.32, 1.32));
  for (const sx of [-1, 1]) { // the ribbon down the sides
    s.push(...line([sx * .6, -1, 0], [sx * .6, .1, 0]), ...line([0, -1, sx * .6], [0, .1, sx * .6]));
    s.push(...line([sx * .66, .1, 0], [sx * .66, .32, 0]), ...line([0, .1, sx * .66], [0, .32, sx * .66]));
  }
  s.push(...bow(.32, .42));
  return s;
}

// More Than Giftz: a stack of gift boxes for bulk orders.
function giftStack() {
  const s = [];
  const boxes = [[0, -.7, 0, 1.5, .6, 1.3], [.08, -.15, .04, 1.08, .5, .96], [-.04, .3, 0, .66, .4, .62]];
  for (const [x, y, z, w, h, d] of boxes) {
    s.push(...box(x, y, z, w, h, d));
    s.push(...ribbon(y + h / 2, w, d).map(([a, b]) => [[a[0] + x, a[1], a[2] + z], [b[0] + x, b[1], b[2] + z]]));
    for (const sx of [-1, 1]) s.push(...line([x + sx * w / 2, y - h / 2, z], [x + sx * w / 2, y + h / 2, z]));
  }
  s.push(...bow(.5, .3).map(([a, b]) => [[a[0] - .04, a[1], a[2]], [b[0] - .04, b[1], b[2]]]));
  // a tag hanging off the top box
  s.push(...poly([[.33, .4, .31], [.6, .22, .31], [.62, .05, .31], [.48, .03, .31], [.46, .2, .31]]));
  return s;
}

// Linkora: a phone showing a link-in-bio page.
const PH = { w: .96, h: 1.9, d: .12, y: -.04 };
const PH_LINKS = [.12, -.16, -.44, -.72];
function phone() {
  const { w, h, d, y } = PH, z = d / 2 + .005, s = [...box(0, y, 0, w, h, d)];
  s.push(...rectXY(-w / 2 + .06, y - h / 2 + .1, w / 2 - .06, y + h / 2 - .1, z)); // screen
  s.push(...ringXY(.15, z, 28, 0, .58), ...line([-.22, .34, z], [.22, .34, z])); // profile picture and name
  for (const ly of PH_LINKS) s.push(...rectXY(-.34, ly - .1, .34, ly + .1, z)); // link buttons
  return s;
}
const phoneLive = (t) => { // one link lights up at a time
  const ly = PH_LINKS[Math.floor(t * 1.2) % PH_LINKS.length], z = PH.d / 2 + .01;
  return rectXY(-.34, ly - .1, .34, ly + .1, z).map((sg) => [...sg, 1, 'chart']);
};

// JD Resume: a resume page with a second page behind it.
function resume() {
  const s = [], w = 1.3, h = 1.84, y0 = -.98, z = .02, c = .22;
  s.push(...poly([[-w / 2, y0, z], [w / 2, y0, z], [w / 2, y0 + h - c, z], [w / 2 - c, y0 + h, z], [-w / 2, y0 + h, z], [-w / 2, y0, z]]));
  s.push(...poly([[w / 2 - c, y0 + h, z], [w / 2 - c, y0 + h - c, z], [w / 2, y0 + h - c, z]])); // folded corner
  s.push(...rectXY(-w / 2 + .1, .46, -w / 2 + .4, .76, z)); // photo
  s.push(...line([-.08, .7, z], [.4, .7, z]), ...line([-.08, .58, z], [.26, .58, z])); // name and title
  for (const [top, rows] of [[.28, 3], [-.24, 3], [-.66, 2]]) { // sections with lines of text
    s.push(...line([-w / 2 + .1, top, z], [-.1, top, z]));
    for (let r = 1; r <= rows; r++) s.push(...line([-w / 2 + .1, top - r * .1, z], [w / 2 - .12 - (r % 2) * .18, top - r * .1, z]));
  }
  s.push(...poly([[-w / 2 + .1, y0, -.14], [-w / 2 + .1, y0 + h - .06, -.14], [w / 2 + .1, y0 + h - .06, -.14], [w / 2 + .1, y0, -.14]])); // the page behind
  return s;
}
const resumeLive = (t) => { // the ATS check ticks down the sections
  const tops = [.28, -.24, -.66], top = tops[Math.floor(t * .9) % tops.length], z = .03, x = .5;
  return [[[x - .06, top + .02, z], [x - .02, top - .03, z], 1, 'chart'], [[x - .02, top - .03, z], [x + .07, top + .07, z], 1, 'chart']];
};

const MODELS = [
  { build: chair, live: () => [] },
  { build: laptop, live: laptopLive },
  { build: fabric, live: fabricLive },
  { build: giftBox, live: () => [] },
  { build: giftStack, live: () => [] },
  { build: phone, live: phoneLive },
  { build: resume, live: resumeLive },
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

    // live details in orange: the chart, the lit link, the ATS tick, the thread on the cloth
    const live = clamp((md.assemble - .8) / .2);
    if (live > 0) {
      for (const [a, b, w = 1, kind] of M.live(t)) {
        const pa = view(a), pb = view(b);
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

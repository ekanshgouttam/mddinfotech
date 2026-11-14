import { Engine } from './engine.js';
import { Lab } from './lab.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const rect = (el) => el.getBoundingClientRect();
const onScreen = (r, margin = 0) => r.bottom > -margin && r.top < innerHeight + margin;
const body = document.body;

// Scroll progress through a section whose stage is pinned: 0 at pin start, 1 at pin end.
function progress(section) {
  const r = rect(section), span = r.height - innerHeight;
  return span > 0 ? clamp(-r.top / span) : (r.top < 0 ? 1 : 0);
}

/* ---------- The machine room (everything behind the dark sections) ---------- */
const engine = new Engine($('#engine'));

const mouse = { x: -1e4, y: -1e4 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

// Click (or tap) on a machine: it spins up and sends out a pulse.
const machinesNow = {};
const ping = { id: '', start: -1e9 };
const machineAt = (x, y) => Object.keys(machinesNow).find((id) => {
  const m = machinesNow[id];
  return m && Math.hypot(x - m.x, y - m.y) < m.r;
});
function triggerPing(e) {
  if (e.target.closest('a, button')) return;
  const id = machineAt(e.clientX, e.clientY);
  if (id) { ping.id = id; ping.start = performance.now(); }
}
$('#hero').addEventListener('click', triggerPing);
$('#contact').addEventListener('click', triggerPing);

/* ---------- Hero: the growth engine, then the dive into its core ---------- */
const hero = { sec: $('#hero'), stage: $('#hero .stage'), anchor: $('#hero .core-anchor'), ui: $('.hero-ui'), p: 0 };
function updateHero() {
  const box = rect(hero.sec);
  if (!onScreen(box)) return { visible: false, white: 0 };
  hero.p += (progress(hero.sec) - hero.p) * 0.14;
  const p = hero.p;
  hero.ui.style.opacity = 1 - clamp(p / 0.16);
  hero.ui.style.visibility = p > 0.16 ? 'hidden' : '';

  const a = rect(hero.anchor);
  let x = a.left + a.width / 2, y = a.top + a.height / 2, r = a.width / 2;
  const z = reduce ? 0 : clamp((p - 0.16) / 0.62);
  const toCentre = smooth(clamp(z * 1.6));
  x += (innerWidth / 2 - x) * toCentre;
  y += (innerHeight / 2 - y) * toCentre;
  r *= 30 ** (z * z);
  const white = reduce ? smooth(clamp((p - 0.4) / 0.35)) : smooth(clamp((z - 0.6) / 0.34));
  hero.stage.classList.toggle('near-core', p < 0.16 && Math.hypot(mouse.x - x, mouse.y - y) < r);
  return { visible: true, x, y, r, white };
}

/* ---------- The lab: services as live diagrams ---------- */
const lab = {
  sec: $('#services'), stage: $('#services .stage'), ui: $('.lab-ui'), anchor: $('.diagram-anchor'),
  svcs: $$('.svc'), tabs: $$('.tab'), idx: -1, since: 0,
};
const labView = new Lab($('.lab-canvas'));
const SVC_END = 0.84, BREAK = 0.88; // services share 0–0.84 of the scroll; the room breaks up after 0.88

function updateLab(now) {
  const box = rect(lab.sec);
  if (!onScreen(box)) { lab.idx = -1; return { covers: false, light: false }; }
  const p = progress(lab.sec), n = lab.svcs.length;
  const idx = Math.min(n - 1, Math.floor(clamp(p / SVC_END) * n));
  if (idx !== lab.idx) {
    lab.idx = idx; lab.since = now;
    lab.svcs.forEach((el, i) => el.classList.toggle('is-active', i === idx));
    lab.tabs.forEach((el, i) => { el.classList.toggle('is-active', i === idx); el.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
    const strip = lab.tabs[idx].closest('.tabs'); // keep the active tab in view when the strip scrolls (phones)
    strip.scrollTo({ left: lab.tabs[idx].parentElement.offsetLeft - strip.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  }
  const breakup = clamp((p - BREAK) / (1 - BREAK));
  lab.ui.classList.toggle('is-gone', p > BREAK - 0.015);
  const s = rect(lab.stage), a = rect(lab.anchor);
  labView.draw({
    index: idx, breakup,
    since: reduce ? 9 : (now - lab.since) / 1000,   // reduced motion: diagrams appear complete and hold still
    time: reduce ? 0 : now / 1000,
    area: { x: a.left - s.left, y: a.top - s.top, w: a.width, h: a.height },
  });
  return {
    covers: s.top <= 0 && s.bottom >= innerHeight && breakup <= 0,
    light: s.top <= 40 && s.bottom > 40 && breakup < 0.12,
  };
}
lab.tabs.forEach((tab, i) => tab.addEventListener('click', () => {
  const span = lab.sec.offsetHeight - innerHeight;
  scrollTo({ top: lab.sec.offsetTop + ((i + 0.5) / lab.svcs.length) * SVC_END * span, behavior: reduce ? 'auto' : 'smooth' });
}));

/* ---------- Work: a model per project, rebuilt between projects ---------- */
const work = { sec: $('#work'), anchor: $('.model-anchor'), missions: $$('.mission'), count: $('.count span'), active: -1 };
function updateWork() {
  const box = rect(work.sec);
  if (!onScreen(box)) return [];
  const n = work.missions.length;
  const s = progress(work.sec) * n, i = Math.min(n - 1, Math.floor(s));
  const f = i < n - 1 ? smooth(clamp((s - i - 0.66) / 0.34)) : 0;  // take this model apart, build the next
  const active = i + (f > 0.5 ? 1 : 0);
  if (active !== work.active) {
    work.active = active;
    work.missions.forEach((el, k) => el.classList.toggle('is-active', k === active));
    work.count.textContent = active + 1;
  }
  const enter = smooth(clamp((1 - box.top / innerHeight - 0.25) / 0.6)); // the first model builds as the section arrives
  const a = rect(work.anchor), cx = a.left + a.width / 2, cy = a.top + a.height / 2, R = a.width * 0.36; // model + turntable fit the anchor
  const models = [{ x: cx - f * R * 0.3, y: cy, r: R, amt: 1, type: i, assemble: Math.min(1 - f, enter) }];
  if (f > 0) models.push({ x: cx + (1 - f) * R * 0.3, y: cy, r: R, amt: 1, type: i + 1, assemble: f });
  return models;
}

/* ---------- Process: a circuit trace with a signal running along it ---------- */
const proc = {
  sec: $('#process'), stage: $('#process .stage'), plan: $('.route-plan'), flown: $('.route-flown'),
  probe: $('.probe'), steps: $$('.step'), wps: $$('.waypoint'), len: 0, marks: [],
};
function buildRoute() {
  const s = rect(proc.stage), vertical = innerWidth <= 860;
  const pts = proc.wps.map((w) => { const r = rect(w); return [r.left + r.width / 2 - s.left, r.top + r.height / 2 - s.top]; });
  if (!pts.length) return;
  const last = pts[pts.length - 1];
  // Straight runs with 45° jogs between pads, like a trace on a circuit board.
  const path = [];
  if (vertical) {
    path.push([pts[0][0], pts[0][1] - 24]);
    pts.forEach((p, i) => {
      path.push(p);
      const q = pts[i + 1];
      if (!q) return;
      const side = i % 2 ? 1 : -1, j = 16, dy = q[1] - p[1];
      path.push([p[0], p[1] + dy * 0.3], [p[0] + side * j, p[1] + dy * 0.3 + j], [p[0] + side * j, q[1] - dy * 0.3 - j], [q[0], q[1] - dy * 0.3]);
    });
    path.push([last[0], last[1] + 220]);
  } else {
    const j = Math.min(44, s.height * 0.06);
    path.push([-40, pts[0][1] + j * 2], [pts[0][0] - 40 - j * 2, pts[0][1] + j * 2], [pts[0][0] - 40, pts[0][1]]);
    pts.forEach((p, i) => {
      path.push(p);
      const q = pts[i + 1];
      if (!q) return;
      const side = i % 2 ? 1 : -1, dx = q[0] - p[0];
      path.push([p[0] + dx * 0.25, p[1]], [p[0] + dx * 0.25 + j, p[1] + side * j], [q[0] - dx * 0.25 - j, p[1] + side * j], [q[0] - dx * 0.25, q[1]]);
    });
    path.push([last[0] + 40, last[1]], [last[0] + 40 + j * 2, last[1] - j * 2], [s.width + 40, last[1] - j * 2]);
  }
  const d = path.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  proc.plan.setAttribute('d', d);
  proc.flown.setAttribute('d', d);
  proc.len = proc.plan.getTotalLength();
  proc.flown.style.strokeDasharray = `${proc.len} ${proc.len}`;
  // where along the trace each pad sits
  const samples = [];
  for (let k = 0; k <= 600; k++) { const L = (k / 600) * proc.len, q = proc.plan.getPointAtLength(L); samples.push([L, q.x, q.y]); }
  proc.marks = pts.map(([x, y]) => samples.reduce((b, sm) => (Math.hypot(sm[1] - x, sm[2] - y) < Math.hypot(b[1] - x, b[2] - y) ? sm : b))[0]);
}
function updateProcess() {
  if (!proc.len || !onScreen(rect(proc.sec))) return;
  const L = proc.len * clamp((progress(proc.sec) - 0.05) / 0.85);
  proc.flown.style.strokeDashoffset = proc.len - L;
  const q = proc.plan.getPointAtLength(L);
  proc.probe.setAttribute('x', q.x - 5); proc.probe.setAttribute('y', q.y - 5);
  proc.steps.forEach((el, i) => el.classList.toggle('is-reached', L >= proc.marks[i] - 2));
}

/* ---------- Contact: the engine again, smaller ---------- */
const farAnchor = $('.core-far');
function contactMachine() {
  const a = rect(farAnchor);
  return onScreen(a, a.width) ? { x: a.left + a.width / 2, y: a.top + a.height / 2, r: a.width / 2 } : null;
}

/* ---------- Frame loop ---------- */
let powerAt = -1, last = performance.now();

function frame(now) {
  tick(now);
  requestAnimationFrame(frame);
}

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const h = updateHero();
  const l = updateLab(now);
  const models = updateWork();
  updateProcess();
  const c = contactMachine();

  machinesNow.hero = h.visible ? { x: h.x, y: h.y, r: h.r } : null;
  machinesNow.contact = c;
  body.classList.toggle('on-light', (h.visible && h.white > 0.5) || l.light);
  body.style.setProperty('--nav-shade', h.visible ? (1 - clamp(h.white * 2)).toFixed(3) : '1');
  if (l.covers) return; // the lab hides the machine room completely

  const intro = reduce ? 1 : powerAt < 0 ? 0 : clamp((now - powerAt) / 1800);
  const age = (id) => (ping.id === id ? (now - ping.start) / 1000 : -1);
  const machines = [];
  if (h.visible) machines.push({ id: 'hero', ...machinesNow.hero, amt: 1, intro, white: h.white, pingAge: age('hero') });
  if (c) machines.push({ id: 'contact', ...c, amt: 1, intro: 1, white: 0, pingAge: age('contact') });
  engine.render({
    time: reduce ? 20 : now / 1000,
    dt: reduce ? 0 : dt,
    white: h.visible ? h.white : 0,
    gridShift: scrollY * 0.5,
    mouse, machines, models,
  });
}

function resize() {
  engine.resize();
  labView.resize();
  buildRoute();
}
let resizeTimer = 0;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

/* ---------- Opening: the engine powers on ---------- */
async function start() {
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  resize();
  requestAnimationFrame(frame);
  const go = () => {
    powerAt = performance.now();
    body.classList.add('is-ready');
    setTimeout(() => body.classList.add('is-settled'), 2600);
  };
  if (reduce) go(); else setTimeout(go, 500);
}
start();

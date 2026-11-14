import { Universe } from './universe.js';
import { Lab } from './lab.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const rect = (el) => el.getBoundingClientRect();
const onScreen = (r, margin = 0) => r.bottom > -margin && r.top < innerHeight + margin;
const body = document.body;

// Scroll progress through a section whose stage is pinned: 0 at pin start, 1 at pin end.
function progress(section) {
  const r = rect(section), span = r.height - innerHeight;
  return span > 0 ? clamp(-r.top / span) : (r.top < 0 ? 1 : 0);
}

/* ---------- The universe layer ---------- */
const universe = new Universe($('#universe'));
if (!universe.ok) document.documentElement.classList.add('no-gl');

const mouse = { x: -1e4, y: -1e4 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

// Click (or tap) near the star: a flare leaves the limb toward that point.
let sunNow = { x: 0, y: 0, r: 0, amt: 0 };
const flare = { angle: 0, start: -1e9 };
const nearStar = (x, y) => sunNow.amt > 0 && Math.hypot(x - sunNow.x, y - sunNow.y) < sunNow.r * 2.4;
function triggerFlare(e) {
  if (e.target.closest('a, button') || !nearStar(e.clientX, e.clientY)) return;
  flare.angle = Math.atan2(e.clientY - sunNow.y, e.clientX - sunNow.x);
  flare.start = performance.now();
}
$('#hero').addEventListener('click', triggerFlare);
$('#contact').addEventListener('click', triggerFlare);

/* ---------- Hero: the star, then the flight into it ---------- */
const hero = { sec: $('#hero'), stage: $('#hero .stage'), anchor: $('#hero .sun-anchor'), ui: $('.hero-ui'), p: 0 };
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
  hero.stage.classList.toggle('near-star', nearStar(mouse.x, mouse.y) && p < 0.16);
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

/* ---------- Work: a world per project ---------- */
const work = { sec: $('#work'), anchor: $('.planet-anchor'), missions: $$('.mission'), count: $('.count span'), active: -1 };
const OFF = { x: 0, y: 0, r: 0, amt: 0, type: 0 };
function updateWork() {
  if (!onScreen(rect(work.sec))) return [OFF, OFF];
  const n = work.missions.length;
  const s = progress(work.sec) * n, i = Math.min(n - 1, Math.floor(s));
  const f = i < n - 1 ? smooth(clamp((s - i - 0.66) / 0.34)) : 0;  // travel to the next world
  const active = i + (f > 0.5 ? 1 : 0);
  if (active !== work.active) {
    work.active = active;
    work.missions.forEach((el, k) => el.classList.toggle('is-active', k === active));
    work.count.textContent = active + 1;
  }
  const a = rect(work.anchor), cx = a.left + a.width / 2, cy = a.top + a.height / 2, R = a.width / 2;
  const cur = { x: cx - f * innerWidth * 0.85, y: cy + f * R * 0.2, r: R * (1 - 0.45 * f), amt: 1, type: i };
  const next = f > 0 ? { x: cx + (1 - f) * innerWidth * 0.8, y: cy - (1 - f) * R * 0.15, r: R * (0.55 + 0.45 * f), amt: 1, type: i + 1 } : OFF;
  return [cur, next];
}

/* ---------- Process: the flight path ---------- */
const proc = {
  sec: $('#process'), stage: $('#process .stage'), plan: $('.route-plan'), flown: $('.route-flown'),
  probe: $('.probe'), steps: $$('.step'), wps: $$('.waypoint'), len: 0, marks: [],
};
function buildRoute() {
  const s = rect(proc.stage), vertical = innerWidth <= 860;
  const pts = proc.wps.map((w) => { const r = rect(w); return [r.left + r.width / 2 - s.left, r.top + r.height / 2 - s.top]; });
  if (!pts.length) return;
  const last = pts[pts.length - 1];
  const path = [vertical ? [pts[0][0], pts[0][1] - 24] : [-40, pts[0][1] + s.height * 0.18]];
  pts.forEach((p, i) => {
    path.push(p);
    if (i < pts.length - 1) { // arc between waypoints, alternating sides: a transfer orbit
      const q = pts[i + 1], side = i % 2 ? 1 : -1;
      path.push(vertical ? [(p[0] + q[0]) / 2 + side * 26, (p[1] + q[1]) / 2] : [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + side * s.height * 0.1]);
    }
  });
  path.push(vertical ? [last[0], last[1] + 220] : [s.width + 40, last[1] - s.height * 0.22]);
  // Catmull-Rom through every point, written as cubic Béziers
  let d = `M${path[0][0]},${path[0][1]}`;
  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[i - 1] || path[i], p1 = path[i], p2 = path[i + 1], p3 = path[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  proc.plan.setAttribute('d', d);
  proc.flown.setAttribute('d', d);
  proc.len = proc.plan.getTotalLength();
  proc.flown.style.strokeDasharray = `${proc.len} ${proc.len}`;
  // where along the path each waypoint sits
  const samples = [];
  for (let k = 0; k <= 600; k++) { const L = (k / 600) * proc.len, q = proc.plan.getPointAtLength(L); samples.push([L, q.x, q.y]); }
  proc.marks = pts.map(([x, y]) => samples.reduce((b, sm) => (Math.hypot(sm[1] - x, sm[2] - y) < Math.hypot(b[1] - x, b[2] - y) ? sm : b))[0]);
}
function updateProcess() {
  if (!proc.len || !onScreen(rect(proc.sec))) return;
  const L = proc.len * clamp((progress(proc.sec) - 0.05) / 0.85);
  proc.flown.style.strokeDashoffset = proc.len - L;
  const q = proc.plan.getPointAtLength(L);
  proc.probe.setAttribute('cx', q.x); proc.probe.setAttribute('cy', q.y);
  proc.steps.forEach((el, i) => el.classList.toggle('is-reached', L >= proc.marks[i] - 2));
}

/* ---------- Contact: the star again, far away ---------- */
const farAnchor = $('.sun-far');
function farSun() {
  const a = rect(farAnchor);
  return onScreen(a, a.width * 2) ? { x: a.left + a.width / 2, y: a.top + a.height / 2, r: a.width / 2, amt: 1 } : null;
}

/* ---------- Frame loop ---------- */
const OFF_SUN = { x: 0, y: 0, r: 0, amt: 0 };
const t0 = performance.now();
let igniteAt = -1;

function frame(now) {
  tick(now);
  requestAnimationFrame(frame);
}

function tick(now) {
  const h = updateHero();
  const l = updateLab(now);
  const planets = updateWork();
  updateProcess();

  sunNow = h.visible ? { x: h.x, y: h.y, r: h.r, amt: 1 } : (farSun() || OFF_SUN);
  body.classList.toggle('on-light', (h.visible && h.white > 0.5) || l.light);

  if (universe.ok && !l.covers) {
    const since = igniteAt < 0 ? -1 : (now - igniteAt) / 1000;
    const flareAge = (now - flare.start) / 1000;
    universe.render({
      time: reduce ? 40 : now / 1000,
      shift: scrollY * 0.12,
      stars: reduce ? 1 : clamp((now - t0) / 1500),
      sun: sunNow,
      ignite: reduce ? 1 : since < 0 ? 0 : clamp(easeOutBack(clamp(since / 1.5)), 0, 1.12),
      shock: reduce || since < 0 ? 0 : clamp((since - 0.15) / 1.7),
      white: h.visible ? h.white : 0,
      mouse,
      flare: { angle: flare.angle, age: flareAge, strength: flareAge < 2.6 ? 1 : 0 },
      planets,
    });
  }
}

function resize() {
  universe.ok && universe.resize();
  labView.resize();
  buildRoute();
}
let resizeTimer = 0;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

/* ---------- Opening: the star ignites ---------- */
async function start() {
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  resize();
  requestAnimationFrame(frame);
  const go = () => {
    igniteAt = performance.now();
    body.classList.add('is-ready');
    setTimeout(() => body.classList.add('is-settled'), 2600);
  };
  if (reduce) go(); else setTimeout(go, 500);
}
start();

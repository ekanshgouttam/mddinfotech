import { Engine, Circuit } from './engine.js';
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

const mouse = { x: -1e4, y: -1e4, t: -1e4 };
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return; // touch steers nothing; a tap starts branches instead
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = performance.now();
}, { passive: true });

/* ---------- Hero: a circuit board routing itself around the headline, then printed into the lab ---------- */
const hero = { sec: $('#hero'), stage: $('#hero .stage'), copy: $('.hero-copy'), ui: $('.hero-ui'), circuit: new Circuit(), p: 0, w: 0, h: 0 };
function layoutHero() {
  const st = rect(hero.stage), W = st.width, H = st.height;
  if (W === hero.w && H === hero.h) return; // phones resize as the address bar moves; the board stays
  hero.w = W; hero.h = H;
  const local = (el, m) => { const b = rect(el); return { x: b.left - st.left - m, y: b.top - st.top - m, w: b.width + 2 * m, h: b.height + 2 * m }; };
  const lines = $$('.hero-title .l');
  const keep = [...lines, $('.hero-h1'), $('.hero-lede'), $('.hero-hint')].map((el) => local(el, 14));
  const top = rect($('.nav')).height + 4;
  keep.push({ x: 0, y: -8, w: W, h: top + 8 }); // under the header
  const phone = W <= 680, r = phone ? 20 : 28, reach = r * 1.4 + 24; // the chip, its pins and a little air
  const copyTop = local(hero.copy, 0).y, titleRight = Math.max(...lines.map((el) => { const b = local(el, 0); return b.x + b.w; }));
  // The chip sits in open space: right of the headline on wide screens, above the copy on narrow ones
  let x = W * 0.74, y = H * 0.42;
  if (x - reach < titleRight + 40) { x = W * (phone ? 0.64 : 0.7); y = top + (copyTop - top) / 2; }
  hero.circuit.layout(W, H, 8, keep, { x, y, r }, engine.dpr);
  if (powerAt >= 0 || reduce) hero.circuit.finish(); // after the opening, a new layout appears fully grown
}
function updateHero() {
  const box = rect(hero.sec);
  if (!onScreen(box)) return { visible: false, white: 0 };
  hero.p += (progress(hero.sec) - hero.p) * 0.14;
  const p = hero.p;
  hero.ui.style.opacity = 1 - clamp(p / 0.16);
  hero.ui.style.visibility = p > 0.16 ? 'hidden' : '';
  const wave = clamp((p - 0.14) / 0.64) * 1.15; // white tiles fill the grid and print the board into the lab
  const st = rect(hero.stage);
  return { visible: true, x: st.left, y: st.top, w: st.width, h: st.height, wave, white: clamp(wave / 1.15) };
}
// A click (or tap) on the board starts new branches from the nearest traces
addEventListener('click', (e) => {
  if (powerAt < 0 || reduce || hero.p > 0.12 || e.target.closest('a, button, summary, .map')) return;
  const st = rect(hero.stage);
  if (e.clientY < st.top || e.clientY > st.bottom) return;
  hero.circuit.branchAt(e.clientX - st.left, e.clientY - st.top);
});

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

/* "About project" opens the project's dialog as a small power-up, in the site's circuit language:
   1. the button's pad lights, and an orange chip flies out of it to the middle of the screen;
   2. the chip stretches into a glowing beam the width of the sheet;
   3. the beam splits in two and the halves sweep apart, scanning the sheet open between them;
   4. the registration marks draw in and the contents print in one after another: the name widens,
      list pads flash, service tags pop.
   Closing plays it backwards: the contents go, the sheet scans shut to a beam, the beam folds into the chip,
   and the chip flies home into its button. The page underneath holds still while a dialog is open. */
const EASE = 'cubic-bezier(.2, .7, .1, 1)', EASE_IN = 'cubic-bezier(.55, 0, .75, .2)';
const anim = (dlg, el, frames, opts) => {
  if (!el) return null;
  try {
    const a = el.animate(frames, opts);
    dlg.anims.push(a);
    return a;
  } catch { return null; } // a pseudo-element the browser can't animate: skip that flourish
};
function beams(dlg) { // two glowing lines, created once per dialog, living in its top layer
  if (!dlg.beams) dlg.beams = [0, 1].map(() => dlg.appendChild(Object.assign(document.createElement('span'), { className: 'dossier-beam' })));
  return dlg.beams;
}
const place = (x, y, w, h, o = 1) => ({ left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, opacity: o });
function geometry(dlg) { // where the sheet is, and the middle of the part of it on screen
  const s = rect($('.dossier-sheet', dlg)), b = rect(dlg.zoomBtn);
  const top = Math.max(s.top, 0), bottom = Math.min(s.bottom, innerHeight), cy = (top + bottom) / 2;
  return { s, b, top, bottom, cy, cx: s.left + s.width / 2 };
}
function stopAnims(dlg) { (dlg.anims || []).forEach((a) => a.cancel()); dlg.anims = []; }

function openDossier(dlg, btn) {
  if (dlg.open) return;
  dlg.zoomBtn = btn;
  document.documentElement.classList.add('no-scroll');
  dlg.showModal();
  dlg.scrollTop = 0;
  if (reduce) return;
  stopAnims(dlg);
  const sheet = $('.dossier-sheet', dlg), [b1, b2] = beams(dlg), g = geometry(dlg), { s, b, cy, cx } = g;
  const chip = 14, T1 = 420, T2 = 520; // chip flight + stretch, then the scan

  // 1. press: the button's pad flashes
  anim(dlg, $('.pad', btn), [{ background: '#fff', boxShadow: '0 0 14px 4px rgba(223,104,38,.9)' }, {}], { duration: 500, easing: 'ease-out' });
  anim(dlg, dlg, { opacity: [0, 1] }, { duration: 500, easing: 'ease', pseudoElement: '::backdrop' });

  // 2. the chip flies to the centre and stretches into a beam
  anim(dlg, b1, [
    { ...place(b.left + b.width - 26, b.top + b.height / 2 - 5, 10, 10), easing: 'cubic-bezier(.4, 0, .2, 1)' },
    { ...place(cx - chip / 2, cy - chip / 2, chip, chip), offset: 0.55, easing: EASE },
    place(s.left, cy - 1, s.width, 2),
  ], { duration: T1, fill: 'forwards' });

  // 3. the beam splits and the halves sweep apart, scanning the sheet open between them
  const sweep = { duration: T2, delay: T1, easing: EASE, fill: 'forwards' };
  anim(dlg, b1, [place(s.left, cy - 1, s.width, 2), { ...place(s.left, g.top - 1, s.width, 2), offset: 0.8 }, place(s.left, g.top - 1, s.width, 2, 0)], sweep);
  anim(dlg, b2, [place(s.left, cy - 1, s.width, 2), { ...place(s.left, g.bottom - 1, s.width, 2), offset: 0.8 }, place(s.left, g.bottom - 1, s.width, 2, 0)], sweep);
  const clipFrom = `inset(${cy - s.top}px 0 ${s.bottom - cy}px 0)`;
  anim(dlg, sheet, [{ clipPath: clipFrom, opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: T2, delay: T1, easing: EASE, fill: 'backwards' });
  anim(dlg, sheet, [{ backgroundPosition: '0 24px, 24px 0' }, { backgroundPosition: '0 0, 0 0' }], { duration: T2 + 300, delay: T1, easing: EASE });

  // 4. registration marks draw in, then the contents print in one after another
  const at = T1 + T2 * 0.55;
  for (const pe of ['::before', '::after']) anim(dlg, sheet, [{ width: '0px', height: '0px' }, { width: '22px', height: '22px' }], { duration: 450, delay: at, easing: EASE, fill: 'backwards', pseudoElement: pe });
  const items = [
    $('.dossier-ref', dlg), $('.dossier-head h3', dlg), $('.dossier-close', dlg), $('.dossier-lede', dlg), $('.dossier-main h4', dlg),
    ...$$('.dossier-list li', dlg), ...$$('.dossier-spec > div', dlg), $('.dossier-cta', dlg),
  ].filter(Boolean);
  items.forEach((el, k) => {
    const delay = at + k * 55;
    anim(dlg, el, [
      { opacity: 0, transform: 'translateY(10px)', clipPath: 'inset(-6px 100% -6px 0)' },
      { opacity: 1, transform: 'none', clipPath: 'inset(-6px 0 -6px 0)' },
    ], { duration: 520, delay, easing: EASE, fill: 'backwards' });
    if (el.matches('h3')) anim(dlg, el, [{ fontStretch: '62%' }, { fontStretch: '125%' }], { duration: 900, delay, easing: EASE, fill: 'backwards' });
    if (el.matches('li')) anim(dlg, el, [{ background: '#DF6826', boxShadow: '0 0 12px 2px rgba(223,104,38,.8)' }, {}], { duration: 700, delay: delay + 200, easing: 'ease-out', pseudoElement: '::before' });
    $$('.dossier-tags li', el).forEach((tag, j) => anim(dlg, tag, [
      { opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.08)', offset: 0.6 }, { opacity: 1, transform: 'none' },
    ], { duration: 420, delay: delay + 180 + j * 70, easing: EASE, fill: 'backwards' }));
  });
}

function closeDossier(dlg) {
  if (!dlg.open || dlg.closing) return;
  if (reduce || !dlg.zoomBtn) { dlg.close(); return; }
  dlg.closing = true;
  stopAnims(dlg);
  const sheet = $('.dossier-sheet', dlg), [b1, b2] = beams(dlg), g = geometry(dlg), { s, b, cy, cx } = g;
  const T1 = 180, T2 = 300, T3 = 360, done = { fill: 'forwards' };
  // the contents fade, the sheet scans shut to a beam...
  $$(':scope > *', sheet).forEach((el) => anim(dlg, el, { opacity: [1, 0] }, { duration: T1, easing: 'ease-in', ...done }));
  for (const [el, edge] of [[b1, g.top], [b2, g.bottom]]) {
    anim(dlg, el, [place(s.left, edge - 1, s.width, 2, 0), { ...place(s.left, edge - 1, s.width, 2), offset: 0.15 }, place(s.left, cy - 1, s.width, 2)], { duration: T2, delay: T1 * 0.5, easing: EASE_IN, fill: 'both' });
  }
  anim(dlg, sheet, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: `inset(${cy - s.top}px 0 ${s.bottom - cy}px 0)` }], { duration: T2, delay: T1 * 0.5, easing: EASE_IN, ...done });
  // ...the beam folds into the chip, and the chip flies home into its button
  anim(dlg, b2, { opacity: [1, 0] }, { duration: 1, delay: T1 * 0.5 + T2, ...done });
  anim(dlg, b1, [
    { ...place(s.left, cy - 1, s.width, 2), easing: EASE_IN },
    { ...place(cx - 7, cy - 7, 14, 14), offset: 0.45, easing: 'cubic-bezier(.5, 0, .2, 1)' },
    place(b.left + b.width - 26, b.top + b.height / 2 - 5, 10, 10, 0.2),
  ], { duration: T3, delay: T1 * 0.5 + T2, ...done });
  anim(dlg, dlg, { opacity: [1, 0] }, { duration: T1 * 0.5 + T2 + T3, easing: 'ease-in', pseudoElement: '::backdrop', ...done });
  setTimeout(() => {
    dlg.close();
    stopAnims(dlg);
    dlg.closing = false;
    // the chip lands: the button's pad flashes
    $('.pad', dlg.zoomBtn).animate([{ background: '#fff', boxShadow: '0 0 14px 4px rgba(223,104,38,.9)' }, {}], { duration: 500, easing: 'ease-out' });
  }, T1 * 0.5 + T2 + T3);
}
$$('.about-btn').forEach((btn) => btn.addEventListener('click', () => {
  const dlg = document.getElementById(btn.dataset.about);
  if (dlg) openDossier(dlg, btn);
}));
$$('.dossier').forEach((dlg) => {
  dlg.addEventListener('close', () => document.documentElement.classList.remove('no-scroll'));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDossier(dlg); }); // Esc
  $('form', dlg).addEventListener('submit', (e) => { e.preventDefault(); closeDossier(dlg); }); // the Close button
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) { closeDossier(dlg); return; } // a click outside the sheet closes it
    const link = e.target.closest('a[href^="#"]'); // "Start a project": close, let the page scroll again, then travel
    if (!link) return;
    e.preventDefault();
    dlg.close(); // closing returns focus to the button, which would stop a scroll that had already started
    document.documentElement.classList.remove('no-scroll');
    const target = $(link.getAttribute('href'));
    requestAnimationFrame(() => target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));
    history.replaceState(null, '', link.getAttribute('href'));
  });
});

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

/* ---------- Contact: the logo's disc, drawn as a specification the first time it comes into view ---------- */
const mark = { anchor: $('.panel-anchor'), born: -1 };
function contactMark(now) {
  const a = rect(mark.anchor);
  if (!onScreen(a, a.height)) return null;
  if (mark.born < 0 && powerAt >= 0 && a.top < innerHeight * 0.85) mark.born = now;
  const k = reduce ? 1 : mark.born < 0 ? 0 : clamp((now - mark.born) / 1800);
  return { x: a.left + a.width / 2, y: a.top + a.height * 0.42, r: Math.min(a.width, a.height) * 0.28, k };
}

/* ---------- The page prints itself as you read: each block is swept in when it first appears ---------- */
const prints = reduce ? [] : $$('.hero-title .l, .audience .kicker, .audience-statement, .audience-cols > div, .process .kicker, .faq .kicker, .qa, .contact > :not(.panel-anchor), .credits > *');
prints.forEach((el) => el.classList.add('gen'));
function startPrinting() {
  if (!prints.length) return;
  const io = new IntersectionObserver((entries) => {
    let k = 0; // blocks that appear together print one after another
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target, delay = k++ * 110;
      io.unobserve(el);
      el.style.setProperty('--d', `${delay}ms`);
      el.classList.add('is-printed');
      setTimeout(() => el.classList.add('is-done'), delay + 1000);
    }
  }, { rootMargin: '0px 0px -6% 0px' });
  prints.forEach((el) => io.observe(el));
}

/* ---------- Navigation: the core shows where you are and opens a map of the site ---------- */
const nav = {
  btn: $('.core-btn'), read: $('.core-section'), disc: $('.core-disc'), fill: $('.dial-fill'), ticks: $('.dial-ticks'),
  map: $('#sitemap'), list: $('#sitemap nav'), trunk: $('.map-trunk'), hot: $('.map-hot'), nodes: $$('.map-node'),
  sections: $$('main > section'), current: '', open: false, geo: null,
};
const DIAL = 2 * Math.PI * 21; // the dial's circumference in its own units
const NAMES = { hero: 'Start', services: 'Services', work: 'Work', audience: 'Who we work with', process: 'Process', faq: 'Questions', contact: 'Contact' };

function setReadout(text) {
  nav.btn.setAttribute('aria-label', nav.open ? 'Close site map' : `Site map. You are in ${text}`);
  if (nav.read.textContent === text) return;
  nav.read.classList.add('is-swapping');
  nav.read.textContent = text;
  void nav.read.offsetHeight; // commit the start position, then let it rise into place
  nav.read.classList.remove('is-swapping');
}

function updateNav() {
  const total = document.documentElement.scrollHeight - innerHeight;
  nav.fill.style.strokeDashoffset = (DIAL * (1 - clamp(total > 0 ? scrollY / total : 0))).toFixed(2);
  const mid = innerHeight / 2;
  const sec = nav.sections.find((s) => { const r = rect(s); return r.top <= mid && r.bottom > mid; });
  if (!sec || sec.id === nav.current) return;
  nav.current = sec.id;
  nav.nodes.forEach((n) => (n.dataset.for === sec.id ? n.setAttribute('aria-current', 'location') : n.removeAttribute('aria-current')));
  if (!nav.open) setReadout(NAMES[sec.id]);
}

// A tick on the dial wherever a section starts
function buildDial() {
  const total = document.documentElement.scrollHeight - innerHeight;
  nav.ticks.innerHTML = nav.sections.slice(1).map((s) => {
    const a = clamp(s.offsetTop / total) * Math.PI * 2;
    return `<line x1="${24 + Math.cos(a) * 17.5}" y1="${24 + Math.sin(a) * 17.5}" x2="${24 + Math.cos(a) * 24.5}" y2="${24 + Math.sin(a) * 24.5}"></line>`;
  }).join('');
}

// The circuit: from the core, across to a bus line, down, and a branch into each section
function drawMap(animate) {
  const d = rect(nav.disc), cx = d.left + d.width / 2, cy = d.top + d.height / 2;
  nav.map.style.setProperty('--cx', `${cx}px`);
  nav.map.style.setProperty('--cy', `${cy}px`);
  const box = rect(nav.list), padLeft = box.left, busX = padLeft - 34, j = 12;
  const ys = nav.nodes.map((n) => box.top + n.offsetTop + n.offsetHeight / 2);
  const y0 = box.top - 30; // the trace drops out of the core and crosses below the header, clear of the logo
  nav.geo = { cx, cy, busX, j, padLeft, ys, y0 };
  let path = `${mapHead(nav.geo)} L${busX},${ys[ys.length - 1] - j}`;
  ys.forEach((y) => { path += ` M${busX},${y - j} L${busX + j},${y} L${padLeft},${y}`; });
  nav.trunk.setAttribute('d', path);
  const len = nav.trunk.getTotalLength();
  nav.trunk.style.transition = 'none';
  nav.trunk.style.strokeDasharray = `${len} ${len}`;
  nav.trunk.style.strokeDashoffset = animate ? len : 0;
  if (animate) {
    void nav.trunk.getBoundingClientRect();
    nav.trunk.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.2, .7, .1, 1) .15s';
    nav.trunk.style.strokeDashoffset = 0;
  }
}

// From the bottom of the core, down, then across to the top of the bus line
const mapHead = ({ cx, cy, busX, j, y0 }) => `M${cx},${cy + 14} L${cx},${y0 - j} L${cx - j},${y0} L${busX + j},${y0} L${busX},${y0 + j}`;

// Hovering a section sends a signal from the core to it
function signalTo(i) {
  if (!nav.geo) return;
  const { busX, j, padLeft, ys } = nav.geo, y = ys[i];
  nav.hot.setAttribute('d', `${mapHead(nav.geo)} L${busX},${y - j} L${busX + j},${y} L${padLeft},${y}`);
  const len = nav.hot.getTotalLength();
  nav.hot.style.transition = 'none';
  nav.hot.style.strokeDasharray = `${len} ${len}`;
  nav.hot.style.strokeDashoffset = len;
  nav.hot.style.opacity = 1;
  void nav.hot.getBoundingClientRect();
  nav.hot.style.transition = 'stroke-dashoffset .5s cubic-bezier(.2, .7, .1, 1)';
  nav.hot.style.strokeDashoffset = 0;
}

function openMap() {
  nav.open = true;
  document.documentElement.classList.add('no-scroll');
  body.classList.add('map-open');
  nav.map.classList.add('is-open');
  nav.btn.setAttribute('aria-expanded', 'true');
  setReadout('Close');
  drawMap(true);
  nav.nodes[0].focus({ preventScroll: true });
}
function closeMap() {
  nav.open = false;
  document.documentElement.classList.remove('no-scroll');
  body.classList.remove('map-open');
  nav.map.classList.remove('is-open');
  nav.btn.setAttribute('aria-expanded', 'false');
  nav.hot.style.opacity = 0;
  setReadout(NAMES[nav.current] || 'Start');
}

nav.btn.addEventListener('click', () => (nav.open ? closeMap() : openMap()));
// Any link closes the map (and the page then travels there); a click on empty space just closes it
nav.map.addEventListener('click', (e) => { if (e.target.closest('a') || !e.target.closest('nav')) closeMap(); });
$('.brand').addEventListener('click', () => nav.open && closeMap());
nav.nodes.forEach((n, i) => {
  n.addEventListener('pointerenter', () => signalTo(i));
  n.addEventListener('focus', () => signalTo(i));
});
addEventListener('keydown', (e) => {
  if (!nav.open) return;
  if (e.key === 'Escape') { closeMap(); nav.btn.focus(); return; }
  if (e.key === 'Tab') { // keep focus on the core and the map while it is open
    const stops = [nav.btn, ...$$('a', nav.map)], i = stops.indexOf(document.activeElement);
    const next = e.shiftKey ? (i <= 0 ? stops.length - 1 : i - 1) : (i === stops.length - 1 ? 0 : i + 1);
    stops[next].focus();
    e.preventDefault();
  }
});

/* ---------- Frame loop ---------- */
let powerAt = -1, last = 0;

function frame(now) {
  tick(now);
  requestAnimationFrame(frame);
}

function tick(now) {
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  const h = updateHero();
  const l = updateLab(now);
  const models = updateWork();
  updateProcess();
  updateNav();

  body.classList.toggle('on-light', (h.visible && h.white > 0.5) || l.light);
  body.style.setProperty('--nav-shade', h.visible ? (1 - clamp(h.white * 2)).toFixed(3) : '1');
  if (l.covers) return; // the lab hides the machine room completely

  if (h.visible && powerAt >= 0 && !reduce) {
    const over = mouse.y > h.y && mouse.y < h.y + h.h;
    hero.circuit.update(dt, over ? { x: mouse.x - h.x, y: mouse.y - h.y, active: now - mouse.t < 400 } : null);
  }
  engine.render({
    time: reduce ? 20 : now / 1000, dt, scroll: scrollY, still: reduce, rule: powerAt >= 0, models,
    circuit: h.visible ? { c: hero.circuit, x: h.x, y: h.y } : null,
    wave: h.visible && h.wave > 0 ? { k: h.wave, x: h.x, y: h.y, w: h.w, h: h.h } : null,
    mark: contactMark(now),
  });
}

function resize() {
  engine.resize();
  layoutHero();
  labView.resize();
  buildRoute();
  buildDial();
  if (nav.open) drawMap(false);
}
let resizeTimer = 0;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

/* ---------- Opening: the loader powers up, its disc drops onto the board as the chip, the board grows ---------- */
const loader = $('.loader');

// The dial fills as the page gets ready, never faster than 0.9 s; resolves at 100%
function load(ready) {
  return new Promise((done) => {
    const pct = $('.loader-pct', loader), fill = $('.ld-fill', loader), LEN = 2 * Math.PI * 56, t0 = performance.now();
    let ok = false, shown = 0;
    ready.then(() => (ok = true));
    const iv = setInterval(() => {
      const t = performance.now() - t0;
      const goal = Math.min(ok ? 100 : 30 + 55 * (1 - Math.exp(-t / 900)), t / 9);
      shown += (goal - shown) * 0.3;
      if (goal === 100 && shown > 99.5) shown = 100;
      pct.textContent = Math.round(shown);
      fill.style.strokeDashoffset = (LEN * (1 - shown / 100)).toFixed(1);
      if (shown === 100) { clearInterval(iv); done(); }
    }, 30);
  });
}

function power() {
  powerAt = performance.now();
  hero.circuit.lit = true;
  body.classList.add('is-ready');
  startPrinting();
  setTimeout(() => body.classList.add('is-settled'), 2600);
}

async function start() {
  const ready = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(() => {
    resize();
    requestAnimationFrame(frame);
  });
  if (!loader || reduce) { await ready; loader?.remove(); power(); return; }
  await load(ready);
  // the disc travels to the chip on the board and becomes its die
  const disc = $('.loader-disc', loader), d = rect(disc), st = rect(hero.stage), c = hero.circuit.chip;
  const tx = st.left + c.x, ty = st.top + c.y;
  if (ty > 0 && ty < innerHeight) disc.style.transform = `translate(${tx - (d.left + d.width / 2)}px, ${ty - (d.top + d.height / 2)}px) scale(${(2 * c.rad) / d.width})`;
  else disc.style.opacity = 0; // the page opened further down: no chip to land on
  loader.classList.add('is-leaving');
  setTimeout(power, 750);
  setTimeout(() => loader.remove(), 1400);
}
start();

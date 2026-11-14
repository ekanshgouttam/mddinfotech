// The universe layer: one full-screen WebGL pass that draws the starfield, the star
// (the orange disc from the logo, alive) and the project planets. The page tells it
// where things are each frame; it draws them.

const VERT = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.,-1.), vec2(3.,-1.), vec2(-1.,3.));
void main(){ gl_Position = vec4(P[gl_VertexID], 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 o;

uniform vec2 uRes;
uniform float uTime, uScale;
uniform vec2 uShift;          // starfield parallax, px
uniform float uStars;
uniform vec4 uSun;            // x, y, radius (px, y up), amount
uniform vec4 uSunFx;          // ignite, shock, whiteout, flare strength
uniform vec2 uMouse;          // px, y up
uniform vec2 uFlare;          // angle, age (s)
uniform vec4 uPl0, uPl1;      // planets: x, y, radius, amount
uniform vec2 uPlType;         // planet types for slot 0 and 1

const vec3 LAB = vec3(.945, .953, .965);

// Simplex noise (Ashima Arts / Ian McEwan, MIT)
vec3 mod289(vec3 x){ return x - floor(x * (1. / 289.)) * 289.; }
vec4 mod289(vec4 x){ return x - floor(x * (1. / 289.)) * 289.; }
vec4 permute(vec4 x){ return mod289(((x * 34.) + 10.) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - .85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1. / 6., 1. / 3.);
  const vec4 D = vec4(0., .5, 1., 2.);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1. - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0., i1.z, i2.z, 1.)) + i.y + vec4(0., i1.y, i2.y, 1.)) + i.x + vec4(0., i1.x, i2.x, 1.));
  vec3 ns = .142857142857 * D.wyz - D.xzx;
  vec4 j = p - 49. * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7. * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1. - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2. + 1.;
  vec4 s1 = floor(b1) * 2. + 1.;
  vec4 sh = -step(h, vec4(0.));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x), p1 = vec3(a0.zw, h.y), p2 = vec3(a1.xy, h.z), p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.);
  m = m * m;
  return 105. * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * snoise(p); p *= 2.03; a *= .5; } return s; }
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }

// ---------- Background ----------
vec3 sky(vec2 px){
  vec3 c = vec3(.016, .024, .047);
  // faint nebula in the logo's blue
  float n = snoise(vec3((px + uShift * .1) / (uRes.y * .7), uTime * .01)) * .5 + snoise(vec3((px + uShift * .1) / (uRes.y * .3), 3.)) * .25;
  c += vec3(.05, .07, .19) * smoothstep(-.1, .8, n) * .5;
  for (int l = 0; l < 3; l++) {
    float fl = float(l);
    float cell = (110. - fl * 32.) * uScale;
    vec2 q = (px + uShift * (.15 + fl * .3)) / cell;
    vec2 id = floor(q), f = fract(q);
    float h = hash(id + fl * 31.7);
    vec2 pos = vec2(hash(id + 3.1 + fl), hash(id + 7.7 + fl)) * .8 + .1;
    float d = length(f - pos) * cell;
    float size = (.5 + h * 1.2) * uScale;
    float tw = .6 + .4 * sin(uTime * (.8 + h * 2.5) + h * 40.);
    vec3 tint = mix(vec3(.72, .8, 1.), vec3(1., .86, .7), hash(id + 9.));
    c += tint * smoothstep(size + uScale, 0., d) * step(.62, h) * tw * (.5 + fl * .3);
  }
  return c * uStars;
}

// ---------- The star ----------
vec3 sunRamp(float h){
  vec3 c0 = vec3(.26, .04, .01), c1 = vec3(.62, .15, .03), c2 = vec3(.875, .408, .149), c3 = vec3(1., .67, .35), c4 = vec3(1., .95, .85);
  return h < .25 ? mix(c0, c1, h / .25) : h < .5 ? mix(c1, c2, (h - .25) / .25) : h < .75 ? mix(c2, c3, (h - .5) / .25) : mix(c3, c4, (h - .75) / .25);
}

vec3 sunSurface(vec3 n, float t){
  vec3 p = rotY(t * .025) * n;
  float w = snoise(p * 1.4 + vec3(0., 0., t * .04));
  float big = fbm(p * 2.6 + w * .7 + vec3(t * .02, 0., 0.));
  float gran = snoise(p * 38. + vec3(0., t * .3, 0.)) * .5 + .5;
  float fil = 1. - abs(snoise(p * 5. + w * .8 + vec3(0., t * .03, 0.)));   // bright magnetic filaments
  float h = .64 + big * .24 + (gran - .5) * .24 + smoothstep(.92, 1., fil) * .14;
  h *= mix(.62, 1., pow(n.z, .7));
  return sunRamp(clamp(h, 0., 1.)) * (.32 + .82 * pow(n.z, .5));
}

vec3 drawSun(vec2 px, vec3 col){
  float R = uSun.z * uSunFx.x;
  if (uSun.w <= 0. || R < .5) return col;
  vec2 d = px - uSun.xy;
  float dist = length(d), r = dist / R, t = uTime;
  vec2 dir = d / max(dist, 1e-4);
  vec3 add = vec3(0.);

  // the mouse pulls the corona toward it
  vec2 dm = uMouse - uSun.xy;
  float boost = smoothstep(R * 2.8, R * 1.02, length(dm)) * pow(max(dot(dir, normalize(dm + 1e-4)), 0.), 6.);

  if (r < 4.5) {
    float rr = max(r - 1., 0.);
    float reach = 1. + boost * 2.5;
    float n1 = snoise(vec3(dir * 3.2, rr * 1.8 - t * .12)) * .5 + .5;
    float n2 = snoise(vec3(dir * 9., rr * 4. - t * .25)) * .5 + .5;
    float glow = exp(-rr * 7. / reach) * (.3 + .95 * n1 * n2) + exp(-rr * 1.6) * .2 + exp(-rr * .6) * .06;
    float prom = smoothstep(.6, .85, snoise(vec3(dir * 5., t * .12 + rr * 6.))) * exp(-rr * 20.);
    add += mix(vec3(.8, .22, .05), vec3(1., .6, .27), exp(-rr * 5.)) * glow * (1. + boost) + vec3(1., .55, .2) * prom * 1.5;

    // a flare: click sends a jet out of the limb
    if (uSunFx.w > 0.) {
      vec2 fd = vec2(cos(uFlare.x), sin(uFlare.x));
      float proj = dot(d / R, fd);
      float perp = length(d / R - fd * proj) + snoise(vec3(proj * 5., uFlare.y * 1.5, 0.)) * .025 * proj;
      float front = 1. + uFlare.y * 1.7;
      float jet = exp(-perp * perp / (.0008 + uFlare.y * .005)) * smoothstep(.97, 1.03, proj) * smoothstep(front + .05, front - .6, proj);
      add += vec3(1., .72, .42) * jet * max(0., 1. - uFlare.y / 2.4) * 2.2 * uSunFx.w;
    }

    // ignition shockwave
    float rs = 1. + uSunFx.y * 2.6;
    add += vec3(1., .75, .5) * exp(-pow((r - rs) * R / (R * .025 + 2.), 2.)) * (1. - uSunFx.y) * 1.3 * step(.001, uSunFx.y);
  }
  col += add * uSun.w;

  if (r < 1.) {
    vec3 n = vec3(d / R, 0.);
    n.z = sqrt(max(0., 1. - dot(n.xy, n.xy)));
    vec3 s = sunSurface(n, t) * (1. + (1. - uSunFx.x) * 2.);
    float edge = smoothstep(1., 1. - 1.5 / R, r);
    col = mix(col, s, edge * uSun.w);
  }

  // anamorphic streak in the logo's blue: a lens effect, so it lies over everything
  float sy = abs(d.y) / (R * .016 + 1.5 * uScale);
  col += (vec3(.43, .55, 1.) * exp(-sy) * exp(-abs(d.x) / (uRes.x * .42)) * .55
        + vec3(1., .9, .8) * exp(-sy) * exp(-abs(d.x) / (R * .55)) * .3) * uSun.w * min(uSunFx.x, 1.);
  return col;
}

// ---------- Planets ----------
vec3 planetSurface(float type, vec3 p, float t){
  if (type < .5) {            // amber gas giant
    float w = fbm(vec3(p.x * 1.5, p.y * 9., p.z * 1.5) + vec3(t * .03, 0., 0.));
    float b = sin(p.y * 22. + w * 4.) * .5 + .5;
    vec3 c = mix(vec3(.36, .15, .06), vec3(.93, .6, .28), b);
    return mix(c, vec3(.99, .86, .62), smoothstep(.55, .9, sin(p.y * 7. + w * 2.) * .5 + .5) * .45);
  }
  if (type < 1.5) {           // violet storm world
    float w = fbm(p * vec3(2., 6., 2.) + vec3(0., 0., t * .04));
    float b = sin(p.y * 14. + w * 5.) * .5 + .5;
    vec3 c = mix(vec3(.16, .07, .3), vec3(.84, .42, .76), b);
    return mix(c, vec3(.44, .52, 1.), smoothstep(.55, 1., w) * .55);
  }
  if (type < 2.5) {           // sandstone desert
    float h = fbm(p * 2.5);
    float ridge = 1. - abs(snoise(p * 5.));
    vec3 c = mix(vec3(.5, .32, .18), vec3(.93, .78, .55), smoothstep(-.3, .5, h));
    c *= .78 + .3 * smoothstep(.7, 1., ridge);
    return mix(c, vec3(.28, .16, .09), smoothstep(.86, .97, ridge) * .6);
  }
  float n = fbm(p * 2.);      // ice
  float crack = smoothstep(.93, .99, 1. - abs(snoise(p * 7.)));
  vec3 c = mix(vec3(.6, .78, .87), vec3(.93, .97, 1.), n * .5 + .5);
  return mix(c, vec3(.18, .42, .58), crack * .7);
}

vec3 atmosphere(float type){
  return type < .5 ? vec3(1., .62, .3) : type < 1.5 ? vec3(.86, .5, 1.) : type < 2.5 ? vec3(1., .7, .45) : vec3(.5, .85, 1.);
}

vec4 ring(vec2 q){            // the gas giant's rings, q in planet radii
  float a = -.38, c = cos(a), s = sin(a);
  vec2 u = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  float rho = length(vec2(u.x, u.y / .26));
  float band = smoothstep(1.38, 1.44, rho) * smoothstep(2.08, 1.98, rho);
  float tex = .55 + .45 * sin(rho * 46.) * sin(rho * 13. + 1.);
  float gap = smoothstep(.02, .0, abs(rho - 1.74));
  // alpha carries a sign: negative for the near half (drawn over the planet), positive for the far half
  return vec4(mix(vec3(.82, .62, .4), vec3(1., .88, .7), tex) * .85, band * (.75 - gap * .6) * (.55 + .45 * tex) * (step(0., u.y) * 2. - 1.));
}

vec3 drawPlanet(vec2 px, vec4 P, float type, vec3 col){
  if (P.w <= 0. || P.z < 1.) return col;
  vec2 q = (px - P.xy) / P.z;
  float r = length(q);
  if (r > 2.5) return col;
  vec3 atm = atmosphere(type);
  vec3 L = normalize(vec3(-.65, .35, .65));
  vec4 rg = type < .5 ? ring(q) : vec4(0.);
  bool front = rg.a < 0.;
  rg.a = abs(rg.a);

  vec3 c = col;
  if (!front && rg.a > 0. && r > 1.) c = mix(c, rg.rgb, rg.a * P.w);  // back of ring, hidden by the planet

  // halo
  float lit = max(dot(normalize(vec3(q, .3)), L), 0.);
  c += atm * exp(-max(r - 1., 0.) * 22.) * (.15 + .85 * lit) * .55 * P.w * step(1., r);

  if (r < 1.) {
    vec3 n = vec3(q, sqrt(1. - r * r));
    vec3 p = rotY(uTime * .06) * rotX(.35) * n;
    vec3 s = planetSurface(type, p, uTime);
    float diff = smoothstep(-.12, 1., dot(n, L));
    vec3 shade = s * (.025 + diff * 1.05);
    if (type > 2.5) shade += vec3(1., .78, .5) * step(.78, snoise(p * 38.)) * smoothstep(.1, -.2, dot(n, L)) * .9; // city lights at night
    shade += atm * pow(1. - n.z, 2.6) * (.15 + diff) * .8;
    float edge = smoothstep(1., 1. - 1.5 / P.z, r);
    c = mix(c, shade, edge * P.w);
  }
  if (front && rg.a > 0.) c = mix(c, rg.rgb * (.35 + .65 * smoothstep(-.4, .6, q.x * -.7 + q.y * .3 + .4)), rg.a * P.w);
  return c;
}

void main(){
  vec2 px = gl_FragCoord.xy;
  vec3 col = sky(px);
  col = drawSun(px, col);
  col = drawPlanet(px, uPl0, uPlType.x, col);
  col = drawPlanet(px, uPl1, uPlType.y, col);
  col = mix(col, LAB, uSunFx.z);
  col += (hash(px + fract(uTime) * 91.) - .5) / 255.;   // dither: no banding in the glow
  o = vec4(col, 1.);
}`;

function compile(gl) {
  const make = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = make(gl.VERTEX_SHADER, VERT), fs = make(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; }
  const u = {};
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
    const name = gl.getActiveUniform(p, i).name;
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

export class Universe {
  constructor(canvas) {
    this.canvas = canvas;
    this.ok = false;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) return;
    this.gl = gl;
    this.prog = compile(gl);
    if (!this.prog) return;
    this.vao = gl.createVertexArray();
    this.ok = true;
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    // The star is soft by nature: render below device resolution and keep the frame light.
    this.scale = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(1600000 / (w * h)));
    this.canvas.width = Math.round(w * this.scale);
    this.canvas.height = Math.round(h * this.scale);
  }

  // All positions in CSS px from the top-left of the viewport.
  render(s) {
    if (!this.ok) return;
    const gl = this.gl, { p, u } = this.prog, k = this.scale, H = this.canvas.height;
    const X = (x) => x * k, Y = (y) => H - y * k;
    gl.viewport(0, 0, this.canvas.width, H);
    gl.useProgram(p);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(u.uRes, this.canvas.width, H);
    gl.uniform1f(u.uTime, s.time);
    gl.uniform1f(u.uScale, k);
    gl.uniform2f(u.uShift, 0, -s.shift * k);
    gl.uniform1f(u.uStars, s.stars);
    gl.uniform4f(u.uSun, X(s.sun.x), Y(s.sun.y), s.sun.r * k, s.sun.amt);
    gl.uniform4f(u.uSunFx, s.ignite, s.shock, s.white, s.flare.strength);
    gl.uniform2f(u.uMouse, X(s.mouse.x), Y(s.mouse.y));
    gl.uniform2f(u.uFlare, -s.flare.angle, s.flare.age);
    const [a, b] = s.planets;
    gl.uniform4f(u.uPl0, X(a.x), Y(a.y), a.r * k, a.amt);
    gl.uniform4f(u.uPl1, X(b.x), Y(b.y), b.r * k, b.amt);
    gl.uniform2f(u.uPlType, a.type, b.type);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

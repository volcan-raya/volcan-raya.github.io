// The volcano: a plain truncated cone whose top is a flat black hole; and what it does: the pressure building, the
// eruption, the tremor, the words leaving the crater. What the files say to each other is in core.js.
(() => {
"use strict";
const { rand, clamp, lerp, smooth, $, reduce } = V;

// The world, in the volcano's own units: y up, the base at y = 0, the axis at x = z = 0. eye: the chamber's middle
// height; Rc: the chamber's radius
const VOL = { H: 16, Rb: 48, Rt: 2.8, eye: 2, Rc: 4.6 };   // a mountain, broad and low as 2.00's (about 20°), the hole small on it; the chamber as in 1.00
const SLOPE = (VOL.Rb - VOL.Rt) / VOL.H;

// ================= its part of the picture (see field.js) =================
// the hole (what = 2) and the cone's side (what = 1), nearer than best, along the ray from p, not before lo. PIVOT is the
// point the rays are measured from, on the axis at the chamber's height, so the far eye of the long lens loses no precision
const glsl = `
const float VH = ${VOL.H.toFixed(3)}, RB = ${VOL.Rb.toFixed(3)}, RT = ${VOL.Rt.toFixed(3)}, VE = ${VOL.eye.toFixed(3)}, M = ${SLOPE.toFixed(6)};
const vec3 PIVOT = vec3(0., VE, 0.);
void volcanoHit(vec3 p, vec3 rd, float lo, inout float best, inout vec3 N) {
  if (abs(rd.y) > 1e-5) {
    float t = (VH - p.y) / rd.y; vec2 h = p.xz + rd.xz * t;
    if (t > lo && t < best && dot(h, h) < RT * RT) { best = t; N = vec3(0., 1., 0.); what = 2.; }
  }
  float k = RB - M * p.y, a = dot(rd.xz, rd.xz) - M * M * rd.y * rd.y;
  float b = 2. * (dot(p.xz, rd.xz) + M * rd.y * k), c = dot(p.xz, p.xz) - k * k, disc = b * b - 4. * a * c;
  if (disc >= 0. && abs(a) >= 1e-6) {
    float s = sqrt(disc), t1 = (-b - s) / (2. * a), t2 = (-b + s) / (2. * a);
    for (int i = 0; i < 2; i++) {
      float t = i == 0 ? t1 : t2, y = p.y + rd.y * t;
      if (t > lo && t < best && y > 0. && y < VH) { vec3 h = p + rd * t; best = t; N = normalize(vec3(h.x, M * length(h.xz), h.z)); what = 1.; }
    }
  }
}
// the hole is black; the cone's side is the terrain's white, with its lines (terrain.js)
bool volcanoColour(out vec3 c) { if (what > 1.5 && what < 2.5) { c = vec3(0.); return true; } return false; }
`;

// ================= pressure =================
// Pressure builds with time and with every note that comes in. It isn't shown as a number: inside, the view trembles
// more and more; outside, the sky turns (terrain.js). At the top it erupts: one strong shake, words leaving the crater,
// the dots jolted; then it starts again from zero. The camera stays where it is.
const FILL_TIME = 180, PER_NOTE = .12;        // seconds to fill with nobody writing; what one note adds
let pressure = 0, phase = "build", phaseT = 0, shake = 0, nextSmall = 14;
function addPressure(x) { if (phase === "build") pressure = Math.min(1, pressure + x); }
const inside = () => V.camera.cam ? V.camera.cam.inside : 1;   // the build-up is felt in the soup; outside it is seen in the colour
function updatePressure(dt) {
  phaseT += dt;
  if (phase === "build") {
    pressure = Math.min(1, pressure + dt / FILL_TIME);
    if (pressure >= 1) { phase = "seal"; phaseT = 0; }
    if (V.soup.texts().length && (nextSmall -= dt) <= 0) {   // now and then a small tremor
      nextSmall = rand(22, 50) * lerp(1, .45, pressure);
      shake = Math.max(shake, 2.5 * inside());
    }
  } else if (phase === "seal") {
    if (phaseT > 1.4) { phase = "settle"; phaseT = 0; erupt(); }
  } else if (phase === "settle") {
    pressure = Math.max(0, pressure - dt * 1.5);
    if (phaseT > 2) { phase = "build"; phaseT = 0; pressure = 0; }
  }
}
function erupt() {
  shake = 20; spill();
  V.soup.jolt(reduce.matches ? .4 : 1);
}
function tremor(t) {
  const amp = reduce.matches ? 0 : (pressure * pressure * 2.5 + (phase === "seal" ? 1.5 + phaseT * 4 : 0)) * inside() + shake;
  const view = V.view;
  if (amp < .05) { if (view.style.transform) view.style.transform = ""; return; }
  const x = amp * (.6 * Math.sin(t * 61) + .4 * Math.sin(t * 83 + 1.3)), y = amp * (.6 * Math.sin(t * 57 + 2) + .4 * Math.sin(t * 91 + .4));
  view.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}

// ================= the eruption, seen from outside =================
// Only what was written comes out: text posts and comments; a picture or a voice stays what it is. Each word goes one
// of two ways:
//   smoke  it rises out of the hole, swaying and drifting off to one side as a plume does, its letters growing as it
//          climbs, grey, thinning out until it is gone
//   lava   it pours over the rim and flows down the outside of the cone, along the slope, slowing as it comes to the
//          foot, where it lies and cools, red-orange to black, then fades. What is behind the cone is hidden by it
// How many go each way is DEV's "lava share". And between eruptions the volcano is never quite still: now and then a
// word escapes on its own, as smoke, carried by a wind that turns slowly; a little more often as the pressure builds
// (DEV: "steady smoke", words a minute, 0 for none).
const FW = .3, FLY_MIN = 11, SLANT = Math.hypot(VOL.H, VOL.Rb - VOL.Rt), HOT = [255, 69, 0];
const lfont = () => `500 100px ${V.type()}`;
let flyers = [], lavaShare = V.store.get("volcano-v11-lava", .5), steady = V.store.get("volcano-v11-steady", 12);
let windA = rand(0, 6.28), nextPuff = 2;
function word(text, lava, extra) {
  const letters = [...text].map(ch => ({ ch, w: V.mctx.measureText(ch).width / 100 }));
  const f = { letters, em: letters.reduce((a, L) => a + L.w, 0), lava, age: 0, gone: false, ph: rand(0, 6.28), freq: rand(.8, 1.2), ...extra };
  f.v = f.speed;
  flyers.push(f);
}
const smokeOf = (wind, head) => ({ a: rand(0, 6.28), start: rand(.2, .8) * VOL.Rt, wind, speed: rand(1.6, 2.1), size: 1.4, head });
// one word escaping on its own, one not already in the air
function puff() {
  const flying = new Set(flyers.map(f => f.text)), pool = V.soup.texts().filter(t => t && !flying.has(t));
  if (!pool.length) return;
  const text = pool[Math.floor(Math.random() * pool.length)];
  V.mctx.font = lfont();
  word(text, false, { ...smokeOf(windA + rand(-.35, .35), 0), text });
}
function updatePuffs(dt) {
  windA += dt * .02 * Math.sin(phaseT * .05 + 1);   // the wind turns, slowly
  if (steady <= 0 || phase !== "build" || (nextPuff -= dt) > 0) return;
  puff();
  nextPuff = 60 / steady * rand(.6, 1.4) * lerp(1, .5, pressure);
}
function spill() {
  const pool = V.soup.texts().filter(Boolean), cam = V.camera.cam, mctx = V.mctx;
  const n = Math.min(reduce.matches ? 6 : 10, pool.length);
  const facing = Math.atan2(cam.z, cam.x), right = Math.atan2(cam.rt[2], cam.rt[0]);   // the side of the cone the eye sees; the view's right
  mctx.font = lfont();
  const nLava = Math.round(n * lavaShare);
  let iLava = 0;
  for (let k = 0; k < n; k++) {
    const text = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], lava = (k + .5) / n < lavaShare, head = -k * .8 - rand(0, 1);
    // lava: spread evenly over the side that is seen, so no two runs lie on each other
    if (lava) word(text, true, { text, head, a: facing + lerp(-1.25, 1.25, nLava > 1 ? iLava++ / (nLava - 1) : .5) + rand(-.08, .08), speed: rand(2.2, 2.8), size: .8 });
    else word(text, false, { text, ...smokeOf(right + (Math.random() < .5 ? 0 : Math.PI) + rand(-.5, .5), head) });
  }
}
// where a word's way is, u along it: smoke goes up and off with the wind, swaying; lava follows the cone's side
function pathAt(f, u) {
  if (f.lava) {
    const sl = clamp(u, 0, SLANT + .6), on = Math.min(sl, SLANT) / SLANT;   // past the foot, a little way out on the disc
    const r = lerp(VOL.Rt, VOL.Rb, on) + Math.max(0, sl - SLANT) + .04, y = Math.max(0, VOL.H * (1 - on)) + .02;
    const a = f.a + .05 * Math.sin(u * f.freq * 1.3 + f.ph);                // it meanders a little as it runs
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  }
  const drift = .15 * u + .035 * u * u, sway = .35 * smooth(0, 3, u) * Math.sin(u * f.freq + f.ph);
  return [Math.cos(f.a) * f.start + Math.cos(f.wind) * drift - Math.sin(f.wind) * sway, VOL.H + .1 + 1.1 * u, Math.sin(f.a) * f.start + Math.sin(f.wind) * drift + Math.cos(f.wind) * sway];
}
function updateFlyers(dt) {
  const k = reduce.matches ? .6 : 1;
  for (const f of flyers) {
    f.age += dt;
    if (f.lava) { f.head += f.v * dt * k; if (f.head > 0) f.v *= Math.exp(-dt * f.speed / (SLANT + 1)); }   // it slows as it goes, and comes to rest near the foot
    else f.head += f.speed * dt * k;
    if (f.lava ? f.age > 30 : f.head - f.em * FW * 3 > 16) f.gone = true;
  }
  flyers = flyers.filter(f => !f.gone);
}
// smoke: how much of it is left at u along its way; lava: its colour and how much is left, by how long it has been out
const smokeAlpha = u => 1 - smooth(6, 15, u);
const lavaInk = f => { const c = smooth(3, 14, f.age); return `rgb(${HOT.map(v => Math.round(v * (1 - c))).join(",")})`; };
function drawFlyers(x) {
  const { W, H } = V.size(), cam = V.camera.cam, project = V.camera.project;
  x.textAlign = "center"; x.textBaseline = "middle"; x.font = lfont();
  for (const f of flyers) {
    if (f.head <= 0) continue;
    const span = f.em * FW * 1.7 * f.size * (f.lava ? 1 : 2.4) + 1, pts = [], M = 60;
    let seen = false;
    for (let u = Math.max(0, f.head - span); ; u = Math.min(f.head, u + .2)) {
      const w = pathAt(f, u), q = project(...w);
      if (q) {
        pts.push({ x: q.x, y: q.y, k: q.k, s: 0, u, w });
        if (q.x > -M && q.x < W + M && q.y > -M && q.y < H + M) seen = true;
      }
      if (u >= f.head) break;
    }
    if (!seen || pts.length < 2) continue;
    for (let i = 1; i < pts.length; i++) pts[i].s = pts[i - 1].s + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const S = pts[pts.length - 1].s;
    let seg = 0;
    const at = s => {                            // the point at screen length s along the way: where, its direction, how far along, in the world
      if (s <= pts[seg].s) seg = 0;
      while (seg < pts.length - 2 && pts[seg + 1].s < s) seg++;
      const a = pts[seg], b = pts[seg + 1], t = clamp((s - a.s) / ((b.s - a.s) || 1), 0, 1);
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), k: lerp(a.k, b.k, t), u: lerp(a.u, b.u, t), w: [0, 1, 2].map(i => lerp(a.w[i], b.w[i], t)), ang: Math.atan2(b.y - a.y, b.x - a.x) };
    };
    // the size of a letter here: smoke swells as it rises; lava is a little smaller
    const sizeAt = p => Math.max(FW * p.k * f.size * (f.lava ? 1 : 1 + .1 * p.u), FLY_MIN);
    if (f.lava) { x.fillStyle = lavaInk(f); x.globalAlpha = 1 - smooth(24, 30, f.age); }
    else x.fillStyle = "#3a3a3a";
    // always read from left to right: a word going left has its first letter at the head
    const back = pts[pts.length - 1].x < pts[0].x, px0 = sizeAt(pts[pts.length - 1]);
    let pos = back ? S : S - f.em * px0;
    for (const L of f.letters) {
      const p0 = at(clamp(pos, 0, S)), px = sizeAt(p0), adv = L.w * px, mid = back ? pos - adv / 2 : pos + adv / 2;
      pos += back ? -adv : adv;
      if (mid < 0) { if (back) break; continue; }
      if (L.ch === " ") continue;
      const p = at(clamp(mid, 0, S));
      if (f.lava) {                              // on the far side of the cone, hidden by it
        const [wx, wy, wz] = p.w, r = Math.hypot(wx, wz) || 1;
        if (wy > .03 && wx * (cam.x - wx) + SLOPE * r * (cam.y - wy) + wz * (cam.z - wz) < 0) continue;
      } else x.globalAlpha = smokeAlpha(p.u);
      let ang = back ? p.ang + Math.PI : p.ang;
      ang = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -1.45, 1.45);
      x.save(); x.translate(p.x, p.y); x.rotate(ang); x.scale(px / 100, px / 100); x.fillText(L.ch, 0, 0); x.restore();
    }
    x.globalAlpha = 1;
  }
}

// ================= DEV: the pressure, by hand =================
// drag the tube (or use the arrow keys on it), or press "erupt"
V.dev.tab("volcano", `
  <div id="tube" role="slider" tabindex="0" aria-label="Pressure: drag to set it" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="pFill"></span></div>
  <button id="pBoom" type="button">erupt</button>
  <span><span class="k">pressure </span><span id="pVal">0%</span></span>
  <label class="full"><span class="k">steady smoke, words a minute (0: none) </span><span id="steadyVal"></span><input type="range" id="steady" min="0" max="60" step="1"></label>
  <label class="full"><span class="k">lava share (the rest is smoke) </span><span id="lavaVal"></span><input type="range" id="lava" min="0" max="100" step="5"></label>`);
const tube = $("tube"), pFill = $("pFill"), pVal = $("pVal"), pBoom = $("pBoom");
const setFrom = e => { if (phase !== "build") return; const r = tube.getBoundingClientRect(); pressure = clamp((r.bottom - e.clientY) / r.height, 0, 1); };
tube.addEventListener("pointerdown", e => { tube.setPointerCapture(e.pointerId); setFrom(e); });
tube.addEventListener("pointermove", e => { if (tube.hasPointerCapture(e.pointerId)) setFrom(e); });
tube.addEventListener("keydown", e => {
  const step = { ArrowUp: .05, ArrowRight: .05, ArrowDown: -.05, ArrowLeft: -.05, PageUp: .2, PageDown: -.2 }[e.key];
  if (step == null || phase !== "build") return;
  e.preventDefault(); pressure = clamp(pressure + step, 0, 1);
});
pBoom.addEventListener("click", () => { if (phase === "build") pressure = 1; });
const lavaIn = $("lava"), showLava = () => { lavaIn.value = Math.round(lavaShare * 100); $("lavaVal").textContent = Math.round(lavaShare * 100) + "%"; };
lavaIn.addEventListener("input", () => { lavaShare = +lavaIn.value / 100; V.store.set("volcano-v11-lava", lavaShare); showLava(); });
showLava();
const steadyIn = $("steady"), showSteady = () => { steadyIn.value = steady; $("steadyVal").textContent = steady; };
steadyIn.addEventListener("input", () => { steady = +steadyIn.value; V.store.set("volcano-v11-steady", steady); nextPuff = Math.min(nextPuff, 60 / Math.max(1, steady)); showSteady(); });
showSteady();
function showDev() {
  pFill.style.height = `calc(${(pressure * 100).toFixed(2)}% - ${(pressure * 4).toFixed(2)}px)`;
  pVal.textContent = { build: Math.floor(pressure * 100) + "%", seal: "sealed", settle: "eruption" }[phase];
  tube.setAttribute("aria-valuenow", String(Math.round(pressure * 100)));
  pBoom.disabled = phase !== "build";
}

V.volcano = {
  VOL, SLOPE, addPressure, PER_NOTE, get pressure() { return pressure; }, get phase() { return phase; }, glsl,
  update(dt) { updatePressure(dt); shake *= Math.exp(-dt * 3); updatePuffs(dt); updateFlyers(dt); },
  drawMarks(x) { if (V.camera.cam.out) drawFlyers(x); },
  tremor, showDev,
};
})();

// The volcano, 3.00: only text. An emoji (🌋, drawn in field.js) and the words leaving its crater; the pressure building,
// the eruption, the tremor, as in 1.03, but flat: no cone, no slope in depth. What the files say to each other is in core.js.
(() => {
"use strict";
const { rand, clamp, lerp, smooth, $, reduce } = V;

// ================= pressure, as in 1.03 =================
// Pressure builds with time and with every note that comes in. Inside, the view trembles more and more; at the top it
// erupts: one strong shake, words leaving the crater, the balls thrown up; then it starts again from zero.
const FILL_TIME = 180, PER_NOTE = .12;
let pressure = 0, phase = "build", phaseT = 0, shake = 0, nextSmall = 14;
function addPressure(x) { if (phase === "build") pressure = Math.min(1, pressure + x); }
const inside = () => V.camera.cam ? V.camera.cam.inside : 0;
function updatePressure(dt) {
  phaseT += dt;
  if (phase === "build") {
    pressure = Math.min(1, pressure + dt / FILL_TIME);
    if (pressure >= 1) { phase = "seal"; phaseT = 0; }
    if (V.soup.texts().length && (nextSmall -= dt) <= 0) {
      nextSmall = rand(22, 50) * lerp(1, .45, pressure);
      shake = Math.max(shake, 2.5);
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
  V.soup.jolt(reduce.matches ? .4 : inside());
}
function tremor(t) {
  const amp = reduce.matches ? 0 : pressure * pressure * 2.5 + (phase === "seal" ? 1.5 + phaseT * 4 : 0) + shake;
  const view = V.view;
  if (amp < .05) { if (view.style.transform) view.style.transform = ""; return; }
  const x = amp * (.6 * Math.sin(t * 61) + .4 * Math.sin(t * 83 + 1.3)), y = amp * (.6 * Math.sin(t * 57 + 2) + .4 * Math.sin(t * 91 + .4));
  view.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}

// ================= the words leaving the crater =================
// Each word is a line of letters, straight out of the crater, as in the drawing for 3.00:
//   smoke  black, up and out in a fan, each word on its own ray, its letters growing a little as it goes, on until it
//          leaves the screen
//   lava   thrown out to one side, then down and away along a long line just under level, hot orange cooling to
//          a burnt brown, blurred by its heat; it keeps flowing, at an even pace, until it leaves the screen
// Everything is measured in E, the emoji's size, so the words keep their size against it. They always read from left to
// right: a word going left has its first letter at its head. Between eruptions a word escapes now and then, as smoke
// (DEV: "steady smoke", words a minute).
const HOT = [255, 140, 72], COOL = [70, 18, 4], SMOKE = "#000";
let wordSize = V.store.get("volcano-v15-wordsize", 15);   // % of the emoji
const lfont = () => `400 100px ${V.type()}`;
let flyers = [], lavaShare = V.store.get("volcano-v15-lava", .5), steady = V.store.get("volcano-v15-steady", 12);
let burst = V.store.get("volcano-v15-burst", 24), fan = V.store.get("volcano-v15-fan", 70);   // fan: how far from upright smoke can go, in degrees
let nextPuff = 2, windA = rand(-.3, .3);
function word(text, extra) {
  V.mctx.font = lfont();
  const letters = [...text].map(ch => ({ ch, w: V.mctx.measureText(ch).width / 100 }));
  flyers.push({ text, letters, em: letters.reduce((a, L) => a + L.w, 0), age: 0, gone: false, ...extra });
}
// smoke: a ray from the crater, ang from upright (- left, + right); head: how far its first letter is out, in E (below 0: not yet)
const smoke = (ang, head) => ({ lava: false, ang, head, speed: rand(.55, .8), grow: rand(.15, .35) });
// lava: a way in E from the crater: an arc out to one side, landing low on the volcano, then a long line down and away
const COOL_L = 3.4;                                // how far along its line (in E) a lava word takes to cool
const farE = () => { const { W, H } = V.size(), { E } = V.camera.volcano(); return Math.hypot(W, H) / Math.max(1, E); };   // past every border, from the crater
function lavaWay(side) {
  const pts = [], add = (x, y) => pts.push([x, y]);
  const land = [side * rand(.12, .3), rand(.18, .34)], up = rand(.1, .35);
  for (let k = 0; k <= 16; k++) { const t = k / 16; add(land[0] * t, land[1] * t - 4 * up * t * (1 - t)); }
  const dip = rand(12, 34) * Math.PI / 180, wob = rand(.01, .04), ph = rand(0, 6.28);
  for (let k = 1, n = Math.ceil((farE() + 4) / .06); k <= n; k++) {   // long enough to go off the screen
    const r = k * .06;
    add(land[0] + side * Math.cos(dip) * r, land[1] + Math.sin(dip) * r + Math.sin(r * 4 + ph) * wob * Math.min(1, r));
  }
  let l = 0; const way = pts.map((p, i) => { if (i) l += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return { p, l }; });
  return { pts: way, L: l, land: way[16].l };
}
const lava = (side, head) => ({ lava: true, way: lavaWay(side), head, fly: rand(1.4, 1.9), speed: rand(.35, .55) });
function puff() {
  const flying = new Set(flyers.map(f => f.text)), pool = V.soup.texts().filter(t => t && !flying.has(t));
  if (!pool.length) return;
  word(pool[Math.floor(Math.random() * pool.length)], smoke(windA + rand(-.25, .25), 0));
}
function updatePuffs(dt) {
  windA = clamp(windA + dt * rand(-.05, .05), -.6, .6);   // the wind wanders, slowly
  if (steady <= 0 || phase !== "build" || (nextPuff -= dt) > 0) return;
  puff();
  nextPuff = 60 / steady * rand(.6, 1.4) * lerp(1, .5, pressure);
}
function spill() {
  const texts = V.soup.texts().filter(Boolean);
  if (!texts.length) return;
  const n = reduce.matches ? Math.min(8, burst) : burst, pool = [];
  while (pool.length < n) { const round = texts.slice(); for (let i = round.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [round[i], round[j]] = [round[j], round[i]]; } pool.push(...round); }
  pool.length = n;
  const nLava = Math.round(n * lavaShare), nSmoke = n - nLava, gap = 16 / Math.max(16, n), F = fan * Math.PI / 180;
  // the smoke's rays spread over the fan in a shuffled order, so the first out are not all on one side
  const order = [...Array(nSmoke).keys()].sort(() => Math.random() - .5);
  let iS = 0, iL = 0;
  for (let k = 0; k < n; k++) {
    const isLava = (k + .5) / n < lavaShare, head = -(k * gap * .12 + rand(0, .25));
    if (isLava) word(pool[k], lava(iL++ % 2 ? 1 : -1, head * 1.2));
    else { const u = nSmoke > 1 ? order[iS++] / (nSmoke - 1) : .5; word(pool[k], smoke(lerp(-F, F, u) + rand(-.04, .04), head)); }
  }
}
// a point on a lava word's way, l along it (in E)
function wayAt(w, l) {
  const p = w.pts; if (l <= 0) return p[0].p;
  let lo = 0, hi = p.length - 1;
  if (l >= p[hi].l) return p[hi].p;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m].l < l) lo = m; else hi = m; }
  const t = (l - p[lo].l) / ((p[hi].l - p[lo].l) || 1);
  return [lerp(p[lo].p[0], p[hi].p[0], t), lerp(p[lo].p[1], p[hi].p[1], t)];
}
function updateFlyers(dt) {
  const k = reduce.matches ? .6 : 1, { W, H } = V.size(), { E } = V.camera.volcano(), far = Math.hypot(W, H) / Math.max(1, E);
  for (const f of flyers) {
    f.age += dt;
    if (f.lava) {
      const w = f.way, on = f.head - w.land;      // how far along its line, past where it landed
      const v = f.head < w.land ? f.fly : f.speed * lerp(1.4, 1, smooth(0, 1.5, on));   // a burst as it lands, then an even flow
      f.head = Math.min(w.L, f.head + v * dt * k);
      const tail = wayAt(w, Math.max(0, f.head - f.em * sizeAt(f, 0)));
      if (Math.hypot(tail[0], tail[1]) > far || f.head >= w.L) f.gone = true;   // all of it off the screen
    } else {
      f.head += f.speed * dt * k * (f.head < 0 ? 2 : 1);
      if (f.head - f.em * wordSize / 100 * 1.6 > far) f.gone = true;
    }
  }
  flyers = flyers.filter(f => !f.gone);
}
// how big a letter is, d out from the crater (in E): smoke swells a little as it goes
const sizeAt = (f, d) => wordSize / 100 * (f.lava ? .9 : 1 + f.grow * Math.max(0, d));
function drawFlyers(x) {
  const cam = V.camera.cam, { E, crater } = V.camera.volcano(), { W, H } = V.size();
  const away = 1 - smooth(0, .5, cam.e);          // going in, they go as the volcano grows
  if (away <= 0 || !E) return;
  // the scene, grown round the crater as the emoji is (camera.js), in E from the crater
  x.save();
  x.translate(cam.fx, cam.fy); x.scale(cam.zoom * E, cam.zoom * E);
  x.translate((crater[0] - cam.kx) / E, (crater[1] - cam.ky) / E);
  x.textAlign = "center"; x.textBaseline = "middle"; x.font = lfont();
  for (const f of flyers) {
    if (f.head <= 0) continue;
    if (f.lava) drawLava(x, f, away, E); else drawSmoke(x, f, away);
  }
  x.restore(); x.globalAlpha = 1; x.shadowBlur = 0; x.shadowColor = "transparent";
}
function letter(x, ch, px, py, ang, size) {
  x.save(); x.translate(px, py); x.rotate(ang); x.scale(size / 100, size / 100); x.fillText(ch, 0, 0); x.restore();
}
function drawSmoke(x, f, away) {
  const dx = Math.sin(f.ang), dy = -Math.cos(f.ang), back = dx < -.02;   // going left: its first letter at the head
  const ang = back ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
  x.fillStyle = SMOKE;
  // the word lies from its tail (crater side) to its head; letters laid from the head inwards, each at its own size
  let d = f.head;
  const lets = back ? f.letters : [...f.letters].reverse();
  for (const L of lets) {
    const size = sizeAt(f, d), adv = L.w * size, mid = d - adv / 2;
    d -= adv;
    if (mid < .02) break;                          // still in the crater
    if (L.ch === " ") continue;
    x.globalAlpha = away * smooth(.02, .12, mid);
    letter(x, L.ch, dx * mid, dy * mid, ang, size);
  }
}
function drawLava(x, f, away, E) {
  const c = smooth(.15, .9, clamp((f.head - f.way.land) / COOL_L, 0, 1)) * .7 + smooth(3, 16, f.age) * .3;
  const rgb = HOT.map((v, i) => Math.round(lerp(v, COOL[i], clamp(c, 0, 1))));
  x.fillStyle = `rgb(${rgb})`;
  // its heat: a soft, dark copy round each letter, fading as it cools (shadows are in screen px)
  x.shadowColor = `rgba(${COOL}, ${(.55 * (1 - c * .5)).toFixed(2)})`; x.shadowBlur = Math.max(2, E * .025 * V.camera.cam.zoom); x.shadowOffsetX = 0; x.shadowOffsetY = 0;
  x.globalAlpha = away;
  const size = sizeAt(f, 0), at = l => wayAt(f.way, l);
  const tail = f.head - f.em * size, a = at(Math.max(0, tail)), b = at(f.head);
  const back = b[0] < a[0];                        // going left: its first letter at the head
  let l = back ? f.head : tail;
  for (const L of f.letters) {
    const adv = L.w * size, mid = back ? l - adv / 2 : l + adv / 2;
    l += back ? -adv : adv;
    if (mid < .02) { if (back) break; continue; }
    if (L.ch === " ") continue;
    const p = at(mid), q = at(mid + .01);
    let ang = Math.atan2(q[1] - p[1], q[0] - p[0]); if (back) ang += Math.PI;
    ang = Math.atan2(Math.sin(ang), Math.cos(ang));
    letter(x, L.ch, p[0], p[1], ang, size);
  }
  x.shadowBlur = 0; x.shadowColor = "transparent";
}

// ================= DEV: the pressure, by hand =================
V.dev.tab("volcano", `
  <div id="tube" role="slider" tabindex="0" aria-label="Pressure: drag to set it" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="pFill"></span></div>
  <button id="pBoom" type="button">erupt</button>
  <span><span class="k">pressure </span><span id="pVal">0%</span></span>
  <label class="full"><span class="k">steady smoke, words a minute (0: none) </span><span id="steadyVal"></span><input type="range" id="steady" min="0" max="60" step="1"></label>
  <label class="full"><span class="k">eruption, words (more than the notes: repeated) </span><span id="burstVal"></span><input type="range" id="burst" min="8" max="80" step="1"></label>
  <label class="full"><span class="k">lava share (the rest is smoke) </span><span id="lavaVal"></span><input type="range" id="lava" min="0" max="100" step="5"></label>
  <label class="full"><span class="k">smoke fan, from upright </span><span id="fanVal"></span><input type="range" id="fan" min="10" max="90" step="1"></label>
  <label class="full"><span class="k">word size, % of the volcano </span><span id="wsVal"></span><input type="range" id="ws" min="5" max="40" step="1"></label>`);
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
function slider(id, out, get, set, fmt) {
  const el = $(id), show = () => { el.value = get(); $(out).textContent = fmt(get()); };
  el.addEventListener("input", () => { set(+el.value); show(); });
  show();
}
slider("lava", "lavaVal", () => Math.round(lavaShare * 100), v => { lavaShare = v / 100; V.store.set("volcano-v15-lava", lavaShare); }, v => v + "%");
slider("steady", "steadyVal", () => steady, v => { steady = v; V.store.set("volcano-v15-steady", v); nextPuff = Math.min(nextPuff, 60 / Math.max(1, v)); }, String);
slider("burst", "burstVal", () => burst, v => { burst = v; V.store.set("volcano-v15-burst", v); }, String);
slider("fan", "fanVal", () => fan, v => { fan = v; V.store.set("volcano-v15-fan", v); }, v => v + "°");
slider("ws", "wsVal", () => wordSize, v => { wordSize = v; V.store.set("volcano-v15-wordsize", v); }, v => v + "%");
function showDev() {
  pFill.style.height = `calc(${(pressure * 100).toFixed(2)}% - ${(pressure * 4).toFixed(2)}px)`;
  pVal.textContent = { build: Math.floor(pressure * 100) + "%", seal: "sealed", settle: "eruption" }[phase];
  tube.setAttribute("aria-valuenow", String(Math.round(pressure * 100)));
  pBoom.disabled = phase !== "build";
}

V.volcano = {
  addPressure, PER_NOTE, get pressure() { return pressure; }, get phase() { return phase; },
  VOL: { eye: 0, Rc: 1 },
  update(dt) { updatePressure(dt); shake *= Math.exp(-dt * 3); updatePuffs(dt); updateFlyers(dt); },
  drawMarks(x) { if (V.camera.cam.out) drawFlyers(x); },
  tremor, showDev,
};
})();

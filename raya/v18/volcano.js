// The volcano, 3.00: only text. An emoji (🌋, drawn in field.js) and the words leaving its crater; the pressure building,
// the eruption, the tremor, as in 1.03, but flat: no cone, no slope in depth. What the files say to each other is in core.js.
(() => {
"use strict";
const { rand, clamp, lerp, smooth, $, reduce } = V;   // (aya v00: this file is a copy of rai/v15/volcano.js)

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
  V.soup.unpick();                     // aya v01: the rant that was open is taken away, by force
  shake = 20; startReel();            // aya v00: every vent, one by one (v04: no more 3.01 spill, the letters are the lava)
  burstPending = true;                 // aya v10: then the balls go up, burst, and run as lava (startBurst)
  if (bx.up) V.camera.goTo(1);         // aya v10: the view goes up to the volcano
  // aya v11: no jolt: the soup's balls stay in the soup; the eruption's come out of the crater's opening only
}
function tremor(t) {
  const amp = reduce.matches ? 0 : pressure * pressure * 2.5 + (phase === "seal" ? 1.5 + phaseT * 4 : 0) + shake;
  const view = V.view;
  if (amp < .05) { if (view.style.transform) view.style.transform = ""; return; }
  const x = amp * (.6 * Math.sin(t * 61) + .4 * Math.sin(t * 83 + 1.3)), y = amp * (.6 * Math.sin(t * 57 + 2) + .4 * Math.sin(t * 91 + .4));
  view.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}

// ================= the words leaving the crater =================
// Each word is a line of letters, straight out of the crater, as in the drawing for 3.00 (3.01: from the triangle's apex, touching it):
//   smoke  black, up and out in a fan, each word on its own ray, its letters growing a little as it goes, on until it
//          leaves the screen
//   lava   (3.01) down the triangle's sides from its apex, then from the foot winding on below in every direction,
//          out, down, back under; in 1.03's burning red-orange, sharp, no blur; on until it leaves the screen
// Everything is measured in E, the emoji's size, so the words keep their size against it. They always read from left to
// right: a word going left has its first letter at its head. Between eruptions a word escapes now and then, as smoke
// (DEV: "steady smoke", words a minute).
const LAVA = [196, 0, 12], SMOKE = "#000";   // the lava: the notification balls' red (soup.js DOT); 1.03's were HOT [255, 69, 0], COOL .62
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
  // 3.01: down the triangle's side from its apex (just inside its edge, on the black), then from the foot it winds on
  // below, each word its own way: out to the side, straight down, or back under the volcano; never up
  const pts = [], add = (x, y) => pts.push([x, y]), IN = .035, foot = rand(.45, 1);   // foot: how far down the side it leaves it
  for (let k = 0; k <= 24; k++) { const t = k / 24 * foot; add(side * (.5 * t - IN * .7), .5 * t + IN * .7 * (t > 0 ? 1 : 0)); }
  const [fx0, fy0] = pts[pts.length - 1];
  let th = Math.PI / 4;                                 // its heading: 0 out to the side, π/2 straight down, past it back under
  const aim = rand(0, 1.5) * Math.PI / 2, turn = rand(2.5, 6), wob = rand(1.5, 3.5), ph = rand(0, 6.28), fr = rand(1.5, 3.5);
  let x = fx0, y = fy0;
  for (let k = 1, n = Math.ceil((farE() + 4) / .05); k <= n; k++) {   // long enough to go off the screen
    const r = k * .05;
    th += ((aim - th) * turn * .05) + Math.sin(r * fr + ph) * wob * .05 * Math.min(1, r * 2);   // turning to its own way soon, then meandering
    th = clamp(th, -.05, Math.PI * .8);
    x += side * Math.cos(th) * .05; y += Math.sin(th) * .05;
    add(x, y);
  }
  let l = 0; const way = pts.map((p, i) => { if (i) l += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return { p, l }; });
  return { pts: way, L: l, land: way[24].l };
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
  const away = cam.inside ? 0 : 1;                 // whole until the cut to the soup, no fade (3.01)
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
    if (mid < 0) break;                            // not out of the apex yet: a letter shows once its middle is out, touching it
    if (L.ch === " ") continue;
    x.globalAlpha = away;
    letter(x, L.ch, dx * mid, dy * mid, ang, size);
  }
}
function drawLava(x, f, away, E) {
  // 1.03's lava: its red-orange, burning, cooling only a little darker as it goes, never to white or black. On this
  // orange it starts a little darker than 1.03's hot (that is the orange itself)
  // 13/11/26: the notification balls' red (../shared/soup.js, DOT), as it is, no cooling
  x.fillStyle = `rgb(${LAVA.join(",")})`;
  // its heat: a soft, dark copy round each letter, fading as it cools (shadows are in screen px)
  // 3.01: no heat blur, sharp from the apex on
  x.globalAlpha = away;
  const size = sizeAt(f, 0), at = l => wayAt(f.way, l);
  const tail = f.head - f.em * size, a = at(Math.max(0, tail)), b = at(f.head);
  const back = b[0] < a[0];                        // going left: its first letter at the head
  let l = back ? f.head : tail;
  for (const L of f.letters) {
    const adv = L.w * size, mid = back ? l - adv / 2 : l + adv / 2;
    l += back ? -adv : adv;
    if (mid < 0) { if (back) break; continue; }
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
["steady", "burst", "lava", "fan", "ws"].forEach(id => { const l = $(id).closest("label"); if (l) l.hidden = true; });   // aya v07: 3.01's smoke and lava are gone, so are their rows
function showDev() {
  pFill.style.height = `calc(${(pressure * 100).toFixed(2)}% - ${(pressure * 4).toFixed(2)}px)`;
  pVal.textContent = { build: Math.floor(pressure * 100) + "%", seal: "sealed", settle: "eruption" }[phase];
  tube.setAttribute("aria-valuenow", String(Math.round(pressure * 100)));
  pBoom.disabled = phase !== "build";
}


// ================= aya v00: at the eruption, every vent, one by one, as in stop motion =================
// The moment it erupts, all the notes pass, one after the other, very fast: one vent a frame of a film run by hand,
// large, black on the orange, over everything; each letter trembling on its own, and the whole jumping a little from one
// vent to the next, as a stop-motion frame does. Then it is gone and the soup is as it was. In or out of the volcano.
// DEV, aya: "stop motion" on / off, how long each vent stays, how much the letters tremble, and how large they are
const smOpt = { on: V.store.get("aya-v10-sm", false), ms: V.store.get("aya-v00-smms", 90), shake: V.store.get("aya-v00-smshake", 5), size: V.store.get("aya-v00-smsize", 100) };
let reel = null;
function startReel() {
  const texts = [...new Set(V.soup.texts().map(t => String(t).trim()).filter(Boolean))];
  if (!smOpt.on || !texts.length) return;
  for (let i = texts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [texts[i], texts[j]] = [texts[j], texts[i]]; }
  reel = { list: texts, i: 0, acc: 0, lay: null, layI: -1, boil: 0, jit: null, off: [0, 0] };
}
function updateReel(dt) {
  if (!reel) return;
  const ms = reduce.matches ? Math.max(260, smOpt.ms) : smOpt.ms;
  reel.acc += dt * 1000;
  while (reel.acc >= ms) {
    reel.acc -= ms; reel.i++;
    if (reel.i >= reel.list.length) { reel = null; return; }   // aya v04: the letters then go as soon as we are out (updateLava)
    reel.off = [rand(-1, 1), rand(-1, 1)];        // the frame jumps a little, as each photograph of a stop motion does
  }
  reel.boil += dt;
  if (reel.boil > 1 / 24) { reel.boil = 0; reel.jit = null; }   // the letters tremble at 24 a second, each on its own
}
// one vent laid out: as large as fits, in lines, each letter's width measured once
function layReel(text, W, H) {
  const x = V.mctx, maxW = W * .86, maxH = H * .62;
  let fs = Math.min(W, H) * .16 * smOpt.size / 100, lines = [];
  const wrap = f => {
    x.font = `500 ${f}px ${V.type()}`;
    const out = []; let line = "";
    for (const w of text.split(/\s+/)) {
      const test = line ? line + " " + w : w;
      if (x.measureText(test).width <= maxW || !line) line = test; else { out.push(line); line = w; }
    }
    if (line) out.push(line);
    return out;
  };
  for (let k = 0; k < 30; k++) {
    lines = wrap(fs);
    const widest = Math.max(...lines.map(l => x.measureText(l).width));
    if (lines.length * fs * 1.02 <= maxH && widest <= maxW) break;
    fs *= .9;
  }
  x.font = `500 ${fs}px ${V.type()}`;
  return { fs, lines: lines.map(l => ({ l, w: x.measureText(l).width, ch: [...l].map(ch => ({ ch, w: x.measureText(ch).width })) })) };
}
function drawReel(x) {
  if (!reel) return;
  const { W, H } = V.size(), text = reel.list[reel.i];
  if (reel.layI !== reel.i) { reel.lay = layReel(text, W, H); reel.layI = reel.i; reel.jit = null; }
  const { fs, lines } = reel.lay, amp = reduce.matches ? 0 : smOpt.shake * fs / 60, n = lines.reduce((a, L) => a + L.ch.length, 0);
  if (!reel.jit) reel.jit = Array.from({ length: n }, () => [rand(-1, 1) * amp, rand(-1, 1) * amp, rand(-1, 1) * amp * .012]);
  const lh = fs * 1.02, top = H / 2 - lines.length * lh / 2 + lh / 2, jump = reduce.matches ? 0 : fs * .05;
  x.save();
  x.font = `500 ${fs}px ${V.type()}`; x.textBaseline = "middle"; x.textAlign = "left"; x.fillStyle = "#000"; x.globalAlpha = 1;
  let k = 0;
  lines.forEach((L, li) => {
    let px = W / 2 - L.w / 2 + reel.off[0] * jump;
    const py = top + li * lh + reel.off[1] * jump;
    for (const c of L.ch) {
      const [jx, jy, jr] = reel.jit[k++];
      if (c.ch !== " ") {
        x.save(); x.translate(px + c.w / 2 + jx, py + jy); x.rotate(jr); x.fillText(c.ch, -c.w / 2, 0); x.restore();
      }
      px += c.w;
    }
  });
  x.restore();
}
V.dev.tab("aya", `
  <div class="full seg" role="group" aria-label="Stop motion of the vents at an eruption">
    <span class="k">stop motion</span>
    <button class="t" type="button" data-sm="1">on</button>
    <button class="t" type="button" data-sm="0">off</button>
    <button class="t" type="button" id="smTry">play it</button>
  </div>
  <label class="full"><span class="k">each vent stays </span><span id="smMsV"></span><input type="range" id="smMs" min="30" max="400" step="10"></label>
  <label class="full"><span class="k">letters tremble </span><span id="smShakeV"></span><input type="range" id="smShake" min="0" max="20" step="1"></label>
  <label class="full"><span class="k">letter size </span><span id="smSizeV"></span><input type="range" id="smSize" min="40" max="200" step="5"></label>`);
function showSm() {
  document.querySelectorAll("[data-sm]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.sm === "1") === smOpt.on)));
  $("smMs").value = smOpt.ms; $("smMsV").textContent = smOpt.ms + " ms (" + (1000 / smOpt.ms).toFixed(1) + " a second)";
  $("smShake").value = smOpt.shake; $("smShakeV").textContent = smOpt.shake ? String(smOpt.shake) : "still";
  $("smSize").value = smOpt.size; $("smSizeV").textContent = smOpt.size + "%";
  V.store.set("aya-v10-sm", smOpt.on); V.store.set("aya-v00-smms", smOpt.ms); V.store.set("aya-v00-smshake", smOpt.shake); V.store.set("aya-v00-smsize", smOpt.size);
}
document.querySelectorAll("[data-sm]").forEach(b => b.addEventListener("click", () => { smOpt.on = b.dataset.sm === "1"; if (!smOpt.on) reel = null; showSm(); }));
$("smTry").addEventListener("click", () => { const was = smOpt.on; smOpt.on = true; startReel(); smOpt.on = was; });
$("smMs").addEventListener("input", e => { smOpt.ms = +e.target.value; showSm(); });
$("smShake").addEventListener("input", e => { smOpt.shake = +e.target.value; reel && (reel.jit = null); showSm(); });
$("smSize").addEventListener("input", e => { smOpt.size = +e.target.value; reel && (reel.layI = -1); showSm(); });
showSm();


// ================= aya v01: before the eruption, the open rant trembles =================
// From "from" (DEV, aya, % of the pressure) the letters of a rant left open start to tremble, as the stop motion's do,
// a little, then more and more; sealed, in the last 1.4 s, they shake hard; then it erupts, the rant is closed by force
// (V.soup.unpick) and the stop motion plays. pre(): 0 … 1, how hard, read by soup.js each frame
let preFrom = V.store.get("aya-v01-pre", 85);
function pre() {
  if (reduce.matches) return 0;
  if (phase === "seal") return .4 + .6 * Math.min(1, phaseT / 1.4);
  if (phase === "build" && pressure * 100 >= preFrom) return .4 * (pressure * 100 - preFrom) / Math.max(1, 100 - preFrom);
  return 0;
}
V.dev.tab("aya", `<label class="full"><span class="k">an open rant trembles from </span><span id="preV"></span><input type="range" id="preFrom" min="0" max="100" step="1"></label>`);
function showPre() { $("preFrom").value = preFrom; $("preV").textContent = preFrom >= 100 ? "only when sealed" : preFrom + "% pressure"; V.store.set("aya-v01-pre", preFrom); }
$("preFrom").addEventListener("input", e => { preFrom = +e.target.value; showPre(); });
showPre();


// ================= aya v03: the eruption, letter by letter =================
// Out of a vent at the bottom of the soup (outside: the volcano's apex) the letters of the rants are thrown, one by one,
// fast, each on its own arc, and fall back onto the ground. The letters of one word land side by side; the words come
// from different rants, mixed, so what lands is a new text, almost incoherent, built from the ground up, row on row.
// It lands hot (yellow, then the balls' red), flows on a little along the ground, slower and slower, cools to black, stops,
// and fades away, almost: a light trace of it stays (drawn once into a canvas of its own, so it costs nothing after).
// Some of it is smoke instead: whole words going up, swelling, thinning out to nothing.
// DEV, aya: letters a second, words thrown, smoke share, letter size, the trace left, clear the traces
const lv = { rate: V.store.get("aya-v03-rate", 140), words: V.store.get("aya-v05-words2", 150), smoke: V.store.get("aya-v03-smoke", 25),
  size: V.store.get("aya-v03-lsize", 100), trace: V.store.get("aya-v04-trace2", 30) };
// aya v08: what can be tried in DEV, aya ("try" and the rows under it), kept in this browser
const ex = { sinuous: true, sinAmp: 100, pace: 100, variety: 100, near: 280, jets: 45, lobs: 30, smokeWords: true, smokeLife: 5.5, smokeDark: 72, smokeSwell: 40, smokeRead: 55,
  ...(V.store.get("aya-v09-ex", {}) || {}) };
let forceSmoke = null;                            // for one throw: 0 lava only, 100 smoke only
let outFirst = V.store.get("aya-v04-out", true), backIn = V.store.get("aya-v04-back", false), backT = 0;
let lavaRun = null, lavaPending = false, lavaBottomW = 0;   // aya v05: lavaBottomW, the lowest line, in the scene's px (screen + pan)
const traceCv = document.createElement("canvas"), tctx = traceCv.getContext("2d");
let traceKey = "";
function traceFit() {                                // aya v05: in the scene's px, three screens tall (it can be scrolled)
  const { W, H, MDPR } = V.size(), k = W + "x" + H + "x" + MDPR;
  if (k === traceKey) return;
  traceKey = k; traceCv.width = Math.round(W * MDPR); traceCv.height = Math.round(H * 3 * MDPR);
}
const lfs = () => { const { W } = V.size(); return clamp(W / 52, 13, 24) * lv.size / 100; };
const lfont2 = fs => `500 ${fs.toFixed(1)}px ${V.type()}`;
function vent() {                                  // aya v04: out of the triangle's apex; the ground is the black under it
  const { CX, CY, E, crater } = V.camera.volcano();
  return { x: crater[0], y: crater[1], ground: CY + .25 * E, E };
}
function startLava() {
  lavaPending = false; shake = Math.max(shake, 14);
  const texts = V.soup.texts().map(t => String(t).trim()).filter(Boolean);
  if (!texts.length) return;
  for (let i = texts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [texts[i], texts[j]] = [texts[j], texts[i]]; }
  // the words of several rants, taken in turns, a few at a time from each: a new text, almost incoherent
  const srcs = texts.map(t => t.split(/\s+/).filter(Boolean)), seq = [];   // aya v05: from all of them, so there is enough for many lines
  let k = 0;
  while (seq.length < lv.words && srcs.some(w => w.length)) {
    const src = srcs[k++ % srcs.length]; if (!src.length) continue;
    const take = 1 + Math.floor(Math.random() * 3);
    for (let n = 0; n < take && src.length && seq.length < lv.words; n++) seq.push(src.shift());
  }
  const { W } = V.size(), v = vent(), fs = lfs(), ctx = V.mctx;
  ctx.font = lfont2(fs);
  const space = ctx.measureText(" ").width, lh = fs * 1.12, margin = 14;
  const share = forceSmoke ?? lv.smoke; forceSmoke = null;
  const words = seq.map(t => ({ t, smoke: Math.random() * 100 < share, ch: [...t].map(c => ({ c, w: ctx.measureText(c).width })) }));
  words.forEach(w => w.w = w.ch.reduce((a, c) => a + c.w, 0));
  // aya v06: the mountain seen as 3D. The rows lie on its slope going away from us: near the apex they are far, small;
  // lower down they are near, large (s, the row's scale). Each row as wide as the mountain at its height, centred
  const apexY = v.y, pad = fs * .9, { H } = V.size();
  const NEAR = ex.near / 100, scaleAt = y => clamp(.5 + (y - apexY) / H * 1.7 * (NEAR - .5) / 2.3, .5, NEAR);   // aya v07/v08: from far and small to near and large (DEV: near)
  const widthAt = y => Math.min(W - margin * 2, fs * 34 * scaleAt(y), 2 * (y - apexY) - pad * 2);
  let y = apexY + Math.max(lh * 2.4, (fs * 7 + pad * 2) / 2);
  const rows = [];
  let row = [], rw = 0;
  const VAR = ex.variety / 100;
  words.forEach(w => w.m = 1 + ((Math.random() < .2 ? rand(1.3, 1.9) : rand(.65, 1.25)) - 1) * VAR);   // aya v07: each word its own size, a few much bigger (v08, DEV: variety)
  for (const w of words.filter(w => !w.smoke)) {
    const sc = scaleAt(y) * w.m;
    if (row.length && rw + w.w * sc > widthAt(y)) { rows.push({ row, y, sc: scaleAt(y) }); y += fs * scaleAt(y) * 1.15; row = []; rw = 0; }
    row.push(w); rw += (w.w + space) * scaleAt(y) * w.m;
  }
  if (row.length) rows.push({ row, y, sc: scaleAt(y) });
  rows.forEach(({ row, y, sc }, ri) => {
    const tw = row.reduce((a, w) => a + w.w * sc * w.m, 0) + space * sc * (row.length - 1);
    let x = clamp(v.x - tw / 2, margin, Math.max(margin, W - margin - tw));
    for (const w of row) { const ws = sc * w.m; w.sc = ws; w.depth = clamp((sc - .5) / 2.3, 0, 1); w.xf = x; w.yf = y + rand(-1.5, 1.5) * fs * sc / 12; w.row = ri; x += w.w * ws + space * sc * rand(.5, 1.1); }
  });
  lavaBottomW = (rows.length ? rows[rows.length - 1].y : apexY) + fs * 2 + V.camera.pan();
  // how they are thrown, the far rows first. A few words at a time make one throw, of one of three kinds:
  //   a jet:   fast and low, its letters one right behind the other on the same arc, a strand
  //   a lob:   slow and high, a strand too, looser, falling far down the slope
  //   a spray: each letter on an arc of its own
  // A strand lands as one, a little above where its words lie, and its letters then run down the slope into their places.
  // The smoke goes up in among them
  const lavaW = words.filter(w => !w.smoke), smokeW = words.filter(w => w.smoke);
  lavaW.sort((a, b) => a.row - b.row || a.xf - b.xf);
  const throws = [];
  for (let i = 0; i < lavaW.length;) {
    const n = Math.min(lavaW.length - i, 1 + Math.floor(Math.random() * 3)), grp = [];
    for (let k2 = 0; k2 < n && lavaW[i] && (!grp.length || lavaW[i].row === grp[0].row); k2++) grp.push(lavaW[i++]);
    const r = Math.random();
    throws.push({ words: grp, kind: r < ex.jets / 100 ? "jet" : r < (ex.jets + ex.lobs) / 100 ? "lob" : "spray" });   // v08, DEV: the mix
  }
  for (let k2 = throws.length - 1; k2 > 0; k2--) { if (Math.random() < .35) { const j2 = Math.max(0, k2 - 1 - Math.floor(Math.random() * 3)); [throws[k2], throws[j2]] = [throws[j2], throws[k2]]; } }   // roughly far to near, not strictly
  // aya v07: the smoke in throws too, the same three kinds, its strands going up instead of falling
  for (let i = 0; i < smokeW.length;) {
    const grp = smokeW.slice(i, i + 1 + Math.floor(Math.random() * 2)); i += grp.length;
    const r = Math.random();
    throws.splice(Math.floor(Math.random() * (throws.length + 1)), 0, { words: grp, kind: "smoke", sk: r < .45 ? "jet" : r < .85 ? "lob" : "spray" });
  }
  const g = 900, letters = [], gapOf = { jet: 13, lob: 42, spray: 1000 / lv.rate };
  const arc = (x0, y0, xl, yl, T) => ({ x0, y0, vx: (xl - x0) / T, vy: (yl - y0 - .5 * g * T * T) / T, T });
  let t0 = 0;
  for (const th of throws) {
    const w0 = th.words[0], gap = gapOf[th.kind] ?? 0;
    if (th.kind === "smoke") {
      // aya v07: smoke speaks as the lava does: a jet (fast, a tight strand), a lob (slow, looser) or a spray (each letter
      // on its own), out of the apex, but up: slowed by the air, drifting on the wind, curling, swelling, thinning out
      // v08: by default in whole words, readable (each word's letters side by side, going up together), darker, slower
      // to swell, and lasting longer (DEV: smoke, as words / as letters, how long, how dark, how much it swells)
      const sk = th.sk, ang = rand(-.8, .8), sp = sk === "jet" ? rand(380, 500) : sk === "lob" ? rand(200, 290) : 0;
      const sgap = sk === "jet" ? 16 : sk === "lob" ? 48 : 1000 / lv.rate, wind = rand(-26, 26), curl = rand(-1, 1), m = rand(1, 1.6);
      const life = ex.smokeLife * rand(.8, 1.2), swell = ex.smokeSwell / 100;
      let n = 0;
      for (const w of th.words) {
        let cx = 0;
        const wa = sk === "spray" ? rand(-1, 1) : ang + rand(-.06, .06), ws = sk === "spray" ? rand(180, 380) : sp * rand(.92, 1.08), wph = rand(0, 6.28);
        for (const c of w.ch) {
          // v09: readable, but not too much: a word's letters leave together and loosen as it rises (DEV, smoke: readable)
          const loose = 1 - ex.smokeRead / 100, asWord = ex.smokeWords;
          const a2 = asWord ? wa + rand(-1, 1) * loose * .22 : sk === "spray" ? rand(-1, 1) : ang + rand(-.09, .09);
          const s2 = asWord ? ws * (1 + rand(-1, 1) * loose * .22) : sk === "spray" ? rand(180, 420) : sp * rand(.9, 1.1);
          const off = asWord ? (cx + c.w / 2 - w.w / 2) * m : 0;
          letters.push({ ch: c.c, w: c.w * m, born: t0 + (asWord ? (cx / Math.max(1, w.w)) * loose * 160 : n * sgap), smoke: true, rot: 0, a: 0, heat: 1, fs: fs * m,
            x: v.x + off, y: v.y - fs * .3, vx: Math.sin(a2) * s2, vy: -Math.cos(a2) * s2, wind, curl, life, grow: swell * rand(.6, 1.2), off, ph: asWord ? wph : rand(0, 6.28), word: asWord });
          cx += c.w; n++;
        }
        if (ex.smokeWords) t0 += sgap * (w.ch.length + 2) * .8;
        n += 2;
      }
      t0 += Math.max(60, n * sgap) * rand(.3, .7); continue;
    }
    const wc = w0.xf + w0.w * w0.sc / 2, dir = Math.sign(wc - v.x) || (Math.random() < .5 ? -1 : 1);
    // where the strand comes down: up the slope from where its first word lies, and off to the apex's side of it
    const lift = (th.kind === "lob" ? rand(.5, 2.2) : th.kind === "jet" ? rand(.2, 1.2) : 0) * (ex.sinuous ? 2.6 : 1);   // v08 sinuous: higher up, a longer way down
    const sph = rand(0, 6.28), swv = rand(1.2, 2.6);
    const Px = w0.xf - dir * rand(10, 60) * w0.sc, Py = w0.yf - lift * fs * w0.sc * 1.1;
    const T = th.kind === "jet" ? rand(.7, 1) : th.kind === "lob" ? rand(1.7, 2.5) : 0;
    const x0 = v.x + rand(-5, 5), y0 = v.y - fs * .3, path = T ? arc(x0, y0, Px, Py, T) : null, run = rand(60, 140) * ex.pace / 100 * (ex.sinuous ? .7 : 1);
    let n = 0;
    for (const w of th.words) {
      let cx = 0;
      for (const c of w.ch) {
        const sc = w.sc, L = { ch: c.c, w: c.w * sc, born: t0 + n * gap, smoke: false, x: x0, y: y0, rot: 0, a: 1, heat: 1, fs: fs * sc,
          xf: w.xf + cx * sc, yf: w.yf, spin: rand(-7, 7) * (th.kind === "jet" ? .4 : 1), rest: rand(-.07, .07), g, depth: w.depth };
        if (path) { Object.assign(L, path, { xl: Px, yl: Py }); L.T *= rand(.985, 1.015); }
        else { const Ts = rand(.95, 1.8); L.xl = L.xf - dir * rand(10, 50) * sc; L.yl = L.yf - (ex.sinuous ? rand(.5, 2) * fs * sc : 0); Object.assign(L, arc(x0 + rand(-4, 4), y0, L.xl, L.yl, Ts)); }
        L.amp = fs * sc * rand(.8, 1.6) * ex.sinAmp / 100; L.waves = swv; L.ph = sph; L.cr = 0;
        // once down, it runs to its place at lava's pace (px a second), slowing, then cools where it stops
        L.flowT = clamp(Math.hypot(L.xf - L.xl, L.yf - L.yl) / run, .9, ex.sinuous ? 6 : 3.6) + rand(0, .5);
        cx += c.w; n++; letters.push(L);
      }
      n += 2;                                      // a little gap between two words of one strand
    }
    t0 += Math.max(60, n * gap) * (th.kind === "spray" ? 1 : rand(.35, .8)) + rand(0, 40);   // throws overlap
  }
  letters.sort((a, b) => a.fs - b.fs);             // the far (small) ones drawn first, the near ones over them
  // the older traces fade further, then this one is laid over them
  traceFit(); tctx.save(); tctx.globalCompositeOperation = "destination-out"; tctx.fillStyle = "rgba(0,0,0,.45)"; tctx.fillRect(0, 0, traceCv.width, traceCv.height); tctx.restore();
  lavaRun = { t: 0, letters, p0: V.camera.pan() };   // aya v05: laid out at this scroll
}
// hot to cold: pale yellow, the balls' red, black
function heatCol(h) {                              // aya v04, on the black: white-hot, yellow, orange, the balls' red, dark red
  const st = [[60, 6, 3], [196, 0, 12], [255, 120, 0], [255, 214, 90], [255, 246, 214]];
  const u = clamp(h, 0, 1) * (st.length - 1), i = Math.min(st.length - 2, Math.floor(u)), f = u - i, a = st[i], b = st[i + 1];
  return `rgb(${Math.round(lerp(a[0], b[0], f))},${Math.round(lerp(a[1], b[1], f))},${Math.round(lerp(a[2], b[2], f))})`;
}
function updateLava(dt) {
  const cam = V.camera.cam;
  if (lavaPending && !reel && cam && cam.s >= .999 && V.camera.pan() < 2) startLava();   // aya v04: out, and the stop motion over: now
  if (lavaRun && !lavaRun.letters.some(L => !L.done)) { lavaRun = null; if (backIn) backT = 1.5; }
  if (backT > 0 && (backT -= dt) <= 0 && cam && cam.s >= .999) V.camera.goTo(0);   // aya v04: back into the soup (DEV)
  if (!lavaRun) return;
  lavaRun.t += dt;
  const ms = lavaRun.t * 1000, quick = reduce.matches;
  let alive = 0;
  for (const L of lavaRun.letters) {
    if (L.done) continue;
    alive++;
    const age = (ms - L.born) / 1000;
    if (age < 0) { L.show = false; continue; }
    L.show = true;
    if (L.smoke) {
      // the same path for every letter of a strand: it all depends on its age, not on when it was drawn
      const k = Math.exp(-dt * 1.3), rise = -38;
      L.vx = L.vx * k + (L.wind + Math.sin(age * 1.4 + L.curl * 3) * 40 * L.curl) * (1 - k);
      L.vy = L.vy * k + rise * (1 - k);
      L.x += L.vx * dt; L.y += L.vy * dt;
      L.scale = 1 + L.grow * age * 1.2; L.rot = Math.sin(age * .9 + L.ph + (L.word ? L.off * .02 : 0)) * (L.word ? .05 + (1 - ex.smokeRead / 100) * .25 : .25) * Math.min(1, age);
      L.a = ex.smokeDark / 100 * Math.min(1, age * 8) * Math.min(1, Math.max(0, 1 - age / L.life) * 2.2);   // v08: dark until late, then gone
      if (age > L.life) L.done = true;
      continue;
    }
    if (age < L.T && !quick) {                      // in the air, on its arc, growing as it comes towards us
      L.x = L.x0 + L.vx * age; L.y = L.y0 + L.vy * age + .5 * L.g * age * age; L.rot = L.spin * age * (1 - age / L.T);
      const u = age / L.T; L.heat = 1; L.a = 1; L.k = lerp(.4, 1, u) + (L.depth || 0) * .9 * Math.sin(Math.PI * Math.min(1, u * 1.15));   // aya v07: the near ones swell as they come at us
      continue;
    }
    L.k = 1;
    const on = quick ? age : age - L.T;             // down: it runs on into its place, slower and slower, cools, stops, fades
    const f = 1 - Math.pow(1 - Math.min(1, on / L.flowT), ex.sinuous ? 1.8 : 2.4);
    L.x = lerp(L.xl, L.xf, f) + Math.sin(on * 3 + L.xf) * (1 - f) * 1.5; L.y = lerp(L.yl ?? L.yf, L.yf, f); L.rot = lerp(L.rot, L.rest, Math.min(1, dt * 6));
    if (ex.sinuous && L.amp) {                       // v08: winding as it runs, as lava does, a strand all along one meander
      const dx = L.xf - L.xl, dy = L.yf - (L.yl ?? L.yf), len = Math.hypot(dx, dy) || 1, wv = L.amp * Math.sin(f * Math.PI * L.waves + L.ph) * Math.sin(Math.PI * f);
      L.x += -dy / len * wv; L.y += dx / len * wv;
      L.cr += dt * 7 * L.heat; L.y += L.cr;          // and still creeping down while it is hot
    }
    L.heat = Math.max(0, 1 - on / (L.flowT + 1.2));
    const fadeAt = L.flowT + 2.2, fade = Math.min(1, Math.max(0, (on - fadeAt) / 1.8));
    L.a = lerp(1, lv.trace / 100, fade);
    if (fade >= 1) { L.done = true; bake(L); }
  }
}
function bake(L) {                                   // what stays of it: a light trace, drawn once
  traceFit();
  const { MDPR } = V.size();
  tctx.setTransform(MDPR, 0, 0, MDPR, 0, 0);
  tctx.globalAlpha = lv.trace / 100; tctx.fillStyle = "rgb(196,0,12)";   // aya v04: a red trace, on the black
  tctx.font = lfont2(L.fs); tctx.textBaseline = "alphabetic"; tctx.textAlign = "left";
  tctx.save(); tctx.translate(L.x + L.w / 2, L.y + (lavaRun ? lavaRun.p0 : 0)); tctx.rotate(L.rot); tctx.fillText(L.ch, -L.w / 2, 0); tctx.restore();
  tctx.globalAlpha = 1;
}
function drawLava2(x) {
  const cam = V.camera.cam;
  if (!cam || cam.inside || cam.s < .999) return;     // aya v04: outside only, once the view is still
  const { W, H } = V.size();
  const pan = V.camera.pan(), { MDPR } = V.size();
  if (traceKey) { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(traceCv, 0, -Math.round(pan * MDPR)); x.restore(); }
  if (!lavaRun) return;
  x.save(); x.translate(0, lavaRun.p0 - pan);       // aya v05: where it was laid out, moved by the scroll since
  x.textBaseline = "alphabetic"; x.textAlign = "left";
  let font = "";
  for (const L of lavaRun.letters) {
    if (L.done || !L.show || L.ch === " ") continue;
    const f = lfont2(L.fs); if (f !== font) { x.font = f; font = f; }
    x.globalAlpha = L.a;
    x.fillStyle = L.smoke ? "#000" : L.heat <= 0 ? "rgb(196,0,12)" : heatCol(L.heat);
    const s = L.smoke ? L.scale : (L.k ?? 1), ox = L.smoke ? L.off * (s - 1) : 0;   // smoke: the word swells as a whole, its letters apart; lava: grows as it comes
    x.save(); x.translate(L.x + L.w / 2 + ox - (L.smoke ? L.w / 2 : 0), L.y); x.rotate(L.rot); if (s !== 1) x.scale(s, s); x.fillText(L.ch, -L.w / 2, 0); x.restore();
  }
  x.restore(); x.globalAlpha = 1;
}
V.dev.tab("aya", `
  <span class="full k">the eruption, letter by letter, out of the volcano (after the stop motion if it is on)</span>
  <span class="full seg"><button class="t" type="button" id="lvTry">throw it now</button><button class="t" type="button" id="lvClear">clear the traces</button></span>
  <div class="full seg" role="group" aria-label="Where the eruption is seen"><span class="k">at the eruption</span><button class="t" type="button" data-out="1">go out</button><button class="t" type="button" data-out="0">stay</button></div>
  <div class="full seg" role="group" aria-label="After the eruption"><span class="k">after it</span><button class="t" type="button" data-back="1">back in</button><button class="t" type="button" data-back="0">stay out</button></div>
  <label class="full"><span class="k">letters a second </span><span id="lvRateV"></span><input type="range" id="lvRate" min="20" max="400" step="10"></label>
  <label class="full"><span class="k">words thrown </span><span id="lvWordsV"></span><input type="range" id="lvWords" min="10" max="300" step="5"></label>
  <label class="full"><span class="k">smoke, of the words </span><span id="lvSmokeV"></span><input type="range" id="lvSmoke" min="0" max="100" step="5"></label>
  <label class="full"><span class="k">letter size </span><span id="lvSizeV"></span><input type="range" id="lvSize" min="50" max="250" step="5"></label>
  <label class="full"><span class="k">trace left </span><span id="lvTraceV"></span><input type="range" id="lvTrace" min="0" max="60" step="1"></label>`);
function showLv() {
  $("lvRate").value = lv.rate; $("lvRateV").textContent = lv.rate;
  $("lvWords").value = lv.words; $("lvWordsV").textContent = lv.words;
  $("lvSmoke").value = lv.smoke; $("lvSmokeV").textContent = lv.smoke + "%";
  $("lvSize").value = lv.size; $("lvSizeV").textContent = lv.size + "%";
  $("lvTrace").value = lv.trace; $("lvTraceV").textContent = lv.trace ? lv.trace + "%" : "none";
  V.store.set("aya-v03-rate", lv.rate); V.store.set("aya-v05-words2", lv.words); V.store.set("aya-v03-smoke", lv.smoke); V.store.set("aya-v03-lsize", lv.size); V.store.set("aya-v04-trace2", lv.trace);
}
for (const [id, k] of [["lvRate", "rate"], ["lvWords", "words"], ["lvSmoke", "smoke"], ["lvSize", "size"], ["lvTrace", "trace"]]) $(id).addEventListener("input", e => { lv[k] = +e.target.value; showLv(); });
$("lvTry").addEventListener("click", () => { lavaPending = true; V.camera.panTo(0); if (inside()) V.camera.goTo(1); });   // aya v04: out first, then thrown
function showOut() {
  document.querySelectorAll("[data-out]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.out === "1") === outFirst)));
  document.querySelectorAll("[data-back]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.back === "1") === backIn)));
  V.store.set("aya-v04-out", outFirst); V.store.set("aya-v04-back", backIn);
}
document.querySelectorAll("[data-out]").forEach(b => b.addEventListener("click", () => { outFirst = b.dataset.out === "1"; showOut(); }));
document.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => { backIn = b.dataset.back === "1"; showOut(); }));
showOut();
$("lvClear").addEventListener("click", () => { traceFit(); tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, traceCv.width, traceCv.height); });
showLv();



// ================= aya v14: the eruption, breathing (in place of v10–v13's fireworks) =================
// The volcano lets go in pulses, never in time: a hesitant first breath, a silence, the strong release, then weaker and
// stronger ones with silences between them, ending in slow overflows. A pulse sends out a few of the soup's balls, each
// in a way of its own:
//   burst  thrown high and hard, it breaks while still rising: its words fly on as fragments, loosening into letters;
//          now and then a word stays up, floating, a long time, before it comes down
//   lob    it rises slowly, its letters coming away from it one by one, falling back near the crater
//   spill  it hardly leaves the opening, drops onto the rim and runs
//   far    thrown whole on a long, low, uneven arc, it breaks where it lands, far down the slope
//   over   no throw: molten, it wells up over the rim and runs down, letter after letter
// Where they land they gather, hesitate, then flow down the cone's face in streams laid along it (some thick and slow,
// some thin and faster, some splitting, some joining), each letter queued behind the one ahead, so they pile up where a
// stream slows; a glow of molten matter under them. Cooling, they slow, stop, darken, and stay as a trace. Smoke, faint,
// round the crater: a little as the pressure builds, more with a strong pulse. No flash, no streaks. All in scene px.
// DEV, aya, "the eruption": how violent, bursting or overflowing, the silences, how high, how far, how thick the lava,
// how long it stays hot, the trace, the smoke
const bx = { up: true, dezoom: true, cap: 70, trace: 26, force: 100, mix: 50, calm: 100, high: 100, far: 100, visc: 100, life: 12, smoke: 100,
  ...(V.store.get("aya-v14-bx", {}) || {}) };
let burstPending = false, burstOpts = null, eru = null;
const bCv = document.createElement("canvas"), bctx = bCv.getContext("2d");
let bKey = "";
const BS = 1;   // aya v13: the trace's resolution, px a scene px
function bFit() {                                  // the trace, kept in a canvas as tall as the whole scene
  const { W, H, MDPR } = V.size(), g = V.camera.geo(), k = W + "x" + H + "x" + MDPR + "x" + g.S;
  if (k === bKey) return;
  bKey = k; bCv.width = Math.round(W * BS); bCv.height = Math.round(g.S * BS);   // aya v13: at most 1 px a px
}
const bfont = fs => `500 ${fs.toFixed(1)}px ${V.type()}`;
const STEP = 5, MAXCH = 40;                                    // the streams are laid every 5 px down the face
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickW = w => { let s = 0; for (const k in w) s += Math.max(0, w[k]); let r = Math.random() * s; for (const k in w) if ((r -= Math.max(0, w[k])) <= 0) return k; return Object.keys(w)[0]; };

// ---------- the streams: lines down the face of the cone, as its slope would take lava ----------
// x at each depth (every STEP px under the rim): along the cone's lines, fanning out from the rim, meandering more and
// more lower down. s: the length along it. A stream has 1–3 lanes side by side (thick ones slower), its letters queued
// in each lane; it goes as far as its reach (where it has cooled, stops), maybe splits, maybe joins another
function chanNew(j0, x0, o = {}) {
  const g = V.camera.geo(), H = V.size().H, n = Math.max(8, eru.NJ - j0), xs = new Float32Array(n), ss = new Float32Array(n);
  const plainD = g.kind === "plain" ? g.gy - eru.Y0 : Infinity;
  const half = d => g.cw + Math.min(d, plainD) * g.k;
  let u = clamp((x0 - g.cx) / half(j0 * STEP), -.95, .95);
  const drift = o.drift ?? rand(-.0012, .0012), A = rand(.5, 1.5), fr = rand(.006, .016), ph = rand(0, 6.28);
  for (let i = 0; i < n; i++) {
    const d = (j0 + i) * STEP, dd = i * STEP;
    u = clamp(u + drift + rand(-1, 1) * .0008, -.96, .96);
    xs[i] = g.cx + u * half(d) + Math.sin(d * fr + ph) * A * Math.min(1, dd / 140) * (6 + dd * .055);
  }
  const c = x0 - xs[0]; for (let i = 0; i < n; i++) xs[i] += c * Math.exp(-i * STEP / 70);   // it starts where it was asked to
  for (let i = 1; i < n; i++) ss[i] = ss[i - 1] + Math.hypot(xs[i] - xs[i - 1], STEP);
  const nl = o.lanes ?? +pickW({ 1: 3, 2: 3, 3: 2 }), vis = 100 / bx.visc;
  const v0 = (nl === 3 ? rand(18, 30) : nl === 2 ? rand(28, 48) : rand(45, 80)) * vis;
  const ch = { j0, n, xs, ss, nl, v0, reach: Math.min(ss[n - 1], o.reach ?? H * rand(.3, .85)), lanes: Array.from({ length: nl }, () => []),
    splits: [], into: null, hi: 0, lo: Infinity, pf: rand(.5, 1.2), pp: rand(0, 6.28), cool: nl === 3 ? 1.3 : nl === 2 ? 1.1 : .9 };
  eru.chans.push(ch);
  return ch;
}
function chanPt(ch, s) {                             // a point on a stream, s along it: [x, y, its heading]
  const ss = ch.ss, xs = ch.xs, n = ch.n;
  let lo = 0, hi = n - 1;
  if (s <= 0) hi = 1;
  else if (s >= ss[n - 1]) lo = n - 2;
  else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ss[m] < s) lo = m; else hi = m; }
  if (hi - lo !== 1) hi = lo + 1;
  const f = (s - ss[lo]) / ((ss[hi] - ss[lo]) || 1);
  return [lerp(xs[lo], xs[hi], f), eru.Y0 + (ch.j0 + lo + f) * STEP, Math.atan2(STEP, xs[hi] - xs[lo])];
}
function chanFind(x, y) {                            // the stream under a place, or a new one from it
  const H = V.size().H, j = Math.max(0, Math.round((y - eru.Y0) / STEP));
  let best = null, bd = 1e9;
  for (const ch of eru.chans) {
    const i = j - ch.j0; if (i < 0 || i >= ch.n || (ch.into && i > ch.into.i)) continue;
    const d = Math.abs(ch.xs[i] - x); if (d < bd) { bd = d; best = ch; }
  }
  const thr = Math.max(34, eru.lg * 2 + j * STEP * .07);
  if ((!best || bd > thr) && eru.chans.length < MAXCH) best = chanNew(j, x, { reach: rand(70, H * .4), lanes: Math.random() < .55 ? 1 : 2 });
  if (!best) for (const ch of eru.chans) {           // no stream at this depth, and no more new ones: the nearest of all
    const i = clamp(j - ch.j0, 0, ch.n - 1), d = Math.hypot(ch.xs[i] - x, (ch.j0 + i - j) * STEP); if (d < bd) { bd = d; best = ch; }
  }
  return { ch: best, i: clamp(j - best.j0, 0, best.n - 1) };
}
function laneRoom(ch, s) {                           // the lane with the most room round s
  let best = 0, bd = -1;
  for (let l = 0; l < ch.nl; l++) {
    let m = 1e9; for (const o of ch.lanes[l]) m = Math.min(m, Math.abs(o.s - s));
    m += rand(0, 6); if (m > bd) { bd = m; best = l; }
  }
  return best;
}
// a letter with no room left in its lane, back to the stream's start: into a lane with room near where it is, or a new
// arm of the flow beside it (blocked lava finds another way)
const free = (ch, l, s, w) => ch.lanes[l].every(o => o.st === "done" || Math.abs(o.s - s) >= (o.w + w) / 2 + .6);
function rehome(L) {
  const j = Math.max(0, Math.round((L.y - eru.Y0) / STEP));
  let best = null;
  for (const ch of eru.chans) {
    const i = j - ch.j0; if (i < 0 || i >= ch.n || (ch.into && i > ch.into.i)) continue;
    const d = Math.abs(ch.xs[i] - L.x); if (d > 160 || (best && d >= best.d)) continue;
    for (let l = 0; l < ch.nl; l++) if (free(ch, l, ch.ss[i], L.w)) { best = { ch, l, s: ch.ss[i], d }; break; }
  }
  if (!best && eru.chans.length < MAXCH) {
    const g = V.camera.geo(), side = Math.sign(L.x - g.cx) || (Math.random() < .5 ? -1 : 1);
    const ch = chanNew(j, L.x + side * eru.lg * rand(.8, 1.6), { drift: side * rand(.001, .003), lanes: 1, reach: rand(60, V.size().H * .35) });
    best = { ch, l: 0, s: 0 };
  }
  return best;
}
// a free stretch tw long in a lane, at sHead or as near behind it as there is room (null: none before the start), so a
// word laid there does not get mixed with the letters already in it
function spanAt(ch, l, sHead, tw) {
  const ls = ch.lanes[l].filter(o => o.st !== "done").sort((a, b) => b.s - a.s);
  let h = sHead;
  for (const o of ls) {
    if (o.s - o.w / 2 - .6 >= h) continue;          // ahead of it
    if (o.s + o.w / 2 + .6 <= h - tw) break;        // behind it, and so are the rest
    h = o.s - o.w / 2 - .6;                         // in the way: behind it, then
  }
  return h - tw >= 0 ? h : null;
}
function spanFind(ch, sHead, tw) {                    // the lane with room nearest sHead: [lane, head] or null
  let best = null;
  for (let l = 0; l < ch.nl; l++) { const h = spanAt(ch, l, sHead, tw); if (h != null && (!best || h > best[1] + rand(-2, 2))) best = [l, h]; }
  return best;
}
// a letter, landed: onto a stream, behind the one before it of the same word if there is one, so the words still read
function settle(L, x, y, grp) {
  let f = null;
  if (grp && grp.ch) {
    const i = Math.round((y - eru.Y0) / STEP) - grp.ch.j0;
    if (i >= 0 && i < grp.ch.n && Math.abs(grp.ch.xs[i] - x) < 90) f = { ch: grp.ch, i };
  }
  f = f || chanFind(x, y);
  const ch = f.ch, s0 = ch.ss[f.i];
  let lane, s;
  const prev = grp && grp.last && grp.last.ch === ch && grp.last.st !== "done" ? grp.last : null;
  if (prev) { lane = prev.lane; s = Math.min(s0 + rand(-3, 3), prev.s - (prev.w + L.w) / 2 - .6); }
  else {                                             // the first of its word: room for all of it
    const tw = grp && grp.tw || L.w, sp = spanFind(ch, Math.max(s0, tw), tw);
    if (sp) { lane = sp[0]; s = sp[1] - L.w / 2; } else { lane = laneRoom(ch, s0); s = s0; }
  }
  place(L, ch, lane, s); L.grp = grp || null;
  if (grp) { grp.ch = ch; grp.last = L; }
}
function place(L, ch, lane, s) {
  ch.lo = Math.min(ch.lo, Math.max(0, s));
  Object.assign(L, { ch, lane, s, st: "pool", pt: 0, hes: rand(.45, 1.5) * bx.visc / 100, v: 0, blk: 0, ct: 0, spi: 0,
    heat: Math.min(L.heat ?? .75, .75), ck: rand(.8, 1.2), a: L.a ?? 1 });
  while (L.spi < ch.splits.length && ch.splits[L.spi].s <= s) L.spi++;
  ch.lanes[lane].push(L); eru.ground.push(L);
}
// a ball, or what is left of it, or a word flying as a fragment, comes down whole: it breaks where it lands, its letters
// laid along the stream in order (Ls: the letters, in the text's order, from where they are now)
function layDown(Ls, x, y) {
  const f = chanFind(x, y), ch = f.ch, k = Math.min(ch.n - 1, f.i + 4);
  const goesLeft = ch.xs[k] < ch.xs[f.i] - .3 || (Math.abs(ch.xs[k] - ch.xs[f.i]) <= .3 && x < V.camera.geo().cx);
  const seq = goesLeft ? Ls : [...Ls].reverse();      // the stream's head is the text's start when it goes left: it reads
  const tw = seq.reduce((a, c) => a + c.w + .6, 0), s0 = ch.ss[f.i];
  // its head: down from where it landed, so all of it is on the stream, in a lane where it has room, not mixed with others
  let sp = spanFind(ch, Math.min(ch.reach, Math.max(s0 + tw * .25, tw + 2)), tw), at = ch;
  if (!sp && eru.chans.length < MAXCH) {             // no room: a new arm of the flow beside it
    const side = Math.sign(x - V.camera.geo().cx) || 1;
    at = chanNew(Math.max(0, Math.round((y - eru.Y0) / STEP)), x + side * eru.lg * rand(.8, 1.6), { drift: side * rand(.001, .003), lanes: 1, reach: rand(tw + 40, tw + V.size().H * .35) });
    sp = [0, Math.min(at.reach, tw + 2)];
  }
  const lane = sp ? sp[0] : laneRoom(ch, s0), grp = { tw };
  let s = sp ? sp[1] : Math.max(s0, tw + 2);
  for (const L of seq) {
    s -= L.w / 2;
    place(L, at, lane, s); L.grp = grp;
    s -= L.w / 2 + .6;
  }
}

// ---------- the pulses ----------
function startBurst(opts) {
  burstPending = false; burstOpts = null;
  const list = shuffle(V.soup.burstList());
  if (!list.length) return;
  const { W, H } = V.size(), g = V.camera.geo(), ctx = V.mctx;
  const fresh = !eru;
  if (fresh) {
    const Y0 = g.cy + g.lip, fs0 = clamp(W / 46, 13, 22);
    eru = { t: 0, Y0, NJ: Math.max(60, Math.ceil((0 - Y0) / STEP) + 1), lg: fs0 * 1.08, fs0, chans: [], balls: [], air: [], ground: [], overs: [],
      events: [], glow: 0, end: 0 };
    // the streams from the rim, fanning out down the face; a split or two; maybe one joining another
    const nR = 3 + Math.floor(rand(0, 3));
    for (let k = 0; k < nR; k++) chanNew(0, g.cx + (lerp(-.8, .8, nR > 1 ? k / (nR - 1) : .5) + rand(-.12, .12)) * g.cw);
    const rim = eru.chans.slice().sort((a, b) => a.xs[0] - b.xs[0]);
    for (const ch of rim) if (Math.random() < .5) {
      const i = Math.floor(rand(.12, .5) * Math.min(ch.n, H * .7 / STEP)), dir = Math.random() < .5 ? -1 : 1;
      const c = chanNew(ch.j0 + i, ch.xs[i], { drift: dir * rand(.0015, .003), lanes: 1, reach: rand(80, H * .45) });
      ch.splits.push({ i, s: ch.ss[i], to: c, p: rand(.3, .55) });
    }
    if (rim.length > 2 && Math.random() < .6) {        // two neighbours: one runs into the other
      const k = 1 + Math.floor(Math.random() * (rim.length - 2)), A = rim[k], B = rim[k + (Math.random() < .5 ? -1 : 1)];
      const jm = Math.floor(rand(.18, .45) * H / STEP);
      if (jm < A.n - 2 && jm < B.n - 2) {
        for (let i = Math.max(1, jm - 40); i <= jm; i++) B.xs[i] = lerp(B.xs[i], A.xs[i], smooth(jm - 40, jm, i));
        for (let i = 1; i < B.n; i++) B.ss[i] = B.ss[i - 1] + Math.hypot(B.xs[i] - B.xs[i - 1], STEP);
        B.into = { i: jm, s: B.ss[jm], to: A, sTo: A.ss[jm] }; B.reach = Math.max(B.reach, B.ss[jm] + 2); B.splits = B.splits.filter(sp => sp.i < jm);
        A.reach = Math.max(A.reach, A.ss[jm] + H * .15);
      }
    }
  }
  // the items: each ball with its text
  const items = list.map(it => {
    const text = it.text.length > bx.cap ? it.text.slice(0, bx.cap).replace(/\s+\S*$/, "") + "…" : it.text;
    const fs = eru.fs0 * (it.reply ? .8 : 1) * rand(.9, 1.2);
    ctx.font = bfont(fs);
    return { text, fs, reply: it.reply, R: Math.max(5, it.R * (it.reply ? .8 : 1)), chars: [...text].map(c => ({ c, w: ctx.measureText(c).width })) };
  });
  // the rhythm: how strong each pulse, how many it sends, the silence after it
  const t0 = eru.t + .15, pulses = [], calm = bx.calm / 100;
  if (opts && opts.I != null) pulses.push({ t: t0, I: opts.I, n: Math.min(items.length, opts.I > .6 ? 6 : 2), kind: opts.kind });
  else {
    let t = t0, I = rand(.12, .28), left = items.length;
    while (left > 0) {
      const n = Math.min(left, clamp(Math.round(lerp(1, 6, I * I) * rand(.7, 1.3)), 1, 7));
      pulses.push({ t, I, n }); left -= n;
      t += (pulses.length === 1 ? rand(1.8, 2.8) : I > .6 ? rand(2.2, 4.4) : rand(.8, 2.4)) * calm;   // a longer silence after a strong one
      I = pulses.length === 1 ? rand(.85, 1) : Math.random() < .16 ? rand(.6, .95) : clamp(I * rand(.35, .95) + rand(-.05, .22), .1, .85);
    }
    const last = pulses[pulses.length - 1]; if (pulses.length > 2) { last.I = Math.min(last.I, .2); last.end = true; }
  }
  const G = 600, F = bx.force / 100, HI = bx.high / 100, M = bx.mix / 50;
  let k = 0;
  for (const p of pulses) {
    eru.events.push({ t: p.t, I: p.I });
    const dur = lerp(1.8, 1.1, p.I) * rand(.8, 1.25);
    for (let q = 0; q < p.n && k < items.length; q++) {
      const it = items[k++], I = p.I, tb = p.t + dur * Math.pow(Math.random(), I > .6 ? 1.6 : 1);
      const kind = p.kind || (p.end ? pickW({ over: 2, spill: 1 }) : pickW({
        burst: I * I * 3 * M * (it.reply ? .6 : 1), far: I * .6 * M, lob: 1.2 - Math.abs(I - .45) * 1.4,
        spill: (1 - I) * 1.1 * (2 - M) + .1, over: (1 - I) * (1 - I) * 1.4 * (2 - M) }));
      if (kind === "over") {                       // welling over the rim, no throw
        const chars = it.chars.length > 44 ? it.chars.slice(0, it.chars.slice(0, 44).map(c => c.c).lastIndexOf(" ") + 1 || 44) : it.chars;
        eru.overs.push({ t0: tb, x0: g.cx + rand(-.8, .8) * g.cw, chars, fs: it.fs, k: 0, ch: null });
        continue;
      }
      const b = { kind, t0: tb, R: it.R, fs: it.fs, chars: it.chars, reply: it.reply, x0: g.cx + rand(-.55, .55) * g.cw, y0: g.cy + g.lip + 3 * it.R, gone: false, out: 0 };
      if (kind === "burst") {
        const h = H * rand(.3, .58) * HI * F + 3 * it.R; b.G = G; b.vy = -Math.sqrt(2 * G * h); b.T = -b.vy / G;
        b.vx = rand(-1, 1) * Math.min(W * .26, 240) / b.T; b.breakAt = b.T * rand(.5, 1.02); b.dz = 0;
      } else if (kind === "lob") {
        const h = H * rand(.08, .24) * HI * Math.sqrt(F) + 3 * it.R; b.G = 300; b.vy = -Math.sqrt(2 * b.G * h); b.T = -b.vy / b.G;
        b.vx = rand(-1, 1) * Math.min(W * .12, 110) / b.T; b.dz = rand(0, H * .1);
        b.order = [...b.chars.keys()]; if (b.vx > 0) b.order.reverse();   // the first to come away lands first, at the stream's head
        b.peeled = 0;
      } else if (kind === "spill") {
        const h = rand(4, 26) * Math.sqrt(F) + 3 * it.R; b.G = 520; b.vy = -Math.sqrt(2 * b.G * h); b.T = -b.vy / b.G;
        b.vx = rand(-1, 1) * Math.min(g.cw * 1.4, 80); b.dz = rand(0, 18);
      } else {                                      // far
        const h = H * rand(.12, .3) * HI * F + 3 * it.R; b.G = 560; b.vy = -Math.sqrt(2 * b.G * h); b.T = -b.vy / b.G;
        b.vx = (Math.random() < .5 ? -1 : 1) * rand(.28, .5) * W * bx.far / 100 / (2.2 * b.T); b.dz = rand(.2, .55) * H;
        b.wob = rand(4, 14); b.wf = rand(1.5, 3); b.wp = rand(0, 6.28);
      }
      eru.balls.push(b);
    }
  }
  eru.end = Math.max(eru.end, ...eru.balls.map(b => b.t0), ...eru.overs.map(o => o.t0));
  if (fresh) {
    bFit();
    bctx.save(); bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalCompositeOperation = "destination-out"; bctx.fillStyle = "rgba(0,0,0,.4)"; bctx.fillRect(0, 0, bCv.width, bCv.height); bctx.restore();
    if (bx.dezoom) V.camera.dezoom(true);           // aya v12: the view draws back while it lasts
  }
}
// a ball breaks in the air: its words fly on as fragments (a few letters break loose), slowed by the air, then fall
function fragment(b, x, y, vx, vy) {
  const { H } = V.size(), F = bx.force / 100, FAR = bx.far / 100, cx = V.camera.geo().cx;
  const clumps = []; let cur = [], words = 0, want = 1 + Math.floor(Math.random() * 2);
  for (const c of b.chars) {
    cur.push(c);
    if (c.c === " " && ++words >= want) { clumps.push(cur); cur = []; words = 0; want = 1 + Math.floor(Math.random() * 2); }
  }
  if (cur.length) clumps.push(cur);
  let floated = 0;
  for (const cl of clumps) {
    const a = -Math.PI / 2 + rand(-1.5, 1.5), V0 = rand(80, 250) * FAR * Math.sqrt(F);
    const float = floated < 1 && cl.length < 9 && Math.random() < .12 ? rand(2.5, 5) : 0; if (float) floated++;
    const k = float ? .3 : 1;
    const cvx = (vx * .7 + Math.cos(a) * V0) * k, cvy = (vy * .7 + Math.sin(a) * V0) * k - (float ? 30 : 0);
    const cw = cl.reduce((s, c) => s + c.w, 0), r0 = rand(-.35, .35), dzc = Math.pow(Math.random(), 1.4) * H * .5, grp = { ch: null, last: null, tw: cw + cl.length * .6, clump: true };
    const right = x + cvx * 1.2 > cx;                // it will land to the right: its last letter first, to read along the stream
    let off = -cw / 2;
    const lets = cl.map((c, i) => { const o = off + c.w / 2; off += c.w; return [c, o, i]; });
    if (right) lets.reverse();
    for (const [c, o, i] of lets) {
      const loose = !float && Math.random() < .14;
      eru.air.push({ c: c.c, w: c.w, fs: b.fs, x: x + Math.cos(r0) * o, y: y + Math.sin(r0) * o,
        vx: cvx + rand(-1, 1) * (loose ? 70 : 9), vy: cvy + rand(-1, 1) * (loose ? 70 : 9), g: float ? 18 : rand(420, 500), drag: float ? 1.3 : .5,
        rot: r0, spin: loose ? rand(-4, 4) : rand(-.4, .4), heat: .85, dz: loose ? Math.pow(Math.random(), 1.4) * H * .5 : dzc, grp: loose ? null : grp, float, t: 0, i });
    }
  }
  if (bx.smoke > 0) puffAt(x, y, b.R * 3, .05, vx * .2, -12, 14, rand(3, 4.5));   // a little smoke where it broke
}
function updateBurst(dt) {
  const cam = V.camera.cam;
  if (burstPending && !reel && cam && V.camera.settled()) startBurst(burstOpts);
  if (!eru) return;
  eru.t += dt;
  const { W, H } = V.size(), C = V.camera, g = C.geo();
  // the pulses: a shake, a breath of smoke, the crater glowing a little
  for (const e of eru.events) if (!e.done && eru.t >= e.t) {
    e.done = true; eru.glow = Math.max(eru.glow, e.I);
    shake = Math.max(shake, e.I > .6 ? e.I * e.I * 6 : e.I * 1.5);
    if (bx.smoke > 0) for (let n = Math.round(1 + e.I * 5 * bx.smoke / 100); n-- > 0;) wisp(.05 + .08 * e.I, e.I);
  }
  eru.glow = Math.max(0, eru.glow - dt * .45);
  // the balls
  for (const b of eru.balls) {
    if (b.gone) continue;
    const age = eru.t - b.t0; if (age < 0) continue;
    b.x = b.x0 + b.vx * age + (b.wob ? Math.sin(age * b.wf + b.wp) * b.wob * Math.min(1, age) : 0);
    b.y = b.y0 + b.vy * age + .5 * b.G * age * age;
    const vyc = b.vy + b.G * age;
    if (b.kind === "burst" && age >= b.breakAt) { b.gone = true; fragment(b, b.x, b.y, b.vx, vyc); continue; }
    if (b.kind === "lob") {                         // its letters come away one by one, gently
      const want = Math.floor(b.chars.length * smooth(b.T * .45, b.T * 1.7, age));
      while (b.peeled < want) {
        const c = b.chars[b.order[b.peeled++]];
        eru.air.push({ c: c.c, w: c.w, fs: b.fs, x: b.x + rand(-1, 1) * b.R * .5, y: b.y + rand(-1, 1) * b.R * .5, vx: b.vx + rand(-22, 22), vy: vyc + rand(-30, 8),
          g: rand(260, 320), drag: .35, rot: rand(-.3, .3), spin: rand(-1.2, 1.2), heat: .78, dz: b.dz + rand(-12, 12), grp: b.grp || (b.grp = { ch: null, last: null, tw: b.chars.reduce((a, c) => a + c.w + .6, 0) }), float: 0, t: 0 });
      }
      b.out = b.peeled / b.chars.length;
      if (b.peeled >= b.chars.length) { b.gone = true; continue; }
    }
    if (age > b.T * .3 && vyc > 0 && b.y >= C.surfaceY(clamp(b.x, -W, 2 * W)) + b.dz) {   // down, whole: it breaks where it lands
      b.gone = true;
      const rest = b.kind === "lob" ? b.order.slice(b.peeled).sort((p, q) => p - q).map(i => b.chars[i]) : b.chars;   // in the text's order: layDown turns it to read
      layDown(rest.map(c => ({ c: c.c, w: c.w, fs: b.fs, x: b.x + rand(-1, 1) * b.fs * 1.3, y: b.y + rand(-1, .6) * b.fs * .8, rot: rand(-.5, .5), heat: .75 })), b.x, Math.max(b.y, C.surfaceY(b.x)));
      if (b.kind === "far") shake = Math.max(shake, 1.5);
    }
  }
  // the overflows: one letter after another over the rim, as the stream makes room for it
  for (const o of eru.overs) {
    if (o.done || eru.t < o.t0) continue;
    if (!o.ch) {
      const f = chanFind(o.x0, eru.Y0 + 1); o.ch = f.ch; o.lane = laneRoom(o.ch, 0);
      const k = Math.min(o.ch.n - 1, 6); o.seq = o.ch.xs[k] < o.ch.xs[0] ? o.chars : [...o.chars].reverse();
    }
    const lane = o.ch.lanes[o.lane];
    let minS = Infinity, mw = 0; for (const L of lane) if (L.s < minS) { minS = L.s; mw = L.w; }
    const c = o.seq[o.k];
    if (minS === Infinity || minS - (mw + c.w) / 2 - .6 >= 0) {
      const [px, py] = chanPt(o.ch, 0);
      const L = { c: c.c, w: c.w, fs: o.fs, x: px, y: py - o.fs * .7, rot: 0, heat: .8, a: 0, fin: true };
      place(L, o.ch, o.lane, 0); L.st = "flow"; L.v = o.ch.v0 * .4; L.heat = .8; L.grp = o;
      if (++o.k >= o.seq.length) o.done = true;
    }
  }
  // the letters in the air
  for (const L of eru.air) {
    L.t += dt;
    if (L.float) L.g = lerp(18, 300, smooth(L.float, L.float + 2.5, L.t));
    const dr = Math.exp(-dt * L.drag); L.vx *= dr; L.vy = L.vy * dr + L.g * dt;
    L.x += L.vx * dt; L.y += L.vy * dt; L.rot += L.spin * dt; L.spin *= Math.exp(-dt * .8);
    L.heat = Math.max(.62, L.heat - dt * .05);
    const gy = C.surfaceY(clamp(L.x, -W, 2 * W));
    if (L.landed) continue;
    if ((L.vy > 0 && L.y >= gy + L.dz) || L.t > 14) {
      L.y = Math.max(L.y, gy);
      if (L.grp && L.grp.clump) {                  // a word flying as one: it all comes down here, in order
        const all = eru.air.filter(o => o.grp === L.grp && !o.landed).sort((a, b) => a.i - b.i);
        for (const o of all) { o.landed = true; o.heat = Math.min(o.heat, .75); }
        layDown(all, L.x, L.y);
      } else { L.landed = true; settle(L, L.x, L.y, L.grp); }
    }
  }
  if (eru.air.some(L => L.landed)) eru.air = eru.air.filter(L => !L.landed);
  // the streams: each lane's letters in a queue, flowing at the lava's pace, slowing as they cool; held up by the one ahead
  const moves = [], visc = bx.visc / 100;
  for (const ch of eru.chans) {
    for (let l = 0; l < ch.nl; l++) {
      const lane = ch.lanes[l];
      if (!lane.length) continue;
      lane.sort((a, b) => b.s - a.s);
      let lim = Infinity, pw = 0;
      for (const L of lane) {
        L.heat = Math.max(0, L.heat - dt * .75 / (bx.life * ch.cool * L.ck));
        if (L.st === "pool") { L.pt += dt; if (L.pt >= L.hes) L.st = "flow"; }
        let s = L.s;
        if (L.st === "flow") {
          const room = ch.reach - L.s;
          const tv = ch.v0 * Math.pow(L.heat / .75, 1.2) * (1 + .3 * Math.sin(eru.t * ch.pf + ch.pp - L.s * .012)) * smooth(-2, 40, room);
          L.v += (tv - L.v) * Math.min(1, dt * (tv > L.v ? .9 : 3));   // heavy: slow to start, quick to stop
          s += L.v * dt;
          if (L.heat <= 0 && L.v < .5) L.st = "cool";
        }
        s = Math.min(s, ch.reach);
        const cap = lim - (pw + L.w) / 2 - .6;
        if (s > cap) { s = cap; if (L.st === "flow") { L.blk += dt; L.v *= Math.exp(-dt * 4); } } else L.blk = 0;
        if (s < 0 && L.st !== "cool" && !L.moving) {   // no room back to the start: elsewhere
          const h = rehome(L); if (h) { L.moving = true; moves.push([L, h.ch, h.s, h.l]); continue; }
        }
        s = Math.max(0, s);
        L.s = s; lim = s; pw = L.w;
        if (s > ch.hi) ch.hi = s;
        if (L.st === "cool" || (L.st === "pool" && L.heat <= 0)) {    // stopped, cold: it fades to its trace
          L.st = "cool"; L.ct += dt;
          if (L.ct > 1.2) { L.a = lerp(1, bx.trace / 100, Math.min(1, (L.ct - 1.2) / 1.6)); if (L.ct > 2.8) { L.st = "done"; bakeB(L); ch.dirty = true; } }
        }
        if (L.st !== "flow") continue;
        if (ch.into && L.s >= ch.into.s) { moves.push([L, ch.into.to, L.s - ch.into.s + ch.into.sTo, Math.min(L.lane, ch.into.to.nl - 1)]); continue; }
        if (L.spi < ch.splits.length && L.s >= ch.splits[L.spi].s) {
          const sp = ch.splits[L.spi++], gm = L.grp || L;
          gm.go = gm.go || new Map(); if (!gm.go.has(sp)) gm.go.set(sp, Math.random() < sp.p);
          if (gm.go.get(sp)) { moves.push([L, sp.to, L.s - sp.s, 0]); continue; }
        }
        if (L.blk > .7 && ch.nl > 1 && !L.grp) {                // held up a while: into the lane beside, if there is room
          const l2 = clamp(L.lane + (Math.random() < .5 ? -1 : 1), 0, ch.nl - 1);
          if (l2 !== L.lane && ch.lanes[l2].every(o => Math.abs(o.s - L.s) >= (o.w + L.w) / 2 + 1)) moves.push([L, ch, L.s, l2]);
          L.blk = 0;
        }
      }
    }
  }
  for (const [L, to, s, l] of moves) {
    L.moving = false;
    const from = L.ch.lanes[L.lane], i = from.indexOf(L); if (i >= 0) from.splice(i, 1);
    L.ch = to; L.s = s; L.lane = l; to.lanes[l].push(L);
    L.spi = 0; while (L.spi < to.splits.length && to.splits[L.spi].s <= s) L.spi++;
  }
  for (const ch of eru.chans) if (ch.dirty) { ch.dirty = false; for (let l = 0; l < ch.nl; l++) ch.lanes[l] = ch.lanes[l].filter(L => L.st !== "done"); }
  // where each letter is drawn: eased towards its place in its lane (slowly while it gathers, then with the stream)
  const lg = eru.lg;
  let live = 0;
  for (const L of eru.ground) {
    if (L.st === "done") continue;
    live++;
    const [px, py, an] = chanPt(L.ch, L.s), off = (L.lane - (L.ch.nl - 1) / 2) * lg;
    const tx = px - Math.sin(an) * off, ty = py + Math.cos(an) * off;
    const k = L.st === "pool" ? Math.min(1, dt * 1.6) : Math.min(1, dt * 7);
    L.x += (tx - L.x) * k; L.y += (ty - L.y) * k;
    let up = an; if (up > Math.PI / 2) up -= Math.PI; if (up < -Math.PI / 2) up += Math.PI;
    L.rot += (up - L.rot) * Math.min(1, dt * (L.st === "pool" ? 2 : 5));
    if (L.fin) { L.a = Math.min(1, L.a + dt * 3); if (L.a >= 1) L.fin = false; }
  }
  if (eru.ground.length > 400 && eru.ground.length > live * 2) eru.ground = eru.ground.filter(L => L.st !== "done");
  const busy = eru.t < eru.end + .2 || eru.balls.some(b => !b.gone) || eru.air.length || eru.overs.some(o => !o.done) || live;
  if (!busy) { bakeWays(); eru = null; V.camera.dezoom(false); }
}
let bBaked = false;
function bakeWays() {                                // at the end, each stream's way, very faint, under its letters
  if (!bx.trace) return;
  bFit(); bBaked = true;
  const g = V.camera.geo();
  bctx.setTransform(BS, 0, 0, BS, 0, -g.y0 * BS);
  bctx.globalCompositeOperation = "destination-over"; bctx.lineCap = "round"; bctx.lineJoin = "round"; bctx.strokeStyle = "rgb(120, 28, 32)";
  for (const ch of eru.chans) {
    if (!(ch.hi > ch.lo + 4)) continue;
    bctx.globalAlpha = bx.trace / 100 * .2; bctx.lineWidth = eru.lg * (ch.nl * .55 + .15);
    bctx.beginPath(); strokeRun(bctx, ch, ch.lo, ch.hi); bctx.stroke();
  }
  bctx.globalCompositeOperation = "source-over"; bctx.globalAlpha = 1;
}
function bakeB(L) {                                  // what stays of a letter
  bFit(); bBaked = true;
  const g = V.camera.geo();
  bctx.setTransform(BS, 0, 0, BS, 0, -g.y0 * BS);   // the trace canvas starts at the scene's top
  if (L.c !== " ") {
    bctx.globalAlpha = bx.trace / 100; bctx.fillStyle = "rgb(60, 12, 22)"; bctx.font = bfont(L.fs); bctx.textBaseline = "middle"; bctx.textAlign = "center";
    bctx.save(); bctx.translate(L.x, L.y); bctx.rotate(L.rot); bctx.fillText(L.c, 0, 0); bctx.restore();
  }
  bctx.globalAlpha = 1;
}
const HEAT = [];                                   // aya v13: the colours worked out once, 64 of them
function heatB(h) { const i = Math.round(clamp(h, 0, 1) * 63); return HEAT[i] || (HEAT[i] = heatC(i / 63)); }
function heatC(h) {                                // white-hot, yellow, orange, red, dark red
  const st = [[60, 12, 22], [128, 22, 36], [214, 46, 38], [255, 104, 44], [255, 178, 70], [255, 238, 176]];
  const u = clamp(h, 0, 1) * (st.length - 1), i = Math.min(st.length - 2, Math.floor(u)), f = u - i, a = st[i], b = st[i + 1];
  return `rgb(${Math.round(lerp(a[0], b[0], f))},${Math.round(lerp(a[1], b[1], f))},${Math.round(lerp(a[2], b[2], f))})`;
}

// ---------- the smoke: soft, pale, translucent, rising, swelling, drifting, gone ----------
function sprite(rgb) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.45, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c;
}
const smokeSpr = sprite("226,220,228"), glowSpr = sprite("255,140,70"), lavaSpr = sprite("255,96,40"), lavaSpr2 = sprite("190,30,34");
let puffs = [], puffAcc = 0, windS = rand(-8, 8);
function puffAt(x, y, r, a, vx, vy, grow, life) {
  if (puffs.length >= 48) return;
  puffs.push({ x, y, r, a, vx, vy, grow, life, age: 0, rmax: Math.min(80, r * 2.6), ax: rand(1, 1.6), ay: rand(.6, 1) });
}
function wisp(a, I = 0) {                            // out of the opening, a few soft shapes together
  const g = V.camera.geo(), x = g.cx + rand(-.7, .7) * g.cw, y = g.cy - g.lip * .5;
  const vx = windS * .4 + rand(-6, 6), vy = -rand(14, 26) - I * 45;
  for (let n = 2 + Math.floor(rand(0, 3)); n-- > 0;)   // a few soft shapes together, each its own size, drifting apart
    puffAt(x + rand(-1, 1) * g.cw * .4, y + rand(-6, 4), g.cw * rand(.12, .3) * (1 + I * .6), a * rand(.5, 1), vx + rand(-6, 6), vy * rand(.75, 1.15), rand(5, 13) * (1 + I), rand(4, 8.5));
}
function updateSmoke(dt) {
  windS = clamp(windS + rand(-1, 1) * dt * 6, -16, 16);
  const k = bx.smoke / 100;
  if (k > 0) {
    let rate = 0, a = .05;
    if (eru) { rate = .5; a = .05; }
    else if (phase === "seal") { rate = 2.2; a = .09; }
    else if (phase === "build") { rate = .1 + pressure * pressure * 1.1; a = .03 + .05 * pressure; }
    puffAcc += dt * rate * Math.min(1, k);
    while (puffAcc >= 1) { puffAcc--; wisp(a * Math.max(1, k * .9)); }
  }
  for (const p of puffs) {
    p.age += dt; p.vx += (windS - p.vx) * dt * .25; p.vy *= Math.exp(-dt * .12);
    p.x += p.vx * dt; p.y += p.vy * dt; p.r = Math.min(p.rmax, p.r + p.grow * dt);
  }
  if (puffs.some(p => p.age >= p.life)) puffs = puffs.filter(p => p.age < p.life);
}
function drawSmoke(x) {
  for (const p of puffs) {
    const u = p.age / p.life, a = p.a * smooth(0, .18, u) * Math.pow(1 - u, 1.4);
    if (a < .004) continue;
    x.globalAlpha = a; x.drawImage(smokeSpr, p.x - p.r * p.ax, p.y - p.r * p.ay, p.r * 2 * p.ax, p.r * 2 * p.ay);
  }
  x.globalAlpha = 1;
}

// ---------- drawing ----------
function strokeRun(x, ch, sA, sB) {                  // the stream's line, from sA to sB along it
  const [ax, ay] = chanPt(ch, sA), [bx2, by2] = chanPt(ch, sB);
  x.moveTo(ax, ay);
  const ss = ch.ss;
  let i = 0; while (i < ch.n && ss[i] <= sA) i++;
  for (; i < ch.n && ss[i] < sB; i++) x.lineTo(ch.xs[i], eru.Y0 + (ch.j0 + i) * STEP);
  x.lineTo(bx2, by2);
}
function drawBurst(x) {
  const C = V.camera, g = C.geo(), { MDPR } = V.size();
  x.save(); C.sceneTo(x);                          // aya v12: in scene px, through the zoom
  if (bKey && bBaked) {                            // aya v13: only the part of the trace on the screen
    const [l, t] = C.toScene(0, 0), [r, bt] = C.toScene(V.size().W, V.size().H);
    const sx = Math.max(0, l), sy = Math.max(0, t - g.y0), ex2 = Math.min(bCv.width / BS, r), ey = Math.min(bCv.height / BS, bt - g.y0);
    if (ex2 > sx && ey > sy) x.drawImage(bCv, sx * BS, sy * BS, (ex2 - sx) * BS, (ey - sy) * BS, sx, g.y0 + sy, ex2 - sx, ey - sy);
  }
  const vw = C.view(), zk = vw.z * MDPR;
  const put = L => { const c = Math.cos(L.rot) * zk, s = Math.sin(L.rot) * zk; x.setTransform(c, s, -s, c, (L.x * vw.z + vw.e) * MDPR, (L.y * vw.z + vw.f) * MDPR); x.fillText(L.c, 0, 0); };
  if (eru) {
    // the molten matter: a soft glow under the hot letters, one blob every other letter, so where they crowd it is one
    // glowing body, and where they are few, a faint one
    const lg = eru.lg, gr = lg * 1.25;
    let n = 0;
    for (const L of eru.ground) {
      if (L.st === "done" || L.heat < .03 || (n++ & 1)) continue;
      x.globalAlpha = .22 * smooth(.03, .45, L.heat) * (L.a ?? 1);
      x.drawImage(L.heat > .5 ? lavaSpr : lavaSpr2, L.x - gr, L.y - gr, gr * 2, gr * 2);
    }
    // the letters on the ground
    x.textBaseline = "middle"; x.textAlign = "center";
    let font = "";
    for (const L of eru.ground) {
      if (L.st === "done" || L.c === " ") continue;
      const f = bfont(L.fs); if (f !== font) { x.font = f; font = f; }
      x.globalAlpha = L.a; x.fillStyle = L.heat <= 0 ? "rgb(60, 12, 22)" : heatB(L.heat); put(L);
    }
    C.sceneTo(x);
  }
  // the crater: a little glow with a pulse (no flash), the smoke round it
  const glow = eru ? eru.glow : phase === "seal" ? .2 : 0;
  if (glow > .01) { const r = g.cw * (1.3 + glow * .8); x.globalAlpha = glow * .2; x.drawImage(glowSpr, g.cx - r, g.cy - r * 1.15, r * 2, r * 2); x.globalAlpha = 1; }
  drawSmoke(x);
  if (!eru) { x.restore(); return; }
  for (const o of eru.overs) {                     // where it wells over the rim: a molten swelling on the lip
    if (o.done || !o.ch || eru.t < o.t0) continue;
    const [px, py] = chanPt(o.ch, 0);
    x.globalAlpha = .85; x.fillStyle = heatB(.78); x.beginPath(); x.ellipse(px, py - o.fs * .1, o.fs * .85, o.fs * .38, 0, 0, Math.PI * 2); x.fill();
  }
  for (const b of eru.balls) {                     // the balls, lava-coloured, out of the opening (a lob smaller as it lets go)
    if (b.gone || eru.t < b.t0 || b.y > g.cy + g.lip) continue;
    const r = b.R * Math.sqrt(1 - (b.out || 0) * .85);
    x.save(); x.beginPath(); x.rect(-1e5, -1e5, 2e5, 1e5 + g.cy + g.lip); x.clip();
    x.globalAlpha = 1; x.fillStyle = "rgb(255,112,52)"; x.beginPath(); x.arc(b.x, b.y, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = "rgba(255,214,150,.75)"; x.beginPath(); x.arc(b.x - r * .25, b.y - r * .25, r * .42, 0, Math.PI * 2); x.fill();
    x.restore();
  }
  x.textBaseline = "middle"; x.textAlign = "center";
  let font = "";
  for (const L of eru.air) {                       // the letters in the air
    if (L.c === " ") continue;
    const f = bfont(L.fs); if (f !== font) { x.font = f; font = f; }
    x.globalAlpha = 1; x.fillStyle = heatB(L.heat); put(L);
  }
  x.restore(); x.globalAlpha = 1;
}

// ================= aya v08: DEV, try =================
// at the top of the tab: buttons that play each thing asked for, straight away, and the rows to change them
function goOutThen(f) { if (inside()) { V.camera.goTo(1); setTimeout(f, 1500); } else f(); }
function throwNow(share) { forceSmoke = share; lavaPending = true; V.camera.panTo(0); if (inside()) V.camera.goTo(1); }
V.dev.tab("aya").insertAdjacentHTML("afterbegin", `
  <span class="full k" style="color:#C16CFF">try</span>
  <span class="full seg" style="flex-wrap:wrap;gap:6px 14px">
    <button class="t" type="button" id="tWhole">the whole eruption</button>
    <button class="t" type="button" id="tRant">open a rant, then erupt</button>
    <button class="t" type="button" id="tBoth">the eruption only</button>
    <button class="t" type="button" id="tPulse">one strong pulse</button>
    <button class="t" type="button" id="tBreath">one soft breath</button>
    <button class="t" type="button" id="tOver">an overflow</button>
    <button class="t" type="button" id="tLava">lava only</button>
    <button class="t" type="button" id="tSmoke">smoke only</button>
    <button class="t" type="button" id="tReel">stop motion</button>
    <button class="t" type="button" id="tTop">up to the volcano</button>
    <button class="t" type="button" id="tBottom">down to the soup</button>
    <button class="t" type="button" id="tClear">clear the traces</button>
  </span>
  <div class="full seg" role="group" aria-label="Lava"><span class="k">lava</span><button class="t" type="button" data-sin="1">sinuous</button><button class="t" type="button" data-sin="0">straight</button></div>
  <label class="full"><span class="k">how much it winds </span><span id="exSinV"></span><input type="range" id="exSin" min="0" max="300" step="10"></label>
  <label class="full"><span class="k">how fast it runs </span><span id="exPaceV"></span><input type="range" id="exPace" min="30" max="250" step="10"></label>
  <label class="full"><span class="k">letter sizes, how varied </span><span id="exVarV"></span><input type="range" id="exVar" min="0" max="200" step="10"></label>
  <label class="full"><span class="k">the nearest rows, how large </span><span id="exNearV"></span><input type="range" id="exNear" min="100" max="450" step="10"></label>
  <label class="full"><span class="k">jets (fast strands) </span><span id="exJetsV"></span><input type="range" id="exJets" min="0" max="100" step="5"></label>
  <label class="full"><span class="k">lobs (slow strands); the rest is spray </span><span id="exLobsV"></span><input type="range" id="exLobs" min="0" max="100" step="5"></label>
  <div class="full seg" role="group" aria-label="Smoke"><span class="k">smoke</span><button class="t" type="button" data-sw="1">as words</button><button class="t" type="button" data-sw="0">as letters</button></div>
  <label class="full"><span class="k">smoke, how readable </span><span id="exReadV"></span><input type="range" id="exRead" min="0" max="100" step="5"></label>
  <label class="full"><span class="k">smoke lasts </span><span id="exLifeV"></span><input type="range" id="exLife" min="2" max="16" step=".5"></label>
  <label class="full"><span class="k">smoke, how dark </span><span id="exDarkV"></span><input type="range" id="exDark" min="20" max="100" step="5"></label>
  <label class="full"><span class="k">smoke, how much it swells </span><span id="exSwellV"></span><input type="range" id="exSwell" min="0" max="150" step="5"></label>
  <span class="full k" style="border-bottom:1px solid rgba(193,108,255,.35);padding-bottom:6px">the rest, as before</span>`);
const EXR = [["exSin", "sinAmp", v => v + "%"], ["exPace", "pace", v => v + "%"], ["exVar", "variety", v => v + "%"], ["exNear", "near", v => (v / 100).toFixed(1) + "×"],
  ["exJets", "jets", v => v + "%"], ["exLobs", "lobs", v => v + "%"], ["exLife", "smokeLife", v => v + " s"], ["exDark", "smokeDark", v => v + "%"], ["exSwell", "smokeSwell", v => v + "%"], ["exRead", "smokeRead", v => v + "%"]];
function showEx() {
  if (ex.jets + ex.lobs > 100) ex.lobs = 100 - ex.jets;
  for (const [id, k, f] of EXR) { $(id).value = ex[k]; $(id + "V").textContent = f(ex[k]); }
  document.querySelectorAll("[data-sin]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.sin === "1") === ex.sinuous)));
  document.querySelectorAll("[data-sw]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.sw === "1") === ex.smokeWords)));
  V.store.set("aya-v09-ex", ex);
}
for (const [id, k] of EXR) $(id).addEventListener("input", e => { ex[k] = +e.target.value; showEx(); });
document.querySelectorAll("[data-sin]").forEach(b => b.addEventListener("click", () => { ex.sinuous = b.dataset.sin === "1"; showEx(); }));
document.querySelectorAll("[data-sw]").forEach(b => b.addEventListener("click", () => { ex.smokeWords = b.dataset.sw === "1"; showEx(); }));
showEx();
$("tWhole").addEventListener("click", () => { if (phase === "build") pressure = 1; });
$("tRant").addEventListener("click", () => {      // into the soup, a rant opened, the pressure near the top (it trembles), then the eruption
  if (phase !== "build") return;
  const go = () => { V.soup.openRandom(); pressure = Math.max(pressure, .93); setTimeout(() => { if (phase === "build") pressure = 1; }, 2600); };
  if (V.camera.scroll() > 5) { V.camera.goTo(0); setTimeout(go, 1300); } else go();
});
$("tBoth").addEventListener("click", () => V.volcano.burstNow());   // aya v10: the balls up and bursting, now
$("tLava").addEventListener("click", () => throwNow(0));
$("tSmoke").addEventListener("click", () => throwNow(100));
$("tReel").addEventListener("click", () => $("smTry").click());
$("tTop").addEventListener("click", () => V.camera.goTo(1));      // aya v10: up to the volcano
$("tBottom").addEventListener("click", () => V.camera.goTo(0));   // down to the soup
$("tClear").addEventListener("click", () => { bFit(); bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, bCv.width, bCv.height); bBaked = false; });


V.dev.tab("aya", `
  <div class="full seg" role="group" aria-label="At the eruption, the view"><span class="k">at the eruption, the view</span><button class="t" type="button" data-bup="1">goes up</button><button class="t" type="button" data-bup="0">stays</button></div>
  <div class="full seg" role="group" aria-label="At the eruption, the zoom"><span class="k">at the eruption, the view</span><button class="t" type="button" data-bdz="1">draws back</button><button class="t" type="button" data-bdz="0">stays near</button></div>
  <span class="full k" id="bxHdThrow" style="opacity:.7">· the pulses and the throws</span>
  <label class="full"><span class="k">how violent </span><span id="bxForceV"></span><input type="range" id="bxForce" min="30" max="200" step="5"></label>
  <label class="full"><span class="k">bursting, or overflowing </span><span id="bxMixV"></span><input type="range" id="bxMix" min="0" max="100" step="5"></label>
  <label class="full"><span class="k">the silences between pulses </span><span id="bxCalmV"></span><input type="range" id="bxCalm" min="20" max="300" step="10"></label>
  <label class="full"><span class="k">how high the balls go </span><span id="bxHighV"></span><input type="range" id="bxHigh" min="30" max="220" step="5"></label>
  <label class="full"><span class="k">how far the fragments fly </span><span id="bxFarV"></span><input type="range" id="bxFar" min="30" max="250" step="5"></label>
  <label class="full"><span class="k">letters a ball, at most </span><span id="bxCapV"></span><input type="range" id="bxCap" min="10" max="200" step="5"></label>
  <span class="full k" id="bxHdLava" style="opacity:.7">· the lava</span>
  <label class="full"><span class="k">how thick, how slow </span><span id="bxViscV"></span><input type="range" id="bxVisc" min="40" max="250" step="10"></label>
  <label class="full"><span class="k">how long it stays hot </span><span id="bxLifeV"></span><input type="range" id="bxLife" min="3" max="25" step=".5"></label>
  <label class="full"><span class="k">the trace it leaves </span><span id="bxTraceV"></span><input type="range" id="bxTrace" min="0" max="80" step="2"></label>
  <span class="full k" id="bxHdSmoke" style="opacity:.7">· the smoke</span>
  <label class="full"><span class="k">smoke </span><span id="bxSmokeV"></span><input type="range" id="bxSmoke" min="0" max="200" step="10"></label>`);
const BXR = [["bxForce", "force", v => v + "%"], ["bxMix", "mix", v => v < 50 ? "more overflowing" : v > 50 ? "more bursting" : "both"], ["bxCalm", "calm", v => v + "%"],
  ["bxHigh", "high", v => v + "%"], ["bxFar", "far", v => v + "%"], ["bxCap", "cap", v => String(v)],
  ["bxVisc", "visc", v => v + "%"], ["bxLife", "life", v => v + " s"], ["bxTrace", "trace", v => v ? v + "%" : "none"], ["bxSmoke", "smoke", v => v ? v + "%" : "none"]];
function showBx() {
  for (const [id, k, f] of BXR) { $(id).value = bx[k]; $(id + "V").textContent = f(bx[k]); }
  document.querySelectorAll("[data-bup]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.bup === "1") === bx.up)));
  document.querySelectorAll("[data-bdz]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.bdz === "1") === bx.dezoom)));
  V.store.set("aya-v14-bx", bx);
}
for (const [id, k] of BXR) $(id).addEventListener("input", e => { bx[k] = +e.target.value; showBx(); });
document.querySelectorAll("[data-bup]").forEach(b => b.addEventListener("click", () => { bx.up = b.dataset.bup === "1"; showBx(); }));
document.querySelectorAll("[data-bdz]").forEach(b => b.addEventListener("click", () => { bx.dezoom = b.dataset.bdz === "1"; showBx(); }));
showBx();
// aya v14: try one pulse on its own (added to an eruption going on, or alone)
function pulseNow(I, kind) { burstOpts = { I, kind }; burstPending = true; if (bx.up) V.camera.goTo(1); }
$("tPulse").addEventListener("click", () => pulseNow(rand(.85, 1)));
$("tBreath").addEventListener("click", () => pulseNow(rand(.2, .35)));
$("tOver").addEventListener("click", () => pulseNow(.15, "over"));

V.volcano = {
  addPressure, PER_NOTE, get pressure() { return pressure; }, get phase() { return phase; },
  VOL: { eye: 0, Rc: 1 },
  update(dt) { updatePressure(dt); shake *= Math.exp(-dt * 3); updateReel(dt); updateBurst(dt); updateSmoke(dt); },   // aya v14: the eruption in pulses, the streams, the smoke (v03–v09's lava no longer)
  drawMarks(x) { drawBurst(x); drawReel(x); },
  erupting: () => !!(eru || burstPending),
  burstNow() { burstOpts = null; burstPending = true; if (bx.up) V.camera.goTo(1); },
  burstState: () => eru ? { t: +eru.t.toFixed(1), balls: eru.balls.length, flying: eru.balls.filter(b => !b.gone && eru.t >= b.t0).length, kinds: eru.balls.reduce((a, b) => (a[b.kind] = (a[b.kind] || 0) + 1, a), { over: eru.overs.length }),
    air: eru.air.length, ground: eru.ground.filter(L => L.st !== "done").length, flowing: eru.ground.filter(L => L.st === "flow").length, chans: eru.chans.length, puffs: puffs.length } : { puffs: puffs.length },
  pulseNow: (I, kind) => pulseNow(I, kind),
  lavaRun: () => lavaRun ? { n: lavaRun.letters.length, left: lavaRun.letters.filter(L => !L.done).length } : null,
  reel: () => reel ? { i: reel.i, n: reel.list.length } : null,
  pre, shakeK: () => smOpt.shake,
  lavaBottom: () => lavaBottomW,
  tremor, showDev,
};
})();

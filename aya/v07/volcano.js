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
  lavaPending = true;                  // aya v03/v04: then the letters are thrown, once the stop motion is over and we are out
  if (inside() && outFirst) V.camera.goTo(1);   // aya v04: out of the soup, to see the volcano erupt
  V.camera.panTo(0);                   // aya v05: back up to the apex, to see it
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
const smOpt = { on: V.store.get("aya-v00-sm", true), ms: V.store.get("aya-v00-smms", 90), shake: V.store.get("aya-v00-smshake", 5), size: V.store.get("aya-v00-smsize", 100) };
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
  V.store.set("aya-v00-sm", smOpt.on); V.store.set("aya-v00-smms", smOpt.ms); V.store.set("aya-v00-smshake", smOpt.shake); V.store.set("aya-v00-smsize", smOpt.size);
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
  const words = seq.map(t => ({ t, smoke: Math.random() * 100 < lv.smoke, ch: [...t].map(c => ({ c, w: ctx.measureText(c).width })) }));
  words.forEach(w => w.w = w.ch.reduce((a, c) => a + c.w, 0));
  // aya v06: the mountain seen as 3D. The rows lie on its slope going away from us: near the apex they are far, small;
  // lower down they are near, large (s, the row's scale). Each row as wide as the mountain at its height, centred
  const apexY = v.y, pad = fs * .9, { H } = V.size();
  const scaleAt = y => clamp(.5 + (y - apexY) / H * 1.7, .5, 2.8);   // aya v07: deeper, from far and small to near and large
  const widthAt = y => Math.min(W - margin * 2, fs * 34 * scaleAt(y), 2 * (y - apexY) - pad * 2);
  let y = apexY + Math.max(lh * 2.4, (fs * 7 + pad * 2) / 2);
  const rows = [];
  let row = [], rw = 0;
  words.forEach(w => w.m = Math.random() < .2 ? rand(1.3, 1.9) : rand(.65, 1.25));   // aya v07: each word its own size, a few much bigger
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
    throws.push({ words: grp, kind: r < .45 ? "jet" : r < .75 ? "lob" : "spray" });
  }
  for (let k2 = throws.length - 1; k2 > 0; k2--) { if (Math.random() < .35) { const j2 = Math.max(0, k2 - 1 - Math.floor(Math.random() * 3)); [throws[k2], throws[j2]] = [throws[j2], throws[k2]]; } }   // roughly far to near, not strictly
  // aya v07: the smoke in throws too, the same three kinds, its strands going up instead of falling
  for (let i = 0; i < smokeW.length;) {
    const grp = smokeW.slice(i, i + 1 + Math.floor(Math.random() * 2)); i += grp.length;
    const r = Math.random();
    throws.splice(Math.floor(Math.random() * (throws.length + 1)), 0, { words: grp, kind: "smoke", sk: r < .4 ? "jet" : r < .75 ? "lob" : "spray" });
  }
  const g = 900, letters = [], gapOf = { jet: 13, lob: 42, spray: 1000 / lv.rate };
  const arc = (x0, y0, xl, yl, T) => ({ x0, y0, vx: (xl - x0) / T, vy: (yl - y0 - .5 * g * T * T) / T, T });
  let t0 = 0;
  for (const th of throws) {
    const w0 = th.words[0], gap = gapOf[th.kind] ?? 0;
    if (th.kind === "smoke") {
      // aya v07: smoke speaks as the lava does: a jet (fast, a tight strand), a lob (slow, looser) or a spray (each letter
      // on its own), out of the apex, but up: slowed by the air, drifting on the wind, curling, swelling, thinning out
      const sk = th.sk, ang = rand(-.75, .75), sp = sk === "jet" ? rand(420, 560) : sk === "lob" ? rand(220, 320) : 0;
      const sgap = sk === "jet" ? 16 : sk === "lob" ? 48 : 1000 / lv.rate, wind = rand(-30, 30), curl = rand(-1, 1), life = rand(3, 4.6), m = rand(.7, 1.5);
      let n = 0;
      for (const w of th.words) {
        for (const c of w.ch) {
          const a2 = sk === "spray" ? rand(-1, 1) : ang + rand(-.09, .09), s2 = sk === "spray" ? rand(180, 420) : sp * rand(.9, 1.1);   // the strand opens out as it slows
          letters.push({ ch: c.c, w: c.w * m, born: t0 + n * sgap, smoke: true, rot: 0, a: 0, heat: 1, fs: fs * m,
            x: v.x, y: v.y - fs * .3, vx: Math.sin(a2) * s2, vy: -Math.cos(a2) * s2, wind, curl, life, grow: rand(.5, 1), off: 0, ph: rand(0, 6.28) });
          n++;
        }
        n += 2;
      }
      t0 += Math.max(60, n * sgap) * rand(.3, .7); continue;
    }
    const wc = w0.xf + w0.w * w0.sc / 2, dir = Math.sign(wc - v.x) || (Math.random() < .5 ? -1 : 1);
    // where the strand comes down: up the slope from where its first word lies, and off to the apex's side of it
    const lift = th.kind === "lob" ? rand(.5, 2.2) : th.kind === "jet" ? rand(.2, 1.2) : 0;
    const Px = w0.xf - dir * rand(10, 60) * w0.sc, Py = w0.yf - lift * fs * w0.sc * 1.1;
    const T = th.kind === "jet" ? rand(.7, 1) : th.kind === "lob" ? rand(1.7, 2.5) : 0;
    const x0 = v.x + rand(-5, 5), y0 = v.y - fs * .3, path = T ? arc(x0, y0, Px, Py, T) : null, run = rand(60, 140);
    let n = 0;
    for (const w of th.words) {
      let cx = 0;
      for (const c of w.ch) {
        const sc = w.sc, L = { ch: c.c, w: c.w * sc, born: t0 + n * gap, smoke: false, x: x0, y: y0, rot: 0, a: 1, heat: 1, fs: fs * sc,
          xf: w.xf + cx * sc, yf: w.yf, spin: rand(-7, 7) * (th.kind === "jet" ? .4 : 1), rest: rand(-.07, .07), g, depth: w.depth };
        if (path) { Object.assign(L, path, { xl: Px, yl: Py }); L.T *= rand(.985, 1.015); }
        else { const Ts = rand(.95, 1.8); L.xl = L.xf - dir * rand(10, 50) * sc; L.yl = L.yf; Object.assign(L, arc(x0 + rand(-4, 4), y0, L.xl, L.yl, Ts)); }
        // once down, it runs to its place at lava's pace (px a second), slowing, then cools where it stops
        L.flowT = clamp(Math.hypot(L.xf - L.xl, L.yf - L.yl) / run, .9, 3.6) + rand(0, .5);
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
      const k = Math.exp(-dt * 1.3), rise = -45;
      L.vx = L.vx * k + (L.wind + Math.sin(age * 1.4 + L.curl * 3) * 40 * L.curl) * (1 - k);
      L.vy = L.vy * k + rise * (1 - k);
      L.x += L.vx * dt; L.y += L.vy * dt;
      L.scale = 1 + L.grow * age * 1.2; L.rot = Math.sin(age * .9 + L.ph) * .25 * Math.min(1, age);
      L.a = .75 * Math.min(1, age * 8) * Math.max(0, 1 - age / L.life);
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
    const f = 1 - Math.pow(1 - Math.min(1, on / L.flowT), 2.4);
    L.x = lerp(L.xl, L.xf, f) + Math.sin(on * 3 + L.xf) * (1 - f) * 1.5; L.y = lerp(L.yl ?? L.yf, L.yf, f); L.rot = lerp(L.rot, L.rest, Math.min(1, dt * 6));
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

V.volcano = {
  addPressure, PER_NOTE, get pressure() { return pressure; }, get phase() { return phase; },
  VOL: { eye: 0, Rc: 1 },
  update(dt) { updatePressure(dt); shake *= Math.exp(-dt * 3); updateReel(dt); updateLava(dt); },   // aya v07: no more 3.01 smoke (puffs, flyers)
  drawMarks(x) { drawLava2(x); drawReel(x); },
  lavaRun: () => lavaRun ? { n: lavaRun.letters.length, left: lavaRun.letters.filter(L => !L.done).length } : null,
  reel: () => reel ? { i: reel.i, n: reel.list.length } : null,
  pre, shakeK: () => smOpt.shake,
  lavaBottom: () => lavaBottomW,
  tremor, showDev,
};
})();

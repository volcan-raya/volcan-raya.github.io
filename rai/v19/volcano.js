// The volcano: a mountain, steep and pointed at the top and broad at the foot, whose top is a flat black hole; and what it does: the pressure building, the
// eruption, the tremor, the words leaving the crater. What the files say to each other is in core.js.
(() => {
"use strict";
const { rand, clamp, lerp, smooth, $, reduce } = V;

// The world, in the volcano's own units: y up, the base at y = 0, the axis at x = z = 0. eye: the chamber's middle
// height; Rc: the chamber's radius
const VOL = { H: 36, Rb: 58, Rt: 2.8, eye: 2, Rc: 4.6 };   // the hole small on it; the chamber as in 1.00
// Its side, as a real stratovolcano's: concave, about 60° under the rim, easing to under 30° at the foot, so it is
// pointed and its foot stays out of view. The curve y = H (1 - x^Q), x from the rim (0) to the foot (1), laid out as
// straight sections, each a cone of its own: { r0, y0 } at its top, { r1, y1 } at its bottom, M how much r grows per
// unit down. SLOPE is the top section's.
const Q = .75, XS = [0, .02, .05, .1, .17, .27, .4, .56, .76, 1];
const PROF = XS.map(x => [VOL.Rt + x * (VOL.Rb - VOL.Rt), VOL.H * (1 - x ** Q)]);
const SECTIONS = PROF.slice(1).map(([r1, y1], i) => { const [r0, y0] = PROF[i]; return { r0, y0, r1, y1, M: (r1 - r0) / (y0 - y1) }; });
const SLOPE = SECTIONS[0].M;
const sectionAt = r => SECTIONS.find(s => r <= s.r1) || SECTIONS[SECTIONS.length - 1];
const coneY = r => { if (r <= VOL.Rt) return VOL.H; const s = sectionAt(r); return Math.max(0, s.y0 - (r - s.r0) / s.M); };   // the side's height at r from the axis

// ================= its part of the picture (see field.js) =================
// the hole (what = 2) and the cone's side (what = 1), nearer than best, along the ray from p, not before lo. PIVOT is the
// point the rays are measured from, on the axis at the chamber's height, so the far eye of the long lens loses no precision
const glsl = `
const float VH = ${VOL.H.toFixed(3)}, RB = ${VOL.Rb.toFixed(3)}, RT = ${VOL.Rt.toFixed(3)}, VE = ${VOL.eye.toFixed(3)};
const vec3 PIVOT = vec3(0., VE, 0.);
// one section of the side: the cone r = K - M y, between heights y0 and y1
void coneSide(vec3 p, vec3 rd, float lo, float K, float M, float y0, float y1, inout float best, inout vec3 N) {
  float k = K - M * p.y, a = dot(rd.xz, rd.xz) - M * M * rd.y * rd.y;
  float b = 2. * (dot(p.xz, rd.xz) + M * rd.y * k), c = dot(p.xz, p.xz) - k * k, disc = b * b - 4. * a * c;
  if (disc < 0. || abs(a) < 1e-6) return;
  float s = sqrt(disc), t1 = (-b - s) / (2. * a), t2 = (-b + s) / (2. * a);
  for (int i = 0; i < 2; i++) {
    float t = i == 0 ? t1 : t2, y = p.y + rd.y * t;
    if (t > lo && t < best && y >= y0 && y <= y1) { vec3 h = p + rd * t; best = t; N = normalize(vec3(h.x, M * length(h.xz), h.z)); what = 1.; }
  }
}
void volcanoHit(vec3 p, vec3 rd, float lo, inout float best, inout vec3 N) {
  if (abs(rd.y) > 1e-5) {
    float t = (VH - p.y) / rd.y; vec2 h = p.xz + rd.xz * t;
    if (t > lo && t < best && dot(h, h) < RT * RT) { best = t; N = vec3(0., 1., 0.); what = 2.; }
  }
${SECTIONS.map(s => `  coneSide(p, rd, lo, ${(s.r0 + s.M * s.y0).toFixed(4)}, ${s.M.toFixed(6)}, ${s.y1.toFixed(4)}, ${s.y0.toFixed(4)}, best, N);`).join("\n")}
}
// the hole is black (1.03, as 1.02: the orange tried for it is gone); the cone's side is the terrain's white, with its lines (terrain.js)
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
//   lava   as in 0.04: it is thrown up out of the hole in an arc, lands on the slope and runs down it as a tongue that
//          meanders, gathering speed, over the foot and on, out of the screen: it never vanishes on the way. Some of it
//          (DEV: "lava stays") stops on the slope and stays there, cooled to a darker red, until the next eruption
//          pushes it on down and out, as the new lava comes.
//          What is behind the mountain is hidden by it
// An eruption goes all the way round, 360°, not only towards the eye.
// Everything is measured in U, the mountain's height over 1.01's, so the words keep their size against it.
// How many go each way is DEV's "lava · smoke". And between eruptions the volcano is never quite still: now and then a
// word escapes on its own, as smoke, carried by a wind that turns slowly; a little more often as the pressure builds
// (DEV: "steady smoke", words a minute, 0 for none).
const U = VOL.H / 7, FW = .3, FLY_MIN = 11, HOT = [255, 69, 0], TAU = Math.PI * 2;
const lfont = () => `500 100px ${V.type()}`;
let flyers = [], lavaShare = V.store.get("volcano-v17-lava", .5), steady = V.store.get("volcano-v17-steady", 12);
let stayShare = V.store.get("volcano-v17-stay", .6);   // of the lava, how much stays on the slope (DEV: "stays"); the rest runs off to the foot
let burst = V.store.get("volcano-v17-burst", 16);   // how many words an eruption sends out (DEV, 8 … 80): more than there are, and they come round again
let windA = rand(0, 6.28), nextPuff = 2;
function word(text, lava, extra) {
  const letters = [...text].map(ch => ({ ch, w: V.mctx.measureText(ch).width / 100 }));
  const f = { letters, em: letters.reduce((a, L) => a + L.w, 0), lava, age: 0, gone: false, ph: rand(0, 6.28), freq: rand(.8, 1.2), ...extra };
  f.v = f.speed;
  flyers.push(f);
}
const smokeOf = (wind, head) => ({ a: rand(0, 6.28), start: rand(.2, .8) * VOL.Rt, wind, speed: rand(1.6, 2.1), size: 1.4, head });
// a lava word's whole way, in the world, measured along it (l): up out of the hole and down onto the slope in an arc, then
// down the slope to the foot, meandering more as it goes
function lavaWay(a) {
  const pts = [], g = 9.8, h = rand(.3, .6) * VOL.H, vy = Math.sqrt(2 * g * h), r0 = rand(0, .6) * VOL.Rt;
  const rLand = lerp(VOL.Rb * .12, VOL.Rb * .5, Math.random() ** .8), yLand = coneY(rLand);   // thrown well out, as in 0.04
  const tLand = (vy + Math.sqrt(vy * vy + 2 * g * (VOL.H - yLand))) / g, vr = (rLand - r0) / tLand;
  let l = 0, prev = null;
  const add = (r, y, b, on) => { const p = [Math.cos(b) * r, y, Math.sin(b) * r]; if (prev) l += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]); pts.push({ p, l, on }); prev = p; };
  for (let k = 0; k <= 40; k++) { const t = tLand * k / 40; add(r0 + vr * t, VOL.H + vy * t - g * t * t / 2 + .05 * U, a, false); }
  // it winds as it goes down: a wide, slow swing from side to side, a tighter bend on it, and a little wobble, growing
  // as it runs, so no two tongues are alike and none is a straight line
  const land = l, seed = rand(0, 6.28), A = rand(1.6, 2.8) * U, kk = rand(.12, .2) / U, B = rand(.5, .9) * U, kb = rand(.4, .6) / U;
  const rs = [];
  for (let r = rLand; r <= VOL.Rb * 3; r += .3 * U) {   // down the slope, over the foot and far out over the plain
    const d = r - rLand, run = Math.min(1, d / (3 * U));
    const off = (Math.sin(d * kk + seed) * A + Math.sin(d * kb + seed * 2) * B + Math.sin(d * kb * 2.3 + seed * 3) * B * .35) * run;
    add(r, coneY(r) + .03 * U, a + off / r, true);
    rs.push([r, l]);
  }
  const lAt = R => (rs.find(([r]) => r >= R) || rs[rs.length - 1])[1];   // how far along it is when it is R from the axis
  return { pts, land, foot: lAt(VOL.Rb * .97), lAt, L: l };
}
// the point at l along a lava word's way
function wayAt(w, l) {
  const p = w.pts; if (l <= 0) return p[0].p;
  let lo = 0, hi = p.length - 1;
  if (l >= p[hi].l) return p[hi].p;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m].l < l) lo = m; else hi = m; }
  const t = (l - p[lo].l) / ((p[hi].l - p[lo].l) || 1);
  return [0, 1, 2].map(i => lerp(p[lo].p[i], p[hi].p[i], t));
}
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
  const texts = V.soup.texts().filter(Boolean), cam = V.camera.cam, mctx = V.mctx;
  if (!texts.length) return;
  const n = reduce.matches ? Math.min(8, burst) : burst;   // a big eruption
  // the words in a shuffled order, again and again as long as more are asked for than there are
  const pool = [];
  while (pool.length < n) { const round = texts.slice(); for (let i = round.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [round[i], round[j]] = [round[j], round[i]]; } pool.push(...round); }
  pool.length = n;
  const gap = 16 / Math.max(16, n);              // more words come closer together, so a big one lasts no longer than 16 do
  // all the way round, 360°: the lava spread evenly round the cone from a turn of its own, so no two runs lie on each
  // other; the smoke each on its own wind. What stayed from the last eruption cools off, so the slope doesn't fill up
  for (const f of flyers) if (f.lava && f.stays && !f.leaving) { f.leaving = true; f.rest = f.way.L; f.v0 = f.head; }   // it flows on, off the volcano
  const turn = rand(0, TAU);
  mctx.font = lfont();
  const nLava = Math.round(n * lavaShare);
  let iLava = 0;
  for (let k = 0; k < n; k++) {
    const text = pool[k], lava = (k + .5) / n < lavaShare, head = -k * .8 * gap - rand(0, 1);
    // lava, one after another, each with its own pace, some thick and slow, some running. What stays has time to flow
    // first, down to the edge of the volcano: most stop in its outer ring, near the foot, a few a little higher. The
    // rest runs on, out
    if (lava) {
      const way = lavaWay(turn + TAU * iLava++ / Math.max(1, nLava) + rand(-.08, .08)), stays = Math.random() < stayShare, r = Math.random();
      const rest = !stays ? way.L : Math.max(way.land, way.lAt(VOL.Rb * (r < .7 ? rand(.86, .97) : rand(.72, .86))));
      word(text, true, { text, way, stays, rest, head: -(k * .35 * gap + rand(0, .4)) * 4 * U, fly: rand(3.6, 4.6) * U, speed: rand(.7, 1.5) * U, size: 1.3 });
      const f = flyers[flyers.length - 1];
      if (stays) f.rest = Math.min(way.L, Math.max(f.rest, way.land + f.em * FW * U * f.size * 1.2 + .5 * U));   // all of it on the ground, none left hanging in the air
    }
    else word(text, false, { text, ...smokeOf(rand(0, TAU), head) });
  }
}
// where a word's way is, u along it: smoke goes up and off with the wind, swaying; lava follows the cone's side
function pathAt(f, u) {
  if (f.lava) return wayAt(f.way, u);
  const drift = (.35 * u + .07 * u * u) * U, sway = .5 * U * smooth(0, 3, u) * Math.sin(u * f.freq + f.ph);
  return [Math.cos(f.a) * f.start + Math.cos(f.wind) * drift - Math.sin(f.wind) * sway, VOL.H + (.1 + 1.1 * u) * U, Math.sin(f.a) * f.start + Math.sin(f.wind) * drift + Math.cos(f.wind) * sway];
}
function updateFlyers(dt) {
  const k = reduce.matches ? .6 : 1;
  for (const f of flyers) {
    f.age += dt;
    if (f.lava) {
      const w = f.way, staying = f.stays && !f.leaving;
      // in the air, fast; on the slope it gathers speed, surging a little like something thick. What stays slows where
      // it stops; what runs on keeps its pace down to the foot and over it, out of the screen
      const prog = staying ? clamp((f.head - w.land) / (f.rest - w.land), 0, 1) : clamp((f.head - (f.v0 ?? w.land)) / (w.foot - w.land), 0, 1);
      const v = f.head < w.land ? f.fly : f.speed * (.6 + 1.6 * prog) * (1 + .3 * Math.sin(f.head * .4 / U + f.ph)) * (staying ? 1 - .88 * smooth(.88, 1, prog) : 1);
      f.head = Math.min(f.rest, f.head + v * dt * k);
      f.fade = 0;
      if (staying && f.head >= f.rest) f.cold = Math.min(1, (f.cold || 0) + dt / 3);   // stopped: it darkens over 3 s
      if (!staying && f.head - f.em * FW * U * f.size * 1.7 >= w.foot && f.offscreen) f.gone = true;   // over the foot and out of sight
      if (f.head >= w.L) f.gone = true;
    }
    else f.head += f.speed * dt * k;
    if (!f.lava && f.head - f.em * FW * 3 > 16) f.gone = true;
  }
  flyers = flyers.filter(f => !f.gone);
}
// smoke: how much of it is left at u along its way; lava: its colour and how much is left, by how long it has been out
const smokeAlpha = u => 1 - smooth(6, 15, u);
// lava cools from the hole's red-orange only a little darker (COOL of it), never to black
// What stays on the slope cools further, to a slightly darker red, once it has stopped
const COOL = .62, COOL_STAY = .55;
const lavaInk = f => {
  let c = lerp(1, COOL, smooth(3, 14, f.age));
  if (f.stays) c = lerp(c, COOL_STAY, smooth(0, 1, f.cold || 0));
  return `rgb(${HOT.map(v => Math.round(v * c)).join(",")})`;
};
function drawFlyers(x) {
  const { W, H } = V.size(), cam = V.camera.cam, project = V.camera.project;
  x.textAlign = "center"; x.textBaseline = "middle"; x.font = lfont();
  for (const f of flyers) {
    if (f.head <= 0) continue;
    const span = f.lava ? f.em * FW * U * f.size * 1.7 + U : f.em * FW * 1.7 * f.size * 2.4 + 1, pts = [], M = 60;
    let seen = false;
    for (let u = Math.max(0, f.head - span); ; u = Math.min(f.head, u + (f.lava ? .25 * U : .2))) {
      const w = pathAt(f, u), q = project(...w);
      if (q) {
        pts.push({ x: q.x, y: q.y, k: q.k, s: 0, u, w });
        if (q.x > -M && q.x < W + M && q.y > -M && q.y < H + M) seen = true;
      }
      if (u >= f.head) break;
    }
    f.offscreen = !seen;
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
    const sizeAt = p => Math.max(FW * U * p.k * f.size * (f.lava ? 1 : 1 + .1 * p.u), FLY_MIN);
    if (f.lava) { x.fillStyle = lavaInk(f); x.globalAlpha = 1 - f.fade; }
    else x.fillStyle = "#3a3a3a";
    // always read from left to right: a word going left has its first letter at the head and reads down from it, top
    // to bottom, so it is never turned over. For smoke, left is where its wind goes on screen (deciding by its sway made it
    // flip back and forth, as if it fell back into the hole), with some slack so it doesn't flip as you orbit past
    let back;
    if (f.lava) back = pts[pts.length - 1].x < pts[0].x;
    else {
      const d = Math.cos(f.wind) * cam.rt[0] + Math.sin(f.wind) * cam.rt[2];
      if (f.back === undefined || Math.abs(d) > .25) f.back = d < 0;
      back = f.back;
    }
    const px0 = sizeAt(pts[pts.length - 1]);
    let pos = back ? S : S - f.em * px0;
    for (const L of f.letters) {
      const p0 = at(clamp(pos, 0, S)), px = sizeAt(p0), adv = L.w * px, mid = back ? pos - adv / 2 : pos + adv / 2;
      pos += back ? -adv : adv;
      if (mid < 0) { if (back) break; continue; }
      if (L.ch === " ") continue;
      const p = at(clamp(mid, 0, S));
      if (f.lava) {                              // on the far side of the cone, hidden by it
        const [wx, wy, wz] = p.w, r = Math.hypot(wx, wz) || 1;
        if (r > VOL.Rt && wy < coneY(r) + .1 * U && wx * (cam.x - wx) + sectionAt(r).M * r * (cam.y - wy) + wz * (cam.z - wz) < 0) continue;   // in the air it is always seen
        if (r > VOL.Rb && wx * cam.x + wz * cam.z < 0) continue;   // past the far foot: gone down behind the volcano's edge, not up into the sky
      } else x.globalAlpha = smokeAlpha(p.u);
      let ang = back ? p.ang + Math.PI : p.ang;
      ang = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -1.45, 1.45);
      x.save(); x.translate(p.x, p.y); x.rotate(ang); x.scale(px / 100, px / 100); x.fillText(L.ch, 0, 0); x.restore();
    }
    x.globalAlpha = 1;
  }
}

// ================= DEV: the eruption, by hand (its own tab), and the steady smoke (the volcano's) =================
// drag the tube (or use the arrow keys on it), or press "erupt". messages: how many words an eruption sends (more than
// the notes: repeated); lava · smoke: how they are shared
V.dev.tab("eruption", `
  <div id="tube" role="slider" tabindex="0" aria-label="Pressure: drag to set it" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="pFill"></span></div>
  <button id="pBoom" type="button">erupt</button>
  <span><span class="k">pressure </span><span id="pVal">0%</span></span>
  <label class="full"><span class="k">messages </span><span id="burstVal"></span><input type="range" id="burst" min="8" max="80" step="1"></label>
  <label class="full"><span class="k">lava · smoke </span><span id="lavaVal"></span><input type="range" id="lava" min="0" max="100" step="5"></label>
  <label class="full"><span class="k">lava stays </span><span id="stayVal"></span><input type="range" id="stay" min="0" max="100" step="5"></label>`);
// steady smoke: words a minute, 0 for none. Put after the lines (terrain.js loads after this file), so the volcano's tab
// reads rings, meridians, smoke
const steadyRow = document.createElement("label");
steadyRow.className = "full";
steadyRow.innerHTML = '<span class="k">smoke </span><span id="steadyVal"></span><input type="range" id="steady" min="0" max="60" step="1">';
V.dev.tab("volcano").append(steadyRow);   // in now, so its input is there to listen to; moved to the end once the lines are in
setTimeout(() => V.dev.tab("volcano").append(steadyRow));
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
const lavaIn = $("lava"), showLava = () => {
  const l = Math.round(lavaShare * 100), nl = Math.round(burst * lavaShare);
  lavaIn.value = l; $("lavaVal").textContent = `${l}% · ${100 - l}%  (${nl} · ${burst - nl})`;
};
lavaIn.addEventListener("input", () => { lavaShare = +lavaIn.value / 100; V.store.set("volcano-v17-lava", lavaShare); showLava(); });
showLava();
const steadyIn = $("steady"), showSteady = () => { steadyIn.value = steady; $("steadyVal").textContent = steady; };
steadyIn.addEventListener("input", () => { steady = +steadyIn.value; V.store.set("volcano-v17-steady", steady); nextPuff = Math.min(nextPuff, 60 / Math.max(1, steady)); showSteady(); });
showSteady();
const stayIn = $("stay"), showStay = () => { stayIn.value = Math.round(stayShare * 100); $("stayVal").textContent = Math.round(stayShare * 100) + "%"; };
stayIn.addEventListener("input", () => { stayShare = +stayIn.value / 100; V.store.set("volcano-v17-stay", stayShare); showStay(); });
showStay();
const burstIn = $("burst"), showBurst = () => { burstIn.value = burst; $("burstVal").textContent = burst; };
burstIn.addEventListener("input", () => { burst = +burstIn.value; V.store.set("volcano-v17-burst", burst); showBurst(); showLava(); });
showBurst();
function showDev() {
  pFill.style.height = `calc(${(pressure * 100).toFixed(2)}% - ${(pressure * 4).toFixed(2)}px)`;
  pVal.textContent = { build: Math.floor(pressure * 100) + "%", seal: "sealed", settle: "eruption" }[phase];
  tube.setAttribute("aria-valuenow", String(Math.round(pressure * 100)));
  pBoom.disabled = phase !== "build";
}

V.volcano = {
  VOL, SLOPE, coneY, addPressure, PER_NOTE, get pressure() { return pressure; }, get phase() { return phase; }, glsl,
  update(dt) { updatePressure(dt); shake *= Math.exp(-dt * 3); updatePuffs(dt); updateFlyers(dt); },
  drawMarks(x) { if (V.camera.cam.out) drawFlyers(x); },
  tremor, showDev,
};
})();

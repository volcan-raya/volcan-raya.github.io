// The camera: the way in and out, the lens, where the eye is and what it looks at; and all the moving: wheel, pinch,
// drag, keys. A touch on a ball in the soup is the soup's (soup.js). What the files say to each other is in core.js.
(() => {
"use strict";
const { clamp, lerp, smooth, $, reduce } = V;
const VOL = V.volcano.VOL;

// The way in is one number, s:
//   S_BOT … 0       the soup's depth: from its floor, where the title lies (0 m), up to where the eye rests over it. The
//                   page opens on the floor, the title filling the view, and rises to rest (the opening), the balls going
//                   past; you can always scroll back down to it
//   0 … S_IN        in the chamber: from the hole straight down the axis, looking straight down the whole way, onto the soup
//                   below, as from the sky: the black fades out evenly, the soup's reds coming through it, the balls coming up
//                   at you only near the end. Nothing turns. At 0 you look down on the soup; a drag turns you round the
//                   axis or lifts the head towards level (dip), and scrolling out brings it straight down again
//   S_IN … S_RAIL   the rail, as in 2.00: going out, the camera first rises straight up the axis, looking down on the
//                   hole, to about three times the volcano's height; only then does it swing out, still drawing back, to
//                   the view from the side, far off. Its tilt depends on s alone, but dragging sideways still turns it round the axis; going in is going out backwards
//   S_RAIL … S_MAX  outside, free: orbit and tilt round the axis, each step back the same share further. It stops
//                   short of S_FAR, where the distances are counted to, before the mountain's foot comes into view
const S_IN = .8, S_RAIL = 2.2, S_FAR = 4.5, S_MAX = 3.3, Z0 = -1.2, D_RAIL = 45, FAR = 115, DOWN = Math.PI / 2, SWING = .45, SWUNG = .7;   // where on the rail the swing starts (s 1.43: until then, straight down) and ends. The rim at .8, so the hole's black lets go of the screen at .9
// the lens: outside it goes long, the eye further back by the same share as the lens grows, so the size stays and the
// perspective flattens: at eye level the volcano is four straight lines, not the curves of a close round base
const EYE_LINE = .56, TELE = 90;
// outside, the eye looks at the axis this high: on the mountain's upper part, so the summit sits in the view and the foot below it
const LOOK = VOL.H * .75;
// 1.03: once swung out, the eye keeps climbing as you draw back, never level: LIFT more above it by the end, evenly
const LIFT = 12 * Math.PI / 180, lifted = s => LIFT * clamp((s - S_RAIL) / (S_MAX - S_RAIL), 0, 1);
let F = 1, PX = 0, PY = 0, lensK = 1;
function lens() { const { W, H } = V.size(); F = Math.max(H * .95, W * .68) * lensK; PX = W / 2; PY = H * EYE_LINE; }
const P_MIN = -20 * Math.PI / 180, P_MAX = 75 * Math.PI / 180;
// in the chamber you can look up from below; outside the camera stays above the disc
const P_OUT = 28 * Math.PI / 180;               // outside, always from above, so you come out looking down on it and the disc is never edge on
const pitchFloor = s => lerp(P_MIN, P_OUT, smooth(0, S_IN, s));
const REST_Y = VOL.eye - Z0;                    // where the eye rests, over the middle of the soup
// the soup's floor, under the lowest balls, where the title lies (index.html #title), and the eye's lowest point over it
// The eye stops low enough to fill the view with the title, never so low that its ends are cut: at 0 m the title's ink
// runs from margin to margin, the same margins as a note opened full screen (soup.js: --side on #big, DEV soup)
const S_BOT = -1, FLOOR_Y = VOL.eye - VOL.Rc, TITLE_W = .55;
const sideOf = () => { const b = document.getElementById("big"); return (b && parseFloat(getComputedStyle(b).getPropertyValue("--side"))) || 40; };
// and, in a short window, the eyes and the title together never taller than TALL of it
const TALL = .58;
const bottomY = () => {
  const { W, H } = V.size(), across = 1 / Math.max(1, W - 2 * sideOf()), up = ink ? ink.h / ink.w / Math.max(1, H * TALL) : 0;
  return FLOOR_Y + F * TITLE_W * Math.max(across, up);
};
// the opening: from the floor up to rest, slow, faster, slow, as the title is left behind (none with reduced motion)
// it holds HOLD s on the title, by the clock (the first frames of a page can stutter), then rises over dur s
let opening = reduce.matches ? null : { start: 0, hold: 2, dur: 2.8 };
let travel = reduce.matches ? 0 : S_BOT, aim = travel, glide = false, cam = null, yaw = 0, yawAim = 0, pitch = 0, pitchAim = 0;
// in the chamber the head is straight down; dip lifts it towards level (a drag), and goes back to 0 as you scroll out
let dip = 0, dipAim = 0;
const onRail = () => travel > .02 && travel < S_RAIL - .02;
function camera() {
  // the eye's line: the middle of the screen while you look straight down (in the soup, down the hole, up the axis), so
  // the title on the floor is exactly centred at 0 m; lower (EYE_LINE) as you swing out to the side view
  { const { H } = V.size(); PY = H * lerp(.5, EYE_LINE, smooth(S_IN + (S_RAIL - S_IN) * SWING, S_RAIL, travel)); }
  const s = travel, tilted = Math.max(pitch, pitchFloor(s)), ca = Math.cos(yaw), sa = Math.sin(yaw);
  let p = tilted, pos, T = 1, rise = 0, balls = 1;
  const dir = () => [sa * Math.cos(p), -Math.sin(p), ca * Math.cos(p)];
  if (s >= S_RAIL) {                           // outside
    p = Math.min(tilted + lifted(s), 85 * Math.PI / 180);
    const D = D_RAIL * (FAR / D_RAIL) ** ((s - S_RAIL) / (S_FAR - S_RAIL)), f = dir();
    T = TELE ** smooth(S_RAIL, S_RAIL + 1, s);
    pos = [-f[0] * D * T, LOOK - f[1] * D * T, -f[2] * D * T];
  } else if (s >= S_IN) {                      // the rail: up the axis, then the swing out (coming in: the swing over the top, then down onto the hole)
    // the eye rises steadily the whole way, never stopping and never going down again; from halfway it also moves out,
    // and it always looks at the axis, at the summit at first, then lower, at the mountain's upper part
    // (the swing ends before the rail does, so its last part is already the climb)
    const u = (s - S_IN) / (S_RAIL - S_IN), out = smooth(SWING, SWUNG, u), cy = lerp(VOL.H, LOOK, out);
    // up fast just past the rim, so the hole's black lets go of the screen soon, then slower to the same height
    const y = lerp(VOL.H + .03, LOOK + Math.sin(tilted) * D_RAIL, 1 - (1 - u) ** 4), r = Math.cos(tilted) * D_RAIL * out;
    p = r < 1e-4 ? DOWN : Math.atan2(y - cy, r);
    pos = [-sa * r, y, -ca * r];
  } else if (s < 0) {                          // the soup's depth, down to its floor
    rise = 1;
    pos = [0, lerp(bottomY(), REST_Y, (s - S_BOT) / -S_BOT), 0];
    p = DOWN - dip;
  } else {                                     // in: straight down the axis, looking straight down
    const u = 1 - s / S_IN;
    rise = smooth(.15, 1, u);
    balls = smooth(.55, .92, u);               // the balls only near the end, not as soon as the black lifts
    pos = [0, lerp(VOL.H - .03, REST_Y, smooth(0, 1, u)), 0];
    p = DOWN - dip * (1 - smooth(0, .5, s));   // a lifted head goes back down as you scroll out
  }
  const cp = Math.cos(p), sp = Math.sin(p);
  // how much the camera looks down from above (the soup can whiten with it)
  const white = s < S_IN ? 0 : .6 * smooth(0, P_MAX, tilted);
  cam = { in: s < S_IN, inside: rise, rise, balls, white, x: pos[0], y: pos[1], z: pos[2], f: [sa * cp, -sp, ca * cp], rt: [ca, 0, -sa], up: [sa * sp, cp, ca * sp],
    F: F * T, s, out: s >= S_IN, rail: s >= S_IN && s < S_RAIL };
  // the soup can be touched once it is mostly up
  cam.soup = smooth(.5, .9, rise);
  return cam;
}
function project(x, y, z) {
  const px = x - cam.x, py = y - cam.y, pz = z - cam.z, { f, rt, up } = cam;
  const d = f[0] * px + f[1] * py + f[2] * pz; if (d <= 1e-3) return null;
  const k = cam.F / d;
  return { x: PX + (rt[0] * px + rt[2] * pz) * k, y: PY - (up[0] * px + up[1] * py + up[2] * pz) * k, k, d };
}
// the world point at a screen point, d ahead of the camera
function unproject(sx, sy, d) {
  const lx = (sx - PX) / cam.F * d, ly = -(sy - PY) / cam.F * d, { f, rt, up } = cam;
  return [0, 1, 2].map(i => [cam.x, cam.y, cam.z][i] + f[i] * d + rt[i] * lx + up[i] * ly);
}
// moving: everything eases towards the aim; asked for, it glides there more slowly
function goTo(s, slow = false) { opening = null; aim = clamp(s, S_BOT, S_MAX); glide = slow; if (slow && reduce.matches) travel = aim; }
function push(ds) { opening = null; aim = clamp(aim + ds, S_BOT, S_MAX); glide = false; }
function updateTravel(dt) {
  if (fling) {                                  // a spin let go goes on, slowing down
    const k = Math.exp(-dt * 5);
    yawAim += fling.vx * YAW_K * dt; tilt(fling.vy * dt);
    fling.vx *= k; fling.vy *= k; if (Math.hypot(fling.vx, fling.vy) < 15) fling = null;
  }
  yaw += (yawAim - yaw) * (1 - Math.exp(-dt * 12));
  pitchAim = Math.max(pitchAim, pitchFloor(travel));
  pitch += (pitchAim - pitch) * (1 - Math.exp(-dt * 12));
  if (travel > .05) dipAim = 0;                 // out of the soup: straight down again, so the way back in is too
  dip += (dipAim - dip) * (1 - Math.exp(-dt * 12));
  if (opening) {                                // rising off the floor, unless you scroll first
    if (!inkReady) return;                      // it waits for the title to be there
    const now = performance.now() / 1000; if (!opening.start) opening.start = now;
    const t = now - opening.start - opening.hold;
    travel = aim = lerp(S_BOT, 0, smooth(0, 1, t / opening.dur));
    if (t >= opening.dur) opening = null;
    return;
  }
  const rate = glide ? 2.4 : 10;
  travel += (aim - travel) * (1 - Math.exp(-dt * rate));   // no cap: when you stop scrolling, it settles at once where you left it
  if (Math.abs(aim - travel) < 1e-4) { travel = aim; glide = false; }
}

// ================= moving: wheel, pinch, keys =================
// Nothing moves by itself. On the rail the tilt is the rail's, but you can always turn round the axis.
const marks = V.marks, at = V.at, soup = () => V.soup;
const WHEEL = .0011, PINCH = 1.7;
const overUI = t => t instanceof Element && !!t.closest("[data-ui]");
addEventListener("wheel", e => {
  if (overUI(e.target)) return;
  e.preventDefault();
  const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? V.size().H : 1;
  push(e.deltaY * unit * (e.ctrlKey ? WHEEL * 9 : WHEEL));   // pinching on a trackpad comes as a wheel with ctrl, in small steps
}, { passive: false });
// Safari's trackpad pinch
let gScale = 1;
addEventListener("gesturestart", e => { e.preventDefault(); gScale = e.scale || 1; });
addEventListener("gesturechange", e => {
  e.preventDefault(); if (pointers.size) return;             // on a phone, the pointers already carry it
  const s = e.scale || 1; push(-Math.log(s / gScale) * PINCH); gScale = s;
});
// touch: two fingers pinch, one finger orbits and tilts, as the mouse does. In the chamber a dot, with one finger or the
// mouse, is picked up by the soup (soup.js) and dropped where you let go
const pointers = new Map(), YAW_K = .0035;     // radians per px
const tilt = dy => {
  if (travel < .05) { dipAim = clamp(dipAim - dy * YAW_K, 0, DOWN); return; }   // in the soup: the head lifts towards level
  if (onRail() || travel < S_IN) return;
  pitchAim = clamp(pitchAim + dy * YAW_K, P_MIN, P_MAX);
};
let pinchD = 0, dragged = false, downAt = null, grabbing = false, orbit = null;
// a spin goes on a little once let go, slowing down, as a thrown ball does (soup.js): the drag's speed, in px a second,
// kept while turning; let go while still moving, it carries on (fling, updateTravel). Not with reduced motion
let spin = null, fling = null;
const track = (dx, dy) => {
  const now = performance.now(), dt = spin ? (now - spin.t) / 1000 : 0;
  if (!spin) spin = { vx: 0, vy: 0, t: now };
  if (dt > 0) { const k = 1 - Math.exp(-dt / .06); spin.vx += (dx / dt - spin.vx) * k; spin.vy += (dy / dt - spin.vy) * k; }
  spin.t = now;
};
const letGo = () => {
  if (spin && !reduce.matches && performance.now() - spin.t < 90 && Math.hypot(spin.vx, spin.vy) > 60) fling = { vx: spin.vx, vy: spin.vy };
  spin = null;
};
const drop = () => { if (grabbing) { grabbing = false; soup().drop(); } };
marks.addEventListener("pointerdown", e => {
  downAt = { x: e.clientX, y: e.clientY }; dragged = false; fling = spin = null;
  if (!pointers.size && (e.pointerType === "touch" || e.button === 0) && cam.soup > .5) {
    grabbing = soup().pointerDown(...at(e));
    if (grabbing) { try { marks.setPointerCapture(e.pointerId); } catch {} }
  }
  if (e.pointerType !== "touch") {
    if (!grabbing && e.button === 0) { orbit = { x: e.clientX, y: e.clientY }; try { marks.setPointerCapture(e.pointerId); } catch {} }
    return;
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { marks.setPointerCapture(e.pointerId); } catch {}
  if (pointers.size === 2) { drop(); spin = null; const [a, b] = [...pointers.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); }
});
marks.addEventListener("pointermove", e => {
  if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) dragged = true;
  if (grabbing) {                              // the badge under the pointer, as far off as it was
    soup().pointerMove(...at(e), dragged);
    const p = pointers.get(e.pointerId); if (p) { p.x = e.clientX; p.y = e.clientY; }
    return;
  }
  if (orbit) { track(e.clientX - orbit.x, e.clientY - orbit.y); yawAim += (e.clientX - orbit.x) * YAW_K; tilt(e.clientY - orbit.y); orbit.x = e.clientX; orbit.y = e.clientY; return; }
  if (e.pointerType !== "touch") { soup().hover(...at(e)); return; }
  const p = pointers.get(e.pointerId); if (!p) return;
  if (pointers.size === 2) {
    p.x = e.clientX; p.y = e.clientY;
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchD > 0 && d > 0) push(-Math.log(d / pinchD) * PINCH);   // fingers apart: forward
    pinchD = d;
  } else if (pointers.size === 1) {
    track(e.clientX - p.x, e.clientY - p.y); tilt(e.clientY - p.y); yawAim += (e.clientX - p.x) * YAW_K;
    p.x = e.clientX; p.y = e.clientY;
  }
});
const lift = e => { pointers.delete(e.pointerId); pinchD = 0; if (!pointers.size) { const held = grabbing; drop(); if (!held) letGo(); orbit = null; } };
marks.addEventListener("pointerup", lift); marks.addEventListener("pointercancel", lift);
marks.addEventListener("pointerleave", e => { if (e.pointerType !== "touch") soup().hover(null); });
marks.addEventListener("click", e => {          // a tap: the soup decides (a badge opens; anywhere else closes what is open)
  if (dragged) return;
  soup().click(...at(e));
});
addEventListener("keydown", e => {
  const t = e.target;
  if (e.metaKey || e.ctrlKey || e.altKey || (t instanceof Element && t.closest("input, textarea, select, [contenteditable]"))) return;
  if (e.key === "+" || e.key === "=") { push(-.22); e.preventDefault(); }
  else if (e.key === "-" || e.key === "_") { push(.22); e.preventDefault(); }
  else if (e.key === "0") { goTo(0, true); e.preventDefault(); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { yawAim += e.key === "ArrowLeft" ? -.25 : .25; e.preventDefault(); }
  else if (e.key === "ArrowUp" || e.key === "ArrowDown") { tilt(e.key === "ArrowUp" ? 70 : -70); e.preventDefault(); }
});

// ================= DEV: where the camera is, the lens =================
V.dev.tab("camera", `
  <label class="full"><span class="k">camera </span><span id="camVal"></span><input type="range" id="camera" min="0" max="3.3" step="0.001" value="0"></label>
  <span class="full"><button class="t" id="home" type="button">back to the soup</button></span>
  <label class="full"><span class="k">lens </span><span id="lensVal">1.00</span><input type="range" id="lens" min="0.4" max="3" step="0.01" value="1"></label>`);
const camIn = $("camera"), camVal = $("camVal");
$("lens").addEventListener("input", () => { lensK = +$("lens").value; $("lensVal").textContent = lensK.toFixed(2); lens(); });
$("home").addEventListener("click", () => goTo(0, true));
camIn.max = S_MAX; camIn.min = S_BOT;
camIn.addEventListener("input", () => { travel = aim = +camIn.value; glide = false; });
// DEV: two numbers. Where the camera is on its way, the raw position the wheel moves (0 at the title on the soup's
// floor, 1 at rest over the soup, 2 at the rim, 3.43 where it starts to swing out to the side), and where it
// looks, its pitch: -90° straight down, 0° level, 90° straight up
const camText = () => {
  const deg = Math.round(Math.asin(Math.max(-1, Math.min(1, cam.f[1]))) * 180 / Math.PI);
  return `${(travel - S_BOT).toFixed(2)} · ${deg === 0 ? 0 : deg}°`;
};
function showDev() {
  camVal.textContent = camText();
  if (document.activeElement !== camIn) camIn.value = travel.toFixed(3);
}

// ================= the title, lying on the soup's floor =================
// NOTIFICATION SOUP (index.html #title) is on the floor, TITLE_W wide, turning with you; seen from above, nearer or
// further as the eye goes down or up. From a little way up it softens and fades, so at rest it is gone, and you can
// always scroll down to it again
const titleEl = document.querySelector("#title > span");
// where the letters' ink is in the title's box, measured in its own font: the box has room for the letter spacing after
// the last letter and the font's own ascent and descent, so its middle is not the ink's. Measured again once the fonts
// are in (Mebar Display arrives later)
let ink = null;
const INK_LIFT = .22;
function measureInk() {
  if (!titleEl) return;
  const cs = getComputedStyle(titleEl), x = document.createElement("canvas").getContext("2d");
  x.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  // across, from the first letter's ink to the last's, in the box as laid out (with the letter spacing, which the canvas
  // doesn't take, after every letter, the last one too); up and down, from the whole text's ink about its baseline
  const t = (titleEl.querySelector(".t") || titleEl).textContent, m = x.measureText(t), m0 = x.measureText(t[0]), m1 = x.measureText(t[t.length - 1]);
  const w = titleEl.offsetWidth, h = titleEl.offsetHeight, ls = parseFloat(cs.letterSpacing) || 0;
  const left = -m0.actualBoundingBoxLeft, right = w - ls - (m1.width - m1.actualBoundingBoxRight);
  const base = (h - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
  let top = base - m.actualBoundingBoxAscent;   // the ink's top: the title's, or the eyes' over it
  const eyes = titleEl.querySelector(".eyes");
  if (eyes) {
    const es = getComputedStyle(eyes), gap = parseFloat(es.bottom) - h;   // bottom: 100% + gap
    x.font = `${es.fontWeight} ${es.fontSize} ${es.fontFamily}`;
    const v = x.measureText("V"), eb = (eyes.offsetHeight - (v.fontBoundingBoxAscent + v.fontBoundingBoxDescent)) / 2 + v.fontBoundingBoxAscent;
    top = Math.min(top, -gap - eyes.offsetHeight + eb - v.actualBoundingBoxAscent);
  }
  // the middle of all the ink, eyes and letters, set a little above the middle (INK_LIFT of its own height): the eyes'
  // weight on top and the screen's lower half taken by the composer make the true middle look low
  const bottom = base + m.actualBoundingBoxDescent, cy = (top + bottom) / 2 + INK_LIFT * (bottom - top);
  ink = { w: right - left || w, h: bottom - top, dx: w / 2 - (left + right) / 2, dy: h / 2 - cy };
  if (eyes) eyes.style.left = `${(left + right) / 2}px`;   // the eyes over the letters' middle, not the box's
}
// it shows only once Mebar Display is in and measured, so it never lands in one place and jumps to another
let inkReady = false;
const fontsIn = () => { measureInk(); inkReady = true; };
(document.fonts ? Promise.race([Promise.all([document.fonts.load('300 120px "Mebar Display"'), document.fonts.load('400 120px "Mebar Eyes"', "V")]).then(() => document.fonts.ready), new Promise(r => setTimeout(r, 3000))]) : Promise.resolve()).then(fontsIn);
document.fonts?.addEventListener?.("loadingdone", () => { if (inkReady) measureInk(); });
function placeTitle() {
  if (!titleEl) return;
  if (!ink) measureInk();
  const a = cam.in ? project(0, FLOOR_Y, 0) : null, b = a && project(1, FLOOR_Y, 0), h = cam.y - FLOOR_Y;
  const o = a && b && inkReady ? 1 - smooth(2.2, 4.8, h) : 0;
  titleEl.style.opacity = o.toFixed(3);
  if (o <= 0) return;
  // TITLE_W is the ink's width; its middle on the floor's middle
  const ppu = Math.hypot(b.x - a.x, b.y - a.y), k = ppu * TITLE_W / ink.w;
  titleEl.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) rotate(${Math.atan2(b.y - a.y, b.x - a.x).toFixed(4)}rad) scale(${k.toFixed(4)}) translate(-50%, -50%) translate(${ink.dx.toFixed(2)}px, ${ink.dy.toFixed(2)}px)`;
  const bl = 6 * smooth(1, 4.4, h);
  titleEl.style.filter = bl > .2 ? `blur(${(bl / Math.max(k, .05)).toFixed(2)}px)` : "none";   // in screen px: the filter is scaled with it
}
V.camera = {
  get cam() { return cam; }, project, unproject, NEAR: .14, z0: Z0, goTo, lens, screen: () => ({ PX, PY }),
  update(dt) { updateTravel(dt); camera(); placeTitle(); },
  dragging: () => !!(orbit && dragged), showDev,
};
})();

// The camera: the way in and out, the lens, where the eye is and what it looks at; and all the moving: wheel, pinch,
// drag, keys. A touch on a ball in the soup is the soup's (soup.js). What the files say to each other is in core.js.
(() => {
"use strict";
const { clamp, lerp, smooth, $, reduce } = V;
const VOL = V.volcano.VOL;

// The way in is one number, s:
//   0 … S_IN        in the chamber: from the hole down the axis to the middle; the black fades out evenly, the soup's reds coming
//                   through it, as the head lifts from straight down to level. At 0 you look round the middle, as the mouse turns you
//   S_IN … S_RAIL   the rail, as in 2.00: going out, the camera first rises straight up the axis, looking down on the
//                   hole, to about three times the volcano's height; only then does it swing out, still drawing back, to
//                   the view from the side, far off. Its tilt depends on s alone, but dragging sideways still turns it round the axis; going in is going out backwards
//   S_RAIL … S_MAX  outside, free: orbit and tilt round the axis, each step back the same share further. It stops
//                   short of S_FAR, where the distances are counted to, before the mountain's foot comes into view
const S_IN = 1, S_RAIL = 2.2, S_FAR = 4.5, S_MAX = 3.3, Z0 = -1.2, D_RAIL = 45, FAR = 115, DOWN = Math.PI / 2, SWING = .5;   // SWING: where on the rail the swing starts
// the lens: outside it goes long, the eye further back by the same share as the lens grows, so the size stays and the
// perspective flattens: at eye level the volcano is four straight lines, not the curves of a close round base
const EYE_LINE = .56, TELE = 90;
// outside, the eye looks at the axis this high: on the mountain's upper part, so the summit sits in the view and the foot below it
const LOOK = VOL.H * .75;
let F = 1, PX = 0, PY = 0, lensK = 1;
function lens() { const { W, H } = V.size(); F = Math.max(H * .95, W * .68) * lensK; PX = W / 2; PY = H * EYE_LINE; }
const P_MIN = -20 * Math.PI / 180, P_MAX = 75 * Math.PI / 180;
// in the chamber you can look up from below; outside the camera stays above the disc
const P_OUT = 28 * Math.PI / 180;               // outside, always from above, so you come out looking down on it and the disc is never edge on
const pitchFloor = s => lerp(P_MIN, P_OUT, smooth(0, S_IN, s));
let travel = 0, aim = 0, glide = false, cam = null, yaw = 0, yawAim = 0, pitch = 0, pitchAim = 0;
const onRail = () => travel > .02 && travel < S_RAIL - .02;
function camera() {
  const s = travel, tilted = Math.max(pitch, pitchFloor(s)), ca = Math.cos(yaw), sa = Math.sin(yaw);
  let p = tilted, pos, T = 1, rise = 0;
  const dir = () => [sa * Math.cos(p), -Math.sin(p), ca * Math.cos(p)];
  if (s >= S_RAIL) {                           // outside
    const D = D_RAIL * (FAR / D_RAIL) ** ((s - S_RAIL) / (S_FAR - S_RAIL)), f = dir();
    T = TELE ** smooth(S_RAIL, S_RAIL + 1, s);
    pos = [-f[0] * D * T, LOOK - f[1] * D * T, -f[2] * D * T];
  } else if (s >= S_IN) {                      // the rail: up the axis, then the swing out (coming in: the swing over the top, then down onto the hole)
    // the eye rises steadily the whole way, never stopping and never going down again; from halfway it also moves out,
    // and it always looks at the axis, at the summit at first, then lower, at the mountain's upper part
    const u = (s - S_IN) / (S_RAIL - S_IN), out = smooth(SWING, 1, u), cy = lerp(VOL.H, LOOK, out);
    const y = lerp(VOL.H + .03, LOOK + Math.sin(tilted) * D_RAIL, u), r = Math.cos(tilted) * D_RAIL * out;
    p = r < 1e-4 ? DOWN : Math.atan2(y - cy, r);
    pos = [-sa * r, y, -ca * r];
  } else {                                     // in: down the axis, the head lifting
    const u = 1 - s / S_IN, f0 = dir();
    rise = smooth(.15, 1, u);
    const end = [-f0[0] * -Z0, VOL.eye - f0[1] * -Z0, -f0[2] * -Z0], go = smooth(0, 1, u);
    pos = [end[0] * go, lerp(VOL.H - .03, end[1], go), end[2] * go];
    p = lerp(DOWN, tilted, rise);
  }
  const cp = Math.cos(p), sp = Math.sin(p);
  // how much the camera looks down from above (the soup can whiten with it)
  const white = .6 * smooth(0, P_MAX, tilted);
  cam = { in: s < S_IN, inside: rise, rise, white, x: pos[0], y: pos[1], z: pos[2], f: [sa * cp, -sp, ca * cp], rt: [ca, 0, -sa], up: [sa * sp, cp, ca * sp],
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
function goTo(s, slow = false) { aim = clamp(s, 0, S_MAX); glide = slow; if (slow && reduce.matches) travel = aim; }
function push(ds) { aim = clamp(aim + ds, 0, S_MAX); glide = false; }
function updateTravel(dt) {
  yaw += (yawAim - yaw) * (1 - Math.exp(-dt * 12));
  pitchAim = Math.max(pitchAim, pitchFloor(travel));
  pitch += (pitchAim - pitch) * (1 - Math.exp(-dt * 12));
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
const tilt = dy => { if (onRail()) return; pitchAim = clamp(pitchAim + dy * YAW_K, P_MIN, P_MAX); };
let pinchD = 0, dragged = false, downAt = null, grabbing = false, orbit = null;
const drop = () => { if (grabbing) { grabbing = false; soup().drop(); } };
marks.addEventListener("pointerdown", e => {
  downAt = { x: e.clientX, y: e.clientY }; dragged = false;
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
  if (pointers.size === 2) { drop(); const [a, b] = [...pointers.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); }
});
marks.addEventListener("pointermove", e => {
  if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) dragged = true;
  if (grabbing) {                              // the badge under the pointer, as far off as it was
    soup().pointerMove(...at(e), dragged);
    const p = pointers.get(e.pointerId); if (p) { p.x = e.clientX; p.y = e.clientY; }
    return;
  }
  if (orbit) { yawAim += (e.clientX - orbit.x) * YAW_K; tilt(e.clientY - orbit.y); orbit.x = e.clientX; orbit.y = e.clientY; return; }
  if (e.pointerType !== "touch") { soup().hover(...at(e)); return; }
  const p = pointers.get(e.pointerId); if (!p) return;
  if (pointers.size === 2) {
    p.x = e.clientX; p.y = e.clientY;
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchD > 0 && d > 0) push(-Math.log(d / pinchD) * PINCH);   // fingers apart: forward
    pinchD = d;
  } else if (pointers.size === 1) {
    tilt(e.clientY - p.y); yawAim += (e.clientX - p.x) * YAW_K;
    p.x = e.clientX; p.y = e.clientY;
  }
});
const lift = e => { pointers.delete(e.pointerId); pinchD = 0; if (!pointers.size) { drop(); orbit = null; } };
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
camIn.max = S_MAX;
camIn.addEventListener("input", () => { travel = aim = +camIn.value; glide = false; });
// DEV: two numbers. Where the camera is on its way, the raw position the wheel moves (0 in the soup, at rest), and where it
// looks, its pitch: -90° straight down, 0° level, 90° straight up
const camText = () => {
  const deg = Math.round(Math.asin(Math.max(-1, Math.min(1, cam.f[1]))) * 180 / Math.PI);
  return `${(travel).toFixed(2)} · ${deg === 0 ? 0 : deg}°`;
};
function showDev() {
  camVal.textContent = camText();
  if (document.activeElement !== camIn) camIn.value = travel.toFixed(3);
}

V.camera = {
  get cam() { return cam; }, project, unproject, NEAR: .14, z0: Z0, goTo, lens, screen: () => ({ PX, PY }),
  update(dt) { updateTravel(dt); camera(); },
  dragging: () => !!(orbit && dragged), showDev,
};
})();

// 3.01: no camera, no 3D. The volcano is a black triangle, the eject's, and the eject (⏏) takes you out. One number, s, says where you are: 0 in the soup, 1 outside, looking at the volcano (an emoji,
// 🌋). Going in is a click on it: the emoji grows round a point low in it, low on the screen, until it fills the screen, and the soup's
// orange is that same orange. Coming out is any of the propositions in a row at the top of the soup: the same zoom, backwards, on the one axis. Nothing scrolls.
// The soup is flat: a ball is a point on the screen, all of them the same size. What the files say to each other is in core.js.
(() => {
"use strict";
const { clamp, lerp, smooth, $, reduce } = V;

// the volcano on the screen: its emoji's middle and size, and its crater, where the words leave from. Set in DEV (volcano)
const look = { size: 44, craterY: .25, pivotY: .18, atY: .7, ...(V.store.get("volcano-v15-look2", {}) || {}) };   // size: % of the screen's short side; craterY: above the middle, in emoji sizes; pivotY: where the zoom goes in, below the middle, in emoji sizes; atY: where that point is on the screen, from the top
let W = 1, H = 1, E = 100, CX = 0, CY = 0;
function lens() {
  ({ W, H } = V.size());
  E = Math.min(W, H) * look.size / 100;
  CX = W / 2; CY = H * look.atY - E * look.pivotY;   // the volcano placed so the point the zoom goes in at is low on the screen, the volcano weighing down
}
const crater = () => [CX, CY - E * look.craterY];
const pivot = () => [CX, CY + E * look.pivotY];     // low in the volcano, where the soup is: the zoom grows round it

// the way in: s eases to its aim. ZMAX: how much the emoji grows on the way in, round its crater
const ZMAX = 60, TIME = 1.4, CUT = .85;           // CUT: how far in (e) the soup takes over, at once, no fade
let s = 0, aim = 0, cam = null;                   // it opens in the soup
function goTo(v) { aim = clamp(v, 0, 1); if (reduce.matches) s = aim; }
function update(dt) {
  if (s !== aim) {
    const step = dt / TIME;
    s = aim > s ? Math.min(aim, s + step) : Math.max(aim, s - step);
  }
  const t = 1 - s, e = t < .5 ? 4 * t * t * t : 1 - 4 * (1 - t) ** 3;   // 0 outside … 1 in: slow to start, fast through the middle
  const zoom = Math.exp(Math.log(ZMAX) * e);
  const [kx, ky] = pivot();
  // one axis only: the emoji grows and shrinks round one point, low in the volcano and low on the screen; nothing else moves
  const fx = kx, fy = ky;
  cam = {
    s, e, zoom, fx, fy, kx, ky,                    // the emoji, the words: scaled by zoom round (kx, ky), which is drawn at (fx, fy)
    out: e < .999, in: e > .001,
    inside: e >= CUT ? 1 : 0,                      // the soup, or the volcano: a cut, no fade
    soup: e >= CUT ? 1 : 0,                        // and it can be touched
    F: 1, x: 0, y: 0, z: 0,
  };
  return cam;
}
// outside, a point of the scene as it is drawn with the zoom
const outside = (x, y) => [cam.fx + (x - cam.kx) * cam.zoom, cam.fy + (y - cam.ky) * cam.zoom];

// ================= the soup, flat =================
// A ball's place is x, y, from -1 to 1 across the screen, less a margin (the title above, the composer below); z is kept
// for soup.js and does nothing. k: the px of one unit of size, so a ball (BR in soup.js) is BALL px across, wherever it is
const BALL = () => V.store.get("volcano-v15-ball", 26);
const box = () => ({ x0: W / 2, y0: H * .5, sx: W / 2 - 40, sy: H * .5 - 90 });
function project(x, y) {
  const b = box();
  return { x: b.x0 + x * b.sx, y: b.y0 - y * b.sy, k: BALL() / 2 / .028, d: 1 };
}
function unproject(px, py) {
  const b = box();
  return [(px - b.x0) / b.sx, (b.y0 - py) / b.sy, 0];
}

// ================= in and out =================
const view = V.view, marks = V.marks, at = V.at, soup = () => V.soup;
document.body.insertAdjacentHTML("beforeend", `
<button id="goIn" class="sr" type="button">into the volcano</button>
<nav id="goOut" aria-label="into and out of the volcano"></nav>`);
// the way in and the way out, both: the eject, ⏏, the volcano's triangle on its bar, always at the top
const OUTS = [["⏏", "sign", "eject"]];
const goIn = $("goIn"), goOut = $("goOut");
goOut.innerHTML = OUTS.map(([g, k, say], i) =>
  `<button type="button" title="${say}" aria-label="out (${say})"><span class="g ${k}" aria-hidden="true">${g}</span></button>`).join("");
function onVolcano(px, py) {                     // on the triangle (field.js), with a little room round it
  const u = (px - CX) / E, v = (py - CY) / E;
  return cam.e < .05 && v > -.3 && v < .6 && Math.abs(u) < (v < .3 ? v + .35 : .55);   // the triangle, and the bar under it
}
function enter() { if (aim !== 0) goTo(0); }
function leave() {
  if (aim === 1) return;
  goTo(1);                                         // the balls stay where they are: they go up only in an eruption (volcano.js)
}
goIn.addEventListener("click", enter);
goOut.addEventListener("click", e => { if (e.target.closest("button")) (aim === 0 ? leave : enter)(); });

let downAt = null, dragged = false, grabbing = false;
marks.addEventListener("pointerdown", e => {
  downAt = { x: e.clientX, y: e.clientY }; dragged = false;
  if ((e.pointerType === "touch" || e.button === 0) && cam.soup > .5) {
    grabbing = soup().pointerDown(...at(e));
    if (grabbing) { try { marks.setPointerCapture(e.pointerId); } catch {} }
  }
});
marks.addEventListener("pointermove", e => {
  if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) dragged = true;
  if (grabbing) { soup().pointerMove(...at(e), dragged); return; }
  const [px, py] = at(e);
  hoverVolcano = onVolcano(px, py);
  if (e.pointerType !== "touch") soup().hover(px, py);
});
const lift = () => { downAt = null; if (grabbing) { grabbing = false; soup().drop(); } };
marks.addEventListener("pointerup", lift); marks.addEventListener("pointercancel", lift);
marks.addEventListener("pointerleave", e => { hoverVolcano = false; if (e.pointerType !== "touch") soup().hover(null); });
marks.addEventListener("click", e => {
  if (dragged) return;
  const [px, py] = at(e);
  if (onVolcano(px, py)) { enter(); return; }
  soup().click(px, py);
});
addEventListener("keydown", e => {
  const t = e.target;
  if (e.metaKey || e.ctrlKey || e.altKey || (t instanceof Element && t.closest("input, textarea, select, [contenteditable]"))) return;
  if (e.key === "+" || e.key === "=") { enter(); e.preventDefault(); }
  else if (e.key === "-" || e.key === "_") { leave(); e.preventDefault(); }
});
let hoverVolcano = false;

// ================= DEV =================
V.dev.tab("camera", `
  <label class="full"><span class="k">in … out </span><span id="camVal"></span><input type="range" id="camera" min="0" max="1" step="0.001" value="0"></label>
  <label class="full"><span class="k">volcano size, % of the screen </span><span id="sizeV"></span><input type="range" id="vSize" min="10" max="70" step="1"></label>
  <label class="full"><span class="k">crater, above the middle </span><span id="craterV"></span><input type="range" id="vCrater" min="-.2" max=".5" step=".01"></label>
  <label class="full"><span class="k">zoom point, below the middle </span><span id="pivotV"></span><input type="range" id="vPivot" min="-.3" max=".45" step=".01"></label>
  <label class="full"><span class="k">zoom point on the screen, from the top </span><span id="atV"></span><input type="range" id="vAt" min=".35" max=".85" step=".01"></label>
  <label class="full"><span class="k">ball, px </span><span id="ballV"></span><input type="range" id="vBall" min="8" max="80" step="1"></label>`);
const camIn = $("camera");
camIn.addEventListener("input", () => { s = aim = +camIn.value; });
function showLook() {
  $("vSize").value = look.size; $("sizeV").textContent = look.size + "%";
  $("vCrater").value = look.craterY; $("craterV").textContent = look.craterY.toFixed(2);
  $("vPivot").value = look.pivotY; $("pivotV").textContent = look.pivotY.toFixed(2);
  $("vAt").value = look.atY; $("atV").textContent = Math.round(look.atY * 100) + "%";
  $("vBall").value = BALL(); $("ballV").textContent = BALL() + " px";
  V.store.set("volcano-v15-look2", look); lens();
}
$("vSize").addEventListener("input", e => { look.size = +e.target.value; showLook(); });
$("vCrater").addEventListener("input", e => { look.craterY = +e.target.value; showLook(); });
$("vPivot").addEventListener("input", e => { look.pivotY = +e.target.value; showLook(); });
$("vAt").addEventListener("input", e => { look.atY = +e.target.value; showLook(); });
$("vBall").addEventListener("input", e => { V.store.set("volcano-v15-ball", +e.target.value); showLook(); });
function showDev() {
  $("camVal").textContent = s.toFixed(2) + (s >= 1 ? " · outside" : s <= 0 ? " · in the soup" : "");
  if (document.activeElement !== camIn) camIn.value = s.toFixed(3);
}

V.camera = {
  get cam() { return cam; }, project, unproject, unit: () => { const b = box(); return [b.sx, b.sy]; }, NEAR: .14, z0: 0, goTo, lens, update, showDev, outside,
  volcano: () => ({ CX, CY, E, crater: crater() }),
  dragging: () => false,
  cursor: () => hoverVolcano && cam.e < .05 ? "pointer" : null,
  afterFrame() {                                   // the way out only once you are in; the hidden way in only outside
    const inNow = cam.soup > .5;
    const b = goOut.querySelector("button"), say = inNow ? "out of the volcano" : "into the volcano";
    if (b.getAttribute("aria-label") !== say) { b.setAttribute("aria-label", say); b.title = inNow ? "out" : "in"; }
    goIn.disabled = cam.e > .05;
    const hide = inNow ? "" : "hidden";            // only in the soup: outside, the volcano itself is the way in
    if (b.style.visibility !== hide) b.style.visibility = hide;
  },
};
lens();
showLook();
})();

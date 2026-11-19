// rai v18: one way from the soup to the bottom of the mountain, scrolled. The way in and out is 3.02's (v16) zoom into
// the ⏏: going out, we dive into the small ⏏ at the top, the soup growing round it on one axis, until the ⏏ is the
// volcano, where it sits and at its size; coming in, the reverse. Scrolling down (the wheel, two fingers, a drag up, the
// arrows) goes through it, from the soup out to the volcano, and on down into the mountain (aya v05's pan) as far as the
// lava goes; scrolling up comes back the same way, up the mountain to its apex, then in through the ⏏ to the soup. A
// click on the ⏏ or on the volcano still goes the whole way at once.
// 3.01: no camera, no 3D. The volcano is a black triangle, the eject's. One number, s, says where you are: 0 in the
// soup, 1 outside. The soup is flat: a ball is a point on the screen, all of them the same size. What the files say to
// each other is in core.js.
(() => {
"use strict";
const { clamp, lerp, $, reduce } = V;

// the volcano on the screen: its middle and size, and its crater, where the words leave from. Set in DEV (camera)
const look = { size: 44, craterY: .25, pivotY: .18, atY: .7, ...(V.store.get("volcano-v18-look2", {}) || {}) };   // size: % of the screen's short side; craterY: above the middle, in its sizes; pivotY: below the middle; atY: where that point is on the screen, from the top
let W = 1, H = 1, E = 100, CX = 0, CY = 0, CY0 = 0;
// aya v05: outside, the view goes on down into the mountain: pan, px the scene has gone up by (eased to panAim)
let pan = 0, panAim = 0;
function lens() {
  ({ W, H } = V.size());
  E = Math.min(W, H) * look.size / 100;
  CX = W / 2; CY0 = H * look.atY - E * look.pivotY; CY = CY0 - pan;
}
const crater = () => [CX, CY - E * look.craterY];

// s goes to its aim: at a steady pace after a click (TIME), following the hand when scrolled
const TIME = 1.4;
let SPAN = V.store.get("volcano-v18-span", 900);   // px of scrolling for the whole way in or out (DEV, camera)
let s = 0, aim = 0, cam = null, scrolled = false;  // it opens in the soup
function goTo(v) { aim = clamp(v, 0, 1); scrolled = false; if (reduce.matches) s = aim; }
// how far down it goes: until the mountain fills the screen, and on as far as the lava's lowest line
function maxPan() {
  const apex = CY0 - .25 * E, black = apex + Math.max(CX, W - CX) + 12, lava = V.volcano && V.volcano.lavaBottom ? V.volcano.lavaBottom() : 0;
  return Math.max(0, black, lava - H + 70);
}
function panBy(d) { panAim = clamp(panAim + d, 0, maxPan()); }
// one scroll, the whole way: down, the soup → out through the ⏏ → down the mountain; up, the reverse
function scroll(d) {
  if (!d) return;
  scrolled = true;
  if (d > 0) {
    if (aim < 1) { aim = clamp(aim + d / SPAN, 0, 1); if (reduce.matches) s = aim; }
    else if (s >= .999) panBy(d);
  } else {
    if (panAim > 0) panBy(d);
    else { aim = clamp(aim + d / SPAN, 0, 1); if (reduce.matches) s = aim; }   // the pan, eased, is still on its way up to 0: it gets there first
  }
}

// the small ⏏ at the top: its triangle's middle and its width, on the screen
let btn = null;
function button() {
  const g = goOut.querySelector("svg"); if (!g) return null;
  const r = g.getBoundingClientRect(), o = document.body.getBoundingClientRect();
  if (!r.width) return btn;
  return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.width * 6 / 24, w: r.width };   // the svg is 24 × 19: the triangle 12 high
}
function update(dt) {
  if (Math.abs(panAim - pan) > .1) pan += (panAim - pan) * Math.min(1, dt * 9); else pan = panAim;
  CY = CY0 - pan;
  if (s !== aim) {
    if (scrolled) { s += (aim - s) * Math.min(1, dt * 7); if (Math.abs(aim - s) < 1e-4) s = aim; }   // following the scroll, softly
    else { const step = dt / TIME; s = aim > s ? Math.min(aim, s + step) : Math.max(aim, s - step); }
  }
  // scrolled, the way follows the hand evenly; clicked, slow to start, fast through the middle
  const t = 1 - s, e = scrolled ? t : (t < .5 ? 4 * t * t * t : 1 - 4 * (1 - t) ** 3);   // 0 outside … 1 in
  // 3.02's zoom: from the button (at s = 0) to the volcano (at s = 1); the size on a log scale, so it grows evenly, round
  // the one point that stays put while the button grows into the volcano. The soup is scaled with it
  btn = button() || btn || { x: W / 2, y: 30, w: 32 };
  const u = 1 - e, K = E / btn.w, k = Math.exp(Math.log(K) * u);
  let vx, vy;
  if (Math.abs(K - 1) > 1e-3) { const f = (k - 1) / (K - 1); vx = btn.x + (CX - btn.x) * f; vy = btn.y + (CY - btn.y) * f; }
  else { vx = lerp(btn.x, CX, u); vy = lerp(btn.y, CY, u); }
  const zoom = k * btn.w / E;                      // the volcano drawn at zoom × its size, its middle at (vx, vy)
  const there = s >= 1, home = s <= 0;
  cam = {
    s, e, zoom, fx: vx, fy: vy, kx: CX, ky: CY,
    out: !home, in: !there,
    inside: there ? 0 : 1,                         // the soup is there until the ⏏ has arrived, then the cut, no fade
    soup: home ? 1 : 0,                            // and it can be touched only when it is still
    soupT: !home ? { k, tx: vx - btn.x * k, ty: vy - btn.y * k } : null,   // the soup, grown with the button
    eject: !home && !there,                        // the ⏏ drawn over the soup on the way (field.js), the button hidden
    F: 1, x: 0, y: 0, z: 0,
  };
  return cam;
}
// outside, a point of the scene as it is drawn with the zoom
const outside = (x, y) => [cam.fx + (x - cam.kx) * cam.zoom, cam.fy + (y - cam.ky) * cam.zoom];

// ================= the soup, flat =================
// A ball's place is x, y, from -1 to 1 across the screen, less a margin (the title above, the composer below); z is kept
// for soup.js and does nothing. k: the px of one unit of size, so a ball (BR in soup.js) is BALL px across, wherever it is
const BALL = () => V.store.get("volcano-v18-ball", 26);
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
const marks = V.marks, at = V.at, soup = () => V.soup;
document.body.insertAdjacentHTML("beforeend", `
<button id="goIn" class="sr" type="button">into the volcano</button>
<nav id="goOut" aria-label="into and out of the volcano"></nav>`);
// the way out: the eject, ⏏, at the top of the soup only (outside, the volcano is the way in). Drawn from the volcano's
// own shape (field.js: the triangle 12 high in 24, 3 of gap, 4 of bar), so the two are the same
const goIn = $("goIn"), goOut = $("goOut");
const EJECT = '<svg width="32" height="25.33" viewBox="0 0 24 19"><path d="M12 0L24 12H0Z M0 15H24V19H0Z" fill="#000"/></svg>';
goOut.innerHTML = `<button type="button" title="eject" aria-label="out (eject)"><span class="g sign" aria-hidden="true">${EJECT}</span></button>`;
function onVolcano(px, py) {                     // on the triangle (field.js), with a little room round it
  const u = (px - CX) / E, v = (py - CY) / E;
  return cam.e < .05 && v > -.3 && v < .6 && Math.abs(u) < (v < .3 ? v + .35 : .55);
}
function enter() { if (aim !== 0) { goTo(0); panAim = 0; } }   // aya v05: back up to the apex on the way in
function leave() { if (aim !== 1) goTo(1); }       // the balls stay where they are: they go up only in an eruption (volcano.js)
goIn.addEventListener("click", enter);
goOut.addEventListener("click", e => { if (e.target.closest("button")) (aim === 0 ? leave : enter)(); });

let downAt = null, dragged = false, grabbing = false, lastY = null;
marks.addEventListener("pointerdown", e => {
  downAt = { x: e.clientX, y: e.clientY }; dragged = false; lastY = e.clientY;
  if ((e.pointerType === "touch" || e.button === 0) && cam.soup > .5) {
    grabbing = soup().pointerDown(...at(e));
    if (grabbing) { try { marks.setPointerCapture(e.pointerId); } catch {} }
  }
});
marks.addEventListener("pointermove", e => {
  if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) dragged = true;
  if (grabbing) { soup().pointerMove(...at(e), dragged); return; }
  if (downAt && dragged && lastY != null) scroll((lastY - e.clientY) * 1.5);   // a drag on nothing scrolls: dragged up, it goes down
  lastY = e.clientY;
  const [px, py] = at(e);
  hoverVolcano = onVolcano(px, py);
  if (e.pointerType !== "touch") soup().hover(px, py);
});
const lift = () => { downAt = null; lastY = null; if (grabbing) { grabbing = false; soup().drop(); } };
marks.addEventListener("pointerup", lift); marks.addEventListener("pointercancel", lift);
marks.addEventListener("pointerleave", e => { hoverVolcano = false; if (e.pointerType !== "touch") soup().hover(null); });
marks.addEventListener("click", e => {
  if (dragged) return;
  const [px, py] = at(e);
  if (onVolcano(px, py)) { enter(); return; }
  soup().click(px, py);
});
let hoverVolcano = false;
// the wheel (or two fingers on a trackpad), everywhere but in what can be read or typed: an open note, DEV, the bar
addEventListener("wheel", e => {
  if (!cam) return;
  const t = e.target; if (t instanceof Element && t.closest("#big.on, [data-ui], #dev, input, textarea, select")) return;
  scroll(e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY); e.preventDefault();
}, { passive: false });
addEventListener("keydown", e => {
  const t = e.target;
  if (e.metaKey || e.ctrlKey || e.altKey || (t instanceof Element && t.closest("input, textarea, select, [contenteditable]"))) return;
  if (e.key === "+" || e.key === "=") { enter(); e.preventDefault(); return; }
  if (e.key === "-" || e.key === "_") { leave(); e.preventDefault(); return; }
  if (cam && cam.soup > .5 && !["ArrowDown", "PageDown"].includes(e.key)) return;   // in the soup, only down takes you out
  const d = { ArrowDown: 80, ArrowUp: -80, PageDown: H * .8, PageUp: -H * .8, " ": H * .8 }[e.key];
  if (d != null) { scroll(d); e.preventDefault(); }
});

// ================= DEV =================
V.dev.tab("camera", `
  <label class="full"><span class="k">in … out </span><span id="camVal"></span><input type="range" id="camera" min="0" max="1" step="0.001" value="0"></label>
  <label class="full"><span class="k">scroll for the whole way in or out, px </span><span id="spanV"></span><input type="range" id="vSpan" min="200" max="3000" step="50"></label>
  <label class="full"><span class="k">volcano size, % of the screen </span><span id="sizeV"></span><input type="range" id="vSize" min="10" max="70" step="1"></label>
  <label class="full"><span class="k">crater, above the middle </span><span id="craterV"></span><input type="range" id="vCrater" min="-.2" max=".5" step=".01"></label>
  <label class="full"><span class="k">zoom point, below the middle </span><span id="pivotV"></span><input type="range" id="vPivot" min="-.3" max=".45" step=".01"></label>
  <label class="full"><span class="k">zoom point on the screen, from the top </span><span id="atV"></span><input type="range" id="vAt" min=".35" max=".85" step=".01"></label>
  <label class="full"><span class="k">ball, px </span><span id="ballV"></span><input type="range" id="vBall" min="8" max="80" step="1"></label>`);
const camIn = $("camera");
camIn.addEventListener("input", () => { s = aim = +camIn.value; scrolled = true; });
function showLook() {
  $("vSpan").value = SPAN; $("spanV").textContent = SPAN + " px";
  $("vSize").value = look.size; $("sizeV").textContent = look.size + "%";
  $("vCrater").value = look.craterY; $("craterV").textContent = look.craterY.toFixed(2);
  $("vPivot").value = look.pivotY; $("pivotV").textContent = look.pivotY.toFixed(2);
  $("vAt").value = look.atY; $("atV").textContent = Math.round(look.atY * 100) + "%";
  $("vBall").value = BALL(); $("ballV").textContent = BALL() + " px";
  V.store.set("volcano-v18-look2", look); lens();
}
$("vSpan").addEventListener("input", e => { SPAN = +e.target.value; V.store.set("volcano-v18-span", SPAN); showLook(); });
$("vSize").addEventListener("input", e => { look.size = +e.target.value; showLook(); });
$("vCrater").addEventListener("input", e => { look.craterY = +e.target.value; showLook(); });
$("vPivot").addEventListener("input", e => { look.pivotY = +e.target.value; showLook(); });
$("vAt").addEventListener("input", e => { look.atY = +e.target.value; showLook(); });
$("vBall").addEventListener("input", e => { V.store.set("volcano-v18-ball", +e.target.value); showLook(); });
function showDev() {
  $("camVal").textContent = s.toFixed(2) + (s >= 1 ? " · outside" : s <= 0 ? " · in the soup" : "");
  if (document.activeElement !== camIn) camIn.value = s.toFixed(3);
}

V.camera = {
  pan: () => pan, panTo(v) { panAim = clamp(v, 0, maxPan()); }, maxPan,   // aya v05
  get cam() { return cam; }, project, unproject, unit: () => { const b = box(); return [b.sx, b.sy]; }, NEAR: .14, z0: 0, goTo, lens, update, showDev, outside,
  volcano: () => ({ CX, CY, E, crater: crater() }),
  dragging: () => false,
  cursor: () => hoverVolcano && cam.e < .05 ? "pointer" : null,
  afterFrame() {                                   // the way out only once you are in; the hidden way in only outside
    const inNow = cam.soup > .5;
    const b = goOut.querySelector("button"), say = inNow ? "out of the volcano" : "into the volcano";
    if (b.getAttribute("aria-label") !== say) { b.setAttribute("aria-label", say); b.title = inNow ? "out" : "in"; }
    goIn.disabled = cam.e > .05;
    const hide = cam.eject || !inNow ? "hidden" : "";   // only in the soup: outside, the volcano itself is the way in
    if (b.style.visibility !== hide) b.style.visibility = hide;
  },
};
lens();
showLook();
})();

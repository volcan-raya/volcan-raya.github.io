// aya v10: no zoom, no eject. One tall scene, seen through the screen as through a window that slides up and down: the
// soup at the bottom (the lower part, deep in the lava), and above it the volcano, its crater, the sky. You scroll up to
// see it (the wheel, a drag on an empty place, the arrow keys); at an eruption the view goes up by itself (goTo(1)).
// scroll: how far up the view has gone, in px (0: the soup fills the screen; top(): the sky's top at the screen's top).
// Scene coordinates: the soup's screen is y 0 … H; above it, the volcano and the sky, negative y.
// The volcano is drawn as in aya's drawings (15/11/26 slides): a cut cone, its crater a flat top between two black
// edges with a short lip; "plain": on a flat ground, whole; "wide": larger, its sides going off the screen's edges.
(() => {
"use strict";
const { clamp, lerp, $, reduce } = V;

// aya v12: scrolling on up past the top draws the view back (and the eruption does). aya v11: the close-up ("wide", aya's drawing of 17/11/26) by default; the scene as tall, for the screen's width, as the drawing
const look = { kind: "wide", above: 1.4, ...(V.store.get("aya-v12-look", {}) || {}) };   // above: the scene over the soup, in screen heights
let W = 1, H = 1, scroll = 0, scrollAim = 0, cam = null;
// aya v12: the zoom. Scrolling on up past the sky's top, the view draws back (ov, 0 … 1: how far, by the wheel); an
// eruption draws it back too, while it lasts (erz). z: 1 near, less is further; around the crater where it is on the
// screen. Scene to screen: x·z + e, y·z + f
let z = 1, ov = 0, erz = false, ex = 0, fy = 0;
const ZMIN = .42, ZERU = .7;
function lens() { ({ W, H } = V.size()); scrollAim = clamp(scrollAim, 0, top()); scroll = clamp(scroll, 0, top()); }
const above = () => H > 0 && W > 0 ? Math.min(4, Math.max(look.above, W * 2576 / 1306 / H - 1)) : look.above;   // aya v11: never shorter than the drawing, for this width
const top = () => H * above();

// the volcano in scene px. From the drawings, as fractions of the scene's height S (the drawing is S tall): the crater's
// top, its half width, how far the sides go out for each px down, the ground. u: one px of the drawing on this screen
function geo() {
  const S = H * (1 + above()), y0 = -H * above(), u = Math.max(W / 1306, S / 2576);
  if (look.kind === "wide") {
    const cy = y0 + .1456 * S, cw = 59 * u;    // the drawing: lips at 375 of 2576, the opening 585 … 720 of 1306, the sides 585 out for 665 down
    return { kind: "wide", S, y0, u, cx: W / 2, cy, cw, k: .88, lip: 10 * u, line: 6 * u, gy: Infinity };
  }
  const cy = y0 + .242 * S, cw = Math.max(10, 24 * u), gy = y0 + .357 * S;
  return { kind: "plain", S, y0, u, cx: W / 2, cy, cw, k: .857, lip: 5 * u, line: 3 * u, gy };
}
// the ground under a point x, in scene px: the crater's floor, a side, or the plain
function surfaceY(x) {
  const g = geo(), d = Math.abs(x - g.cx);
  if (d <= g.cw) return g.cy + g.lip;
  return Math.min(g.cy + (d - g.cw) / g.k, g.gy);
}

function goTo(v) {                                 // 0: down in the soup; 1: up, the volcano in view, its crater high on the screen
  const g = geo();
  if (!v) ov = 0;
  scrollAim = v ? clamp(H * (g.kind === "wide" ? .42 : .3) - g.cy, 0, top()) : 0;   // v11: the crater lower, room above it for the balls
  if (reduce.matches) scroll = scrollAim;
}
function scrollBy(d) {
  if (d < 0 && ov > 0) {                           // back down: first nearer again, then down
    const take = Math.min(ov * H * 1.6, -d); ov -= take / (H * 1.6); d += take;
  }
  const want = scrollAim + d;
  if (want > top()) ov = clamp(ov + (want - top()) / (H * 1.6), 0, 1);   // on up past the top: further
  scrollAim = clamp(want, 0, top());
}
function view() { return { z, e: ex, f: fy }; }
function sceneTo(ctx) { const { MDPR } = V.size(); ctx.setTransform(MDPR * z, 0, 0, MDPR * z, MDPR * ex, MDPR * fy); }
const toScreen = (x, y) => [x * z + ex, y * z + fy];
const toScene = (x, y) => [(x - ex) / z, (y - fy) / z];
function update(dt) {
  if (!Number.isFinite(scroll)) scroll = 0; if (!Number.isFinite(scrollAim)) scrollAim = 0;
  if (Math.abs(scrollAim - scroll) > .1) scroll += (scrollAim - scroll) * Math.min(1, dt * 7); else scroll = scrollAim;
  const zAim = Math.min(1 - (1 - ZMIN) * ov, erz ? ZERU : 1);
  z += (zAim - z) * Math.min(1, dt * (zAim < z ? 1.6 : 2.4)); if (Math.abs(zAim - z) < 1e-4) z = zAim;
  const g = geo(), ay = clamp(g.cy + scroll, H * .15, H * .6), ax = W / 2;   // around the crater, where it is on the screen
  ex = ax * (1 - z); fy = ay * (1 - z) + scroll * z;
  const s = top() ? scroll / top() : 0;
  cam = {
    s, e: 1 - s, zoom: z, fx: 0, fy: 0, kx: 0, ky: 0,
    out: scroll > 1, in: true,
    inside: 1,                                     // the soup is always there, drawn where it is
    soup: scroll < H * .35 ? 1 : 0,                // it can be touched (and the composer is there) while it is mostly on the screen
    scroll, F: 1, x: 0, y: 0, z: 0,
  };
  return cam;
}
const outside = (x, y) => toScreen(x, y);

// ================= the soup, flat, at the bottom of the scene =================
const BALL = () => V.store.get("volcano-v15-ball", 26);
const box = () => ({ x0: W / 2, y0: H * .5, sx: W / 2 - 40, sy: H * .5 - 90 });
function project(x, y) {
  const b = box();
  const [sx, sy] = toScreen(b.x0 + x * b.sx, b.y0 - y * b.sy);
  return { x: sx, y: sy, k: BALL() / 2 / .028 * z, d: 1 };
}
function unproject(px, py) {
  const b = box();
  const [sx, sy] = toScene(px, py);
  return [(sx - b.x0) / b.sx, (b.y0 - sy) / b.sy, 0];
}

// ================= the pointer, the wheel, the keys =================
const marks = V.marks, at = V.at, soup = () => V.soup;
let downAt = null, dragged = false, grabbing = false, lastY = null;
marks.addEventListener("pointerdown", e => {
  downAt = { x: e.clientX, y: e.clientY }; dragged = false; lastY = e.clientY;
  if ((e.pointerType === "touch" || e.button === 0) && cam.soup > .5) {
    grabbing = soup().pointerDown(...at(e));
  }
  try { marks.setPointerCapture(e.pointerId); } catch {}
});
marks.addEventListener("pointermove", e => {
  if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) dragged = true;
  if (grabbing) { soup().pointerMove(...at(e), dragged); return; }
  if (downAt && dragged && lastY != null) scrollBy(e.clientY - lastY);   // a drag on an empty place: the scene follows the finger
  lastY = e.clientY;
  const [px, py] = at(e);
  if (e.pointerType !== "touch") soup().hover(px, py);
});
const lift = () => { downAt = null; lastY = null; if (grabbing) { grabbing = false; soup().drop(); } };
marks.addEventListener("pointerup", lift); marks.addEventListener("pointercancel", lift);
marks.addEventListener("pointerleave", e => { if (e.pointerType !== "touch") soup().hover(null); });
marks.addEventListener("click", e => { if (dragged) return; soup().click(...at(e)); });
addEventListener("wheel", e => {
  const t = e.target; if (t instanceof Element && t.closest("[data-ui], #dev, input, textarea, #big")) return;
  scrollBy(-(e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY)); e.preventDefault();   // the wheel up: the view goes up
}, { passive: false });
addEventListener("keydown", e => {
  const t = e.target;
  if (e.metaKey || e.ctrlKey || e.altKey || (t instanceof Element && t.closest("input, textarea, select, [contenteditable]"))) return;
  const d = { ArrowUp: 80, ArrowDown: -80, PageUp: H * .8, PageDown: -H * .8, Home: 1e6, End: -1e6 }[e.key];
  if (d != null) { scrollBy(d); e.preventDefault(); }
});

// ================= DEV =================
V.dev.tab("camera", `
  <div class="full seg" role="group" aria-label="The volcano"><span class="k">volcano</span><button class="t" type="button" data-vk="plain">on its plain</button><button class="t" type="button" data-vk="wide">wide, off the edges</button></div>
  <label class="full"><span class="k">the scene above the soup, screens </span><span id="aboveV"></span><input type="range" id="vAbove" min=".8" max="2.5" step=".05"></label>
  <label class="full"><span class="k">ball, px </span><span id="ballV"></span><input type="range" id="vBall" min="8" max="80" step="1"></label>
  <span class="full k">scroll <span id="camVal"></span></span>`);
function showLook() {
  document.querySelectorAll("[data-vk]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.vk === look.kind)));
  $("vAbove").value = look.above; $("aboveV").textContent = look.above.toFixed(2);
  $("vBall").value = BALL(); $("ballV").textContent = BALL() + " px";
  V.store.set("aya-v12-look", look); lens();
}
document.querySelectorAll("[data-vk]").forEach(b => b.addEventListener("click", () => { look.kind = b.dataset.vk; showLook(); }));
$("vAbove").addEventListener("input", e => { look.above = +e.target.value; showLook(); });
$("vBall").addEventListener("input", e => { V.store.set("volcano-v15-ball", +e.target.value); showLook(); });
function showDev() { $("camVal").textContent = Math.round(scroll) + " px of " + Math.round(top()) + ", zoom " + z.toFixed(2); }

V.camera = {
  get cam() { return cam; }, project, unproject, unit: () => { const b = box(); return [b.sx, b.sy]; }, NEAR: .14, z0: 0, goTo, lens, update, showDev, outside,
  geo, surfaceY, top, scrollBy, view, sceneTo, toScreen, toScene, dezoom(on) { erz = !!on; }, zoom: () => z,
  scroll: () => scroll, settled: () => Math.abs(scrollAim - scroll) < 3,
  home() { ov = 0; },
  pan: () => 0, panTo(v) { if (v > 1e5) goTo(0); else goTo(1); }, maxPan: () => 0,   // (v05's names, still asked for by older code)
  volcano: () => { const g = geo(); return { CX: g.cx, CY: g.cy, E: g.cw * 4, crater: [g.cx, g.cy] }; },
  dragging: () => false,
  cursor: () => null,
  afterFrame() {},
};
lens();
update(0);   // aya v12: cam there from the start (a touch before the first frame found it empty)
showLook();
})();

// aya v10: the scene, as in aya's two drawings (15/11/26): a sky going from a night blue at the top to white at the
// horizon; the volcano a cut cone with a flat crater, its two sides drawn in black, each ending at the top in a short
// lip; the cone and the ground under it one body, filled with one gradient, from the crater's pale orange down to a dark
// red-brown, the soup deep in it at the bottom. "plain": on a flat ground; "wide": its sides off the screen's edges.
// Drawn in scene px (camera.js geo()) moved by the scroll.
(() => {
"use strict";
const field = V.fieldEl, ctx = field.getContext("2d");
const SKY = ["#24435f", "#ffffff"], BODY = ["#fbb381", "#632628"];
// aya v11: the sky with the volcano. As the pressure builds it darkens (night at the top, a dusk where it was white);
// sealed, the darkest; after the eruption it clears, lighter than before, then goes back, slowly, to the drawing's.
const DARK = ["#0a1622", "#7d8794"], CLEAR = ["#5f93c0", "#ffffff"];
let dark = 0, clear = 0, lastPhase = "build";
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, f) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, "0")).join(""); };
function skyNow(dt) {
  const vo = V.volcano; if (!vo) return SKY;
  const p = vo.pressure, ph = vo.phase;
  const aim = ph === "seal" ? 1 : ph === "build" ? Math.pow(Math.max(0, (p - .35) / .65), 1.6) * .9 : 0;
  if (ph === "settle" && lastPhase !== "settle") clear = 1;      // the eruption: from the darkest to clear
  lastPhase = ph;
  dark += (aim - dark) * Math.min(1, dt * (aim < dark ? 3 : 1.2));
  clear = Math.max(0, clear - dt / 14);
  const c = clear * clear * (3 - 2 * clear);
  return [0, 1].map(i => mix(mix(SKY[i], DARK[i], dark), CLEAR[i], c * (1 - dark)));
}
let lastT = performance.now();
function size() {
  const { W, H, MDPR } = V.size();
  field.width = Math.round(W * MDPR); field.height = Math.round(H * MDPR);
}
function draw() {
  const { W, H, MDPR } = V.size(), x = ctx, C = V.camera, g = C.geo(), sc = C.scroll();
  const Y = y => y + sc;                            // scene to screen
  const now = performance.now(), sk = skyNow(Math.min(.1, (now - lastT) / 1000)); lastT = now;
  x.setTransform(MDPR, 0, 0, MDPR, 0, 0);
  // the sky: blue at the scene's top, white a little above the ground (or, wide, above where the sides leave the screen)
  const horizon = g.kind === "plain" ? g.gy : g.cy + (W / 2 - g.cw) / g.k;
  const sky = x.createLinearGradient(0, Y(g.y0), 0, Y(g.y0 + (horizon - g.y0) * .78));
  sky.addColorStop(0, sk[0]); sky.addColorStop(1, sk[1]);
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  // the body: crater floor, the sides, the plain (or the edges), down past the screen
  const far = Math.max(W, H) * 4, ft = g.cy + g.lip;
  const sideX = d => g.cw + d * g.k;               // half width, d px under the crater's floor
  x.beginPath();
  x.moveTo(g.cx - g.cw, Y(ft)); x.lineTo(g.cx + g.cw, Y(ft));
  if (g.kind === "plain") {
    const dy = g.gy - ft;
    x.lineTo(g.cx + sideX(dy), Y(g.gy)); x.lineTo(W + 10, Y(g.gy)); x.lineTo(W + 10, Y(g.gy) + far);
    x.lineTo(-10, Y(g.gy) + far); x.lineTo(-10, Y(g.gy)); x.lineTo(g.cx - sideX(dy), Y(g.gy));
  } else {
    x.lineTo(g.cx + sideX(far), Y(ft + far)); x.lineTo(g.cx - sideX(far), Y(ft + far));
  }
  x.closePath();
  const deep = g.y0 + g.S;                         // aya v11: as in the drawing, one gradient from the crater to the scene's bottom, the soup in its dark
  const body = x.createLinearGradient(0, Y(ft), 0, Y(deep));
  body.addColorStop(0, BODY[0]); body.addColorStop(1, BODY[1]);
  x.fillStyle = body; x.fill();
  // the two black sides, from the lip down to the plain (or off the screen), and the lips, short, flat, outward
  x.strokeStyle = "#000"; x.lineWidth = g.line; x.lineCap = "butt";
  const end = g.kind === "plain" ? g.gy - g.cy : far;
  x.beginPath();
  for (const s of [-1, 1]) {
    const lx = g.cx + s * g.cw;
    x.moveTo(lx + s * g.line * .2, Y(g.cy)); x.lineTo(g.cx + s * (g.cw + end * g.k), Y(g.cy + end));
  }
  x.stroke();
  x.lineWidth = g.line * 1.1;
  x.beginPath();
  for (const s of [-1, 1]) { const lx = g.cx + s * g.cw; x.moveTo(lx - s * g.lip * .6, Y(g.cy)); x.lineTo(lx + s * g.lip * 1.2, Y(g.cy)); }
  x.stroke();
}
V.field = { init() {}, size, draw };
})();

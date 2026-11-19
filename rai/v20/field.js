// The field, 3.01: flat. Outside, the orange and the volcano, the eject sign, ⏏, black, its triangle the volcano, grown on the way in; inside,
// the soup's colour, the same orange, all the way up. No shader, no depth.
// Shared: changed only by agreement (see core.js). (aya v05: this copy draws the triangle's sides on down, past the screen)
(() => {
"use strict";
const field = V.fieldEl, ctx = field.getContext("2d");
const ORANGE = "#FF4500";
// the volcano: the eject's triangle (⏏ without its bar), black, E wide and E/2 high, its apex the crater
const TRI = [[0, -.25], [.5, .25], [-.5, .25]];      // in E, round the volcano's middle (CX, CY)
// and under it the eject's bar, so the volcano is the whole ⏏: in the glyph (24 px wide) the triangle is 12 high, then
// 3 of gap and 4 of bar
const BAR = [[-.5, .25 + 3 / 24], [.5, .25 + 3 / 24 + 4 / 24]];   // (aya v04: no longer drawn)
const GROUND = .25;
// rai v18: the ⏏ on its way (camera.js, 3.02's zoom), over the soup: the triangle, and its bar fading as it nears the
// volcano, which has none (aya v04), so it arrives as the volcano is
function eject(x) {
  const { CX, CY, E } = V.camera.volcano(), map = V.camera.outside, cam = V.camera.cam;
  x.beginPath();
  TRI.forEach(([u, v], i) => { const [px, py] = map(CX + u * E, CY + v * E); i ? x.lineTo(px, py) : x.moveTo(px, py); });
  x.closePath(); x.fillStyle = "#000"; x.fill();
  const a = Math.max(0, Math.min(1, cam.e * 1.6));
  if (a > 0) {
    const [b0x, b0y] = map(CX + BAR[0][0] * E, CY + BAR[0][1] * E), [b1x, b1y] = map(CX + BAR[1][0] * E, CY + BAR[1][1] * E);
    x.globalAlpha = a; x.fillRect(b0x, b0y, b1x - b0x, b1y - b0y); x.globalAlpha = 1;
  }
}                                  // aya v04: where the ground starts, in E below the middle: the triangle's foot
function size() {
  const { W, H, MDPR } = V.size();
  field.width = Math.round(W * MDPR); field.height = Math.round(H * MDPR);
}
// v18, aya's look (index.html, the toggle; the default): aya v14's colours. The sky from night blue to cream, darkening as
// the pressure builds, darkest sealed and through the eruption, clearing after it, lighter, then back (her v11, v12); the
// mountain one body, the crater's peach at the apex down through a hot orange to a dark red-brown, its two sides black
// as in her drawing; the soup, deep in that body, from its warm middle down to the dark. Rai's look: the orange, black
const SKY = ["#174a80", "#fdf8f2"], BODY = ["#ffb075", "#ee7a4c", "#701a26"], SOUP = ["#b54f3b", "#701a26"];
const DARK = ["#060d1c", "#4b4a78"], CLEAR = ["#3b8fdc", "#f6fbff"];
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, f) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, "0")).join(""); };
let dark = 0, clear = 0, lastPhase = "build", lastT = performance.now();
function skyNow() {
  const now = performance.now(), dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
  const vo = V.volcano; if (!vo) return SKY;
  const p = vo.pressure || 0, ph = vo.phase;
  const aim = ph === "seal" || ph === "settle" ? 1 : Math.pow(Math.max(0, (p - .35) / .65), 1.6) * .9;
  if (ph !== "settle" && lastPhase === "settle") clear = 1;
  lastPhase = ph;
  dark += (aim - dark) * Math.min(1, dt * (aim < dark ? 3 : 1.2));
  clear = Math.max(0, clear - dt / 14);
  const c = clear * clear * (3 - 2 * clear);
  return [0, 1].map(i => mix(mix(SKY[i], DARK[i], dark), CLEAR[i], c * (1 - dark)));
}
const ayaLook = () => document.documentElement.dataset.look !== "rai";
function draw() {
  const { W, H, MDPR } = V.size(), cam = V.camera.cam, x = ctx, aya = ayaLook();
  x.setTransform(MDPR, 0, 0, MDPR, 0, 0);
  const sk = aya ? skyNow() : null;
  if (cam.inside < 1) {
    const { CX, CY, E } = V.camera.volcano(), out = V.camera.outside;
    const [ax, ay] = out(CX, CY - .25 * E);        // the apex, on the screen
    if (aya) {
      const g = x.createLinearGradient(0, ay - H * .75, 0, ay + H * .3);
      g.addColorStop(0, sk[0]); g.addColorStop(1, sk[1]);
      x.fillStyle = g;
    } else x.fillStyle = ORANGE;
    x.fillRect(0, 0, W, H);
    // the mountain: the triangle and, aya v05, its two sides on down past the screen's edges
    const BIG = 40 * Math.max(W, H) / Math.max(1, E);
    x.beginPath();
    [[0, -.25], [BIG, -.25 + BIG], [BIG, BIG * 4], [-BIG, BIG * 4], [-BIG, -.25 + BIG]].forEach(([u, v], i) => { const [px, py] = out(CX + u * E, CY + v * E); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.closePath();
    if (aya) {
      const deep = ay + Math.max(H, (V.camera.maxPan ? V.camera.maxPan() : 0) + H * .6);
      const g = x.createLinearGradient(0, ay, 0, deep);
      g.addColorStop(0, BODY[0]); g.addColorStop(.32, BODY[1]); g.addColorStop(1, BODY[2]);
      x.fillStyle = g; x.fill();
      x.strokeStyle = "#000"; x.lineWidth = Math.max(.75, E * cam.zoom * .004);   // a thin line, as drawn x.lineJoin = "miter"; x.lineCap = "butt";
      x.beginPath();
      for (const sgn of [-1, 1]) { const [px, py] = out(CX + sgn * BIG * E, CY + (-.25 + BIG) * E); x.moveTo(ax, ay); x.lineTo(px, py); }
      x.stroke();
    } else { x.fillStyle = "#000"; x.fill(); }
  }
  if (cam.inside > 0) {                            // the soup, coming through: all the way up
    if (aya) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, SOUP[0]); g.addColorStop(1, SOUP[1]); x.fillStyle = g; }
    else x.fillStyle = ORANGE;
    x.globalAlpha = cam.inside; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  }
}
V.field = {
  init() {},
  size, draw, eject,
};
})();

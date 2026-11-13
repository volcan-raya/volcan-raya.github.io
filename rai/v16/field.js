// The field, 3.01: flat. Outside, the orange and the volcano, the eject sign, ⏏, black, its triangle the volcano, grown on the way in; inside,
// the soup's colour, the same orange, all the way up. No shader, no depth.
// Shared: changed only by agreement (see core.js).
(() => {
"use strict";
const field = V.fieldEl, ctx = field.getContext("2d");
const ORANGE = "#FF4500";
// the volcano: the eject's triangle (⏏ without its bar), black, E wide and E/2 high, its apex the crater
const TRI = [[0, -.25], [.5, .25], [-.5, .25]];      // in E, round the volcano's middle (CX, CY)
// and under it the eject's bar, so the volcano is the whole ⏏: in the glyph (24 px wide) the triangle is 12 high, then
// 3 of gap and 4 of bar
const BAR = [[-.5, .25 + 3 / 24], [.5, .25 + 3 / 24 + 4 / 24]];
function size() {
  const { W, H, MDPR } = V.size();
  field.width = Math.round(W * MDPR); field.height = Math.round(H * MDPR);
}
// the ⏏, wherever the camera has it (camera.js outside()): the volcano, or on the way (3.02) over the soup, on the marks
// at: { x, y, w }, the ⏏ drawn there instead, its triangle's middle at (x, y), w wide (dezoom: the soup's one, coming)
function eject(x, at) {
  const { CX, CY, E } = V.camera.volcano();
  const map = at ? (px, py) => [at.x + (px - CX) * at.w / E, at.y + (py - CY) * at.w / E] : V.camera.outside;
  x.beginPath();
  TRI.forEach(([u, v], i) => { const [px, py] = map(CX + u * E, CY + v * E); i ? x.lineTo(px, py) : x.moveTo(px, py); });
  x.closePath(); x.fillStyle = "#000"; x.fill();
  const [b0x, b0y] = map(CX + BAR[0][0] * E, CY + BAR[0][1] * E), [b1x, b1y] = map(CX + BAR[1][0] * E, CY + BAR[1][1] * E);
  x.fillRect(b0x, b0y, b1x - b0x, b1y - b0y);
}
function draw() {
  const { W, H, MDPR } = V.size(), cam = V.camera.cam, x = ctx;
  x.setTransform(MDPR, 0, 0, MDPR, 0, 0);
  if (cam.inside < 1) {
    x.fillStyle = ORANGE; x.fillRect(0, 0, W, H);
    eject(x, null);
  }
  if (cam.inside > 0) {                            // the soup, coming through: the orange, all the way up
    x.globalAlpha = cam.inside; x.fillStyle = ORANGE; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  }
}
V.field = {
  init() {},
  size, draw, eject,
};
})();

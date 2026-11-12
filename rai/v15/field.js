// The field, 3.01: flat. Outside, the orange and the volcano, a black triangle (the eject's), grown on the way in; inside,
// the soup's colour, the same orange, all the way up. No shader, no depth.
// Shared: changed only by agreement (see core.js).
(() => {
"use strict";
const field = V.fieldEl, ctx = field.getContext("2d");
const ORANGE = "#FF4500";
// the volcano: the eject's triangle (⏏ without its bar), black, E wide and E/2 high, its apex the crater
const TRI = [[0, -.25], [.5, .25], [-.5, .25]];      // in E, round the volcano's middle (CX, CY)
function size() {
  const { W, H, MDPR } = V.size();
  field.width = Math.round(W * MDPR); field.height = Math.round(H * MDPR);
}
function draw() {
  const { W, H, MDPR } = V.size(), cam = V.camera.cam, x = ctx;
  x.setTransform(MDPR, 0, 0, MDPR, 0, 0);
  if (cam.inside < 1) {
    x.fillStyle = ORANGE; x.fillRect(0, 0, W, H);
    const { CX, CY, E } = V.camera.volcano();
    x.beginPath();
    TRI.forEach(([u, v], i) => { const [px, py] = V.camera.outside(CX + u * E, CY + v * E); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.closePath(); x.fillStyle = "#000"; x.fill();
  }
  if (cam.inside > 0) {                            // the soup, coming through: the orange, all the way up
    x.globalAlpha = cam.inside; x.fillStyle = ORANGE; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  }
}
V.field = {
  init() {},
  size, draw,
};
})();

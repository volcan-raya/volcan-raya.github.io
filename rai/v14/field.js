// The field, 3.00: flat. Outside, the orange and the volcano, an emoji (🌋), grown round its crater on the way in; inside,
// the soup's colour, the same orange, all the way up. No shader, no depth.
// Shared: changed only by agreement (see core.js).
(() => {
"use strict";
const field = V.fieldEl, ctx = field.getContext("2d");
const ORANGE = "#FF4500";
// the emoji, drawn once, big, so it can be grown without asking the font again every frame
const SPRITE = 1024, sprite = document.createElement("canvas");
function paintSprite() {
  sprite.width = sprite.height = SPRITE;
  const x = sprite.getContext("2d");
  x.clearRect(0, 0, SPRITE, SPRITE);
  x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `${SPRITE * .82}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  x.fillText("🌋", SPRITE / 2, SPRITE * .54);
}
function size() {
  const { W, H, MDPR } = V.size();
  field.width = Math.round(W * MDPR); field.height = Math.round(H * MDPR);
}
function draw() {
  const { W, H, MDPR } = V.size(), cam = V.camera.cam, x = ctx;
  x.setTransform(MDPR, 0, 0, MDPR, 0, 0);
  if (cam.inside < 1) {
    x.fillStyle = ORANGE; x.fillRect(0, 0, W, H);
    const { CX, CY, E } = V.camera.volcano(), [ox, oy] = V.camera.outside(CX, CY), s = E * cam.zoom;
    x.imageSmoothingQuality = "high";
    x.drawImage(sprite, ox - s / 2, oy - s / 2, s, s);
  }
  if (cam.inside > 0) {                            // the soup, coming through: the orange, all the way up
    x.globalAlpha = cam.inside; x.fillStyle = ORANGE; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  }
}
V.field = {
  init() { paintSprite(); document.fonts && document.fonts.ready.then(paintSprite); },
  size, draw,
};
})();

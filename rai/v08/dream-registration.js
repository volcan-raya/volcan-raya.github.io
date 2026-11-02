/* Runtime registration of the unmodified Dreams stills. Coordinates are measured in
   their 640 × 384 source space. Every summit and shoulder maps to frame 00's contour;
   the wider frame 06 is cropped above the cars and people before being expanded.
   Both renderers consume the same registered canvases. */
(function (root) {
  'use strict';
  const x = [0, 80, 160, 240, 280, 300, 320, 340, 360, 400, 480, 560, 640];
  const ridge = [250, 217, 175, 122, 91, 87, 86, 84, 90, 120, 175, 217, 250];
  const frames = [
    { x, y: ridge, floor: 384 },
    { x, y: [250, 217, 175, 122, 91, 87, 86, 84, 90, 120, 175, 217, 250], floor: 384 },
    { x, y: [252, 218, 177, 123, 91, 87, 86, 84, 90, 122, 178, 219, 252], floor: 384 },
    { x: [4, 80, 160, 240, 280, 300, 320, 340, 366, 400, 480, 560, 640], y: [253, 220, 176, 119, 94, 94, 94, 90, 92, 120, 177, 220, 253], floor: 384 },
    { x: [4, 80, 160, 240, 280, 300, 320, 340, 366, 400, 480, 560, 640], y: [248, 214, 173, 120, 91, 90, 87, 90, 85, 116, 170, 214, 248], floor: 384 },
    { x: [4, 80, 160, 240, 280, 300, 320, 340, 366, 400, 480, 560, 640], y: [247, 213, 172, 119, 91, 89, 86, 89, 84, 116, 170, 213, 247], floor: 384 },
    { x: [0, 84, 165, 249, 292, 305, 319, 331, 344, 390, 470, 553, 640], y: [143, 129, 100, 53, 23, 22, 22, 23, 29, 58, 100, 129, 146], floor: 200 },
    { x: [5, 80, 160, 240, 278, 300, 320, 340, 369, 407, 485, 563, 640], y: [254, 219, 178, 121, 94, 92, 95, 94, 89, 116, 176, 219, 254], floor: 384 },
    { x: [5, 80, 160, 240, 278, 300, 320, 340, 369, 407, 485, 563, 640], y: [254, 219, 177, 121, 94, 93, 95, 94, 88, 116, 175, 219, 254], floor: 384 },
    { x: [5, 80, 160, 240, 278, 300, 320, 340, 369, 407, 485, 563, 640], y: [253, 217, 175, 119, 93, 92, 95, 93, 88, 115, 174, 218, 253], floor: 384 },
    { x: [5, 80, 160, 240, 278, 300, 320, 340, 369, 407, 485, 563, 640], y: [253, 218, 175, 120, 93, 92, 95, 93, 89, 116, 175, 218, 253], floor: 384 },
  ];
  function column(frame, targetX) {
    let i = 0;
    while (i < x.length - 2 && targetX > x[i + 1]) i++;
    const t = (targetX - x[i]) / (x[i + 1] - x[i]);
    const mix = (a, b) => a + (b - a) * t;
    return { sx: mix(frame.x[i], frame.x[i + 1]), sy: mix(frame.y[i], frame.y[i + 1]), ty: mix(ridge[i], ridge[i + 1]) };
  }
  function align(image, index) {
    const frame = frames[index];
    if (!frame) throw new RangeError('Unknown Dreams frame');
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 384;
    const ctx = canvas.getContext('2d');
    const scaleX = image.naturalWidth / 640, scaleY = image.naturalHeight / 384;
    // Column strips avoid triangle seams. Skyline and summit positions are identical
    // in every output; the original colours and textures are resampled only once.
    for (let dx = 0; dx < 640; dx++) {
      const left = column(frame, dx), right = column(frame, dx + 1);
      const middle = column(frame, dx + .5), sw = (right.sx - left.sx) * scaleX;
      ctx.drawImage(image, left.sx * scaleX, 0, sw, middle.sy * scaleY, dx, 0, 1, middle.ty);
      ctx.drawImage(image, left.sx * scaleX, middle.sy * scaleY, sw, (frame.floor - middle.sy) * scaleY,
        dx, middle.ty, 1, 384 - middle.ty);
    }
    return canvas;
  }
  const api = { align, column, frames, x, ridge };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DreamRegistration = api;
})(typeof globalThis === 'undefined' ? this : globalThis);

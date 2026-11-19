// v20 (3.04): one long page, the volcano at its top, the soup at its bottom, the mountain's darkening body between
// (draw, below); the view is scrolled down it (camera.js).
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
// v20: v13's sky (rai/v13/terrain.js), the one that evolves: blue to red-orange the way a real one goes, through a pale
// blue, a pale gold and an orange, mixed in OKLab so it never passes through violet. It starts at what was 40% (a pale
// blue going gold), and it is a gradient up the screen: only its upper part goes on to red-orange with the pressure, the
// lower part barely moves, so the words stay readable in an eruption; after one it cools slowly back to blue. For both
// looks: aya v14's night sky is gone
const SKY_COLD = "#1f6fff", SKY_HOT = "#FF4500";
const linOf = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4, gamOf = c => { c = Math.max(0, Math.min(1, c)); return c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055; };
function labOf(h) {
  const [r, g, b] = [1, 3, 5].map(i => linOf(parseInt(h.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(.4122 * r + .5364 * g + .0514 * b), m = Math.cbrt(.2119 * r + .6807 * g + .1074 * b), s = Math.cbrt(.0883 * r + .2817 * g + .63 * b);
  return [.2105 * l + .7936 * m - .0041 * s, 1.978 * l - 2.4286 * m + .4506 * s, .0259 * l + .7828 * m - .8087 * s];
}
const SKY_STOPS = [SKY_COLD, "#7fb2e0", "#f0cc8a", "#ffa64d", SKY_HOT].map(labOf);
function skyAt(p) {
  const u = Math.max(0, Math.min(1, p)) * (SKY_STOPS.length - 1), i = Math.min(Math.floor(u), SKY_STOPS.length - 2), f = u - i;
  const [L, A, B] = [0, 1, 2].map(k => SKY_STOPS[i][k] + (SKY_STOPS[i + 1][k] - SKY_STOPS[i][k]) * f);
  const l = (L + .3963 * A + .2158 * B) ** 3, m = (L - .1056 * A - .0639 * B) ** 3, s = (L - .0895 * A - 1.2915 * B) ** 3;
  return `rgb(${[4.0767 * l - 3.3077 * m + .2310 * s, -1.2684 * l + 2.6098 * m - .3413 * s, -.0042 * l - .7034 * m + 1.7076 * s].map(c => Math.round(gamOf(c) * 255)).join(",")})`;
}
const SKY_FROM = .4, SKY_LOW = .15, SKY_ORANGE = .4;   // what was 40% is 0; the bottom goes 15% of the way; the orange from 40% up the screen
// the pressure as the sky's colour: it follows the pressure as it builds; after an eruption it cools slowly (v13's coolGlow)
let glow = 0, cooling = false, glowT = performance.now();
function sky13() {
  const now = performance.now(), dt = Math.min(.1, (now - glowT) / 1000); glowT = now;
  const vo = V.volcano, pressure = vo ? vo.pressure || 0 : 0, phase = vo ? vo.phase : "build";
  if (phase !== "build") { cooling = true; glow += (1 - glow) * (1 - Math.exp(-dt * 5)); }
  else if (cooling && pressure < glow) { glow = Math.max(pressure, glow - dt / 12); if (glow <= pressure + .002) cooling = false; }
  else { glow += (pressure - glow) * (1 - Math.exp(-dt * 5)); cooling = false; }
  return { lo: skyAt(SKY_FROM + (1 - SKY_FROM) * SKY_LOW * glow), hi: skyAt(SKY_FROM + (1 - SKY_FROM) * glow) };
}
// v20: one long page (camera.js): the sky and the triangle at its top; the mountain's body under it, darkening as it
// goes down, the dark warming slowly into the soup at the bottom, whose screen is the soup's as it always was. Drawn
// moved up by off, the px the view is down the page. Nothing else moves
const DEEP = "#14040a";                            // the dark inside the mountain, between its peach top and the soup
function paintSoup(x, y0, W, H, aya) {             // the soup's own screen, from y0
  if (aya) { const g = x.createLinearGradient(0, y0, 0, y0 + H); g.addColorStop(0, SOUP[0]); g.addColorStop(1, SOUP[1]); x.fillStyle = g; }
  else x.fillStyle = ORANGE;
  x.fillRect(0, y0, W, H);
}
function draw() {
  const { W, H, MDPR } = V.size(), cam = V.camera.cam, x = ctx, aya = ayaLook();
  x.setTransform(MDPR, 0, 0, MDPR, 0, 0);
  const off = cam.off || 0, D = cam.D || 2 * H;
  const soupTop = D - off;                         // where the soup's screen starts, on the screen
  if (soupTop <= 0) { paintSoup(x, 0, W, H, aya); return; }
  const sk = sky13();
  const { CX, CY, E } = V.camera.volcano();
  const ax = CX, ay = CY - .25 * E - off;          // the apex, on the screen
  // the sky, above the mountain
  if (ay + W / 2 > 0) {                            // any of it still beside the slopes
    // v13's: the low colour up to 40% of the screen from its bottom, going to the high one at its top (on the page: it
    // scrolls with the volcano)
    const g = x.createLinearGradient(0, H - off, 0, -off);
    g.addColorStop(0, sk.lo); g.addColorStop(SKY_ORANGE, sk.lo); g.addColorStop(1, sk.hi); x.fillStyle = g;
    x.fillRect(0, 0, W, H);                        // the mountain is drawn over it
  }
  // the mountain: the triangle, its sides on down past the screen's edges, its body down to the soup
  const bot = soupTop + 1, reach = Math.max(W, bot - ay) + W;
  x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + reach, ay + reach); x.lineTo(ax + reach, bot); x.lineTo(ax - reach, bot); x.lineTo(ax - reach, ay + reach); x.closePath();
  const span = Math.max(1, soupTop - ay), at = y => Math.max(0, Math.min(1, (y - ay) / span));
  const g = x.createLinearGradient(0, ay, 0, soupTop);
  if (aya) {
    g.addColorStop(0, BODY[0]); g.addColorStop(at(ay + .35 * H), BODY[1]); g.addColorStop(at(ay + H), BODY[2]);
    g.addColorStop(at(soupTop - .9 * H), DEEP);    // the dark part, then slowly into the soup's own top colour
    g.addColorStop(1, SOUP[0]);
  } else { g.addColorStop(0, "#000"); g.addColorStop(at(soupTop - .9 * H), "#000"); g.addColorStop(1, ORANGE); }
  x.fillStyle = g; x.fill();
  if (aya && ay > -10) {                           // its two sides, a thin black line, as drawn
    x.strokeStyle = "#000"; x.lineWidth = Math.max(.75, E * .004);
    x.beginPath(); for (const sg of [-1, 1]) { x.moveTo(ax, ay); x.lineTo(ax + sg * reach, ay + reach); } x.stroke();
  }
  if (soupTop < H) paintSoup(x, soupTop, W, H, aya);
}
V.field = {
  init() {},
  size, draw, eject,
};
})();

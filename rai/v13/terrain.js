// The terrain: the lines laid on the cone, and the sky round it, which turns with the volcano's pressure. 1.03 has no
// disc: the volcano is alone in the sky, its lines always on, red-orange. What the files say to each other is in core.js.
(() => {
"use strict";
const { clamp, lerp, $, store } = V;
const VOL = V.volcano.VOL;
const R_DISC = 2.25 * VOL.Rb;                    // the disc ends on a ring

// ================= the lines =================
// on the volcano, changed in DEV and kept in this browser: how many rings (contours) from the top to the foot (0: none),
// how many meridians (0: none), 0.75 px thick. The ink is red-orange, the deep soup's
const LINES_DEFAULT = { rings: 8, spokes: 12, width: .75 };
const lines = { ...LINES_DEFAULT, ...(store.get("volcano-v13-lines7", null) || {}), width: LINES_DEFAULT.width };   // the thickness is fixed
const INK = [1, .2706, 0];

// ================= the sky =================
// blue to red-orange the way a real one goes, through a pale blue, a pale gold and an orange. Blue and orange are
// opposites on the colour wheel: this path passes near the neutral on the green side, so it never reaches violet
const SKY_COLD = "#1f6fff", SKY_HOT = "#FF4500";
const linOf = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4, gamOf = c => { c = clamp(c, 0, 1); return c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055; };
function labOf(hex) {
  const [r, g, b] = [1, 3, 5].map(i => linOf(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(.4122 * r + .5364 * g + .0514 * b), m = Math.cbrt(.2119 * r + .6807 * g + .1074 * b), s = Math.cbrt(.0883 * r + .2817 * g + .63 * b);
  return [.2105 * l + .7936 * m - .0041 * s, 1.978 * l - 2.4286 * m + .4506 * s, .0259 * l + .7828 * m - .8087 * s];
}
const SKY_STOPS = [SKY_COLD, "#7fb2e0", "#f0cc8a", "#ffa64d", SKY_HOT].map(labOf);
function skyAt(p) {
  const u = clamp(p, 0, 1) * (SKY_STOPS.length - 1), i = Math.min(Math.floor(u), SKY_STOPS.length - 2);
  const [L, A, B] = [0, 1, 2].map(k => lerp(SKY_STOPS[i][k], SKY_STOPS[i + 1][k], u - i));
  const l = (L + .3963 * A + .2158 * B) ** 3, m = (L - .1056 * A - .0639 * B) ** 3, s = (L - .0895 * A - 1.2915 * B) ** 3;
  return [gamOf(4.0767 * l - 3.3077 * m + .2310 * s), gamOf(-1.2684 * l + 2.6098 * m - .3413 * s), gamOf(-.0042 * l - .7034 * m + 1.7076 * s)];
}
// 1.03: the sky starts at what was 40% (a pale blue going gold), and it is a gradient up the screen: only its upper
// part goes on to red-orange, the lower part barely moves, so the words stay readable in an eruption. Where on the
// screen the orange starts is DEV's "sky: orange from"
const SKY_FROM = .4, SKY_LOW = .15;              // what was 40% is now 0%; the bottom goes only 15% of the way
const skyTop = g => skyAt(SKY_FROM + (1 - SKY_FROM) * g), skyLow = g => skyAt(SKY_FROM + (1 - SKY_FROM) * SKY_LOW * g);
let skyOrange = store.get("volcano-v13-skyfrom", 40);   // % up the screen where the orange starts
// The pressure as a colour, the sky's: it follows the pressure as it builds, but after an eruption it cools slowly, back
// through violet to blue, rather than going out at once.
let glow = 0, cooling = false;
function coolGlow(dt) {
  const { pressure, phase } = V.volcano;
  if (phase !== "build") { cooling = true; glow += (1 - glow) * (1 - Math.exp(-dt * 5)); return; }
  if (cooling && pressure < glow) { glow = Math.max(pressure, glow - dt / 12); if (glow <= pressure + .002) cooling = false; }
  else { glow += (pressure - glow) * (1 - Math.exp(-dt * 5)); cooling = false; }
}

// ================= its part of the picture (see field.js) =================
// No disc (what = 3 is never met); the only marks lie on the cone, measured in pixels, so they stay one thin line at any
// distance: the rings and meridians
const glsl = `
uniform float uThin, uCellY, uSpokes, uSkyPx, uSkyFrom; uniform vec3 uSkyLo, uSkyHi, uInk;
void terrainHit(vec3 p, vec3 rd, float lo, inout float best, inout vec3 N) {}
// how much of a value a pixel spans on this surface: its gradient g, slid along the ray into the surface's plane
float spanOf(vec3 g, vec3 N, vec3 rd, float px) { return length(g - N * dot(g, rd) / dot(N, rd)) * px + 1e-7; }
// a line at u = at; and lines at every multiple of a step, which fade away before they are close enough to clot
float lineAt(float u, float at, float span) { return clamp(uThin + .5 - abs(u - at) / span, 0., 1.); }
float lines(float u, float step, float span) {
  return clamp(uThin + .5 - abs(fract(u / step + .5) - .5) * step / span, 0., 1.) * smoothstep(3., 7., step / span);
}
// how much of a point on the cone is ink
float ink(vec3 P, vec3 N, vec3 rd, float T) {
  float px = T / uF, r = length(P.xz), a = 0.;
  float sa = spanOf(vec3(-P.z, 0., P.x) / max(r * r, 1e-4), N, rd, px);
  // the rings, contour lines at equal heights, and the meridians (DEV: how many). No ring at the foot itself
  // (y = 0): it would lie on the cone's last edge, half of it cut off and the rest doubled by the edge, so it read thicker
  if (uCellY > 0. && P.y > .5 * uCellY) a = lines(P.y, uCellY, spanOf(vec3(0., 1., 0.), N, rd, px));
  if (uSpokes > .5) a = max(a, lines(atan(P.z, P.x), TAU / uSpokes, sa));
  return a;
}
vec3 terrainColour(vec3 P, vec3 N, vec3 rd, float T) { return mix(vec3(1.), uInk, ink(P, N, rd, T)); }
// the sky, a gradient up the screen: the low colour under uSkyFrom, going to the high one at the top
vec3 terrainSky() { return mix(uSkyLo, uSkyHi, smoothstep(uSkyFrom, 1., gl_FragCoord.y / uSkyPx)); }
`;
const uniforms = ["uThin", "uCellY", "uSpokes", "uSkyPx", "uSkyFrom", "uSkyLo", "uSkyHi", "uInk"];
function setUniforms(gl, u, env) {
  gl.uniform3fv(u.uSkyLo, skyLow(glow)); gl.uniform3fv(u.uSkyHi, skyTop(glow));
  gl.uniform1f(u.uSkyPx, env.H * env.sc); gl.uniform1f(u.uSkyFrom, skyOrange / 100);
  gl.uniform1f(u.uThin, .5 * lines.width * Math.max(1, .8 * env.sc));
  gl.uniform1f(u.uCellY, lines.rings > 0 ? VOL.H / lines.rings : 0); gl.uniform1f(u.uSpokes, lines.spokes);
  gl.uniform3fv(u.uInk, INK);
}

// ================= DEV: the lines (the volcano's tab: rings, meridians; 0 for none) and the sky (the eruption's:
// where on the screen, % up, its orange starts) =================
V.dev.tab("volcano", `
  <label class="full"><span class="k">rings </span><span id="ringsVal"></span><input type="range" id="rings" min="0" max="48" step="1"></label>
  <label class="full"><span class="k">meridians </span><span id="spokesVal"></span><input type="range" id="spokes" min="0" max="96" step="4"></label>`);
V.dev.tab("eruption", `
  <label class="full"><span class="k">sky </span><span id="skyFromVal"></span><input type="range" id="skyFrom" min="0" max="90" step="5"></label>`);
function showLines() {
  for (const k of ["rings", "spokes"]) { $(k).value = lines[k]; $(k + "Val").textContent = lines[k]; }
  store.set("volcano-v13-lines7", lines);
}
for (const k of ["rings", "spokes"]) $(k).addEventListener("input", () => { lines[k] = +$(k).value; showLines(); });
showLines();
const skyIn = $("skyFrom"), showSky = () => { skyIn.value = skyOrange; $("skyFromVal").textContent = skyOrange + "%"; };
skyIn.addEventListener("input", () => { skyOrange = +skyIn.value; store.set("volcano-v13-skyfrom", skyOrange); showSky(); });
showSky();

V.terrain = { R_DISC, sky: () => skyLow(glow), skyTop: () => skyTop(glow), skyFrom: () => skyOrange / 100, glsl, uniforms, setUniforms, update: coolGlow };
})();

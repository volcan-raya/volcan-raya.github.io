// The terrain: the white disc the volcano floats on, the lines laid on it and on the cone, and the sky round it all, which
// turns with the volcano's pressure. What the files say to each other is in core.js.
(() => {
"use strict";
const { clamp, lerp, $, store } = V;
const VOL = V.volcano.VOL;
const R_DISC = 2.25 * VOL.Rb;                    // the disc ends on a ring

// ================= the lines =================
// on the disc and the volcano, all changed in DEV and kept in this browser: whether there is a disc at all (ground), where
// the lines go, the foot's circle, how many
// rings from the axis to the foot (0: none), how many meridians (0: none), how thick (CSS px), in what ink
const LINES_DEFAULT = { ground: false, disc: true, cone: true, foot: true, rings: 11, spokes: 24, width: 1, ink: "hot" };   // by default: no disc, the volcano alone, lines red-orange
const lines = { ...LINES_DEFAULT, ...(store.get("volcano-v11-lines4", null) || {}) };
const INKS = { black: [0, 0, 0], grey: [.55, .55, .55], hot: [1, .2706, 0], sky: null };

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
// The disc (what = 3), white; the only marks lie on it and on the cone, measured in pixels, so they stay one thin line
// at any distance: the foot's circle, black, and the rings and meridians
const glsl = `
uniform float uGround, uThin, uOnDisc, uOnCone, uFoot, uCell, uSpokes; uniform vec3 uSky, uInk;
const float RD = ${R_DISC.toFixed(3)};
void terrainHit(vec3 p, vec3 rd, float lo, inout float best, inout vec3 N) {
  if (uGround > .5 && rd.y < 0.) {             // without it, the volcano alone in the sky
    float t = -p.y / rd.y; vec2 h = p.xz + rd.xz * t;
    if (t > lo && t < best && dot(h, h) < RD * RD) { best = t; N = vec3(0., 1., 0.); what = 3.; }
  }
}
// how much of a value a pixel spans on this surface: its gradient g, slid along the ray into the surface's plane
float spanOf(vec3 g, vec3 N, vec3 rd, float px) { return length(g - N * dot(g, rd) / dot(N, rd)) * px + 1e-7; }
// a line at u = at; and lines at every multiple of a step, which fade away before they are close enough to clot
float lineAt(float u, float at, float span) { return clamp(uThin + .5 - abs(u - at) / span, 0., 1.); }
float lines(float u, float step, float span) {
  return clamp(uThin + .5 - abs(fract(u / step + .5) - .5) * step / span, 0., 1.) * smoothstep(3., 7., step / span);
}
// how much of a point on the disc or the cone is ink
float ink(vec3 P, vec3 N, vec3 rd, float T) {
  float px = T / uF, r = length(P.xz), a = 0.;
  float sr = spanOf(vec3(P.x, 0., P.z) / max(r, 1e-4), N, rd, px), sa = spanOf(vec3(-P.z, 0., P.x) / max(r * r, 1e-4), N, rd, px);
  if (what > 2.5 && uFoot > .5) a = lineAt(r, RB + (uThin + .5) * sr, sr);   // the foot, on the disc just outside the cone so none of it is hidden
  // rings and meridians, laid over the disc and the volcano alike, a map seen from the pole (DEV: where, how many, how thick)
  if ((what > 2.5 ? uOnDisc : uOnCone) > .5) {
    if (uCell > 0.) a = max(a, lines(r, uCell, sr));
    if (uSpokes > .5) a = max(a, lines(atan(P.z, P.x), TAU / uSpokes, sa));
  }
  return a;
}
vec3 terrainColour(vec3 P, vec3 N, vec3 rd, float T) { return mix(vec3(1.), uInk, ink(P, N, rd, T)); }
vec3 terrainSky() { return uSky; }
`;
const uniforms = ["uGround", "uThin", "uOnDisc", "uOnCone", "uFoot", "uCell", "uSpokes", "uSky", "uInk"];
function setUniforms(gl, u, env) {
  const sky = skyAt(glow);
  gl.uniform3fv(u.uSky, sky); gl.uniform1f(u.uGround, lines.ground ? 1 : 0);
  gl.uniform1f(u.uThin, .5 * lines.width * Math.max(1, .8 * env.sc)); gl.uniform1f(u.uOnDisc, lines.disc ? 1 : 0); gl.uniform1f(u.uOnCone, lines.cone ? 1 : 0);
  gl.uniform1f(u.uFoot, lines.foot ? 1 : 0); gl.uniform1f(u.uCell, lines.rings > 0 ? VOL.Rb / lines.rings : 0); gl.uniform1f(u.uSpokes, lines.spokes);
  gl.uniform3fv(u.uInk, INKS[lines.ink] || sky);
}

// ================= DEV: the lines =================
V.dev.tab("terrain", `
  <div class="full seg" role="group" aria-label="Terrain">
    <span class="k">terrain</span>
    <button class="t" type="button" data-on="ground" aria-pressed="false">the disc</button>
  </div>
  <div class="full seg" role="group" aria-label="Lines: where">
    <span class="k">lines on</span>
    <button class="t" type="button" data-on="disc" aria-pressed="false">disc</button>
    <button class="t" type="button" data-on="cone" aria-pressed="false">volcano</button>
    <button class="t" type="button" data-on="foot" aria-pressed="false">foot circle</button>
  </div>
  <label class="full"><span class="k">rings, axis to foot (0: none) </span><span id="ringsVal"></span><input type="range" id="rings" min="0" max="48" step="1"></label>
  <label class="full"><span class="k">meridians (0: none) </span><span id="spokesVal"></span><input type="range" id="spokes" min="0" max="96" step="4"></label>
  <label class="full"><span class="k">thickness, px </span><span id="widthVal"></span><input type="range" id="width" min="0.5" max="4" step="0.25"></label>
  <div class="full seg" role="group" aria-label="Lines: ink">
    <span class="k">ink</span>
    <button class="t" type="button" data-ink="black" aria-pressed="false">black</button>
    <button class="t" type="button" data-ink="grey" aria-pressed="false">grey</button>
    <button class="t" type="button" data-ink="hot" aria-pressed="false">red-orange</button>
    <button class="t" type="button" data-ink="sky" aria-pressed="false">sky</button>
  </div>
  <span class="full"><button class="t" id="linesReset" type="button">lines back to default</button></span>`);
function showLines() {
  document.querySelectorAll("[data-on]").forEach(b => b.setAttribute("aria-pressed", String(!!lines[b.dataset.on])));
  document.querySelectorAll("[data-ink]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ink === lines.ink)));
  for (const k of ["rings", "spokes", "width"]) { $(k).value = lines[k]; $(k + "Val").textContent = lines[k]; }
  store.set("volcano-v11-lines4", lines);
}
document.querySelectorAll("[data-on]").forEach(b => b.addEventListener("click", () => { lines[b.dataset.on] = !lines[b.dataset.on]; showLines(); }));
document.querySelectorAll("[data-ink]").forEach(b => b.addEventListener("click", () => { lines.ink = b.dataset.ink; showLines(); }));
for (const k of ["rings", "spokes", "width"]) $(k).addEventListener("input", () => { lines[k] = +$(k).value; showLines(); });
$("linesReset").addEventListener("click", () => { Object.assign(lines, LINES_DEFAULT); showLines(); });
showLines();

V.terrain = { R_DISC, sky: () => skyAt(glow), glsl, uniforms, setUniforms, update: coolGlow };
})();

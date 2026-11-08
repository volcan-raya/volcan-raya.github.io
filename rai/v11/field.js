// The field: one continuous picture, one shader. Every pixel's ray is tested against the volcano (volcano.js: the cone
// and its hole) and the terrain (terrain.js: the disc), the nearest wins; past them it is the sky. No light, no noise.
// Going in is going down the hole: the black fills the view, and past it is the soup's colour (soup.js). Each of those
// files gives its part of the shader as GLSL, with its own uniforms; this file only puts them together and draws.
// Shared: changed only by agreement (see core.js).
(() => {
"use strict";
let FIELD_SCALE = 1, gl = null, uni = {}, ctx2 = null;
const field = V.fieldEl;
const parts = () => [V.volcano, V.terrain, V.soup];

// what every part can use: the ray through a pixel, what it met (1 the cone's side, 2 the hole, 3 the disc), a hash
const HEAD = `precision highp float;
uniform vec2 uPP; uniform float uF, uIn; uniform vec3 uEye, uFwd, uRight, uUp;
const float TAU = 6.2831853;
float what = 0.;
vec3 ray(vec2 q) { return normalize(uFwd * uF + uRight * q.x + uUp * q.y); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;
const BODY = `
// the nearest surface along a ray: where (P), facing what (N), how far from the eye (T). false if it's sky. Measured from
// the point of the ray nearest the volcano's PIVOT, so the far eye of the long lens loses no precision
bool hits(vec3 rd, out vec3 P, out vec3 N, out float T) {
  float t0 = dot(PIVOT - uEye, rd), best = 1e9, lo = -t0; vec3 p = uEye + rd * t0;
  volcanoHit(p, rd, lo, best, N);
  terrainHit(p, rd, lo, best, N);
  if (best > 1e8) return false;
  P = p + rd * best; T = best + t0;
  return true;
}
vec3 shade(vec2 q) {
  vec3 rd = ray(q), P, N, c; float T;
  if (!hits(rd, P, N, T)) return terrainSky();
  if (volcanoColour(c)) return c;
  return terrainColour(P, N, rd, T);
}
void main() {
  vec2 q = gl_FragCoord.xy - uPP;
  vec3 col;
  if (uIn > .5) col = soupColour(q);
  else col = (shade(q + vec2(-.125, -.375)) + shade(q + vec2(.375, -.125)) + shade(q + vec2(.125, .375)) + shade(q + vec2(-.375, .125))) * .25;   // four rays a pixel, so the edges are clean with no stroke
  gl_FragColor = vec4(col, 1.);
}`;

function init() {
  try { gl = field.getContext("webgl", { antialias: false, depth: false, alpha: false, powerPreference: "high-performance" }); } catch {}
  if (gl) {
    const FRAG = HEAD + parts().map(p => p.glsl).join("\n") + BODY;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, "attribute vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }"), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    const prog = vs && fs && gl.createProgram();
    if (prog) { gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); }
    if (!prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) gl = null;
    else {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      const names = ["uPP", "uF", "uIn", "uEye", "uFwd", "uRight", "uUp", ...parts().flatMap(p => p.uniforms || [])];
      for (const n of names) uni[n] = gl.getUniformLocation(prog, n);
    }
  }
  if (!gl) ctx2 = field.getContext("2d");      // no WebGL: the same shapes, flat
}
function size() {
  const { W, H, MDPR } = V.size();
  FIELD_SCALE = MDPR;
  field.width = Math.max(2, Math.round(W * FIELD_SCALE)); field.height = Math.max(2, Math.round(H * FIELD_SCALE));
  if (gl) gl.viewport(0, 0, field.width, field.height);
}
function draw() {
  const sc = FIELD_SCALE, cam = V.camera.cam, { W, H } = V.size(), { PX, PY } = V.camera.screen();
  if (gl) {
    gl.uniform2f(uni.uPP, PX * sc, (H - PY) * sc); gl.uniform1f(uni.uF, cam.F * sc); gl.uniform1f(uni.uIn, cam.in ? 1 : 0);
    gl.uniform3f(uni.uEye, cam.x, cam.y, cam.z); gl.uniform3fv(uni.uFwd, cam.f); gl.uniform3fv(uni.uRight, cam.rt); gl.uniform3fv(uni.uUp, cam.up);
    const env = { sc, W, H, PX, PY, cam };
    for (const p of parts()) if (p.setUniforms) p.setUniforms(gl, uni, env);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return;
  }
  // no WebGL: flat shapes, the disc and the hole as polygons
  const c = ctx2, VOL = V.volcano.VOL, sky = V.terrain.sky(), project = V.camera.project;
  c.setTransform(sc, 0, 0, sc, 0, 0);
  if (cam.in) {
    c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
    c.globalAlpha = cam.rise;
    const g = c.createLinearGradient(0, 0, 0, H);   // the soup's: red-orange low, black at the top
    [["#000", 0], ["#FF4500", .8], ["#FF4500", 1]].forEach(([k, at]) => g.addColorStop(at, k));
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    return;
  }
  c.fillStyle = `rgb(${sky.map(v => Math.round(v * 255)).join(",")})`; c.fillRect(0, 0, W, H);
  const ring = (r, y) => { const pts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, q = project(Math.cos(a) * r, y, Math.sin(a) * r); if (q) pts.push(q); } return pts; };
  const fillPts = (pts, col) => { if (pts.length < 3) return; c.fillStyle = col; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.fill(); };
  fillPts(ring(V.terrain.R_DISC, 0), "#fff");
  const k = project(0, VOL.eye, 0).k, top = project(0, VOL.H, 0).y, base = project(0, 0, 0).y;
  c.fillStyle = "#fff"; c.beginPath(); c.moveTo(PX - VOL.Rb * k, base); c.lineTo(PX - VOL.Rt * k, top); c.lineTo(PX + VOL.Rt * k, top); c.lineTo(PX + VOL.Rb * k, base); c.fill();
  fillPts(ring(VOL.Rt, VOL.H), "#000");
}

V.field = { init, size, draw };
})();

// A notification, the same in every branch of the volcano: its disc, its number and what it plays under the pointer.
// v09 (1.00) and v10 (2.00) both load this file, so a change here shows in both. Each page passes only what is its own:
// the colour, the type, how far it has faded.
//   <script src="../shared/notification.js"></script>
//   volcanoNote.draw(x, b, { rgb, alpha, type, fade, since, dt, imgSrc, count })
//   count: false draws the disc without its number (default true).
//   seen: how a read ball looks. "fill" (default): the caller's colour, as it is. "outline" / "outline-black": as it is
//   read (b.readT 0 … 1) the fill fades away and a ring at its edge comes in, in its colour or in black; the ring is
//   about 1.5 px on a near ball (R ≈ 21), thinner further off, never under one device pixel.
// b needs R, sx, sy, readT, n, s (the note). since: seconds under the pointer, or null when it isn't.
window.volcanoNote = (() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const u = clamp((v - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const out = u => 1 - (1 - Math.min(1, u)) ** 3;
  const TAU = 6.2832;

  const mediumOf = s => s.re ? "text" : s.img ? "image" : s.medium === "voice" ? "voice" : "text";   // a post is one thing: a picture, a voice or a text

  // The signs are drawn for a ball of 11 px, then scaled to its size, so they stay in perspective. They play this many
  // times faster than they were written, and loop as much sooner.
  const R0 = 11, LOOP = 8.5, SPEED = 2.5;
  const signTime = t => reduce.matches ? t % LOOP : (t * SPEED) % LOOP;

  // a picture, as a mosaic of its dark cells round the ball, nearest first
  const MOS = 25, mosaics = new Map();           // by image URL: { ready, level: Float32Array(MOS*MOS) of 0 (dark) … 1 (light) }
  function mosaicOf(src, imgSrc) {
    if (!src) return null;
    let m = mosaics.get(src);
    if (!m) {
      m = { ready: false }; mosaics.set(src, m);
      const img = new Image();
      img.onload = () => { try { m.level = makeMosaic(img); m.ready = true; } catch {} };
      img.src = imgSrc ? imgSrc(src) : src;
    }
    return m;
  }
  function makeMosaic(img) {
    const c = document.createElement("canvas"); c.width = c.height = MOS;
    const x = c.getContext("2d", { willReadFrequently: true });
    const w = img.naturalWidth, h = img.naturalHeight, sq = Math.min(w, h);
    x.drawImage(img, (w - sq) / 2, (h - sq) / 2, sq, sq, 0, 0, MOS, MOS);   // the middle of the picture in 25 × 25 cells
    const d = x.getImageData(0, 0, MOS, MOS).data, v = new Float32Array(MOS * MOS);
    for (let k = 0; k < v.length; k++) {
      const L = (.2126 * d[k * 4] + .7152 * d[k * 4 + 1] + .0722 * d[k * 4 + 2]) / 255;   // all the colour out
      const u = clamp((L - .25) / .5, 0, 1);
      v[k] = L + (u * u * (3 - 2 * u) - L) * .8;                                         // curves: an S, for contrast
    }
    const sorted = Float32Array.from(v).sort(), lo = sorted[Math.floor(v.length * .03)], hi = sorted[Math.floor(v.length * .97)];
    return Float32Array.from(v, a => Math.round(clamp((a - lo) / Math.max(.05, hi - lo), 0, 1) * 5) / 5);   // six tones
  }
  function blipsOf(b, imgSrc) {
    const m = mosaicOf(b.s.img, imgSrc);
    if (!m || !m.ready) return null;
    if (b.blips) return b.blips;
    const cs = 4, mid = (MOS - 1) / 2, R = mid * cs, list = [];
    m.level.forEach((lv, k) => {
      const dx = (k % MOS - mid) * cs, dy = (Math.floor(k / MOS) - mid) * cs, dist = Math.hypot(dx, dy);
      if (dist > R0 + 3 && dist <= R && lv < .85) list.push({ dx, dy, dist, ink: 1 - lv });
    });
    list.sort((a, c) => a.dist - c.dist);
    b.blips = list; b.reach = R;
    return list;
  }

  const MORSE = { a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---", k: "-.-", l: ".-..", m: "--",
    n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..",
    0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----." };
  function morseOf(b) {                          // the first four letters as marks: a dot is 1 unit, a dash 3; gaps 1, 3 between letters, 7 between words
    if (b.morse) return b.morse;
    const letters = (b.s.s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 4);
    const els = []; let u = 0;
    for (const ch of letters) {
      if (ch === " ") { u += 4; continue; }
      for (const sym of MORSE[ch] || "") { const len = sym === "." ? 1 : 3; els.push({ u, len }); u += len + 1; }
      u += 2;
    }
    return (b.morse = { els, units: Math.max(1, u) });
  }

  // three waves leaving the edge, each whole from its first moment and fading as it goes
  function waves(x, tau, reach, r, life, drawAt) {
    const alpha = x.globalAlpha;
    for (let j = 0; j < 3; j++) {
      const u = (tau - j * 1.3) / life; if (u < 0 || u > 1) continue;
      x.globalAlpha = alpha * (1 - u) ** 1.5;
      drawAt(r + u * reach);
    }
    x.globalAlpha = alpha;
  }
  function drawSign(x, b, k, tau, ink, imgSrc) {
    const calm = reduce.matches, me = mediumOf(b.s), { sx, sy, R: r } = b, lw = clamp(k, .7, 1.8), life = calm ? 7 : 4.6;
    if (me === "voice") {                        // rings; louder notes reach further
      x.lineWidth = lw * 1.4; x.strokeStyle = ink;
      waves(x, tau, (34 + 30 * (b.s.i ?? .5)) * k, r, life, R => { x.beginPath(); x.arc(sx, sy, R, 0, TAU); x.stroke(); });
    } else if (me === "text") {                  // the same rings, cut into its Morse: the whole of it at once, going out
      const m = morseOf(b), per = TAU / m.units, a0 = -Math.PI / 2 + Math.sin(b.ph || 0) * .6;
      x.lineCap = "round"; x.lineWidth = 2 * lw; x.strokeStyle = x.fillStyle = ink;
      waves(x, tau, 49 * k, r, life, R => {
        for (const e of m.els) {
          const ang = a0 + (e.u + e.len / 2) * per;
          x.beginPath();
          if (e.len === 1) { x.arc(sx + Math.cos(ang) * R, sy + Math.sin(ang) * R, 1.2 * lw, 0, TAU); x.fill(); }
          else { x.arc(sx, sy, R, a0 + e.u * per, a0 + (e.u + e.len) * per); x.stroke(); }
        }
      });
      x.lineCap = "butt";
    } else if (me === "image") {                 // one sweep from the edge; the picture answers as it passes, like sonar
      const bl = blipsOf(b, imgSrc); if (!bl) return;
      const sweep = calm ? 7 : 4.8, span = b.reach - R0, alpha = x.globalAlpha;
      if (tau > sweep + 5) return;
      if (tau < sweep && !calm) {
        x.lineWidth = lw; x.strokeStyle = ink; x.globalAlpha = alpha * .6 * (1 - tau / sweep);
        x.beginPath(); x.arc(sx, sy, r + tau / sweep * span * k, 0, TAU); x.stroke();
      }
      x.fillStyle = ink;
      for (const c of bl) {
        const hit = (c.dist - R0) / span * sweep; if (tau < hit) break;
        const age = tau - hit, a = Math.max(0, 1 - Math.max(0, tau - sweep - 1.2) / 3.8); if (a <= 0) continue;   // it builds up, holds, then fades together
        x.globalAlpha = alpha * a * c.ink;
        x.beginPath(); x.arc(sx + c.dx * k, sy + c.dy * k, 1.9 * k * out(age / .4), 0, TAU); x.fill();
      }
      x.globalAlpha = alpha;
    }
  }

  function draw(x, b, { rgb, alpha = 1, type = "sans-serif", fade = 1, since = null, dt = 0, imgSrc = null, count = true, seen = "fill" }) {
    const R = b.R, ink = `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
    const o = seen === "fill" ? 0 : smooth(0, 1, b.readT);   // how far a ball is into its outline
    if (o < .998) { x.globalAlpha = alpha * (1 - o); x.fillStyle = ink; x.beginPath(); x.arc(b.sx, b.sy, R, 0, TAU); x.fill(); }
    if (o > .002) {
      const m = x.getTransform(), px = 1 / (Math.hypot(m.a, m.b) || 1), lw = Math.max(px, 1.5 * R / 21);
      x.globalAlpha = alpha * o; x.strokeStyle = seen === "outline-black" ? "#000" : ink; x.lineWidth = lw;
      x.beginPath(); x.arc(b.sx, b.sy, Math.max(.01, R - lw / 2), 0, TAU); x.stroke();
    }
    x.globalAlpha = alpha;
    const ta = count ? (1 - b.readT) * fade * smooth(3.5, 6, R) : 0;   // the number, as on an app icon: white, and gone once read
    if (ta > .02) {
      const digits = String(b.n).length, fs = 2 * R * (digits === 1 ? .56 : digits === 2 ? .46 : .36);
      x.globalAlpha = alpha * ta; x.fillStyle = "#fff";
      x.font = `500 ${fs.toFixed(2)}px ${type}`; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(b.n, b.sx, b.sy + fs * .04);
    }
    x.globalAlpha = alpha;
    if (since != null) drawSign(x, b, Math.max(R, 6) / R0, signTime(since), ink, imgSrc);   // under the pointer, what is in it grows out of the ball, again and again
    // on the keyboard, a bold outline in its own colour: it comes out of the dot's edge and goes back in
    b.ring = (b.ring || 0) + ((b.focus ? 1 : 0) - (b.ring || 0)) * (reduce.matches ? 1 : 1 - Math.exp(-dt / .05));
    if (b.ring > .01) { x.strokeStyle = ink; x.lineWidth = 2; x.beginPath(); x.arc(b.sx, b.sy, R - 1 + 6 * b.ring, 0, TAU); x.stroke(); }
  }

  return { mediumOf, draw };
})();

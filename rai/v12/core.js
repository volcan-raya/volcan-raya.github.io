// v11 (1.01) is in files by subject, so two windows can work on it at once, each on its own files:
//   core.js     this file: the little tools all use, the screen, the type, DEV's tabs and the frame loop. Shared:
//               changed only by agreement
//   volcano.js  the cone and its hole, the pressure, the eruption, the tremor, the words flying out
//   terrain.js  the white disc the volcano floats on, the lines on it and on the cone, the sky
//   camera.js   the way in and out, the lens, where the eye is; all the moving: wheel, pinch, drag, keys
//   soup.js     the notes, their balls, a note opened, the composer, the voice, the name, who is here; the soup's colour
//   field.js    the one picture: a shader made of the volcano's, the terrain's and the soup's parts. Shared
// Each file keeps its names to itself and talks through V. Who reads what:
//
// V (this file):  tools; size() → { W, H, MDPR }; view, fieldEl, marks, mctx; at(e) → [x, y] on the scene; type(),
//                 setType(); dev.tab(name, html) → its group in the DEV panel; dev.on; start()
// V.volcano:      VOL { H, Rb, Rt, eye, Rc }, SLOPE; addPressure(x), PER_NOTE; pressure, phase; glsl; update(dt);
//                 drawMarks(ctx); tremor(t); showDev()
// V.terrain:      R_DISC; sky() → [r, g, b]; glsl, uniforms, setUniforms(gl, u, env); update(dt)
// V.camera:       cam (this frame: .in past the rim, .inside 0 … 1 the soup is drawn, .soup 0 … 1 the soup can be
//                 touched, .out, .rise, .white, .x .y .z, .f .rt .up, .F); project(x, y, z) → { x, y, k, d } or null;
//                 unproject(sx, sy, d) → [x, y, z]; NEAR; z0 (where the eye starts in the chamber); goTo(s, slow);
//                 lens(); screen() → { PX, PY }; update(dt); dragging(); showDev()
// V.soup:         update(dt, t); draw(ctx); pointerDown(px, py) → taken; pointerMove(px, py, dragged) → held; drop();
//                 hover(px, py) (null: left); click(px, py); cursor() → "grabbing" | "pointer" | null; jolt(k);
//                 texts(); readLevel(); glsl, uniforms, setUniforms(gl, u, env)
// V.field:        init(); size(); draw()
// A shader part (glsl) is GLSL put into the one shader, after field.js's head (uF, uEye, uFwd, uRight, uUp, TAU, what,
// ray()). It declares its own uniforms, lists their names in .uniforms and sets them in setUniforms(gl, u, env), where
// u is name → location and env is { sc, W, H, PX, PY, cam }: a new uniform needs no change in field.js.
// Anything on the page that should keep the wheel and the pointer to itself (a panel, the composer) has data-ui.
window.V = (() => {
  "use strict";
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const $ = id => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  // the notes live next to v05, one folder up: so does what was uploaded with them
  const UP = "../";
  const imgSrc = s => !s ? s : /^data:/.test(s) ? s : UP + s;
  async function getJSON(url) {
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + "v=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }
  // the type: one family, for everything drawn on the canvas too. Inter Tight is a placeholder for LL Unica77: to change
  // it, change FONTS. DEV (text) switches between it and a serif, Spectral
  const FONTS = { sans: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif", serif: "'Spectral', Georgia, 'Times New Roman', serif" };
  let type = FONTS.sans;

  // ================= the screen =================
  const view = $("view"), field = $("field"), marks = $("marks"), mctx = marks.getContext("2d");
  let W = 0, H = 0, MDPR = 1, sized = "";
  function resize() {
    const box = document.body.getBoundingClientRect();
    W = Math.round(box.width) || innerWidth; H = Math.round(box.height) || innerHeight; sized = W + "x" + H;
    MDPR = Math.min(2, devicePixelRatio || 1);
    marks.width = Math.round(W * MDPR); marks.height = Math.round(H * MDPR);
    V.camera.lens(); V.field.size();
  }
  // a pointer on the scene, in its own px (the site bar pushes the page, and with it the scene, down)
  const at = e => { const r = marks.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  // ================= DEV: one panel, in tabs; each file puts its rows in its own =================
  const TABS = ["volcano", "soup", "text", "camera"];   // volcano first: its "erupt" is the one most reached for; its lines and the disc are in it too
  const devEl = $("dev"), bar = document.createElement("div"), groups = new Map();
  bar.className = "full devTabs"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "DEV");
  bar.innerHTML = TABS.map(k => `<button type="button" role="tab" data-devtab="${k}">${k}</button>`).join("");
  devEl.append(bar);
  devEl.insertAdjacentHTML("beforeend", '<span class="full devFps"><span class="k">fps </span><span id="fps"></span></span>');
  let shown = TABS.includes(store.get("volcano-v12-devtab", "soup")) ? store.get("volcano-v12-devtab", "soup") : "soup";
  function showTab(k) {
    shown = k; store.set("volcano-v12-devtab", k); devEl.scrollTop = 0;
    for (const b of bar.children) b.setAttribute("aria-selected", String(b.dataset.devtab === k));
    for (const [n, g] of groups) g.hidden = n !== k;
  }
  bar.addEventListener("click", e => { const b = e.target.closest("[data-devtab]"); if (b) showTab(b.dataset.devtab); });
  const dev = {
    on: false,
    tab(name, html) {                            // the group of rows for this tab, made the first time; html is added to it
      let g = groups.get(name);
      if (!g) {
        g = document.createElement("div"); g.className = "devGroup"; g.dataset.tab = name; g.hidden = name !== shown;
        groups.set(name, g);
        const order = TABS.indexOf(name), next = [...groups.values()].find(o => TABS.indexOf(o.dataset.tab) > order && o.isConnected);
        next ? devEl.insertBefore(g, next) : devEl.append(g);
      }
      if (html) g.insertAdjacentHTML("beforeend", html);
      return g;
    },
  };
  showTab(shown);
  addEventListener("cabz:dev", e => { dev.on = !!e.detail.on; devEl.hidden = !dev.on; });   // the "dev" square in the site bar (nav.js)

  // the type, kept in this browser. Text already in the air keeps the widths it was measured with
  dev.tab("text", `<div class="full seg" role="group" aria-label="Type">
    <span class="k">type</span>
    <button class="t" type="button" data-font="sans" aria-pressed="false">sans</button>
    <button class="t" type="button" data-font="serif" aria-pressed="false">serif</button>
  </div>`);
  function setFont(name) {
    const f = FONTS[name] ? name : "sans", root = document.documentElement;
    type = FONTS[f];
    root.style.setProperty("--type", type); root.dataset.font = f; store.set("volcano-v12-font", f);
    document.querySelectorAll("button[data-font]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.font === f)));
    try { document.fonts.load(`500 100px ${type}`); } catch {}   // so the flying words are measured in the real type
  }
  document.querySelectorAll("button[data-font]").forEach(b => b.addEventListener("click", () => setFont(b.dataset.font)));
  setFont(store.get("volcano-v12-font", "sans"));

  // ================= the loop =================
  // each frame, in this order: the microphone, the pressure, the camera, the sky, the soup, the picture, the marks over
  // it (the soup's balls, the flying words), the tremor, DEV
  let last = 0, fpsAvg = 60;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000 || 0), t = now / 1000; last = now;
    const { volcano, terrain, camera, soup } = V;
    soup.readLevel();
    volcano.update(dt);
    camera.update(dt);
    terrain.update(dt);
    soup.update(dt, t);
    V.field.draw();
    const x = mctx, cam = camera.cam;
    x.setTransform(MDPR, 0, 0, MDPR, 0, 0); x.clearRect(0, 0, W, H);
    if (cam.inside > 0) soup.draw(x);
    volcano.drawMarks(x);
    const sc = soup.cursor();
    marks.style.cursor = sc === "grabbing" || camera.dragging() ? "grabbing" : sc || "grab";
    volcano.tremor(t);
    if (dev.on) {
      fpsAvg = lerp(fpsAvg, dt > 0 ? 1 / dt : 60, .05); $("fps").textContent = Math.round(fpsAvg);
      volcano.showDev(); camera.showDev();
    }
    requestAnimationFrame(frame);
  }
  function start() {
    V.camera.update(0);
    V.field.init();
    devEl.hidden = !dev.on;
    addEventListener("resize", resize);
    // the site bar can push the page down after it loads (it adds a padding to <html>): follow the body's size
    if (window.ResizeObserver) {
      new ResizeObserver(() => { const b = document.body.getBoundingClientRect(); if (Math.round(b.width) + "x" + Math.round(b.height) !== sized) resize(); }).observe(document.body);
    }
    resize();
    requestAnimationFrame(frame);
  }

  return { rand, clamp, lerp, smooth, $, reduce, store, UP, imgSrc, getJSON, FONTS,
    type: () => type, setType(f) { type = f; }, size: () => ({ W, H, MDPR }), view, fieldEl: field, marks, mctx, at, dev, start,
    volcano: null, terrain: null, camera: null, soup: null, field: null };
})();

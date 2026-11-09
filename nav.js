// cabz · site bar
// Every page loads site.js (the map of the site, built by _build/build.py) and this file:
//   <script src="../../site.js" defer></script>
//   <script src="../../nav.js" data-path="pp/mouna/poids.html" [data-version="<id>"] defer></script>
// It draws one bar on top of every page: where you are (cabz / pp / mouna), the other
// projects (‹ ›), the index of everything, and the versions of the project as a git line.
// The bar always stays on top, on every page.
(() => {
  "use strict";
  const me = document.currentScript;
  const S = window.CABZ;
  if (!me || !S) return;

  const root = new URL(".", me.src).href;
  // projects marked "cursor": "normal" in projects.json keep the system cursor instead of the home page's
  const plainCursor = S.sections.some((s) => s.projects.some((p) => p.cursor === "normal" && (me.dataset.path || "").startsWith(p.id + "/")));
  if (plainCursor) {
    // nothing to load
  } else if (!document.querySelector('link[data-cabz-cursor]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = root + "cursor.css";
    css.setAttribute("data-cabz-cursor", ""); document.head.append(css);
  }
  if (!plainCursor && !window.cabzCursorStarted && !document.querySelector('script[src="' + root + 'cursor.js"]')) {
    const script = document.createElement("script"); script.src = root + "cursor.js";
    document.head.append(script);
  }
  const path = me.dataset.path || "index.html";
  const viewing = me.dataset.version || new URLSearchParams(location.search).get("version") || "";
  const local = location.protocol === "file:";
  // file:// can't open folders, so point straight at their index.html
  const url = (p) => root + p + (local && (p === "" || p.endsWith("/")) ? "index.html" : "");
  // the root of the tree: volcan-raya / rai or aya
  const BRAND = "volcan-raya";
  const BRAND_HTML = '<span class="brand">volcan-raya</span>';
  const PP = "cabz/pp";

  // Spectral has to be declared on the page itself (fonts don't load from inside a shadow root)
  if (!document.querySelector("link[data-cabz-font]")) {
    const f = document.createElement("link");
    f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600&display=swap";
    f.setAttribute("data-cabz-font", "");
    document.head.appendChild(f);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ddmmyy = (iso) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y.slice(2)}`; };

  // the home page's own projects (lisière, soleil) sit in a section with an empty id
  let project, section;
  for (const s of S.sections) for (const p of s.projects) if (path.startsWith(p.id + "/")) { project = p; section = s; }
  if (!section) section = S.sections.find((s) => s.id && path.startsWith(s.id + "/"));
  // the home page itself is raíz, with its own versions (cabz-vNN tags, see _build/build.py)
  const atRoot = !project && path === "index.html" && S.root?.versions.length > 1;
  if (atRoot) project = S.root;
  const page = atRoot ? path : project ? path.slice(project.id.length + 1) : "";

  // versions
  const vs = project ? project.versions : [];
  let cur = vs.findIndex((v) => (viewing ? v.id === viewing : v.live));
  if (cur < 0) cur = vs.length - 1;
  const past = vs.length > 1 && !vs[cur].live;
  const vHref = (v) => {
    if (v.href) return url(v.href);
    const keep = page !== "index.html" && v.pages.includes(page) ? page : "";
    return url((project.id ? project.id + "/" : "") + (v.live ? "" : "_v/" + v.id + "/") + keep);
  };
  // the bar counts in 0.0x; a version on a branch of its own goes by that branch's name (releases in projects.json)
  const vNameOf = (i, version) => {
    if (version?.release) return version.release;
    const n = /^v(\d+)$/.exec(version?.label || "v" + i);
    return n ? "0." + n[1].padStart(2, "0") : version.label;
  };
  const versionText = (version, i) => `${vNameOf(i, version)} [${version?.date ? ddmmyy(version.date) : "—"}]`;
  const vLabel = (i) => esc(versionText(vs[i], i));

  const vDot = (v, i) => `<a class="dot${i === cur ? " cur" : ""}" href="${vHref(v)}" data-i="${i}" data-tooltip="${esc(versionText(v, i))}"${i === cur ? ' aria-current="true"' : ""}><span class="sr">${esc(versionText(v, i))}</span></a>`;
  // from the first version with a release of its own, the line forks
  const firstRelease = vs.findIndex((v) => v.release);
  const fork = firstRelease > 0;
  const trunk = fork ? firstRelease : vs.length;
  // one lane a branch: releases with the same first number (1.00, 1.01…) go on along it, left to right
  const lanes = [];
  vs.slice(trunk).forEach((v, i) => {
    const key = /^(\d+)\./.exec(v.release || "")?.[1] ?? v.release ?? v.id;
    let lane = lanes.find((l) => l.key === key);
    if (!lane) lanes.push((lane = { key, dots: [] }));
    lane.dots.push(vDot(v, trunk + i));
  });
  const forkH = lanes.length * 17 - 8, rowY = (i) => 4.5 + i * 17;
  const forkPath = `M0 ${forkH / 2}H8M8 ${rowY(0)}V${rowY(lanes.length - 1)}` + lanes.map((_, i) => `M8 ${rowY(i)}H16`).join("");
  const forkLanes = !fork ? "" : `<li class="fork"><svg viewBox="0 0 16 ${forkH}" style="height:${forkH}px" aria-hidden="true"><path d="${forkPath}"/></svg><span class="lanes">${lanes.map((l) => `<span class="lane">${l.dots.join("<i></i>")}</span>`).join("")}</span></li>`;

  // neighbours inside the section
  let prev, next;
  if (project && section && section.projects.length > 1) {
    const i = section.projects.indexOf(project), n = section.projects.length;
    prev = section.projects[(i - 1 + n) % n];
    next = section.projects[(i + 1) % n];
  }
  const pHref = (p) => url(p.href);
  // a name can carry one letter struck by the next, in the same type: "cross": "ex" sets the x over the e
  const crossed = (p, name) => {
    const html = esc(name);
    return p.cross ? html.replace(p.cross, `<span class="ex">${p.cross[0]}<span>${p.cross.slice(1)}</span></span>`) : html;
  };

  const crumbs = [`<a class="c home${!section && path === "index.html" ? " here" : ""}" href="${url("")}">${BRAND_HTML}</a>`];
  if (path.startsWith("cabz/")) crumbs.push(`<i>/</i><a class="c${path === "cabz/index.html" ? " here" : ""}" href="${url("cabz/")}">cabz—</a>`);
  if (section && section.id) crumbs.push(`<i>/</i><a class="c${project ? "" : " here"}" href="${url(section.id + "/")}" title="${esc(section.title)}">${esc(section.short)}</a>`);
  // an older version can carry the name the project had then
  if (project && !atRoot) crumbs.push(`<i>/</i><a class="c here" href="${pHref(project)}" title="${esc(project.title)}">${crossed(project, vs[cur]?.header || project.activeLabel || project.name)}</a>`);
  // a version made side by side lives in a folder of its own (volcano/v07/): its page is that version, not a page of the project
  const shown = vs[cur]?.href && vs[cur].label && page.startsWith(vs[cur].label + "/") ? page.slice(vs[cur].label.length + 1) : page;
  if (shown && shown !== "index.html") crumbs.push(`<span class="pg"><i>/</i> ${esc(shown.replace(/\.html$/, ""))}</span>`);

  // pp's dots come before the names: every row reserves room for the longest line, so the names align
  const ppDots = Math.max(1, ...(S.sections.find((s) => s.id === PP)?.projects.map((p) => p.versions.length) || []));
  const versionMarks = (p, includeSingle) => {
    const versions = p.versions.length ? p.versions : [{}];
    const count = includeSingle ? versions.length : p.versions.length;
    return count > (includeSingle ? 0 : 1)
      ? `<span class="g${includeSingle ? " before" : ""}"${includeSingle ? ` style="min-width:${ppDots * 13 - 8}px"` : ""}>${versions.map((v, i) => `<u data-tooltip="${esc(versionText(v, i))}" aria-label="${esc(versionText(v, i))}"></u>`).join("")}</span>` : "";
  };
  const projectTitle = (p) => p.strike && p.title.startsWith(p.strike + " ")
    ? `<s>${esc(p.strike)}</s>${esc(p.title.slice(p.strike.length))}` : esc(p.title);
  const panel = S.sections.map((s) => `
    <section>
      <a class="sh${s === section && !project ? " here" : ""}" href="${url(s.id ? s.id + "/" : "")}"><b>${s.id ? (s.id.startsWith("cabz/") ? "cabz— / " : "") + esc(s.short) : BRAND_HTML}</b> ${esc(s.title)}</a>
      <ol>${s.projects.map((p) => `
        <li><a href="${pHref(p)}"${p === project ? ' class="here" aria-current="page"' : ""}>
          <span class="n">${s.id === PP ? versionMarks(p, true) : ""}${crossed(p, p === project ? (p.activeLabel || p.name) : p.name)}${s.id !== PP ? versionMarks(p, false) : ""}</span>
          <span class="t">${p.title.replace(/\s/g, "-") === p.name ? "" : projectTitle(p)}${p.note ? ` <em>${esc(p.note)}</em>` : ""}</span>
        </a></li>`).join("")}
      </ol>
    </section>`).join("");

  // the design tokens (tokens.css: the same names and defaults). The index's design column changes them
  // in this browser: what's changed is kept in localStorage and set on <html>, so every page follows,
  // the bar included (custom properties cross into its shadow root)
  const FONTS = [
    ["Spectral", 'Spectral, Georgia, "Times New Roman", serif'],
    ["Helvetica", '"Helvetica Neue", Helvetica, Arial, sans-serif'],
    ["Menlo", "Menlo, ui-monospace, monospace"]
  ];
  const PALETTE = [["peach", "#efb4a5"], ["ink", "#222222"], ["sun", "#ff4500"], ["ray", "#e83700"], ["violet", "#b026ff"],
    ["lilac", "#c16cff"], ["black", "#000000"], ["cream", "#f5f2e7"], ["deep", "#21363c"]];
  const TOKENS = {
    "grid-cols": "8", "grid-gap": "8px", "grid-margin": "24px",
    "type-font": FONTS[0][1], "type-s": "13px", "type-m": "16px",
    ...Object.fromEntries(PALETTE.map(([n, c]) => ["c-" + n, c])),
    "ui-paper": "var(--c-peach)", "ui-ink": "var(--c-ink)"
  };
  const DESIGN_KEY = "cabz-design";
  let design = { tokens: {}, grid: false };
  try { design = { ...design, ...JSON.parse(localStorage.getItem(DESIGN_KEY) || "{}") }; } catch {}
  const token = (k) => design.tokens[k] ?? TOKENS[k];
  const applyTokens = () => {
    for (const k in TOKENS) {
      if (k in design.tokens) document.documentElement.style.setProperty("--" + k, design.tokens[k]);
      else document.documentElement.style.removeProperty("--" + k);
    }
  };
  applyTokens();


  const range = (key, label, min, max) => `<li><label class="k" for="d-${key}">${label}</label><span class="v">
    <input type="range" id="d-${key}" data-token="${key}" min="${min}" max="${max}" step="1"><output for="d-${key}"></output></span></li>`;
  const swatches = (role) => PALETTE.map(([n, c]) => `<button class="sw" type="button" data-role="${role}" data-value="var(--c-${n})" style="--c: var(--c-${n}, ${c})" title="${n}" aria-label="${role}: ${n}"></button>`).join("");
  const designColumn = `
    <aside class="design" aria-label="design">
      <p class="sh"><b>design</b> in this browser</p>
      <ol>
        <li><span class="k">grid</span><span class="v"><button class="btn" type="button" data-show-grid aria-pressed="false">show</button></span></li>
        ${range("grid-cols", "columns", 1, 16)}${range("grid-gap", "gaps", 0, 48)}${range("grid-margin", "margins", 0, 120)}
        <li class="h"><span class="k">type</span></li>
        <li><span class="k">font</span><span class="v">${FONTS.map(([n, f]) => `<button class="btn font" type="button" data-font="${esc(f)}" style="font-family: ${esc(f)}">${n}</button>`).join("")}</span></li>
        ${range("type-s", "small", 9, 24)}${range("type-m", "text", 10, 32)}
        <li class="h"><span class="k">colours</span></li>
        <li><span class="k">palette</span><span class="v">${PALETTE.map(([n]) => `<input class="sw" type="color" data-token="c-${n}" title="${n}" aria-label="palette: ${n}">`).join("")}</span></li>
        <li><span class="k">paper</span><span class="v">${swatches("ui-paper")}</span></li>
        <li><span class="k">ink</span><span class="v">${swatches("ui-ink")}</span></li>
        <li class="h"><span class="k"></span></li>
        <li><span class="k"></span><span class="v"><button class="btn" type="button" data-reset>reset</button><button class="btn" type="button" data-copy>copy css</button></span></li>
      </ol>
    </aside>`;

  const host = document.createElement("div");
  host.setAttribute("data-cabz-nav", "");
  host.toggleAttribute("data-home", document.body.classList.contains("home"));
  host.toggleAttribute("data-fork", fork);
  const sh = host.attachShadow({ mode: "open" });
  sh.innerHTML = `
<style>
  /* The shared bar follows the actual page surface, including dark project pages. */
  :host { all: initial; --cols: var(--grid-cols, 8); --gap: var(--grid-gap, 8px); --m: var(--grid-margin, 24px);
    --nbg: var(--nav-bg, var(--bg, #efb4a5)); --nfg: var(--nav-fg, var(--fg, #222222));
    --nsky: var(--nbg); }
  :host([data-dark]) { --nav-fg: #C16CFF; }
  :host([data-home]) { --nfg: var(--fg, #222222); }
  :host([data-surface]) .bar { background: var(--nbg); }
  * { box-sizing: border-box; }
  ::selection { background: transparent; color: #FF4500; text-shadow: -1px 1px 0 #222222; }
  a, button { color: inherit; text-decoration: none; font: inherit; letter-spacing: inherit; cursor: var(--cursor, pointer); }
  button { background: none; border: 0; padding: 0; cursor: var(--cursor, pointer); }
  a:focus-visible, button:focus-visible { outline: 1px solid currentColor; outline-offset: 3px; }
  .cols { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); column-gap: var(--gap); padding: 0 var(--m); }

  .wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483646;
    font: 400 var(--type-s, 13px)/1 var(--type-font, Spectral, Georgia, "Times New Roman", serif); letter-spacing: .06em; color: var(--nfg); }
  :host([data-fork]) { --bar-h: 48px; }
  .bar { height: var(--bar-h, 32px); align-items: center; background: transparent;
    border-bottom: 1px solid var(--nfg); }

  /* columns 1–3: where you are · 4–6: the versions, always from column 4, whatever the title's length · 7–8: tools */
  .crumbs { grid-column: 1 / 4; display: flex; align-items: center; gap: 8px; min-width: 0; white-space: nowrap; overflow: hidden; }
  .crumbs > i, .pg i { font-style: normal; opacity: 1; }
  /* raíz is set like everything else in the bar: the trail, index and the index's headings share one type */
  .brand { font: inherit; letter-spacing: inherit; }
  .ex { position: relative; }
  .ex span { position: absolute; left: 50%; transform: translateX(-50%); }
  .c { opacity: 1; }
  .c:hover, .c.here { opacity: 1; }
  .pg { opacity: 1; overflow: hidden; text-overflow: ellipsis; }
  .pg i { margin-right: 4px; }
  .vg { grid-column: 4 / 7; display: flex; align-items: center; gap: 16px; min-width: 0; }
  .tools { grid-column: 7 / -1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }

  ol.v { list-style: none; margin: 0; padding: 0; display: flex; align-items: center; flex: none; }
  ol.v li { display: flex; align-items: center; }
  ol.v li + li::before { content: ""; width: 16px; height: 1px; background: var(--nfg); opacity: 1; }
  /* a project that branches: the line forks into one lane a branch */
  ol.v li.fork::before { display: none; }
  .fork svg { display: block; flex: none; width: 16px; height: 26px; overflow: visible; }
  .fork path { fill: none; stroke: var(--nfg); stroke-width: 1; shape-rendering: crispEdges; }
  .lanes { display: grid; row-gap: 8px; }
  .lane { display: flex; align-items: center; }
  .lane i { display: block; width: 16px; height: 1px; background: var(--nfg); }
  .dot { display: block; width: 9px; height: 9px; border: 1px solid var(--nfg); border-radius: 50%; }
  /* hovering a version: the current one's fill fades, its outline stays (the cursor's round is on the hovered one) */
  ol.v:has(.dot:hover) .dot.cur { background: color-mix(in srgb, var(--nfg) 35%, transparent); }
  .dot:focus-visible { background: var(--nfg); }
  .dot:focus-visible { outline: 1px solid var(--nfg); outline-offset: 3px; }
  .dot.cur { background: var(--nfg); }
  .info { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 1; }
  .dev { flex: none; }
  .dev[hidden] { display: none; }
  .info b { font-weight: 400; }
  .latest, .warn { color: var(--nfg); white-space: nowrap; }
  .latest:hover { text-decoration: underline; }

  .steps { display: flex; position: relative; }
  .step-name { position: absolute; top: calc(100% + 8px); right: 0; padding: 3px 7px; white-space: nowrap; pointer-events: none;
    background: var(--nsky); color: var(--nfg); font: 400 var(--type-s, 13px)/1.3 var(--type-font, Spectral, Georgia, "Times New Roman", serif); letter-spacing: .02em; }
  .step-name[hidden] { display: none; }
  .step { display: grid; place-items: center; width: 24px; height: 24px; font-size: 15px; opacity: 1; }
  .step:hover { opacity: 1; }
  .btn { padding: 4px 8px; border: 1px solid var(--nfg); border-radius: 2px; opacity: 1; }
  .btn:hover, .btn[aria-expanded="true"], .btn[aria-pressed="true"] { opacity: 1; }
  .btn[aria-pressed="true"] { background: var(--nfg); color: var(--nbg); }
  .grid-btn, .grid-btn[aria-pressed="true"] { display: none !important; width: 28px; height: 24px; display: grid; place-items: center; padding: 0; border: 0; background: transparent; color: inherit; }
  .grid-btn svg { display: block; width: 22px; height: 22px; overflow: visible; }
  .grid-btn path { fill: none; stroke: currentColor; stroke-width: 1.1; stroke-linecap: round; }
  :host([data-river]) { --nfg: #f5f2e7; --nsky: #21363c; }
  :host([data-river]) .bar { background: transparent; border-bottom-color: #f5f2e766; }

  .panel { background: var(--nsky); padding-top: 32px; padding-bottom: 40px; row-gap: 32px;
    max-height: calc(100vh - var(--bar-h, 32px)); overflow: auto; border-bottom: 1px solid var(--nfg); }
  .panel[hidden] { display: none; }
  /* the index: the projects in columns 1–4, the design column in 6–8, each flowing on its own */
  .projects { grid-column: 1 / 5; display: grid; grid-template-columns: subgrid; row-gap: 32px; align-content: start; }
  .panel section { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-content: start; }
  .sh { grid-column: 1 / -1; justify-self: start; margin-bottom: 16px; opacity: 1; }
  .sh b { font-weight: 400; margin-right: 8px; }
  .sh:hover, .sh.here { opacity: 1; }
  .panel ol { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; list-style: none; margin: 0; padding: 0; }
  .panel li { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; border-top: 1px solid var(--nfg); }
  .panel li:last-child { border-bottom: 1px solid var(--nfg); }
  .panel li a { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-items: baseline; padding: 6px 0; opacity: 1; min-width: 0; }
  .panel li a:hover, .panel li a.here { opacity: 1; }
  .panel .n { grid-column: 1 / 3; display: flex; align-items: center; font-size: var(--type-m, 16px); letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .panel li a.here .n::before { content: "→"; margin-right: 8px; }
  .panel .t { grid-column: 3 / -1; display: flex; align-items: center; gap: 8px; opacity: 1; white-space: nowrap; overflow: hidden; }
  .panel em { font-style: normal; }
  .g { display: inline-flex; align-items: center; margin-left: 16px; flex: none; vertical-align: middle; }
  .g.before { margin-left: 0; margin-right: 16px; }
  .g u { width: 5px; height: 5px; border: 1px solid var(--nfg); border-radius: 50%; }
  .g u + u { margin-left: 8px; position: relative; }
  .g u + u::before { content: ""; position: absolute; right: 100%; top: 50%; width: 8px; height: 1px; background: var(--nfg); }
  .g u:last-child { background: var(--nfg); }
  .g:has(u:hover) u:last-child { background: color-mix(in srgb, var(--nfg) 35%, transparent); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  .tooltip {
    position: fixed; z-index: 2147483647; width: max-content;
    max-width: min(34ch, calc(100vw - 16px)); padding: 5px 8px;
    border: 0; background: transparent; color: var(--nfg);
    font: 400 var(--type-s, 13px)/1.3 var(--type-font, Spectral, Georgia, "Times New Roman", serif); letter-spacing: .02em;
    overflow-wrap: anywhere; pointer-events: none;
  }
  .tooltip[hidden] { display: none; }

  /* the index's right side: the design tokens, live (columns 6–8, beside the projects) */
  .design { grid-column: 6 / -1; display: grid; grid-template-columns: subgrid; align-content: start; }
  .design .sh { margin: 0 0 16px; cursor: default; }
  .design ol { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; list-style: none; margin: 0; padding: 0; }
  .design li { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-items: center; min-height: 32px; padding: 4px 0; border-top: 1px solid var(--nfg); }
  .design li:last-child { border-bottom: 1px solid var(--nfg); }
  .design li.h { border-top: 0; min-height: 0; padding: 24px 0 8px; }
  .design li.h + li { border-top: 1px solid var(--nfg); }
  .design .k { grid-column: 1; }
  .design .v { grid-column: 2 / -1; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
  .design output { flex: none; width: 6ch; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .design input[type=range] { -webkit-appearance: none; appearance: none; flex: 1; min-width: 40px; height: 20px; margin: 0; padding: 0; background: transparent; cursor: var(--cursor, pointer); }
  .design input[type=range]::-webkit-slider-runnable-track { height: 1px; background: var(--nfg); }
  .design input[type=range]::-moz-range-track { height: 1px; background: var(--nfg); }
  .design input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 2px; height: 14px; margin-top: -7px; background: var(--nfg); border: 0; border-radius: 0; }
  .design input[type=range]::-moz-range-thumb { width: 2px; height: 14px; background: var(--nfg); border: 0; border-radius: 0; }
  .design input:focus-visible { outline: 1px solid var(--nfg); outline-offset: 3px; }
  /* the palette: rounds, like the versions; the chosen one ringed */
  .sw { flex: none; width: 15px; height: 15px; padding: 0; border: 1px solid var(--nfg); border-radius: 50%; background: var(--c); }
  .sw[aria-pressed="true"] { outline: 1px solid var(--nfg); outline-offset: 2px; }
  input.sw { -webkit-appearance: none; appearance: none; inline-size: 15px; block-size: 15px; cursor: var(--cursor, pointer); }
  input.sw::-webkit-color-swatch-wrapper { padding: 0; }
  input.sw::-webkit-color-swatch { border: 0; border-radius: 50%; }
  input.sw::-moz-color-swatch { border: 0; border-radius: 50%; }
  .design .btn { font-size: var(--type-s, 13px); }
  .design .font { font-size: var(--type-s, 13px); }
  /* the grid over the whole page: the columns tinted, the margins left clear */
  .gridlines { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
  .gridlines[hidden] { display: none; }
  .gridlines i { display: block; height: 100%; background: color-mix(in srgb, var(--c-sun, #ff4500) 14%, transparent); }
  @media (max-width: 600px) {
    .crumbs { grid-column: 1 / 5; }
    .vg { grid-column: 5 / 7; gap: 8px; }
    .design { grid-column: 1 / -1; }
    .design .k { grid-column: 1 / 3; }
    .design .v { grid-column: 3 / -1; }
    .tools { grid-column: 7 / -1; }
    .pg, .info, .warn, .latest, .steps { display: none; }
    ol.v li + li::before { width: 8px; }
    :host([data-fork]) ol.v li:not(.fork):not(:nth-last-child(2)) { display: none; }   /* no room: the last of the line, and its fork */
    .projects { grid-column: 1 / -1; }
    .panel .n { grid-column: 1 / 5; }
    .panel .t { grid-column: 5 / -1; }
  }
  @media (max-width: 600px) and (min-width: 0) { .tools { gap: 4px; } .btn { padding: 4px 6px; } }
  @media (prefers-reduced-motion: reduce) { .dot { transition: none; } }
</style>
<div class="wrap${past ? " past" : ""}">
  <nav class="bar cols" aria-label="${BRAND}">
    <div class="crumbs">${crumbs.join("")}</div>
    <div class="vg">${vs.length > 1 ? `
      <ol class="v" aria-label="versions">${vs.slice(0, trunk).map((v, i) => `<li>${vDot(v, i)}</li>`).join("")}${fork ? forkLanes : ""}</ol>
      <span class="info" aria-hidden="true">${vLabel(cur)}</span>
      ${past ? `<a class="latest" href="${vHref(vs[vs.length - 1])}">latest →</a>` : ""}` : ""}
      <button class="btn dev" type="button" aria-pressed="false" hidden>dev</button>
      ${local ? `<span class="warn" title="pages that load data need a local server: double-click open-locally.command">local file</span>` : ""}
    </div>
    <div class="tools">
      ${prev ? `<span class="steps">
        <a class="step" href="${pHref(prev)}" data-name="‹ ${esc(prev.name)}" aria-label="previous: ${esc(prev.name)}">‹</a>
        <a class="step" href="${pHref(next)}" data-name="${esc(next.name)} ›" aria-label="next: ${esc(next.name)}">›</a>
        <span class="step-name" aria-hidden="true" hidden></span></span>` : ""}
      <button class="btn grid-btn" type="button" aria-pressed="false" aria-label="switch to river navigation (R)"><svg viewBox="0 0 24 24" aria-hidden="true"><path/><path/><path/><path/></svg></button>
      <button class="btn menu" type="button" aria-expanded="false" aria-controls="panel">index</button>
    </div>
  </nav>
  <div class="panel cols" id="panel" hidden><div class="projects">${panel}</div>${designColumn}</div>
</div>
<div class="gridlines cols" aria-hidden="true" hidden></div>

<div class="tooltip" id="cabz-tooltip" role="tooltip" hidden></div>
`;
  // the bar lives on <html>, outside <body>, so it stays put whatever the page does
  document.documentElement.appendChild(host);
  // the bar resets everything (all: initial), cursor too: where the drawn cursor runs, keep the system one hidden
  if (!plainCursor) host.style.cursor = "var(--cursor-arrow, auto)";   // the system arrow (cursor.css), like the page
  // highlighted text, on every page: no block of colour, the type turns the sun's orange with a black shadow at its bottom left
  if (!document.querySelector("style[data-cabz-selection]")) {
    const selection = document.createElement("style");
    selection.setAttribute("data-cabz-selection", "");
    // one pixel: the shadow touches the letters with no gap, as thin as it gets
    selection.textContent = "::selection{background:transparent;color:#FF4500;text-shadow:-1px 1px 0 #222222}";
    document.head.appendChild(selection);
  }

  // Resolve body/root colours instead of assuming every project uses --bg.
  // Dark projects use a readable purple even when their own text is white.
  const rgba = (value) => {
    const channels = value.match(/[\d.]+/g)?.map(Number);
    return channels?.length >= 3 ? [...channels.slice(0, 3), channels[3] ?? 1] : [0, 0, 0, 0];
  };
  const blend = (top, below) => top.slice(0, 3).map((v, i) => v * top[3] + below[i] * (1 - top[3]));
  let themeFrame = 0;
  const syncTheme = () => {
    themeFrame = 0;
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const rootColor = rgba(rootStyle.backgroundColor), bodyColor = rgba(bodyStyle.backgroundColor);
    const fallback = rootStyle.colorScheme.includes("dark") ? [0, 0, 0] : [255, 255, 255];
    const rootSurface = blend(rootColor, fallback);
    const surface = blend(bodyColor, rootSurface);
    const linear = surface.map((v) => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    host.toggleAttribute("data-dark", luminance < .12);
    document.documentElement.classList.toggle("cabz-cursor-dark", luminance < .12 && !document.body.classList.contains("home"));
    const colour = `rgb(${surface.map(Math.round).join(",")})`;
    if (host.style.getPropertyValue("--nav-bg") !== colour) host.style.setProperty("--nav-bg", colour);
    // Some fullscreen projects reserve 32px on a transparent html canvas. Fill
    // only that gap with their page colour so purple never sits on a white strip.
    host.toggleAttribute("data-surface", rootColor[3] < 1 || surface.some((v, i) => Math.abs(v - rootSurface[i]) > 1));
  };
  const scheduleTheme = () => { if (!themeFrame) themeFrame = requestAnimationFrame(syncTheme); };
  const themeObserver = new MutationObserver(scheduleTheme);
  for (const el of [document.documentElement, document.body]) {
    themeObserver.observe(el, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  }
  addEventListener("load", scheduleTheme);
  document.addEventListener("transitionend", scheduleTheme, true);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", scheduleTheme);
  syncTheme();

  // full-screen projects start below the bar instead of under it: <body> becomes the
  // viewport for their fixed layers (the transform makes it their containing block)
  const off = project && project.offset;
  if (off === true || (Array.isArray(off) && off.includes(page))) {
    const st = document.createElement("style");
    st.textContent = `html{height:100%;padding-top:${fork ? 48 : 32}px!important;box-sizing:border-box!important}` +
      "body{height:100%!important;min-height:0!important;transform:translateZ(0)}";
    document.head.appendChild(st);
  }

  const wrap = sh.querySelector(".wrap");
  const menu = sh.querySelector(".menu");
  const pnl = sh.querySelector(".panel");
  const info = sh.querySelector(".info");
  const isOpen = () => !pnl.hidden;
  const setMenu = (open) => {
    pnl.hidden = !open;
    menu.setAttribute("aria-expanded", String(open));
    if (open) { const h = sh.querySelector(".panel a.here") || sh.querySelector(".panel a"); if (h) h.focus({ preventScroll: true }); }
  };

  menu.addEventListener("click", () => setMenu(!isOpen()));

  // dev options: a project marks its own with data-dev (any element; on <body> when they only exist in
  // its script). Then the bar shows "dev" after the version, which shows and hides them; the page hears
  // it as the cabz-dev class on <html> and a cabz:dev event ({ detail: { on } }). Remembered per project.
  const devBtn = sh.querySelector(".dev");
  // an older version can't carry data-dev itself: projects.json lists its dev-only parts ("dev": {"v04": ["#gauge"]})
  for (const sel of (vs[cur] && vs[cur].dev) || []) document.querySelectorAll(sel).forEach((el) => el.setAttribute("data-dev", ""));
  if (document.querySelector("[data-dev]")) {
    const devKey = "cabz-dev:" + (project ? project.id : path);
    const hideDev = document.createElement("style");
    hideDev.textContent = "html:not(.cabz-dev) [data-dev]:not(html, body) { display: none !important; }";
    document.head.appendChild(hideDev);
    const setDev = (on, save) => {
      document.documentElement.classList.toggle("cabz-dev", on);
      devBtn.setAttribute("aria-pressed", String(on));
      if (save) try { if (on) localStorage.setItem(devKey, "1"); else localStorage.removeItem(devKey); } catch {}
      dispatchEvent(new CustomEvent("cabz:dev", { detail: { on } }));
    };
    let saved = false;
    try { saved = localStorage.getItem(devKey) === "1"; } catch {}
    setDev(saved, false);
    devBtn.hidden = false;
    devBtn.addEventListener("click", () => setDev(devBtn.getAttribute("aria-pressed") !== "true", true));
  }

  // the design column (the index's right side): every control writes one token
  const gridlines = sh.querySelector(".gridlines");
  const designBox = sh.querySelector(".design");
  const px = (v) => parseFloat(v) || 0;
  const saveDesign = () => { try { localStorage.setItem(DESIGN_KEY, JSON.stringify(design)); } catch {} };
  const syncDesign = () => {
    applyTokens();
    const cols = Math.max(1, Math.min(48, Math.round(px(token("grid-cols")))));
    if (gridlines.children.length !== cols) gridlines.innerHTML = "<i></i>".repeat(cols);
    gridlines.hidden = !design.grid;
    designBox.querySelector("[data-show-grid]").setAttribute("aria-pressed", String(design.grid));
    designBox.querySelectorAll("input[type=range]").forEach((input) => {
      const v = token(input.dataset.token);
      input.value = px(v);
      input.nextElementSibling.textContent = input.dataset.token === "grid-cols" ? px(v) : px(v) + " px";
    });
    designBox.querySelectorAll("input[type=color]").forEach((input) => { input.value = token(input.dataset.token); });
    designBox.querySelectorAll("[data-font]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.font === token("type-font"))));
    designBox.querySelectorAll("[data-role]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === token(b.dataset.role))));
    dispatchEvent(new CustomEvent("cabz:design", { detail: { tokens: { ...TOKENS, ...design.tokens } } }));
  };
  const setToken = (k, v) => {
    if (String(v) === TOKENS[k]) delete design.tokens[k]; else design.tokens[k] = String(v);
    saveDesign(); syncDesign();
  };
  designBox.addEventListener("input", (e) => {
    const input = e.target, k = input.dataset.token;
    if (!k) return;
    setToken(k, input.type === "range" && k !== "grid-cols" ? input.value + "px" : input.value);
  });
  designBox.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.matches("[data-show-grid]")) { design.grid = !design.grid; saveDesign(); syncDesign(); }
    else if (b.dataset.font) setToken("type-font", b.dataset.font);
    else if (b.dataset.role) setToken(b.dataset.role, b.dataset.value);
    else if (b.matches("[data-reset]")) { design.tokens = {}; saveDesign(); syncDesign(); }
    else if (b.matches("[data-copy]")) {
      // the :root block of tokens.css with these values, to paste there and make them the site's
      const css = ":root {\n" + Object.keys(TOKENS).map((k) => `  --${k}: ${token(k)};`).join("\n") + "\n}\n";
      navigator.clipboard?.writeText(css).then(() => { b.textContent = "copied"; setTimeout(() => { b.textContent = "copy css"; }, 1200); },
        () => { b.textContent = "copy failed"; });
    }
  });
  syncDesign();

  const gridBtn = sh.querySelector(".grid-btn");
  const modePaths = [...gridBtn.querySelectorAll("path")];
  const riverRhythms = [
    { frequency: 5.2, speed: 1.7, phase: .3, amplitude: 1.05 },
    { frequency: 7.1, speed: 1.17, phase: 2.4, amplitude: 1.35 },
    { frequency: 4.6, speed: 1.9, phase: 4.9, amplitude: 1.1 },
    { frequency: 6.3, speed: 1.43, phase: 1.2, amplitude: 1.3 }
  ];
  const homeModePage = document.body.classList.contains("home");
  if (!homeModePage) gridBtn.style.display = "none";
  const reduceIcon = matchMedia("(prefers-reduced-motion: reduce)");
  let riverMode = false, iconProgress = 1, iconFrame = 0, iconLast = 0, requestedMode = null;
  // the grid: the Swiss cross's outline, open at the four ends, nothing inside and no flag around it.
  // Its arms are 6 wide and 7 long (20 across), drawn 18 across here; each path is one arm's two sides,
  // so it can melt into one river line
  const ARM = 2.7, REACH = 9;
  const iconGrid = [0, 1, 2, 3].map(turn => t => {
    const [x, y] = t < .5 ? [-ARM, -ARM - (t / .5) * (REACH - ARM)] : [ARM, -REACH + ((t - .5) / .5) * (REACH - ARM)];
    const [c, s] = [[1, 0], [0, 1], [-1, 0], [0, -1]][turn];
    return [12 + x * c - y * s, 12 + x * s + y * c];
  });
  const drawModeIcon = now => {
    iconFrame = 0;
    const dt = Math.min((now - (iconLast || now)) / 1000, .04); iconLast = now;
    const target = riverMode ? 0 : 1;   // the icon shows where it takes you: the river from the grid, the grid from the river
    iconProgress = reduceIcon.matches ? target : iconProgress + (target - iconProgress) * (1 - Math.exp(-dt * 7));
    if (Math.abs(iconProgress - target) < .001) iconProgress = target;
    modePaths.forEach((path, i) => {
      const points = [];
      for (let k = 0; k <= 24; k++) {
        const t = k / 24, [gx, gy] = iconGrid[i](t);
        const rhythm = riverRhythms[i], clock = reduceIcon.matches ? 0 : now * .001;
        const wave = Math.sin(t * rhythm.frequency - clock * rhythm.speed + rhythm.phase) * rhythm.amplitude
          + Math.sin(t * 10.3 + clock * rhythm.speed * .61 + rhythm.phase * 1.7) * .28;
        const rx = 6 + i * 5.4 - t * 7 + wave, ry = 2 + t * 20;
        // the arm's two sides are separate lines until it is (nearly) a river line
        points.push(`${!k || (k === 12 && iconProgress < .98) ? 'M' : 'L'}${(gx + (rx - gx) * iconProgress).toFixed(2)} ${(gy + (ry - gy) * iconProgress).toFixed(2)}`);
      }
      path.setAttribute("d", points.join(' '));
    });
    if ((!reduceIcon.matches && !riverMode && !document.hidden) || iconProgress !== target) iconFrame = requestAnimationFrame(drawModeIcon);
  };
  const syncMode = mode => {
    riverMode = mode === "river";
    host.toggleAttribute("data-river", riverMode);
    gridBtn.setAttribute("aria-pressed", String(riverMode));
    gridBtn.setAttribute("aria-label", `switch to ${riverMode ? 'grid' : 'river'} navigation (R)`);
    if (!iconFrame) { iconLast = 0; iconFrame = requestAnimationFrame(drawModeIcon); }
  };
  const toggleNavigation = () => {
    if (!homeModePage) return;
    if (window.RiverExperiment) window.RiverExperiment.toggle();
    else { requestedMode = requestedMode === 'river' ? 'grid' : 'river'; syncMode(requestedMode); }
  };
  gridBtn.addEventListener("click", toggleNavigation);
  addEventListener("cabz:navigation-mode", event => syncMode(event.detail.mode));
  // cmd/ctrl+R reloads the page into the other mode; the URL wins over storage, so it carries the mode too
  const reloadInto = mode => {
    try { localStorage.setItem('cabz-navigation-mode', mode); } catch {}
    const url = new URL(location.href);
    url.searchParams.set('mode', mode);
    location.replace(url);
  };
  addEventListener("keydown", event => {
    const target = event.composedPath()[0];
    if (event.key.toLowerCase() !== 'r' || event.repeat || event.altKey || target?.isContentEditable || target?.matches?.('input,textarea,select')) return;
    if (event.metaKey || event.ctrlKey) {
      if (!homeModePage) return;
      event.preventDefault(); reloadInto(riverMode ? 'grid' : 'river');
      return;
    }
    event.preventDefault(); toggleNavigation();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !iconFrame) { iconLast = 0; iconFrame = requestAnimationFrame(drawModeIcon); } });
  if (homeModePage) iconFrame = requestAnimationFrame(drawModeIcon);
  if (homeModePage) {
    const riverCSS = document.createElement("link"); riverCSS.rel = "stylesheet"; riverCSS.href = root + "river/river.css"; document.head.append(riverCSS);
    const configScript = document.createElement("script"); configScript.src = root + "river/config.js";
    configScript.onload = () => {
      const experiment = document.createElement("script"); experiment.src = root + "river/river.js";
      experiment.onload = () => { if (requestedMode) window.RiverExperiment.setMode(requestedMode); syncMode(window.RiverExperiment.mode); };
      document.head.append(experiment);
    };
    document.head.append(configScript);
  }
  addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) { setMenu(false); menu.focus(); } });
  document.addEventListener("pointerdown", (e) => { if (isOpen() && !e.composedPath().includes(host)) setMenu(false); });

  if (info) {
    sh.querySelectorAll(".dot").forEach((d) => {
      const show = () => { info.innerHTML = vLabel(+d.dataset.i); };
      d.addEventListener("pointerenter", show);
      d.addEventListener("focus", show);
    });
    sh.querySelector("ol.v").addEventListener("pointerleave", () => { info.innerHTML = vLabel(cur); });
  }


  // The index pages link to a project's folder; a project with versions in folders of their own opens on the latest
  if (!project) {
    const folders = new Map();
    for (const s of S.sections) for (const p of s.projects) if (p.href !== p.id + "/") folders.set(root + p.id + "/", url(p.href));
    document.querySelectorAll("a[href]").forEach((a) => {
      const latest = folders.get(a.href.replace(/index\.html$/, ""));
      if (latest) a.href = latest;
    });
  }

  // Project selection pages keep version links; the homepage stays uncluttered.
  document.querySelectorAll("body:not(.home) .list > li[data-project]").forEach((el) => {
    const meta = el.querySelector(".meta");
    let p;
    for (const s of S.sections) for (const q of s.projects) if (q.id === el.dataset.project) p = q;
    if (!meta || !p) return;
    const includeSingle = p.id.startsWith(PP + "/");
    if (!includeSingle && p.versions.length < 2) return;
    const versions = p.versions.length ? p.versions : [{ live: true, href: p.href, msg: p.title }];
    const g = document.createElement("span");
    g.className = "vers";
    g.innerHTML = versions.map((v, i) => {
      const href = v.href ? url(v.href) : url(p.id + "/" + (v.live ? "" : "_v/" + v.id + "/"));
      const description = versionText(v, i);
      return `<a href="${href}" data-tooltip="${esc(description)}" aria-label="${esc(description)}"><i></i></a>`;
    }).join("");
    meta.prepend(g);
  });
  const ppMetas = [...document.querySelectorAll("body.pp-index .list .meta")];
  const ppWidth = Math.max(0, ...ppMetas.map((m) => m.getBoundingClientRect().width));
  ppMetas.forEach((m) => { m.style.minWidth = ppWidth + "px"; });

  // Over a version dot (the bar's, the index's, the menu's), on every page: the cursor is a round the dot's
  // size, in its colour. A system cursor, like the arrow and hand: the image is made once, the first time a
  // dot of that size and colour is reached, and the system draws it from then on, so it never lags.
  // Listened for in the bar's own root too: from one of its dots to the next, the pointer never leaves the bar,
  // so the document hears nothing (only the first dot reached would turn round)
  const rounds = new Map();
  const roundCursor = (event) => {
    const el = event.composedPath()[0]?.closest?.("ol.v .dot, .g u, .vers a");
    if (!el) return;
    const dot = el.matches(".vers a") ? el.querySelector("i") : el;
    const d = dot.getBoundingClientRect().width, color = getComputedStyle(dot).borderTopColor, key = d + color;
    if (!rounds.has(key)) {
      const w = 2 * Math.ceil(d / 2);   // even, so the centre (the hot spot) falls on a whole pixel
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}"><circle cx="${w / 2}" cy="${w / 2}" r="${d / 2}" fill="${color}"/></svg>`;
      rounds.set(key, `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${w / 2} ${w / 2}, pointer`);
    }
    el.style.cursor = rounds.get(key);
  };
  document.addEventListener("pointerover", roundCursor);
  sh.addEventListener("pointerover", roundCursor);

  const stepName = sh.querySelector(".step-name");
  sh.querySelectorAll(".step").forEach((a) => {
    const show = () => { stepName.textContent = a.dataset.name; stepName.hidden = false; };
    const hide = () => { stepName.hidden = true; };
    a.addEventListener("pointerenter", show); a.addEventListener("focus", show);
    a.addEventListener("pointerleave", hide); a.addEventListener("blur", hide);
  });
  // nothing pops up at the pointer along the bar: the versions already show in the bar itself
  sh.querySelectorAll("nav.bar [title], nav.bar [data-tooltip]").forEach((el) => { el.removeAttribute("title"); el.removeAttribute("data-tooltip"); });

  // Custom hints replace native title tooltips, with no timers or fade-in delay.
  for (const root of [sh, document.querySelector(".list")]) {
    root?.querySelectorAll("[title]").forEach((el) => {
      el.dataset.tooltip = el.getAttribute("title");
      el.removeAttribute("title");
    });
  }
  const tooltip = sh.querySelector(".tooltip");
  let hintTarget = null, priorDescription = null;
  const hideHint = () => {
    if (hintTarget) {
      if (priorDescription === null) hintTarget.removeAttribute("aria-describedby");
      else hintTarget.setAttribute("aria-describedby", priorDescription);
    }
    hintTarget = null; priorDescription = null;
    tooltip.hidden = true;
  };
  const positionHint = (x, y) => {
    const box = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(8, Math.min(x + 12, innerWidth - box.width - 8)) + "px";
    tooltip.style.top = Math.max(8, Math.min(y - box.height - 12, innerHeight - box.height - 8)) + "px";
  };
  const showHint = (event) => {
    const target = event.composedPath().find((el) => el instanceof Element && el.hasAttribute("data-tooltip"));
    if (!target || target === hintTarget) return;
    hideHint();
    hintTarget = target;
    priorDescription = target.getAttribute("aria-describedby");
    target.setAttribute("aria-describedby", [priorDescription, "cabz-tooltip"].filter(Boolean).join(" "));
    tooltip.textContent = target.dataset.tooltip;
    tooltip.hidden = false;
    tooltip.style.left = "0px"; tooltip.style.top = "0px";
    const anchor = target.getBoundingClientRect();
    const pointer = event.type.startsWith("pointer");
    positionHint(pointer ? event.clientX : anchor.left, pointer ? event.clientY : anchor.top);
  };
  const leaveHint = (event) => {
    if (hintTarget && !hintTarget.contains(event.relatedTarget)) hideHint();
  };
  for (const root of [document, sh]) {
    root.addEventListener("pointerover", showHint);
    root.addEventListener("pointerout", leaveHint);
    root.addEventListener("pointermove", (event) => {
      if (hintTarget && !tooltip.hidden) positionHint(event.clientX, event.clientY);
    });
    root.addEventListener("focusin", showHint);
    root.addEventListener("focusout", leaveHint);
    root.addEventListener("pointerdown", hideHint);
  }
  addEventListener("resize", hideHint);
  addEventListener("scroll", hideHint, true);
  addEventListener("keydown", (event) => { if (event.key === "Escape") hideHint(); });
})();

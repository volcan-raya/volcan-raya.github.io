// The soup: the notes, their balls, a note opened, the composer, the voice, the name and who is here; and the soup's
// colour, its part of the picture (field.js). It makes its own DOM and its own DEV rows (tabs soup and text); the frame
// loop (core.js) and the pointer (camera.js) call it. What the files say to each other is in core.js.
(() => {
"use strict";
const { rand, clamp, lerp, smooth, $, reduce, store, UP, imgSrc, getJSON } = V;
const C = V.camera, VO = V.volcano;

// ================= its DOM =================
document.body.insertAdjacentHTML("beforeend", `
<div id="notes" class="sr" role="list" aria-label="the notes"></div>
<div id="composer" data-ui hidden></div>
<div id="idPanel" role="dialog" aria-label="Your name" data-ui hidden>
  <p>Stay anonymous, or take a name and lock it with a secret code. Others see your name with a signature made from the code. The code never leaves this browser.</p>
  <label for="nm">name<input id="nm" maxlength="20" autocomplete="off"></label>
  <label for="cd">secret code<input id="cd" type="password" maxlength="40" autocomplete="off"></label>
  <span id="preview">anonymous</span>
  <div class="row">
    <button id="keep" class="pill go" type="button">keep this name</button>
    <button id="anon" class="pill" type="button">stay anonymous</button>
  </div>
  <label for="lang">you speak<select id="lang">
    <option value="en-US">english</option>
    <option value="es-ES">español</option>
    <option value="fr-FR">français</option>
  </select></label>
</div>`);
// DEV: this file's rows, in the tabs "soup" and "text" (core.js makes the tabs)
V.dev.tab("soup", `
  <div class="full seg" role="group" aria-label="How a seen ball looks">
    <span class="k">seen balls</span>
    <button class="t" type="button" data-seen="fill">black</button>
    <button class="t" type="button" data-seen="outline">outline</button>
    <button class="t" type="button" data-seen="outline-black">outline black</button>
  </div>
  <span class="full"><span class="k">here </span><span id="here">…</span></span>
  <label class="full"><span class="k">replies: size of a ball </span><span id="satV"></span><input type="range" id="satSize" min="10" max="100" step="1"></label>
  <label class="full"><span class="k">replies: how far they go round </span><span id="orbV"></span><input type="range" id="orbSize" min="30" max="400" step="5"></label>

  <span><span class="k">notes </span><span id="count"></span></span>
  <span><span class="k">memory </span><span id="mem"></span></span>
  <span class="full"><span class="k">name </span><button class="t" id="devWho" type="button"></button></span>
  <span class="full"><button class="t" id="devUnread" type="button">reset seen / unseen</button></span>
  <div class="full seg" role="group" aria-label="Voice input">
    <button class="t" type="button" data-vm="real" aria-pressed="true">real</button>
    <button class="t" type="button" data-vm="debug" aria-pressed="false">debug</button>
  </div>
  <div class="full meter" id="meter" aria-hidden="true"><span id="level"></span></div>
  <label class="full" id="intBox" hidden><span class="k">intensity of typed notes </span><span id="intVal">25</span><input type="range" id="intensity" min="0" max="100" value="25"></label>
`);
V.dev.tab("text", `
  <div class="full seg" role="group" aria-label="Open a note of this kind">
    <span class="k">try</span>
    <button class="t" type="button" data-try="text">text</button>
    <button class="t" type="button" data-try="image">picture</button>
    <button class="t" type="button" data-try="voice">voice</button>
  </div>
  <label class="full"><span class="k">type size </span><span data-v="fs"></span><input type="range" data-big="fs" min="2" max="60" step=".5"></label>
  <label class="full"><span class="k">line height </span><span data-v="lh"></span><input type="range" data-big="lh" min=".7" max="1.5" step=".01"></label>
  <label class="full"><span class="k">signature size </span><span data-v="sig"></span><input type="range" data-big="sig" min="8" max="40" step="1"></label>
  <div class="full seg" role="group" aria-label="Text size">
    <span class="k">text</span>
    <button class="t" type="button" data-bigset="tsize" data-val="fixed">at its size</button>
    <button class="t" type="button" data-bigset="tsize" data-val="fit">shrink to fit</button>
  </div>
  <label class="full"><span class="k">margin, sides </span><span data-v="side"></span><input type="range" data-big="side" min="0" max="400" step="1"></label>
  <label class="full"><span class="k">margin, top and bottom </span><span data-v="tb"></span><input type="range" data-big="tb" min="0" max="400" step="1"></label>
  <div class="full seg" role="group" aria-label="Ink of an opened note">
    <span class="k">ink</span>
    <button class="t" type="button" data-bigset="ink" data-val="black">black</button>
    <button class="t" type="button" data-bigset="ink" data-val="white">white</button>
    <button class="t" type="button" data-bigset="ink" data-val="red">red</button>
  </div>
  <div class="full seg" role="group" aria-label="How a picture fills the box">
    <span class="k">picture</span>
    <button class="t" type="button" data-bigset="fit" data-val="contain">whole</button>
    <button class="t" type="button" data-bigset="fit" data-val="cover">fill</button>
  </div>
  <label class="full"><span class="k">voice: height of the tallest bar </span><span data-v="wh"></span><input type="range" data-big="wh" min="3" max="100" step="1"></label>
  <label class="full"><span class="k">voice: how many bars </span><span data-v="bars"></span><input type="range" data-big="bars" min="20" max="240" step="1"></label>
  <label class="full"><span class="k">voice: width of a bar </span><span data-v="bw"></span><input type="range" data-big="bw" min="1" max="40" step="1"></label>
  <div class="full seg" role="group" aria-label="What a voice shows">
    <span class="k">voice</span>
    <button class="t" type="button" data-bigset="vw" data-val="off">wave</button>
    <button class="t" type="button" data-bigset="vw" data-val="on">+ words</button>
  </div>
  <div class="full seg" role="group" aria-label="Show the box">
    <span class="k">box</span>
    <button class="t" type="button" data-bigset="show" data-val="off">hidden</button>
    <button class="t" type="button" data-bigset="show" data-val="on">outlined</button>
  </div>`);
const marks = V.marks, notesEl = $("notes");
// an opened note: one layer in the scene, over the field and under the badges, that never takes the pointer
const bigEl = document.createElement("div");
bigEl.id = "big"; bigEl.setAttribute("aria-live", "polite");
bigEl.innerHTML = '<canvas class="viz" aria-hidden="true"></canvas><div class="box"><img class="pic" alt=""><p class="words"></p><p class="sig"></p></div>';
$("field").after(bigEl);
let dev = false;
addEventListener("cabz:dev", e => { dev = !!e.detail.on; if (typeof applyBig === "function") applyBig(); });   // the "dev" square in the site bar (nav.js)

// ================= who is here =================
// counted with playhtml (index.html): presence clears when a person leaves
{
  const hereEl = $("here"), hereText = n => n === 0 ? "no one else" : n === 1 ? "one other" : `${n} others`;
  (async () => {
    const ph = await window.playhtmlReady;
    let pr = null;
    try { pr = ph && ph.presence; } catch {}
    if (!pr) { hereEl.textContent = "can't tell"; return; }
    pr.setMyPresence("here", { t: Date.now() });
    const show = () => { let n = 0; for (const [, e] of pr.getPresences()) if (!e.isMe && e.here) n++; hereEl.textContent = hereText(n); };
    pr.onPresenceChange("here", show);
    setInterval(show, 2000);   // also notices people who leave
    show();
  })();
}

// ================= identity: name + secret code (tripcode) =================
let me = { name: "", trip: "" };
try { const s = JSON.parse(localStorage.getItem("volcano-id") || "null"); if (s && s.name && s.trip) me = s; } catch {}
const ALPH = "abcdefghjkmnpqrstuvwxyz23456789";
async function tripcode(name, code) {
  const data = new TextEncoder().encode(name + "#" + code);
  let bytes;
  try { bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", data)); }
  catch { let h = 2166136261; for (const b of data) h = Math.imul(h ^ b, 16777619); bytes = new Uint8Array(new Uint32Array([h, h * 31, h * 17]).buffer); }
  return [...bytes.slice(0, 6)].map(b => ALPH[b % ALPH.length]).join("");
}
const signature = (name, trip) => name ? `${name} ◆${trip}` : "anonymous";
const idPanel = $("idPanel"), nm = $("nm"), cd = $("cd"), preview = $("preview"), langSel = $("lang");
const ICON_YOU = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4"/></svg>';
function showWho() {
  for (const b of document.querySelectorAll(".you")) {
    b.classList.toggle("named", !!me.name);
    if (me.name) b.textContent = me.name; else b.innerHTML = ICON_YOU;
    b.title = signature(me.name, me.trip);
  }
  $("devWho").textContent = signature(me.name, me.trip);
}
let idFrom = null;
function openId(from) {
  idFrom = from; idPanel.hidden = false;
  document.querySelectorAll(".you").forEach(b => b.setAttribute("aria-expanded", "true"));
  nm.value = me.name; cd.value = ""; updatePreview(); nm.focus({ preventScroll: true });
}
function closeId() {
  if (idPanel.hidden) return;
  idPanel.hidden = true;
  document.querySelectorAll(".you").forEach(b => b.setAttribute("aria-expanded", "false"));
  if (idFrom && idFrom.isConnected) idFrom.focus({ preventScroll: true });
  idFrom = null;
}
async function updatePreview() {
  const n = nm.value.trim();
  preview.textContent = n && cd.value ? signature(n, await tripcode(n, cd.value)) : n ? `${n} ◆ needs a code` : "anonymous";
  $("keep").disabled = !(n && cd.value);
}
nm.addEventListener("input", updatePreview); cd.addEventListener("input", updatePreview);
$("keep").addEventListener("click", async () => {
  const n = nm.value.trim(); if (!n || !cd.value) return;
  me = { name: n, trip: await tripcode(n, cd.value) };
  try { localStorage.setItem("volcano-id", JSON.stringify(me)); } catch {}
  closeId(); showWho();
});
$("anon").addEventListener("click", () => {
  me = { name: "", trip: "" };
  try { localStorage.removeItem("volcano-id"); } catch {}
  closeId(); showWho();
});
// the language speech is heard in
let lang = store.get("volcano-lang", null) || ({ es: "es-ES", fr: "fr-FR" }[(navigator.language || "en").slice(0, 2)] || "en-US");
langSel.value = lang;
langSel.addEventListener("change", () => { lang = langSel.value; store.set("volcano-lang", lang); if (listening) { const c = micComp; stopMic(); startMic(c); } });

// ================= notes: the same as v05's, kept in ../sentences.json =================
// Reading: ../api.php?kind=sentences (shared, can write) → ../sentences.json (read-only) → a few built-in notes.
// New notes go to ../api.php, or stay in this browser when there is no api.php. A reply is a sentence with "re": <the note's id>.
// The keys in this browser are v05's too, so what was read there is read here.
const SENT_STARTERS = ["my landlord has ignored the leak in my ceiling for three weeks", "the 7:42 train was cancelled again", "deadline tomorrow, motivation somewhere in another country", "I said I'm fine eleven times today", "je déteste les lundis", "estoy harta de que me interrumpan", "my phone is at 3% and so am I", "why is adulthood mostly paperwork"];
const SENT_LOCAL_KEY = "lapilli-sentences-local";
// a post is one thing: a picture, a voice or a text. The notes are shared with the older versions, so what each one
// shows is decided here. A comment is always its words.
const mediumOf = volcanoNote.mediumOf;
const noteLabel = s => ({ image: "a picture", voice: "a voice" })[mediumOf(s)] || shortNote(s.s);
let sentences = [], replies = new Map(), sentMode = "none", sentLoaded = false, knownIds = new Set();
async function loadSentences() {
  let data = null;
  try { data = await getJSON(UP + "api.php?kind=sentences"); sentMode = "shared"; } catch {}
  if (!data) { try { data = await getJSON(UP + "sentences.json"); sentMode = "read-only"; } catch {} }
  const seen = new Set(), out = [];
  const add = o => {
    if (!o || typeof o.s !== "string" || (!o.s.trim() && !o.img) || seen.has(String(o.id))) return;
    seen.add(String(o.id));
    out.push({ id: String(o.id), s: o.s.trim().slice(0, 240), t: Number(o.t) || 0,
      name: typeof o.name === "string" ? o.name.slice(0, 20) : "", trip: typeof o.trip === "string" ? o.trip.slice(0, 8) : "",
      i: Number.isFinite(o.i) ? clamp(o.i, 0, 1) : null, re: typeof o.re === "string" ? o.re : null,
      medium: ["voice", "text", "image"].includes(o.medium) ? o.medium : "text",
      img: typeof o.img === "string" && /^(perref\/|uploads\/|data:image\/)/.test(o.img) ? o.img : null });
  };
  (Array.isArray(data?.sentences) ? data.sentences : []).forEach(add);
  if (sentMode !== "shared") { try { JSON.parse(localStorage.getItem(SENT_LOCAL_KEY) || "[]").forEach(add); } catch {} }
  if (!out.some(s => !s.re)) SENT_STARTERS.forEach((t, i) => add({ id: "q" + (i + 1), s: t }));
  if (sentLoaded) {                            // notes and replies from other people add to the pressure too
    const fresh = out.filter(s => !knownIds.has(s.id));
    VO.addPressure(VO.PER_NOTE * fresh.reduce((a, s) => a + (s.re ? .5 : 1), 0));
  }
  knownIds = new Set(out.map(s => s.id));
  sentences = out.filter(s => !s.re);
  replies = new Map();
  for (const r of out.filter(s => s.re).sort((a, b) => a.t - b.t)) addReply(r);
  sentLoaded = true;
  syncBadges(); showStatus();
}
function addReply(r) { if (!replies.has(r.re)) replies.set(r.re, []); replies.get(r.re).push(r); }
// medium: how it was made, "voice", "text" or "image" (img: a small jpeg as a data URL)
async function saveSentence(text, I, re = null, medium = "text", img = null) {
  const t = String(text || "").trim().replace(/\s+/g, " ").slice(0, 240);
  if ((!t && !img) || t.split(" ").length > 40) return;
  if (re) { medium = null; img = null; }       // replies are just words
  const i = I == null ? null : Math.round(clamp(I, 0, 1) * 100) / 100;
  const o = { id: "l-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), s: t, t: Date.now(), name: me.name, trip: me.trip, i, re, medium, img };
  let saved = null;
  if (sentMode === "shared") {
    try {
      const r = await fetch(UP + "api.php?kind=sentences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ s: t, name: me.name, trip: me.trip, i, re, medium, img }) });
      const j = await r.json();
      if (r.ok && j && j.sentence) saved = { ...o, ...j.sentence };
    } catch {}
  }
  if (!saved) {
    try { const l = JSON.parse(localStorage.getItem(SENT_LOCAL_KEY) || "[]"); l.push(o); localStorage.setItem(SENT_LOCAL_KEY, JSON.stringify(l.slice(-300))); } catch {}
    saved = o;
  }
  keepMine(saved.id); knownIds.add(saved.id);
  if (re) { addReply(saved); syncBadges(saved.id); showStatus(); VO.addPressure(VO.PER_NOTE * .5); return saved; }
  if (!sentences.some(x => x.id === saved.id)) sentences.push(saved);
  syncBadges(saved.id); showStatus();
  VO.addPressure(VO.PER_NOTE * (.6 + .8 * (i ?? .5)));   // louder notes push harder
  return saved;
}
const MINE_KEY = "up-mine";                    // what this browser wrote, to show it as yours in a chat
let mineIds = new Set();
try { mineIds = new Set(JSON.parse(localStorage.getItem(MINE_KEY) || "[]")); } catch {}
function keepMine(id) { mineIds.add(id); try { localStorage.setItem(MINE_KEY, JSON.stringify([...mineIds].slice(-500))); } catch {} }
function showStatus() {
  $("count").textContent = sentences.length.toLocaleString();
  $("mem").textContent = { shared: "shared", "read-only": "sentences.json + this browser" }[sentMode] || "this browser only";
}

// ================= the badges =================
// One per note, all of them the same real size: a disc of radius BR, in the chamber. Once opened it is "read" and its red
// fades to black. Seen through the red, the far ones are smaller, darker and softer, the near ones big and sharp. They
// drift slowly round homes of their own. Each reply is a ball of its own, smaller, going round its note on an orbit of
// its own: it can be heard, opened, read and picked up like any other, and let go it falls back into its orbit
const BR = .028, CH = { eye: VO.VOL.eye, Rc: VO.VOL.Rc, z0: C.z0 };
const badges = new Map();
let readMap = store.get("volcano-read", {}) || {};
const TAU = 6.2832;
// a reply's ball, against a note's, and how far out its orbit is (DEV, kept in this browser)
const sat = { size: 42, orbit: 100, ...(store.get("volcano-v12-sat", {}) || {}) };
const shortNote = s => !s ? "a picture" : s.length > 40 ? s.slice(0, 38).trimEnd() + "…" : s;
function hashStr(str) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; }
function seeded(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let birth = null;
function placeHome(b) {                        // the same place on every visit, seeded by the note's id
  const r = seeded(hashStr(b.s.id));
  const z = lerp(-CH.Rc * .92, CH.Rc * .9, r());
  // spread as wide as the view is from where you start, so they fill it at every depth, but always inside the chamber
  const hw = Math.min(.3 + Math.abs(z - CH.z0) * .62, Math.max(.3, Math.sqrt(Math.max(0, CH.Rc ** 2 - z * z)) * .9));
  const hh = Math.min(hw * .6, 1.2);
  b.hx = (r() * 2 - 1) * hw; b.hy = CH.eye + (r() * 1.8 - .8) * hh; b.hz = z;
}
function makeBadge(s) {
  const btn = document.createElement("button"); btn.type = "button"; btn.setAttribute("role", "listitem");
  const b = { s, btn, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, hx: 0, hy: 0, hz: 0, n: 0, read: false, readT: 0, shown: false,
    ph: rand(0, 6.28), sp: rand(.6, 1.25), hold: false, focus: false, ring: 0, sx: 0, sy: 0, R: 0, d: 0 };
  btn.addEventListener("click", () => openNote(b));
  btn.addEventListener("focus", () => { b.focus = b.hold = true; }); btn.addEventListener("blur", () => { b.focus = false; b.hold = hovered === b; });
  notesEl.append(btn);
  return b;
}
// a reply's orbit round its note: a radius (the later ones further out), a tilted plane and a speed, the same every visit
function orbitOf(b, i) {
  const r = seeded(hashStr(b.s.id + "~")), th = r() * TAU, ph = Math.acos(2 * r() - 1);
  const n = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
  const cross = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
  let u = cross(n, Math.abs(n[1]) < .9 ? [0, 1, 0] : [1, 0, 0]); const L = Math.hypot(...u); u = u.map(v => v / L);
  b.orb = { R: BR * (2.4 + 1.5 * Math.sqrt(i)) * (.9 + .25 * r()), u, v: cross(n, u), a0: r() * TAU,
    w: (r() < .5 ? -1 : 1) * (.22 + .2 * r()) / Math.sqrt(1 + i * .5) };
}
function setCount(b) {
  const n = b.parent ? 0 : replies.get(b.s.id)?.length || 0;
  const label = b.parent ? `a reply: ${shortNote(b.s.s)}` : n ? `${noteLabel(b.s)}, ${n} ${n === 1 ? "reply" : "replies"}` : noteLabel(b.s);
  if (label !== b.label) { b.label = label; b.btn.textContent = label; }
  // a reply already seen in a conversation (as it was before v11) counts as read
  b.read = (readMap[b.s.id] || 0) >= 1 || (!!b.parent && (readMap[b.parent.s.id] || 0) >= b.idx + 2);
  if (!b.shown) { b.readT = b.read ? 1 : 0; b.shown = true; }   // already read last time: black at once
}
// where you dropped a badge in the soup (this browser only): its home from then on
let placed = store.get("volcano-v09-placed", {}) || {};
function syncBadges(freshId) {
  const byId = new Map(sentences.map(s => [s.id, s]));
  for (const [id, b] of badges) if (!b.parent && !byId.has(id)) { b.btn.remove(); badges.delete(id); }
  for (const s of sentences) {
    let b = badges.get(s.id);
    if (!b) {
      b = makeBadge(s); badges.set(s.id, b); b.s = s; placeHome(b);
      const p = placed[s.id]; if (Array.isArray(p) && p.length === 3 && p.every(Number.isFinite)) [b.hx, b.hy, b.hz] = p;   // where it was dropped
      if (s.id === freshId && birth) { b.x = birth.x; b.y = birth.y; b.z = birth.z; birth = null; }   // what you just wrote leaves the send button, then sinks in
      else { b.x = b.hx; b.y = b.hy; b.z = b.hz; }
    }
    b.s = s; setCount(b);
  }
  // the replies, round their notes
  const want = new Map();
  for (const [pid, list] of replies) { const p = badges.get(pid); if (p && !p.parent) list.forEach((r, i) => want.set(r.id, [r, p, i])); }
  for (const [id, b] of badges) if (b.parent && !want.has(id)) { b.btn.remove(); badges.delete(id); }
  for (const [id, [r, p, i]] of want) {
    let b = badges.get(id);
    if (!b) {                                  // born from its note, then out to its orbit; yours, from the send button
      b = makeBadge(r); badges.set(id, b); b.parent = p; orbitOf(b, i);
      if (id === freshId && birth) { b.x = birth.x; b.y = birth.y; b.z = birth.z; birth = null; } else { b.x = p.x; b.y = p.y; b.z = p.z; }
    }
    b.s = r; b.parent = p; b.idx = i; setCount(b);
  }
  if (picked && !badges.has(picked.s.id)) closeNote();
}
function markRead(b) { readMap[b.s.id] = Math.max(1, readMap[b.s.id] || 0); store.set("volcano-read", readMap); setCount(b); }
// slow, wide drift round its home and a gentle bob, as if suspended in something thick
const driftOf = (b, t, calm) => [(Math.sin(t * .035 * b.sp + b.ph) * .2 + Math.sin(t * .011 + b.ph * 2) * .08) * calm,
  (Math.cos(t * .028 * b.sp + b.ph * 1.3) * .1 + Math.sin(t * .9 * b.sp + b.ph) * .01) * calm, Math.sin(t * .021 * b.sp + b.ph * 2.2) * .3 * calm];
function updateBadges(dt, t) {
  const calm = reduce.matches ? .5 : 1, exy = 1 - Math.exp(-dt / 1.1), ez = 1 - Math.exp(-dt / 1.6);
  for (const b of badges.values()) {
    b.readT = clamp(b.readT + (b.read ? dt : -dt) / 2, 0, 1);   // two seconds, as in v05
    if (b === picked) { b.vx = b.vy = b.vz = 0; continue; }   // open, it stays where it is; its replies go on round it
    if (b.fly > 0 && b !== grab?.b) {            // erupting: thrown up and out of the hole, to the sky; then it falls back to its home
      b.fly -= dt; b.vy += b.flyA * dt; b.vx *= Math.exp(-dt * .3); b.vz *= Math.exp(-dt * .3);
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; continue;
    }
    if (b.hold) { const k = Math.exp(-dt * 8); b.vx *= k; b.vy *= k; b.vz *= k; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; continue; }
    if (b.parent) {                            // round its note, pulled back to its orbit whenever it is thrown or let go
      const p = b.parent, o = b.orb, a = o.a0 + t * o.w * (reduce.matches ? .3 : 1), c = Math.cos(a), sn = Math.sin(a), k = 1 - Math.exp(-dt / .45), R = o.R * sat.orbit / 100;
      b.x += (p.x + (o.u[0] * c + o.v[0] * sn) * R - b.x) * k;
      b.y += (p.y + (o.u[1] * c + o.v[1] * sn) * R - b.y) * k;
      b.z += (p.z + (o.u[2] * c + o.v[2] * sn) * R - b.z) * k;
    } else {
    const [dx, dy, dz] = driftOf(b, t, calm), tx = b.hx + dx, ty = b.hy + dy, tz = b.hz + dz;
    // v06's exponential settling stays fluid at different frame rates; eruption impulses decay independently.
    b.x += (tx - b.x) * exy; b.y += (ty - b.y) * exy; b.z += (tz - b.z) * ez;
    }
    const damping = Math.exp(-dt * 1.3), impulse = (1 - damping) / 1.3;
    b.x += b.vx * impulse; b.y += b.vy * impulse; b.z += b.vz * impulse;
    b.vx *= damping; b.vy *= damping; b.vz *= damping;
  }
}
// where each badge is on the screen, far to near, so the near ones are drawn over the far ones
const NEAR = C.NEAR;
let vis = [];
function projectBadges() {
  vis = [];
  const cam = C.cam, { W, H } = V.size();
  if (cam.inside <= 0) return;
  for (const b of badges.values()) {
    const p = C.project(b.x, b.y, b.z);
    if (!p || p.d < NEAR) continue;
    const R = BR * p.k * (b.parent ? sat.size / 100 : 1);
    if (p.x + R < -40 || p.x - R > W + 40 || p.y + R < -40 || p.y - R > H + 40) continue;
    b.sx = p.x; b.sy = p.y; b.R = R; b.d = p.d; b.seen = cam.inside;
    vis.push(b);
  }
  vis.sort((a, c) => c.d - a.d);
}
// the one under a point: of all the discs that cover it, the closest; or else, so that even a speck can be picked,
// the one whose middle is nearest, within a finger's reach
function hitAt(x, y) {
  let best = null, near = null, nd = Infinity;
  for (const b of vis) {
    if (smooth(NEAR, .4, b.d) < .1) continue;   // passing the camera, it is all but gone
    const d = Math.hypot(x - b.sx, y - b.sy);
    if (d <= b.R + 1 && b.R >= 3 && (!best || b.d < best.d)) best = b;
    if (d <= Math.max(b.R, 10) + 3 && d < nd) { near = b; nd = d; }
  }
  return best || near;
}
const pick = (px, py) => C.cam.soup > .5 ? hitAt(px, py) : null;

// ================= drawing the inside =================
// what a notification plays under the pointer is in ../shared/notification.js
// red, or black once read: the deep red holds on the orange, where the interface's red would vanish
const DOT = [196, 0, 12], DOT_READ = [10, 3, 2];
// how a seen ball looks (DEV, soup; kept in this browser): its red going black ("fill"), or its fill giving way to a
// ring at its edge, red ("outline") or black ("outline-black"); either way over the same 2 s, and still whole to touch
let seenLook = ["fill", "outline", "outline-black"].includes(store.get("volcano-v12-seen", "fill")) ? store.get("volcano-v12-seen", "fill") : "fill";
function showSeen() { document.querySelectorAll("[data-seen]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.seen === seenLook))); store.set("volcano-v12-seen", seenLook); }
document.querySelectorAll("[data-seen]").forEach(b => b.addEventListener("click", () => { seenLook = b.dataset.seen; showSeen(); }));
showSeen();
function badgeColour(b) {
  const e = b.readT * b.readT * (3 - 2 * b.readT);
  return [lerp(DOT[0], DOT_READ[0], e), lerp(DOT[1], DOT_READ[1], e), lerp(DOT[2], DOT_READ[2], e)];
}
let hovered = null, lastDraw = 0;
// Over a ball the hand becomes a round the ball's size, in its colour, as over the versions in the bar (nav.js): a
// system cursor, each made once, so it never lags. Cursors can't be larger than 128 px: a nearer ball gets a 96 px round
const rounds = new Map();
function roundOver(b) {
  const w = 2 * Math.round(clamp(b.R, 4, 48)), rgb = (seenLook === "fill" ? badgeColour(b) : DOT).map(v => Math.round(v / 8) * 8), key = w + "," + rgb;
  if (!rounds.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}"><circle cx="${w / 2}" cy="${w / 2}" r="${w / 2}" fill="rgb(${rgb})"/></svg>`;
    rounds.set(key, `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${w / 2} ${w / 2}, pointer`);
  }
  return rounds.get(key);
}
function drawInside(x) {
  const now = performance.now(), dt = Math.min(now - lastDraw, 100) / 1000, TYPE = V.type(), { W } = V.size(); lastDraw = now;
  for (const b of vis) volcanoNote.draw(x, b, { rgb: seenLook === "fill" ? badgeColour(b) : DOT, seen: seenLook, alpha: smooth(NEAR, .4, b.d) * b.seen, type: TYPE, since: b === hovered ? now / 1000 - b.sigT0 : null, dt, imgSrc, count: false });
  x.globalAlpha = 1;
  // what it is, next to the one the keyboard is on
  const pk = [...badges.values()].find(b => b.focus);
  if (pk && vis.includes(pk) && pk.seen > .5) {
    x.font = `400 13px ${TYPE}`; x.textBaseline = "middle"; x.fillStyle = "#fff";
    const txt = noteLabel(pk.s), w = x.measureText(txt).width, flip = pk.sx + pk.R + 10 + w > W - 12;
    x.textAlign = flip ? "right" : "left";
    x.fillText(txt, flip ? pk.sx - pk.R - 10 : pk.sx + pk.R + 10, pk.sy);
  }
}

// ================= picking a badge up =================
// In the chamber a dot, with one finger or the mouse, is picked up and dropped where you let go, at its own depth (it
// stays there, in this browser)
let grab = null;
function drop() {
  const g = grab; grab = null; if (!g) return;
  const b = g.b; b.hold = hovered === b || b.focus;
  if (!g.on || b.parent) return;              // a reply goes back to its orbit
  const [dx, dy, dz] = driftOf(b, performance.now() / 1000, reduce.matches ? .5 : 1);
  placed[b.s.id] = [b.x, b.y, b.z]; store.set("volcano-v09-placed", placed);   // its home on the next visits
  b.hx = b.x - dx; b.hy = b.y - dy; b.hz = b.z - dz;   // and now, so it drifts on from where it was dropped
}
function pointerDown(px, py) {
  const b = hitAt(px, py);
  if (!b) return false;
  grab = { b, on: false, off: [px - b.sx, py - b.sy] }; b.hold = true;
  return true;
}
function pointerMove(px, py, dragged) {
  if (!grab) return false;
  if (dragged) grab.on = true;
  const b = grab.b, q = C.project(b.x, b.y, b.z);
  if (grab.on && q && q.d > NEAR) { [b.x, b.y, b.z] = C.unproject(px - grab.off[0], py - grab.off[1], q.d); b.vx = b.vy = b.vz = 0; }
  return true;
}
function hover(px, py) {
  const h = px == null ? null : pick(px, py);
  if (h !== hovered) { if (hovered && !hovered.focus) hovered.hold = false; hovered = h; if (h) { h.hold = true; h.sigT0 = performance.now() / 1000; } }
}
function click(px, py) {                        // a tap: a badge opens; anywhere else closes what is open
  const b = pick(px, py);
  if (b) openNote(b);
  else { if (!idPanel.hidden) closeId(); closeNote(); }
}

// ================= the composer =================
const ICON_MIC = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></svg>';
const ICON_SEND = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
let active = null;                             // the composer the mic writes into
const ICON_CLIP = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M17.5 11.2l-6.3 6.3a4.2 4.2 0 0 1-6-6l7.1-7.1a2.8 2.8 0 0 1 4 4l-7 7a1.4 1.4 0 0 1-2-2l6.4-6.4"/></svg>';
// the medium of what is sent: image if a picture is attached, voice if the mic was used, text otherwise
function makeComposer(host, placeholder, onSend, attach = false) {
  const form = document.createElement("form"); form.className = "bar";
  form.innerHTML = `<button type="button" class="round you" aria-label="your name" aria-expanded="false"></button>`
    + `<div class="fieldwrap${attach ? " with-clip" : ""}"><input class="msgfield" placeholder="${placeholder}" aria-label="${placeholder}" maxlength="240" autocomplete="off" enterkeyhint="send">`
    + (attach ? `<button type="button" class="clip" aria-label="attach a picture">${ICON_CLIP}</button><input type="file" accept="image/*" hidden>` : "") + `</div>`
    + `<button type="button" class="round mic" aria-label="talk" aria-pressed="false">${ICON_MIC}</button>`
    + `<button type="submit" class="round send" aria-label="send" hidden>${ICON_SEND}</button>`;
  host.append(form);
  const c = { form, wrap: form.querySelector(".fieldwrap"), input: form.querySelector(".msgfield"), you: form.querySelector(".you"), mic: form.querySelector(".mic"), send: form.querySelector(".send"), peak: null, spoke: false, img: null };
  if (attach) {
    const file = form.querySelector("input[type=file]"), att = document.createElement("div");
    att.className = "att"; att.hidden = true;
    att.innerHTML = '<img alt="the picture you are sending"><button type="button" aria-label="remove the picture">×</button>';
    host.insertBefore(att, form);
    c.att = att;
    form.querySelector(".clip").addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0]; file.value = "";
      if (!f) return;
      try { setPicture(c, await shrink(f)); } catch { hint(c, "that picture can't be read"); }
    });
    att.querySelector("button").addEventListener("click", () => { setPicture(c, null); c.input.focus({ preventScroll: true }); });
  }
  c.input.addEventListener("input", () => updateSend(c));
  c.input.addEventListener("focus", () => { active = c; });
  c.you.addEventListener("click", () => idPanel.hidden ? openId(c.you) : closeId());
  c.mic.addEventListener("click", () => { if (listening && micComp === c) stopMic(); else startMic(c); });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = c.input.value.trim(); if (!text && !c.img) return;
    if (listening && micComp === c) stopMic();
    const I = c.peak != null ? c.peak : dev && voiceMode === "debug" ? $("intensity").value / 100 : null;
    const img = c.img, medium = img ? "image" : c.spoke ? "voice" : "text";
    // sending, seen: the arrow is pulled down out of the red button, then the button itself goes into the soup as the ball
    const from = c.send.getBoundingClientRect(), wipe = !reduce.matches;
    c.going = wipe; if (wipe) c.send.classList.add("going");
    c.input.value = ""; c.peak = null; c.spoke = false; setPicture(c, null);
    if (wipe) await new Promise(r => setTimeout(r, 280));
    c.going = false; c.send.classList.remove("going"); updateSend(c);
    if (!c.mic.hidden) { c.mic.classList.remove("back"); void c.mic.offsetWidth; c.mic.classList.add("back"); }   // and the mic comes back once the ball has left
    await onSend(text, I, medium, img, wipe ? from : null);
  });
  return c;
}
// a picture, made small (160 px, a few KB) before it goes anywhere
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    let q = .8, d;
    do { d = cv.toDataURL("image/jpeg", q); q -= .15; } while (d.length > 78000 && q > .2);
    return d;
  } finally { URL.revokeObjectURL(url); }
}
function setPicture(c, data) {                  // a picture is the whole post: while there is one, nothing else can be written
  c.img = data;
  if (data) { if (listening && micComp === c) stopMic(); c.input.value = ""; c.spoke = false; c.peak = null; }
  c.wrap.hidden = !!data;
  if (c.att) {
    c.att.hidden = !data;
    if (data) c.att.querySelector("img").src = data;
  }
  updateSend(c);
}
function updateSend(c) {                        // as in Telegram: the mic becomes a send button once there is something to send
  const has = !!c.input.value.trim() || !!c.img || c.going, rec = listening && micComp === c;
  c.send.hidden = !has; c.mic.hidden = has && !rec;
}
const composerEl = $("composer"), coarse = matchMedia("(pointer: coarse)");
// one bar, always at the bottom while you are in the soup: "Vent" writes a note (or adds to your own, open); with
// someone else's note open, "Support" answers it
// the ball starts as the send button: where it was and as big on the screen, then sinks to its place in the soup
function bornFrom(r, k) {
  const o = marks.getBoundingClientRect(), R = r.width / 2, d = Math.max(NEAR * 1.5, BR * k * C.cam.F / R);
  const [x, y, z] = C.unproject(r.left - o.left + R, r.top - o.top + r.height / 2, d); birth = { x, y, z };
}
const mainComp = makeComposer(composerEl, "Vent", async (text, I, medium, img, from) => {
  const b = picked;
  if (from) bornFrom(from, b ? sat.size / 100 : 1);
  if (b) { await saveSentence(text, I, (b.parent || b).s.id); markRead(b); return; }   // a reply is just words, and joins the note's orbit
  await saveSentence(text, I, null, medium, img);
}, true);
const clipEl = mainComp.form.querySelector(".clip");
function barMode(reply) {                       // the same bar, its words and whether a picture can be attached
  const theirs = reply && picked && !mineIds.has(picked.s.id);   // someone else's message, note or reply
  const p = theirs ? "Support" : "Vent";
  mainComp.input.placeholder = p; mainComp.input.setAttribute("aria-label", p);
  clipEl.hidden = reply; mainComp.wrap.classList.toggle("with-clip", !reply);
  if (reply && mainComp.img) setPicture(mainComp, null);
}
const typing = () => { const a = document.activeElement; return a && a.closest && a.closest("input, textarea, select"); };
function setComposer(on) {                      // there whenever the soup can be touched, gone outside
  if (on === !composerEl.hidden) return;
  composerEl.hidden = !on;
  if (on) { if (!coarse.matches && !typing()) mainComp.input.focus({ preventScroll: true }); return; }
  if (listening && micComp === mainComp) stopMic();
  if (composerEl.contains(document.activeElement)) document.activeElement.blur();
  closeId(); closeNote();
}

// ================= a note, opened =================
// Only the note itself, huge, behind the badges: its words, its picture, or its voice as a spectrum. The box it sits
// in is set in DEV (and kept in this browser): the type size, the line height, the four margins and where in the box it sits
// margins are in px from the screen's edges: 0 is the edge itself. The text starts at the top left corner of the box;
// a picture and a voice sit in its middle, which is the middle of the screen
// The voice's tallest bar: 50% is the box's height, so it can go to twice the box. The text: at its size, or, to see a
// long one whole, shrunk until it fits the box (never bigger than its size)
const BIG_KEY = "volcano-v12-big3";
const BIG0 = { fs: 14, lh: .92, side: 40, tb: 90, ink: "black", fit: "contain", vw: "off", show: "off", wh: 23, bars: 88, bw: 7, tsize: "fit", sig: 14 };
const saved = store.get(BIG_KEY, {}) || {};
if (saved.wh != null && !saved.v3) {           // kept before the tallest bar was counted against half the box: the same look
  saved.wh = Math.max(3, Math.round(saved.wh / 2));
  if (saved.bars === 90) saved.bars = 88;        // the old default goes to the new one
}
let big = { ...BIG0, ...saved, v3: 1 };
const INK = { black: [0, 0, 0], white: [255, 255, 255], red: [196, 0, 12] };
const boxEl = bigEl.querySelector(".box"), sigEl = bigEl.querySelector(".sig"), wordsEl = bigEl.querySelector(".words"), picEl = bigEl.querySelector(".pic"), vizEl = bigEl.querySelector(".viz");
function applyBig() {
  const st = bigEl.style;
  st.setProperty("--fs", big.fs + "vw"); st.setProperty("--lh", big.lh);
  st.setProperty("--sig", big.sig + "px");
  st.setProperty("--side", big.side + "px"); st.setProperty("--tb", big.tb + "px"); st.setProperty("--fit", big.fit);
  st.setProperty("--ink", `rgb(${INK[big.ink].join(",")})`);
  bigEl.classList.toggle("outlined", dev && big.show === "on");
  bigEl.classList.toggle("vwords", big.vw === "on");
  for (const i of document.querySelectorAll("[data-big]")) { i.value = big[i.dataset.big]; }
  for (const v of document.querySelectorAll("[data-v]")) { const k = v.dataset.v; v.textContent = { fs: big.fs + " vw", lh: (+big.lh).toFixed(2), bars: String(big.bars), wh: big.wh + "% (50% = the box)" }[k] ?? big[k] + " px"; }
  for (const b of document.querySelectorAll("[data-bigset]")) b.setAttribute("aria-pressed", String(big[b.dataset.bigset] === b.dataset.val));
  store.set(BIG_KEY, big);
  fitWords();
}
// shrink to fit: the largest size, up to the chosen one, at which the whole text is inside the box
function fitWords() {
  wordsEl.style.fontSize = "";
  if (big.tsize !== "fit" || !wordsEl.textContent || getComputedStyle(wordsEl).display === "none") return;
  const bw = boxEl.clientWidth, bh = boxEl.clientHeight, fits = px => { wordsEl.style.fontSize = px + "px"; return wordsEl.scrollHeight <= bh + 1 && wordsEl.scrollWidth <= bw + 1; };
  let lo = 4, hi = parseFloat(getComputedStyle(bigEl).getPropertyValue("--fs")) * innerWidth / 100;
  if (fits(hi)) return;
  for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
  fits(lo);
}
addEventListener("resize", () => fitWords());
document.querySelectorAll("button[data-font]").forEach(b => b.addEventListener("click", () => requestAnimationFrame(fitWords)));   // the type changed (core.js)
document.fonts && document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", () => fitWords());
document.querySelectorAll("[data-big]").forEach(i => i.addEventListener("input", () => { big[i.dataset.big] = +i.value; applyBig(); }));
document.querySelectorAll("[data-bigset]").forEach(b => b.addEventListener("click", () => { big[b.dataset.bigset] = b.dataset.val; applyBig(); }));
document.querySelectorAll("[data-try]").forEach(b => b.addEventListener("click", () => {   // open a note of this kind, to see the box
  const all = [...badges.values()].filter(x => mediumOf(x.s) === b.dataset.try);
  if (all.length) { openNote(all[Math.floor(Math.random() * all.length)]); return; }
  const s = { id: "try-" + b.dataset.try, s: b.dataset.try === "image" ? "" : SENT_STARTERS[Math.floor(Math.random() * SENT_STARTERS.length)],
    medium: b.dataset.try, i: .6, img: b.dataset.try === "image" ? "perref/tartine-par-terre.jpg" : null };
  openNote({ s, fake: true });
}));

// its signature, at the box's bottom right: a pseudonym that names no one, the hour, the day (name hh:mm dd.mm.yy). It comes from the
// writer's tripcode when there is one, so one person keeps one pseudonym across their notes, and from the note when not
const PSEUDO = "bcdfghjklmnpqrstvwxz", VOWEL = "aeiou";
function pseudoOf(s) {
  let h = hashStr("pseudo|" + (s.trip || s.id || s.s || "")), out = "";
  for (let k = 0; k < 6; k++) { out += k % 2 ? VOWEL[h % 5] : PSEUDO[h % 20]; h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; }
  return out;
}
function signLine(s) {
  const z = n => String(n).padStart(2, "0"), d = s.t > 1e11 ? new Date(s.t) : null;
  return [pseudoOf(s), d ? `${z(d.getHours())}:${z(d.getMinutes())}` : "", d ? `${z(d.getDate())}.${z(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}` : ""].filter(Boolean).join("  ");
}
let picked = null, hideT = 0;
function openNote(b) {
  if (C.cam.soup <= .5 && !b.fake) return;
  stopVoice(); clearTimeout(hideT);
  picked = b.fake ? null : b;
  const s = b.s, me = mediumOf(s);
  bigEl.dataset.kind = me;
  wordsEl.textContent = me === "image" ? "" : s.s;
  sigEl.textContent = signLine(s);
  if (me === "image") { picEl.src = imgSrc(s.img); picEl.alt = s.s || "a picture"; } else { picEl.removeAttribute("src"); picEl.alt = ""; }
  bigEl.classList.add("on");
  fitWords();
  if (me === "voice") startVoice(s);
  if (!b.fake) { markRead(b); barMode(true); }
  if (!coarse.matches && !composerEl.hidden && !typing()) mainComp.input.focus({ preventScroll: true });
}
function closeNote() {
  const was = picked;
  stopVoice();
  if (bigEl.classList.contains("on")) {
    bigEl.classList.remove("on");
    hideT = setTimeout(() => { if (!bigEl.classList.contains("on")) { wordsEl.textContent = ""; picEl.removeAttribute("src"); delete bigEl.dataset.kind; } }, 700);
  }
  picked = null; barMode(false);
  if (listening && micComp === mainComp && was) stopMic();
}

// a voice is heard, not read. The notes keep no recording, so the stored words are spoken once, and what is seen is a
// voice message's waveform, huge, as in Telegram: a row of bars made from the words themselves (each syllable a swell,
// each space a dip, a comma or a full stop a gap), filled in as it is spoken, with its time under it
const guessLang = t => {
  const s = " " + t.toLowerCase() + " ";
  if (/[àâçèêëîïôûœ]|\s(je|j'|les|est|pas|une|des|du|mais|et|c'est|tu|vous)\s/.test(s)) return "fr-FR";
  if (/[ñ¿¡áíóú]|\s(que|qué|estoy|por|para|una|los|las|el|muy|pero|mi|yo)\s/.test(s)) return "es-ES";
  return "en-US";
};
const VOWELS = /[aeiouyàáâäãåèéêëìíîïòóôöõùúûüœæ]+/gi;
const vz = { s: null, live: false, t: 0, est: 1, said: 0, prog: 0, fade: 0, u: null, wave: null, waveKey: "" };
function shapeOf(s) {                          // the words as a line of swells and gaps, and how long they take to say
  const r = seeded(hashStr(s.id || s.s || "")), units = [];
  let secs = 0;
  for (const w of (s.s || "").split(/\s+/).filter(Boolean)) {
    const n = Math.max(1, (w.match(VOWELS) || []).length);
    for (let k = 0; k < n; k++) units.push({ a: .5 + .5 * r(), len: .8 + .5 * r() });
    secs += n * .23 + .05;
    if (/[,;:]$/.test(w)) { units.push({ a: .04, len: 1.1 }); secs += .25; }
    else if (/[.!?…]$/.test(w)) { units.push({ a: .03, len: 1.6 }); secs += .4; }
    else units.push({ a: .14, len: .3 });
  }
  if (!units.length) units.push({ a: .5, len: 1 });
  return { units, secs: Math.max(1, secs / .95), r };
}
function waveOf(s, n) {                        // n bars, 0 … 1
  const key = (s.id || s.s) + "|" + n;
  if (vz.waveKey === key) return vz.wave;
  const { units, r } = shapeOf(s), L = units.reduce((a, u) => a + u.len, 0), out = new Float32Array(n), loud = .6 + .4 * (s.i ?? .5);
  for (let k = 0; k < n; k++) {
    let p = (k + .5) / n * L, u = units[0];
    for (u of units) { if (p <= u.len) break; p -= u.len; }
    const swell = Math.sin(Math.PI * clamp(p / u.len, 0, 1)) ** .5;
    out[k] = clamp(u.a * swell * loud * (.7 + .45 * r()), .05, 1);
  }
  vz.waveKey = key; vz.wave = out;
  return out;
}
function startVoice(s) {
  stopVoice();
  vz.s = s; vz.live = true; vz.t = 0; vz.said = 0; vz.prog = 0; vz.est = shapeOf(s).secs;
  if (!window.speechSynthesis || !s.s) return;
  const u = new SpeechSynthesisUtterance(s.s); u.lang = guessLang(s.s); u.rate = .95;
  u.onboundary = e => { if (vz.u === u && (!e.name || e.name === "word")) vz.said = e.charIndex / Math.max(1, s.s.length); };
  u.onend = u.onerror = () => { if (vz.u === u) { vz.live = false; vz.est = Math.max(.5, vz.t); } };
  vz.u = u; speechSynthesis.speak(u);
}
function stopVoice() { vz.live = false; vz.u = null; try { speechSynthesis.cancel(); } catch {} }
function updateVoice(dt) {
  vz.fade = clamp(vz.fade + (bigEl.dataset.kind === "voice" && bigEl.classList.contains("on") ? dt : -dt) / .6, 0, 1);
  if (vz.fade <= 0 || !vz.s) return;
  if (vz.live) { vz.t += dt; if (!vz.u && vz.t >= vz.est) vz.live = false; }   // no speech here: it plays for as long as it would take
  const target = vz.live ? Math.min(.985, Math.max(vz.t / vz.est, vz.said)) : vz.t > 0 ? 1 : 0;
  vz.prog += (target - vz.prog) * (1 - Math.exp(-dt * 8));
  drawVoice();
}
const mmss = s => { s = Math.round(s); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
function drawVoice() {
  const dpr = Math.min(2, devicePixelRatio || 1), cw = vizEl.clientWidth, ch = vizEl.clientHeight;
  if (!cw || !ch) return;
  if (vizEl.width !== Math.round(cw * dpr) || vizEl.height !== Math.round(ch * dpr)) { vizEl.width = Math.round(cw * dpr); vizEl.height = Math.round(ch * dpr); }
  const x = vizEl.getContext("2d"), ink = `rgb(${INK[big.ink].join(",")})`;
  x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, cw, ch);
  const bx = Math.min(big.side, cw / 2 - 10), by = Math.min(big.tb, ch / 2 - 10), boxW = cw - 2 * bx, boxH = ch - 2 * by;   // the box, in the middle of the screen
  const pitch = boxW / big.bars, n = big.bars, bw = Math.min(big.bw, pitch * .9), wave = waveOf(vz.s, n);
  const bandH = boxH * big.wh / 50, fs = clamp(Math.min(bandH, boxH) * .14, 12, 64), cy = by + boxH / 2, top = cy - bandH / 2;   // the wave in the middle, its time under it
  x.lineCap = "round"; x.lineWidth = bw; x.strokeStyle = ink;
  for (let k = 0; k < n; k++) {
    const h = Math.max(0, wave[k] * bandH - bw), px = bx + k * pitch + pitch / 2;
    x.globalAlpha = vz.fade * ((k + .5) / n <= vz.prog ? 1 : .3);   // what has been said, full; the rest, faint
    x.beginPath(); x.moveTo(px, cy - h / 2); x.lineTo(px, cy + h / 2 + .01); x.stroke();
  }
  x.globalAlpha = vz.fade * .75; x.fillStyle = ink;
  x.font = `400 ${fs.toFixed(1)}px ${V.type()}`; x.textAlign = "left"; x.textBaseline = "top";
  x.fillText(mmss(vz.live ? vz.t : vz.est), bx + pitch / 2 - bw / 2, Math.min(top + bandH + fs * .6, by + boxH - fs * 1.2));
  x.globalAlpha = 1;
}

// closing: Esc, or a click on the empty soup (see click)
addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!idPanel.hidden) closeId(); else if (bigEl.classList.contains("on")) closeNote();
});
document.addEventListener("pointerdown", e => {
  const t = e.target, inside = el => !el.hidden && el.contains(t);
  if (inside($("dev"))) return;
  if (!idPanel.hidden && !inside(idPanel) && !t.closest(".you")) closeId();
});

// ================= voice: speech to text, loudness = intensity =================
const SR = window.SpeechRecognition || window.webkitSpeechRecognition, levelEl = $("level");
let rec = null, audio = null, listening = false, level = 0, peak = 0, micComp = null, micBase = "";
function hint(c, text) { const p = c.input.placeholder; c.input.value = ""; c.input.placeholder = text; setTimeout(() => { c.input.placeholder = p; }, 3200); }
async function startMic(c) {
  if (listening) stopMic();
  if (!SR) { hint(c, "this browser can't turn speech into text"); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ac = new AudioContext(), an = ac.createAnalyser(); an.fftSize = 1024;
    ac.createMediaStreamSource(stream).connect(an);
    audio = { ac, an, stream, buf: new Float32Array(an.fftSize) };
  } catch { hint(c, "the microphone isn't available here"); return; }
  micComp = c; active = c; micBase = c.input.value.trim() ? c.input.value.trim() + " " : ""; peak = 0; c.peak = 0; c.spoke = true;
  const r = rec = new SR(); r.lang = lang; r.continuous = true; r.interimResults = true;
  r.onresult = e => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const x = e.results[i];
      if (x.isFinal) micBase += x[0].transcript.trim() + " "; else interim += x[0].transcript;
    }
    c.input.value = (micBase + interim).slice(0, 240); updateSend(c);
  };
  r.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { stopMic(); hint(c, "speech recognition was blocked"); } };
  r.onend = () => { if (listening && rec === r) { try { r.start(); } catch {} } };
  listening = true;
  try { r.start(); } catch {}
  c.mic.classList.add("on"); c.mic.setAttribute("aria-pressed", "true"); c.mic.setAttribute("aria-label", "stop talking");
  updateSend(c);
}
function stopMic() {
  listening = false;
  try { rec && rec.stop(); } catch {}
  rec = null;
  if (audio) { audio.stream.getTracks().forEach(t => t.stop()); audio.ac.close(); audio = null; }
  const c = micComp; micComp = null; level = 0; levelEl.style.width = "0%";
  if (c) {
    c.peak = peak; c.input.value = c.input.value.trim();
    c.mic.classList.remove("on"); c.mic.setAttribute("aria-pressed", "false"); c.mic.setAttribute("aria-label", "talk"); c.mic.style.boxShadow = "";
    updateSend(c);
  }
}
function readLevel() {
  if (!audio) return;
  audio.an.getFloatTimeDomainData(audio.buf);
  let s = 0; for (const v of audio.buf) s += v * v;
  const db = 20 * Math.log10(Math.sqrt(s / audio.buf.length) + 1e-8);
  const l = clamp((db + 55) / 45, 0, 1);       // about -55 dB (quiet room) → 0, -10 dB (shouting) → 1
  level = level * .8 + l * .2;
  peak = Math.max(peak, level);
  if (micComp) { micComp.peak = peak; micComp.mic.style.boxShadow = `0 0 0 ${(level * 9).toFixed(1)}px rgba(255, 59, 48, .3)`; }
  levelEl.style.width = (level * 100).toFixed(1) + "%";
}

// ================= DEV =================
let voiceMode = "real";
$("devWho").addEventListener("click", e => idPanel.hidden ? openId(e.currentTarget) : closeId());
$("devUnread").addEventListener("click", () => {   // every badge unread again, red with its number
  readMap = {}; store.set("volcano-read", readMap);
  for (const b of badges.values()) setCount(b);
});
document.querySelectorAll("[data-vm]").forEach(b => b.addEventListener("click", () => {
  voiceMode = b.dataset.vm;
  document.querySelectorAll("[data-vm]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  $("intBox").hidden = voiceMode !== "debug"; $("meter").hidden = voiceMode === "debug";
}));
$("intensity").addEventListener("input", () => { $("intVal").textContent = $("intensity").value; });
function showSat() {
  $("satSize").value = sat.size; $("orbSize").value = sat.orbit;
  $("satV").textContent = sat.size + "% of a note"; $("orbV").textContent = sat.orbit + "%";
  store.set("volcano-v12-sat", sat);
}
$("satSize").addEventListener("input", e => { sat.size = +e.target.value; showSat(); });
$("orbSize").addEventListener("input", e => { sat.orbit = +e.target.value; showSat(); });
showSat();

// ================= the soup's colour: its part of the picture (see field.js) =================
// red-orange, going to black only towards the top of the chamber, where the hole is: by how far above level each pixel
// looks (the world's up, not the screen's), so it stays put as you turn and tilt. Where the black starts and where it is
// whole are angles above level (DEV, soup). Coming in, it comes out of the black evenly, everywhere at once. The last bit
// is under one level of 8-bit, only so the long gradient doesn't band
const glsl = `
uniform float uRise, uBlackLo, uBlackHi;
const vec3 HOT = vec3(1., .2706, 0.);
vec3 soupColour(vec2 q) {
  float up = smoothstep(uBlackLo, uBlackHi, ray(q).y);   // ray(q).y: the sine of how far above level this pixel looks
  return (mix(HOT, vec3(0.), up) + (hash(gl_FragCoord.xy) - .5) / 255.) * uRise;
}
`;
const soupTop = { from: 20, full: 55, ...(store.get("volcano-v12-souptop", {}) || {}) };
const sinDeg = d => Math.sin(d * Math.PI / 180);
function setUniforms(gl, u, { cam }) {
  gl.uniform1f(u.uRise, cam.rise);
  gl.uniform1f(u.uBlackLo, sinDeg(soupTop.from)); gl.uniform1f(u.uBlackHi, sinDeg(Math.max(soupTop.full, soupTop.from + 1)));
}
V.dev.tab("soup", `
  <label class="full"><span class="k">black from </span><span id="topFromV"></span><input type="range" id="topFrom" min="-30" max="89" step="1"></label>
  <label class="full"><span class="k">black whole at </span><span id="topFullV"></span><input type="range" id="topFull" min="-29" max="90" step="1"></label>`);
function showTop() {
  $("topFrom").value = soupTop.from; $("topFull").value = soupTop.full;
  $("topFromV").textContent = soupTop.from + "° above level"; $("topFullV").textContent = soupTop.full + "° above level";
  store.set("volcano-v12-souptop", soupTop);
}
$("topFrom").addEventListener("input", e => { soupTop.from = +e.target.value; if (soupTop.full <= soupTop.from) soupTop.full = soupTop.from + 1; showTop(); });
$("topFull").addEventListener("input", e => { soupTop.full = +e.target.value; if (soupTop.from >= soupTop.full) soupTop.from = soupTop.full - 1; showTop(); });
showTop();

// ================= what the others call (see core.js) =================
V.soup = {
  glsl, uniforms: ["uRise", "uBlackLo", "uBlackHi"], setUniforms,
  update(dt, t) {
    setComposer(C.cam.soup > .5);
    updateBadges(dt, t);
    projectBadges();
    updateVoice(dt);
  },
  draw: drawInside, pointerDown, pointerMove, drop, hover, click,
  cursor: () => grab && grab.on ? "grabbing" : hovered ? roundOver(hovered) : null,
  jolt(k) { for (const b of badges.values()) { b.vy += rand(.35, .8) * k; b.vx += rand(-.12, .12) * k; b.vz += rand(-.12, .12) * k; b.fly = k * rand(2.6, 3.4); b.flyA = rand(5, 8); } },
  texts: () => [...sentences.filter(s => mediumOf(s) === "text").map(s => s.s), ...[...replies.values()].flat().map(r => r.s)].filter(Boolean),
  readLevel,
};

showWho(); applyBig();
loadSentences();
setInterval(loadSentences, 90 * 1000);         // people elsewhere keep venting
})();

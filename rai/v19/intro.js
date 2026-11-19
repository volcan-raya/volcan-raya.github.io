// Nothing read here is sent or stored, except the device word, which goes with a note posted unnamed (soup.js).
// v19 (1.05): the introduction, and who you are. "I'm not named, but they know who I am": everything a browser tells
// any page, without asking for a permission and without any service (V.who); the name asked outside, under the
// volcano, before the dive (camera.js dive()); with no name, the field becomes what the browser says you are.
// Loaded after camera.js, before soup.js. What the files say to each other is in core.js; the split in NOTES.md.
(() => {
"use strict";
const { $, store, reduce, clamp } = V;
const KEY = "volcano-v19-intro-";
const nav = navigator, ua = nav.userAgent || "", uad = nav.userAgentData;

// ================= what the browser gives away =================
// the device: an iPad in Safari says it is a Mac; a Mac with a touch screen is an iPad (no Mac has one)
function deviceWord() {
  const p = (uad && uad.platform) || "";
  if (/iPhone|iPod/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) return "iPad";
  if (/Android/i.test(p) || /Android/.test(ua)) return "Android";
  if (/mac/i.test(p) || /Macintosh|Mac OS X/.test(ua)) return "Mac";
  if (/win/i.test(p) || /Windows/.test(ua)) return "PC";
  if (/CrOS/.test(ua) || /Chrome OS/i.test(p)) return "Chromebook";
  if (/linux/i.test(p) || /Linux/.test(ua)) return "Linux";
  return "device";
}
// the browser: Arc, Brave and the rest built on Chrome count as Chrome
function browserWord() {
  if (/Edg\//.test(ua)) return "Edge";
  if (/Firefox\/|FxiOS/.test(ua)) return "Firefox";
  if (/CriOS/.test(ua) || (uad && uad.brands && uad.brands.some(b => /Chrom/.test(b.brand))) || /Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "a browser";
}
const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })();
// "Europe/Zurich" → Zurich, "America/Argentina/Buenos_Aires" → Buenos Aires
const city = tz.includes("/") ? tz.split("/").pop().replace(/_/g, " ") : "";
const langName = (() => {
  const l = nav.language || "";
  try { return new Intl.DisplayNames(["en"], { type: "language" }).of(l.split("-")[0]) || l; } catch { return l; }
})();
const mq = q => { try { return matchMedia(q).matches; } catch { return false; } };
const time = () => { try { return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

const device = deviceWord();
const facts = {
  city, timeZone: tz, time: time(), language: langName, languageTag: nav.language || "",
  browser: browserWord(), device,
  screen: `${screen.width} × ${screen.height}`, pixelRatio: devicePixelRatio || 1,
  dark: mq("(prefers-color-scheme: dark)"), reducedMotion: reduce.matches,
  touch: nav.maxTouchPoints > 0, cores: nav.hardwareConcurrency || null,
  memory: nav.deviceMemory || null,                                    // Chrome: GB, rounded
  connection: (nav.connection && nav.connection.effectiveType) || null, // Chrome: 4g, 3g…
  battery: null, charging: null,                                       // Chrome: navigator.getBattery
};
try {
  nav.getBattery && nav.getBattery().then(b => {
    const read = () => { facts.battery = Math.round(b.level * 100); facts.charging = b.charging; };
    read(); b.addEventListener("levelchange", read); b.addEventListener("chargingchange", read);
  }).catch(() => {});
} catch {}

// the facts as said aloud, most telling first: "Zurich · 12:31 · French · 1512 × 982 · 23% battery"
function sayFacts() {
  facts.time = time();
  const f = facts, out = [];
  if (f.city) out.push(f.city);
  if (f.time) out.push(f.time);
  if (f.language) out.push(f.language);
  out.push(f.screen);
  if (f.battery != null) out.push(`${f.battery}% battery${f.charging ? ", charging" : ""}`);
  out.push(f.browser);
  out.push(f.dark ? "dark mode" : "light mode");
  if (f.cores) out.push(`${f.cores} cores`);
  if (f.memory) out.push(`${f.memory} GB`);
  if (f.connection) out.push(f.connection);
  if (f.touch) out.push("touch");
  if (f.reducedMotion) out.push("reduced motion");
  return out;
}

// ================= who: the name, kept as soup.js keeps it (localStorage "volcano-id") =================
const readName = () => { try { const s = JSON.parse(localStorage.getItem("volcano-id") || "null"); return s && s.name ? String(s.name).slice(0, 20) : ""; } catch { return ""; } };
const who = V.who = { name: "", device, label: "", facts };
function setWho(name, save) {
  who.name = name; who.label = name || `unnamed ${device}`;
  if (save) {
    try { if (name) localStorage.setItem("volcano-id", JSON.stringify({ name, trip: "" })); else localStorage.removeItem("volcano-id"); } catch {}
    document.dispatchEvent(new CustomEvent("volcano:who"));
  }
}
setWho(readName(), false);
// the soup's own name panel writes the same key and fires the same event: read it again
document.addEventListener("volcano:who", () => { const n = readName(); if (n !== who.name) setWho(n, false); });
addEventListener("storage", e => { if (e.key === "volcano-id") { setWho(readName(), false); document.dispatchEvent(new CustomEvent("volcano:who")); } });

// ================= the settings (DEV, tab "intro") =================
const set = {
  speed: store.get(KEY + "speed", 1),           // the dive's pace
  color: store.get(KEY + "color", "orange"),    // the title in the black: the soup's orange or the volcano's white
  floor: store.get(KEY + "floor", false),       // v17's opening instead: the title on the soup's floor, the eye rising off it
  ask: store.get(KEY + "ask", "dive"),          // when the name is asked: before the dive, at the first vent, never
  facts: store.get(KEY + "facts", 5),           // how many facts the unnamed see
  beat: store.get(KEY + "beat", 4.5),           // how long they stay before the dive, s
};
const save = (k, v) => { set[k] = v; store.set(KEY + k, v); };

// ================= the name step, outside, under the volcano =================
const step = $("nameStep"), form = $("nameForm"), field = $("nameIn"), go = $("nameGo"), label = $("nameLabel"), factsEl = $("nameFacts");
let phase = "idle";                              // idle → asking → reveal → gone
function showStep() {
  phase = "asking";
  field.value = who.name; label.textContent = ""; factsEl.textContent = "";
  step.classList.remove("revealed", "gone"); step.hidden = false;
  if (!matchMedia("(pointer: coarse)").matches) field.focus({ preventScroll: true });   // on a phone, no keyboard before asked
}
function hideStep() {
  phase = "gone"; step.classList.add("gone");
  if (document.activeElement === field) field.blur();
  setTimeout(() => { if (phase === "gone") step.hidden = true; }, 900);
}
function dive() { V.camera.dive(set.speed); setTimeout(hideStep, reduce.matches ? 0 : 600); }
let beatT = [];
form.addEventListener("submit", e => {
  e.preventDefault();
  if (phase !== "asking") return;
  const n = field.value.trim().slice(0, 20);
  if (n) { if (n !== who.name || !readName()) setWho(n, true); dive(); return; }
  // no name: the field turns into what the browser says you are, and for a beat, what else it said
  if (who.name) setWho("", true); else setWho("", false);
  phase = "reveal"; field.blur();
  label.textContent = who.label; step.classList.add("revealed");
  const list = sayFacts().slice(0, clamp(set.facts, 0, 99)), beat = set.beat * 1000;
  const every = list.length ? Math.min(650, (beat * .6) / list.length) : 0;
  list.forEach((f, i) => beatT.push(setTimeout(() => {
    const s = document.createElement("span"); s.textContent = (i ? " · " : "") + f; factsEl.append(s);
  }, 500 + i * every)));
  beatT.push(setTimeout(() => { if (phase === "reveal") dive(); }, list.length ? beat : 1200));
});
// Enter anywhere while asked (the field not focused, as on a phone after a tap elsewhere)
addEventListener("keydown", e => {
  if (e.key !== "Enter" || phase !== "asking" || e.target === field) return;
  const t = e.target; if (t instanceof Element && t.closest("input, textarea, [data-ui]")) return;
  e.preventDefault(); form.requestSubmit();
});
// moved in by hand before answering: the question goes, no name is taken
(function watch() {
  if (phase === "asking" && V.camera.cam && V.camera.cam.s < V.camera.S_MAX - .3) hideStep();
  requestAnimationFrame(watch);
})();

// ================= the opening =================
function begin() {
  beatT.forEach(clearTimeout); beatT = [];
  V.camera.titleMode(set.floor ? "floor" : "dive", set.color);
  if (set.floor) { phase = "gone"; step.hidden = true; V.camera.replay("floor"); return; }
  V.camera.replay("outside");
  if (set.ask === "dive") showStep();
  else { phase = "idle"; step.hidden = true; beatT.push(setTimeout(() => V.camera.dive(set.speed), 1600)); }
}

// ================= DEV, tab "intro" (core.js's tabs: the tab's button added here, its showing core's) =================
const seg = (id, opts, cur) => `<span class="seg" id="${id}">${opts.map(([v, t]) => `<button class="t" type="button" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join("")}</span>`;
V.dev.tab("intro", `
  <span class="full"><button class="t" id="introReplay" type="button">replay the opening</button></span>
  <label class="full"><span class="k">dive speed </span><span id="introSpeedV"></span><input type="range" id="introSpeed" min="0.3" max="3" step="0.05"></label>
  <span class="k">title</span>${seg("introColor", [["orange", "orange"], ["white", "white"]], set.color)}
  <span class="k">on the floor</span>${seg("introFloor", [["true", "on"], ["false", "off"]], set.floor)}
  <span class="k">ask the name</span>${seg("introAsk", [["dive", "before"], ["vent", "1st vent"], ["never", "never"]], set.ask)}
  <label class="full"><span class="k">facts shown </span><span id="introFactsV"></span><input type="range" id="introFacts" min="0" max="12" step="1"></label>
  <label class="full"><span class="k">the beat </span><span id="introBeatV"></span><input type="range" id="introBeat" min="1" max="10" step="0.5"></label>
  <span class="full"><span class="k">who </span><span id="introWho"></span></span>`);
{
  const bar = document.querySelector("#dev .devTabs");
  if (bar && !bar.querySelector('[data-devtab="intro"]')) bar.insertAdjacentHTML("afterbegin", '<button type="button" role="tab" data-devtab="intro" aria-selected="false">intro</button>');
}
const range = (id, k, fmt) => {
  const el = $(id), out = $(id + "V"), show = () => { el.value = set[k]; out.textContent = fmt(set[k]); };
  el.addEventListener("input", () => { save(k, +el.value); show(); }); show();
};
range("introSpeed", "speed", v => "×" + (+v).toFixed(2));
range("introFacts", "facts", v => (v >= sayFacts().length ? "all " : "") + v);
range("introBeat", "beat", v => (+v).toFixed(1) + " s");
const segOn = (id, k, parse, after) => $(id).addEventListener("click", e => {
  const b = e.target.closest("[data-v]"); if (!b) return;
  save(k, parse(b.dataset.v));
  for (const o of $(id).children) o.setAttribute("aria-pressed", String(o === b));
  after && after();
});
segOn("introColor", "color", v => v, () => V.camera.titleMode(set.floor ? "floor" : "dive", set.color));
segOn("introFloor", "floor", v => v === "true", begin);
segOn("introAsk", "ask", v => v);
$("introReplay").addEventListener("click", begin);
const showWho = () => { $("introWho").textContent = `${who.label} · ${facts.browser}`; };
document.addEventListener("volcano:who", showWho); showWho();

V.intro = {
  get askAt() { return set.ask; },               // "dive" | "vent" | "never": at "vent", the soup asks at the first vent (soup.js)
  replay: begin, facts: sayFacts,
};
// the camera starts outside (camera.js); begin once the page is running
addEventListener("load", () => setTimeout(begin, 0));
document.readyState === "complete" && setTimeout(begin, 0);
})();

// aya v09/v10: the DEV tab "aya", put in order (v10: v03–v09's lava and smoke rows are gone, the eruption's are new). The rows are made by volcano.js and soup.js, each where it belongs; this
// file, loaded after them, only moves them into a few sections that fold (open or closed, kept in this browser), and
// leaves out the buttons that the "try" section already has. Nothing else changes: each row still does what it did.
(() => {
"use strict";
const $ = id => document.getElementById(id), group = V.dev.tab("aya");
const SECTIONS = [
  ["try", "try", true, ["tWhole"]],
  ["eruption", "the eruption: balls bursting, snakes of lava", false, ["data-bup", "bxHigh", "bxCap", "bxSpeed", "bxWind", "bxLife", "bxTrace"]],
  ["before", "before it: the open rant, the stop motion", false, ["preFrom", "data-sm", "smMs", "smShake", "smSize"]],
  ["soup", "the soup: notes, bumping, the others", false, ["data-notes", "data-bump", "push", "simsN", "grabsK"]],
];
// the row (a direct child of the tab's group) that holds an element given by id, or by a data- attribute
function rowOf(key) {
  let n = key.startsWith("data-") ? group.querySelector(`[${key}]`) : $(key);
  if (!n) return null;
  while (n.parentElement && n.parentElement !== group) n = n.parentElement;
  return n.parentElement === group ? n : null;
}
const open = V.store.get("aya-v11-devopen", {}) || {};
const used = new Set(), built = [];
for (const [id, title, dflt, keys] of SECTIONS) {
  const d = document.createElement("details");
  d.className = "full ayaSec"; d.open = open[id] ?? dflt;
  d.innerHTML = `<summary>${title}</summary><div class="ayaBody"></div>`;
  const body = d.querySelector(".ayaBody");
  for (const k of keys) { const r = rowOf(k); if (r && !used.has(r)) { used.add(r); body.append(r); } }
  d.addEventListener("toggle", () => { open[id] = d.open; V.store.set("aya-v11-devopen", open); });
  built.push(d);
}
// what is left in the tab: headings, and the buttons the "try" section has already. Hidden, not removed, so the
// scripts that look for them still find them
for (const n of [...group.children]) if (!used.has(n)) n.hidden = true;
group.prepend(...built);
// the "play it" of the stop motion stays inside its row: it is the same as try's "stop motion"
const smTry = $("smTry"); if (smTry) smTry.hidden = true;
for (const id of ["tLava", "tSmoke"]) { const b = $(id); if (b) b.hidden = true; }   // v10: no lava or smoke of their own any more

const css = document.createElement("style");
css.textContent = `
  #dev details.ayaSec { grid-column: 1 / -1; border-top: 1px solid rgba(193,108,255,.25); padding-top: 8px; }
  #dev details.ayaSec:first-of-type { border-top: 0; padding-top: 0; }
  #dev details.ayaSec > summary { cursor: pointer; list-style: none; color: #C16CFF; font-size: 11.5px; letter-spacing: .04em; padding: 2px 0 6px; user-select: none; }
  #dev details.ayaSec > summary::-webkit-details-marker { display: none; }
  #dev details.ayaSec > summary::before { content: "+ "; display: inline-block; width: 1.4em; }
  #dev details.ayaSec[open] > summary::before { content: "– "; }
  #dev details.ayaSec .ayaBody { display: grid; grid-template-columns: auto 1fr; gap: 10px 14px; padding: 2px 0 10px; }
  #dev details.ayaSec .ayaBody > * { grid-column: 1 / -1; }
  #dev details.ayaSec .seg { flex-wrap: wrap; gap: 6px 14px; }
`;
document.head.append(css);
})();

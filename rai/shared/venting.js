// How many people are here right now, "N people in the soup right now", in the page's own sans (--type). Loaded by 1.01
// (v11) on; 1.00 (v09, ecal) keeps its own. The script tag says where:
//   data-place="bottom-left"  1.01, 1.02: bottom left, as their title was, the count over NOTIFICATION SOUP (bold),
//                      still, there from the start; its foot as the 3.00 count's, or above the composer on a phone
//   (none)             1.03, 3.00: bottom right, the count alone (their title is the large one that opens the page,
//                      Mebar Display); its foot a little above the composer's, or just above the composer where the
//                      composer reaches it (under 1000 px). It comes in as a ball does (see below)
// The count is FAKE for now: 2 or 3, now and then one more or one less, so the corner already reads as it will. Later it
// can come from playhtml's presence (the "here" row in DEV soup counts it)
(() => {
  const TOP = document.currentScript?.dataset.place === "bottom-left";   // (TOP: the still corner of 1.01, 1.02)
  const css = document.createElement("style");
  css.textContent = TOP ? `
#venting { position: fixed; z-index: 5; bottom: calc(13px + env(safe-area-inset-bottom, 0px)); left: calc(16px + env(safe-area-inset-left, 0px)); margin: 0; pointer-events: none;
  color: #000; font: 400 13px/1 var(--type); letter-spacing: 0; white-space: nowrap; }
#venting .n { display: block; margin-bottom: 4px; }
#venting .t { display: block; font-weight: 800; letter-spacing: .02em; }   /* the soup's own sans, bold, as the title was */
@media (max-width: 1000px) { #venting { bottom: calc(66px + env(safe-area-inset-bottom, 0px)); } }
#venting { transition: opacity .2s; }
body:has(#idPanel:not([hidden])) #venting { opacity: 0; }` : `
/* 13 px: a little above the composer's bottom (10 px; the baseline sits 1.5 px above a line of height 1), since the
   box's round ends make its bottom read higher than it is */
#venting { position: fixed; z-index: 5; bottom: calc(13px + env(safe-area-inset-bottom, 0px)); right: calc(16px + env(safe-area-inset-right, 0px));
  margin: 0; pointer-events: none; color: #000; font: 400 13px/1 var(--type); white-space: nowrap; text-align: right; }
@media (max-width: 1000px) { #venting { bottom: calc(66px + env(safe-area-inset-bottom, 0px)); } }
#venting { transition: opacity .2s; }
body:has(#idPanel:not([hidden])) #venting { opacity: 0; }   /* out of the way while a name is being typed */`;
  document.head.append(css);
  const el = document.createElement(TOP ? "h1" : "p");
  el.id = "venting";
  el.innerHTML = '<span class="n" aria-live="off"></span>' + (TOP ? '<span class="t">NOTIFICATION SOUP</span>' : "");
  document.body.append(el);
  const n = el.querySelector(".n");
  let k = Math.random() < .5 ? 2 : 3;
  const show = () => { n.textContent = `${k} people in the soup right now`; };
  const next = () => { k = k === 2 ? 3 : 2; show(); setTimeout(next, 25000 + Math.random() * 45000); };
  show();
  setTimeout(next, 25000 + Math.random() * 45000);
  if (TOP) return;

  // it comes in while the balls do, and rests about 4 s in, with the last of them: it leaves 1.2 s in and takes 3 s,
  // with the balls' ease out on the depth. As a ball, it starts close to us, 8 times its size, already on the screen,
  // large, cut by its bottom right edge, and is pulled back along the depth into its place, getting smaller. Seen from a
  // point just above and left of it (16 px, 20 px), so as it goes back it also slides up and left into the corner
  const intro = document.querySelector("#title > span");
  el.style.opacity = "0";
  setTimeout(() => {
    el.style.opacity = "";
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, easing: "ease" }); return; }
    const r = el.getBoundingClientRect(), f = 600, S = 8, z0 = f - f / S;
    el.style.transformOrigin = `${r.width / 2 - 16}px ${r.height / 2 - 20}px`;
    el.animate([
      { transform: `perspective(${f}px) translateZ(${z0}px)`, opacity: 0 },
      { opacity: 1, offset: .1 },
      { transform: `perspective(${f}px) translateZ(0)`, opacity: 1 },
    ], { duration: intro ? 3000 : 2400, easing: "cubic-bezier(.33, 1, .68, 1)" });   // out, cubic, as the balls' 1 - (1 - u)³
  }, intro ? 1200 : 600);
})();

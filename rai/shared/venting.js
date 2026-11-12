// The corner, bottom right, in two lines lined up on the right: how many people are here right now ("in the soup right
// now", the idiom and the name under it at once), and under it NOTIFICATION SOUP, in the page's own sans (--type), bold for the name and regular for the count. Mebar Display stays for the large
// title that opens 1.03 and 3.00. The bottom of the title's letters is level with the bottom of the composer's box;
// where the composer is wide enough to reach it (under 1000 px), the two lines sit just above it.
// Loaded by 1.01 (v11) on. The count is FAKE for now: 2 or 3, now and then one more or one less, so the corner already
// reads as it will. Later it can come from playhtml's presence (the "here" row in DEV soup counts it)
(() => {
  const css = document.createElement("style");
  css.textContent = `
/* 13 px: a little above the composer's bottom (10 px; the capitals' baseline sits 1.5 px above a line of height 1),
   since the box's round ends make its bottom read higher than it is */
#venting { position: fixed; z-index: 5; bottom: calc(13px + env(safe-area-inset-bottom, 0px)); right: calc(16px + env(safe-area-inset-right, 0px));
  margin: 0; pointer-events: none; color: #000; font: 800 13px/1 var(--type); letter-spacing: .02em; white-space: nowrap; text-align: right; }
#venting span { display: block; }
#venting .n { margin-bottom: 4px; font-weight: 400; letter-spacing: 0; }
@media (max-width: 1000px) { #venting { bottom: calc(66px + env(safe-area-inset-bottom, 0px)); } }`;
  document.head.append(css);
  const el = document.createElement("p");
  el.id = "venting";
  el.innerHTML = '<span class="n" aria-live="off"></span><span>NOTIFICATION SOUP</span>';
  document.body.append(el);
  const n = el.querySelector(".n");
  let k = Math.random() < .5 ? 2 : 3;
  const show = () => { n.textContent = `${k} people in the soup right now`; };
  const next = () => { k = k === 2 ? 3 : 2; show(); setTimeout(next, 25000 + Math.random() * 45000); };
  show();
  setTimeout(next, 25000 + Math.random() * 45000);

  // it comes in while the balls do (soup.js, INTRO: they leave from 0.6 s to 2.2 s, each for 3.5 s), and rests about
  // 4 s in, with the last of them: it leaves 1.2 s in and takes 3 s, with the balls' ease out on the depth. As a ball,
  // it starts close to us, 8 times its size, already on the screen, large, cut by its bottom right edge, and is pulled
  // back along the depth into its place, getting smaller. Seen from a point just above and left of it (16 px, 20 px), so
  // as it goes back it also slides up and left into the corner: from the bottom right, not from the corner itself
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

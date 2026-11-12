// The corner, bottom left: NOTIFICATION SOUP and how many people are heated up (no dot between), in the page's own sans (--type), bold for
// the name and regular for the count. Mebar Display stays for the large title that opens 1.03 and 3.00. Level with the
// middle of the composer; where the composer is wide enough to reach it (under 1000 px), just above it.
// Loaded by 1.01 (v11) on. The count is FAKE for now: 2 or 3, now and then one more or one less, so the corner already
// reads as it will. Later it can come from playhtml's presence (the "here" row in DEV soup counts it)
(() => {
  const css = document.createElement("style");
  css.textContent = `
#venting { position: fixed; z-index: 5; bottom: calc(22px + env(safe-area-inset-bottom, 0px)); left: calc(16px + env(safe-area-inset-left, 0px));
  margin: 0; pointer-events: none; color: #000; font: 800 13px/1.5 var(--type); letter-spacing: .02em; white-space: nowrap; }
#venting .n { font-weight: 400; letter-spacing: 0; }
@media (max-width: 1000px) { #venting { bottom: calc(64px + env(safe-area-inset-bottom, 0px)); } }`;
  document.head.append(css);
  const el = document.createElement("p");
  el.id = "venting";
  el.innerHTML = 'NOTIFICATION SOUP <span class="n" aria-live="off"></span>';
  document.body.append(el);
  const n = el.querySelector(".n");
  let k = Math.random() < .5 ? 2 : 3;
  const show = () => { n.textContent = `${k} people heated up`; };
  const next = () => { k = k === 2 ? 3 : 2; show(); setTimeout(next, 25000 + Math.random() * 45000); };
  show();
  setTimeout(next, 25000 + Math.random() * 45000);

  // it comes with the last of the balls, as one of them (soup.js, INTRO: t0 600 ms, spread 1600 ms, dur 3500 ms, the
  // same perspective and the same ease out on the depth): it leaves when the last balls leave, 2.2 s in, from our side,
  // 14 times its size, and is pulled back into its place along the depth, seen from the middle of the screen, arriving
  // with them, 5.7 s in. Where there is no opening title (1.01, 1.02: their balls don't come in either), soon after
  // opening. Change INTRO there, change this
  const intro = document.querySelector("#title > span");
  el.style.opacity = "0";
  setTimeout(() => {
    el.style.opacity = "";
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, easing: "ease" }); return; }
    const r = el.getBoundingClientRect(), f = 600, S = 14, z0 = f - f / S;   // as close as the balls start
    el.style.transformOrigin = `${innerWidth / 2 - r.left}px ${innerHeight / 2 - r.top}px`;
    el.animate([
      { transform: `perspective(${f}px) translateZ(${z0}px)`, opacity: 0 },
      { opacity: 1, offset: .12 },
      { transform: `perspective(${f}px) translateZ(0)`, opacity: 1 },
    ], { duration: intro ? 3500 : 2400, easing: "cubic-bezier(.33, 1, .68, 1)" });   // out, cubic, as the balls' 1 - (1 - u)³
  }, intro ? 600 + 1600 : 600);
})();

# v19 (1.05), after v17 (1.04): two windows

The feedback of 19/11/26. The brief called this v18, but v18 already exists (rai x aya, 3.03), so it's **v19** everywhere:
the folder `rai/v19/`, `data-ver="v19"` on soup.js, commits "v19 intro: …" / "v19 soup: …".
The site opens on rai/v19/ now.

## Who owns what

| | files |
|---|---|
| **A, the introduction** (outside, the dive, the title, the name) | `index.html` (the page, `#title`, its CSS), `camera.js`, `volcano.js`, `terrain.js`, `intro.js` (new) |
| **B, the soup** (the balls, an opened note) | `soup.js`, `soup.css`, `notification.js` (local copies, ../shared/ stays as v09–v17 use it) |
| **shared, by agreement only** | `core.js`, `field.js` — write what you need under "asks" below, don't edit |

Still from ../shared/: `venting.js`, `mebar.css`, `fonts/`.

## Contracts between A and B

- **`V.who`** (intro.js, loaded before soup.js): `{ name, device: "Mac", label: "unnamed Mac", facts: { … } }`.
  `name` is "" when no name was given. When the name changes, intro.js updates V.who and fires
  `document.dispatchEvent(new CustomEvent("volcano:who"))`.
- **The name** lives in `localStorage["volcano-id"]` = `{ name, … }`, the key soup.js already reads.
  Both windows write it there and fire "volcano:who" after; both listen for "volcano:who" and re-read.
- **Unnamed notes**: B sends `V.who.device` with a note posted without a name. Nothing else from V.who is sent or stored.
- soup.js's settings key is `volcano-v19-…` (from data-ver), so v19's DEV choices start fresh.

## Git

Stage only your own files. `git pull --rebase` before every push. Never force-push, reset, stash or checkout files you don't own.

## Asks (changes to core.js / field.js, or to the other window's files)

### For B (soup.js / soup.css), from A, 19/11/26

1. **soup.js reads the name only once, at load.** The name step now runs *after* that, so until a reload `me.name`
   stays what it was and a note is posted under the old name. Please listen:
   `document.addEventListener("volcano:who", () => { me = { name: V.who.name, trip: "" }; showWho(); })`.
   And after the name panel saves (`$("keep").form` submit), fire `document.dispatchEvent(new CustomEvent("volcano:who"))`
   so intro.js and DEV follow.
2. **An unnamed note carries `V.who.device`** ("Mac", "iPhone"…), as the brief says.
3. **Asking at the first vent:** when `V.intro.askAt === "vent"` and `!V.who.name`, open your name panel at the first
   vent (once per visit). With `"never"`, never ask. (`"dive"`, the default, is asked outside by intro.js.)
4. **No Mebar any more** (the user, 19/11/26: "remove mebar typography, we'll stay all with the same sans font").
   index.html no longer loads ../shared/mebar.css; please take out the Mebar choice ("opening a note" type, "mebar weight")
   and soup.css's Mebar rule (#big … "Mebar Display"), so everything is in the sans.

### Shared (core.js), for the user to agree

- core.js's `TABS` has no "intro": intro.js adds its own tab button to the bar and core's showTab does the rest, so
  nothing breaks, but the open tab isn't remembered across a reload when it is "intro". Ask: add "intro" to TABS.
- core.js still stores under `volcano-v17-devtab` / `volcano-v17-font`, so v19 shares those two settings with v17.
  Ask: v19 keys.
- (not either window's) ../shared/venting.js's "N people in the soup" line runs past the right edge (the page is wider
  than the screen in a measure, since v17 at least; the body's overflow hides it).

## What A built (v19 intro)

- The page opens outside at `S_MAX` (v17's farthest), the name field under the volcano. Enter (or the arrow) → the dive:
  `V.camera.dive(speed)`, along v17's way in (s from 3.3 to 0) by the clock, ~13 s at ×1, slower in the hole so the title
  holds ~3.5 s. Any wheel, pinch, key or the DEV camera slider takes over at once.
- The title in the black: `#title`, set as an opened note is (camera.js reads `--fs`, `--lh`, `--side`, `--tb` off
  `#big`, and shrinks it to fit as fitWords does): **B, if you change the note's type, the title follows**. Orange
  `#FF4500` or white. v17's floor title behind DEV "on the floor".
- The name is asked above the volcano; on Enter it falls into the hole as the zoom starts.
- `V.camera`: new `S_MAX, dive(speed), replay("outside"|"floor"), diving(), titleMode(mode, color)`.
- `V.intro`: `askAt`, `replay()`, `facts()` (the facts as words).
- Reduced motion: fades through `#veil`: outside → the black with the title → the soup.

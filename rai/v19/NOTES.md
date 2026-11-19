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

- (none yet)

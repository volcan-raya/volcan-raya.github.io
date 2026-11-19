# v20 (3.04), after v18 (3.03): two windows

The 3.0x branch goes on from **rai/v18** (rai x aya: aya v14's soup and its conversations, aya v00's simulated others,
the ⏏ zoom), not from v19. The feedback of 19/11/26. The site opens on rai/v20/.
"v07" and "v09" in the feedback are **rai's** (rai/v07/index.html, rai/v09/index.html).

## Who owns what

| | files |
|---|---|
| **A, outside** (the triangle, in/out by gradient, the eruptions) | `index.html` (the page, its CSS), `camera.js`, `volcano.js`, `field.js` |
| **B, the soup** (balls, the opened dialogue, people, the opening window) | `soup.js`, `soup.css`, `notification.js`, `notes.js` |
| **shared, by agreement only** | `core.js`: write what you need under "asks", don't edit |

Local copies now: `soup.css`, `notification.js` (../shared/ stays as v09–v17 use it). Still shared: `../../rai/shared/venting.js`.
No Mebar, no Spectral: one sans everywhere. soup.js runs with `data-ver="v20" data-flat` (settings under `volcano-v20-…`).

## Contracts between A and B

- **`V.soup.threads()`** (B) → `[{ id, s, name, emoji, replies: [{ id, s, name, emoji }] }]`: every text note with its
  replies, live ones too. A sorts by number of replies and takes the top 8 (eruption 1: the notes; eruption 2: their replies).
- **Two kinds of ball only**, from now on: unread filled, read a ring. **`V.soup.ballLook()`** (B) → `{ fill, ring, lw }`,
  so A's eruption balls look the same as the soup's.
- **Nothing scrolls the background**: anything that scrolls on its own (the opened dialogue, the opening window) has
  `data-ui`; camera.js leaves the wheel and touches over `[data-ui]` alone.
- **`V.camera.cam.s`** (0 in the soup … 1 outside) is the one number both read; `cam.soup` still says when the soup can
  be touched.
- `V.soup.jolt(k)` and `V.soup.unpick()` stay: the eruption still shakes the soup and closes an open note.
- Identity (B): localStorage `"volcano-id"` = `{ name, emoji }`; fire `document.dispatchEvent(new CustomEvent("volcano:who"))`
  when it changes.

## Git

Stage only your own files. Commits "v20 outside: …" (A) / "v20 soup: …" (B). `git pull --rebase` before every push.
Never force-push, reset, stash or checkout files you don't own.

## Asks (changes to core.js, or to the other window's files)

- (none yet)

## What A built (v20 outside), 19/11/26

- **No camera, no ⏏.** The user: "remove the eject button, we just want to scroll up and scroll down". Scrolling (wheel,
  two fingers, a drag, ↓/↑) is the only way in and out; the triangle is not a button either. Two `.sr` buttons stay for
  the keyboard (`#goIn`, `#goOutSr`). `cam.soupT` is always null and `cam.eject` false now.
- **The gradient** (field.js): the soup is painted on its own layer and taken away from the top by a soft edge as s goes
  up. `cam.inside` fades the balls out by s = .35; `cam.soup` is 1 only at s = 0.
- **The eruption** (volcano.js, `ER.mode` "v20", DEV volcano): waves for the top 8 notes, balls → lanes of words for
  their replies. It calls `V.soup.threads()` and `V.soup.ballLook()` **if they exist**, and falls back to notes.js
  (`AYA_NOTES`) and v18's ball colour until then, so B can add them whenever.

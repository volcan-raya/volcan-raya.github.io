# volcan-raya

Live: https://volcan-raya.github.io/ (opens rai's v18, 3.03)

- `rai/`: Rai's volcano, every version. `v09/` is 1.00 ecal, `v11/` is 1.01 ecal, `v12/` 1.02 and `v13/` 1.03 ecal (the same branch, going on), `v10/` is 2.00 blender, `v14/` is 3.00, `v15/` 3.01, `v16/` 3.02 and `v18/` 3.03, only text and flat (v18 is rai x aya: aya's soup and eruption, rai's zoom into the ⏏, scrolled) (1.03 and the 3.x share `shared/soup.js`), `v06`–`v08` and `_v/` the earlier ones.
- `aya/`: Aya's volcano, every version, flat like rai's: `v00`–`v02` are 1.00–1.02 the soup, `v03`–`v09` 2.00–2.06 lava letters, `v10`–`v14` 3.00–3.04 the drawn volcano. `aya/index.html` lists them.
- `nav.js`, `site.js`: the bar on top of every page; its index lists every version of every project, a row a branch.

## Adding a version

1. Make a folder in your own folder, such as `aya/v15/`, with an `index.html`.
2. End the page with the bar, pointing to this version:

   ```html
   <script src="../../site.js" defer></script>
   <script src="../../nav.js" data-path="aya/v15/index.html" data-version="v15" defer></script>
   ```
3. Add it to your project's `versions` in `site.js` (`release` puts it on a branch: 3.05 goes on after 3.04):

   ```js
   { "id": "v15", "label": "v15", "date": "2026-11-20", "msg": "…", "pages": ["index.html"], "live": true, "href": "aya/v15/", "release": "3.05" }
   ```

The notifications are in `rai/shared/notification.js`. Load it from `../../rai/shared/notification.js` to use the same ones. A change there shows in every page that loads it.

New notes stay in each visitor's browser: GitHub Pages can't run the `api.php` that shared them.

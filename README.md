# volcan-raya

Live: https://volcan-raya.github.io/ (opens rai's latest, 1.01)

- `rai/`: Rai's volcano, every version. `v09/` is 1.00 ecal, `v11/` is 1.01 ecal (the same branch, going on), `v10/` is 2.00 blender, `v06`–`v08` and `_v/` the earlier ones.
- `aya/`: Aya's iterations.
- `nav.js`, `site.js`: the bar on top of every page.

## Adding a version

1. Make a folder in your own folder, such as `aya/v00/`, with an `index.html`.
2. End the page with the bar, pointing to this version:

   ```html
   <script src="../../site.js" defer></script>
   <script src="../../nav.js" data-path="aya/v00/index.html" data-version="v00" defer></script>
   ```
3. Add it to your project's `versions` in `site.js`:

   ```js
   { "id": "v00", "label": "v00", "date": "2026-11-03", "msg": "first try", "pages": ["index.html"], "live": true, "href": "aya/v00/" }
   ```

The notifications are in `rai/shared/notification.js`. Load it from `../../rai/shared/notification.js` to use the same ones. A change there shows in every page that loads it.

New notes stay in each visitor's browser: GitHub Pages can't run the `api.php` that shared them.

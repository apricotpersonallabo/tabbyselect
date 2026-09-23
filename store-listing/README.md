# TabbySelect store listing assets

Ready-to-upload files for the browser extension stores:

- `assets/chrome-store-icon-128.png`: Chrome Web Store icon, 128 x 128
- `assets/small-promo-440x280.png`: Chrome Web Store small promotional tile, 440 x 280
- `assets/edge-logo-300.png`: Edge Add-ons logo for every listing locale, 300 x 300
- `screenshots/01-search.png`: actual extension UI on the support playground, 1280 x 800
- `amo-metadata.json`: metadata used by `web-ext sign` for the first listed Firefox submission

Run `npm run capture:store` after changing the extension UI or support playground to refresh the screenshot. The capture uses the real unpacked extension; it does not recreate the suggestion UI.

The small promotional tile uses a generated abstract background with the existing TabbySelect icon and exact typography composited afterward. Background prompt:

> Create a clean, modern cobalt-blue software-brand background suggesting keyboard navigation through dropdown choices, with subtle rounded dropdown rows on the right, a small golden-yellow accent, and generous negative space on the left. Background only; no text, logos, browser chrome, or watermark.

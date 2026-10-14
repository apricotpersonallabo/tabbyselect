# TabbySelect production site

`site/` is the production source. The shared platform renders Japanese pages at
`index.html`, `manual.html`, `privacy.html` and English pages under `en/`.
Product HTML files are body fragments; the platform owns layout, navigation and CSS.
`assets/playground.js` owns only the native-select practice status/event log.
The installed extension provides the actual suggestion UI.

- Preserve existing manual section IDs and privacy/store/contact URLs.
- Keep translations complete in both locales; no production fallback is expected.
- `public/` contains the unchanged Google verification response.
- `docs/` is retained unchanged for rollback, and is no longer the editing source.
- The pinned reusable preview checks schema, links, HTML, mobile/desktop and axe.
- Product site CI additionally tests the installed extension in both Playground locales.

See [cutover and rollback](../docs-site-cutover.md) for operation details.

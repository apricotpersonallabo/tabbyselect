# TabbySelect

## Overview

TabbySelect is a Manifest V3 browser extension for Chrome, Microsoft Edge, and Firefox. It adds keyboard-driven prefix or contains search to native single-selection HTML `select` elements. The extension supports English, German, Spanish, Japanese, Korean, Simplified Chinese, and Traditional Chinese.

## Install

Development requires Node.js 24 or later.

```sh
npm ci
npm run test:package
```

The package command creates browser-specific extension directories under `dist/store-packages/`:

- Load `dist/store-packages/chromium` as an unpacked extension in Chrome or Edge.
- Load `dist/store-packages/firefox` as a temporary add-on in Firefox.

## Version management

The release version uses `major.minor.patch` format. Keep the following files aligned when changing it:

- `src/manifest.json`
- `package.json`
- `package-lock.json`
- `STORE_SUBMISSION_MEMO.md`

The release workflow reads the release version directly from `src/manifest.json`. That version must be newer than the version already submitted to each browser store.

## Repository layout

| Path | Purpose |
|---|---|
| `src/` | Browser extension source and localized messages |
| `scripts/` | Store package builder and store publishing clients |
| `tests/unit/` | Unit and package tests |
| `tests/e2e/` | Playwright extension tests |
| `store-listing/` | Store metadata, icons, and screenshots |
| `docs/` | GitHub Pages support site and user manual |
| `.github/workflows/` | CI, support-site deployment, and store submission workflows |

## Automated tests

Run all tests locally with:

```sh
npx playwright install --with-deps chromium
npm test
```

Individual test commands are also available:

- `npm run test:unit` runs the Node.js unit tests.
- `npm run test:package` builds and validates the store packages.
- `npm run test:e2e:package` runs the Playwright tests against the Chromium package.

The `Test browser extension` GitHub Actions workflow runs on pushes and pull requests targeting `main`.

## Automated releases and store submissions

When a change to `src/manifest.json` is pushed to `main`, the `Release and publish browser stores` workflow reads its version, builds the Chromium and Firefox ZIP files, and automatically creates the `v<version>` tag and GitHub Release. To submit packages for store review, run the same workflow manually from `main` and select `all`, `chrome`, `edge`, or `firefox`.

Configure the `browser-stores` GitHub Environment before submitting:

- Repository variables: `CHROME_PUBLISHER_ID`, `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `EDGE_PRODUCT_ID`, and `EDGE_CLIENT_ID`.
- Environment secrets: `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`, `EDGE_API_KEY`, `AMO_JWT_ISSUER`, and `AMO_JWT_SECRET`.

If only one store fails, rerun the workflow for that store with the same version.

## User manual

In the settings page, choose **Prefix match** (default) or **Contains match**. For example, `Ja` matches `Japan` in prefix mode, while `pan` matches it in contains mode. Both modes ignore case and trim leading and trailing whitespace. Changes are saved automatically and apply to open pages and their iframes.

Focusing a select waits for a key before opening the search field, including after mouse interaction. This behavior is always enabled and has no setting to turn it off. Arrow keys, Escape, Tab, modifier keys alone, and shortcuts keep their normal behavior while the select is focused. The browser handles key presses while its native dropdown is open.

A separate **Switch an open select list to suggestions on a key press** setting uses `appearance: base-select` on supported browsers. It is off by default and changes the select and list appearance. When the list is open, a key closes it and opens search with the first character preserved; the value changes only on confirmation. Arrow keys, Escape, Tab, modifier keys alone, and shortcuts keep their normal behavior while the select is focused. Turning the setting off restores the original rendering. The setting is unavailable on browsers that lack support.

Single-selection selects support the same search behavior regardless of their `size` attribute. While open-list switching is enabled, selects temporarily use `size="1"` so every list can open the same picker. Turning the setting off restores the original attribute, including size changes made by the page while the setting was enabled.

The user manual and interactive playground are available at [apricotpersonallabo.github.io/tabbyselect/manual.html](https://apricotpersonallabo.github.io/tabbyselect/manual.html). The source is maintained in `docs/manual.html`.

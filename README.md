# TabbySelect

## Overview

TabbySelect is a Manifest V3 browser extension for Chrome, Microsoft Edge, and Firefox. It adds keyboard-driven prefix search to native single-selection HTML `select` elements. The extension supports English, German, Spanish, Japanese, Korean, Simplified Chinese, and Traditional Chinese.

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

The version submitted through GitHub Actions must exactly match `src/manifest.json` and must be newer than the version already submitted to each browser store.

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

## Automated store submissions

Run the `Publish browser stores` workflow manually from `main`. Supply the version from `src/manifest.json` and select `all`, `chrome`, `edge`, or `firefox`. The workflow builds the Chromium and Firefox ZIP files, publishes them on the `v<version>` GitHub Release, and submits the selected packages for store review.

Configure the `browser-stores` GitHub Environment before submitting:

- Repository variables: `CHROME_PUBLISHER_ID`, `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `EDGE_PRODUCT_ID`, and `EDGE_CLIENT_ID`.
- Environment secrets: `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`, `EDGE_API_KEY`, `AMO_JWT_ISSUER`, and `AMO_JWT_SECRET`.

If only one store fails, rerun the workflow for that store with the same version.

## User manual

The user manual and interactive playground are available at [apricotpersonallabo.github.io/tabbyselect/manual.html](https://apricotpersonallabo.github.io/tabbyselect/manual.html). The source is maintained in `docs/manual.html`.

# TabbySelect

## Overview

TabbySelect is a Manifest V3 browser extension for Chrome, Microsoft Edge, and Firefox. It adds keyboard-driven prefix or contains search to native single-selection HTML `select` elements. The extension supports English, German, Spanish, Japanese, Korean, Simplified Chinese, and Traditional Chinese.

## Install

After the first installation, a welcome page opens in a new tab with basic instructions, Open settings, View the manual, and Close actions. It does not open automatically on updates or browser startup. Reload pages that were open before installation if needed.

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

`CHROME_CLIENT_ID` and `EDGE_CLIENT_ID` may also be stored as environment secrets. The workflow uses the variable when configured and otherwise falls back to the same-named secret.

If only one store fails, rerun the workflow for that store with the same version.

## User manual

In **Enabled URL settings**, turn on **Enable URL filter** to apply the saved URL patterns. The checkbox defaults to off for new and existing users. While off, all HTTP/HTTPS pages are eligible and the pattern field is disabled; saved patterns are retained. With the filter on, an empty pattern list also allows all HTTP/HTTPS pages. Changes apply to open pages and their iframes. The popup enable/disable toggle still controls whether the extension runs.

Use **Export** in the settings page to download `tabbyselect-settings.toml`, and **Import** to restore settings from a file. The file includes URL filtering, URL patterns (even while the filter is off), search mode, and mouse-click suggestions. Importing updates only the included settings and applies them to open pages and iframes; the overall extension enabled state and debug logging are unchanged. Invalid values or duplicate settings reject the file without changing saved settings.

The supported TOML format uses single-line string arrays, double-quoted strings, booleans, blank lines, and whole-line comments. URL pattern whitespace and empty lines are removed:

```toml
# TabbySelect settings
url_filter_enabled = false
url_allow_patterns = ["https://example.com/*"]
search_mode = "contains"
show_suggestions_on_mouse_focus = true
move_focus_after_enter = true
```

In the settings page, choose **Prefix match** or **Contains match** (default). For example, `Ja` matches `Japan` in prefix mode, while `pan` matches it in contains mode. Both modes ignore case and trim leading and trailing whitespace. Changes are saved automatically and apply to open pages and their iframes.

After you interact with the page, focusing a native, single-selection select opens the
search field immediately, including through Tab navigation and programmatic focus.
After navigation, autofocus and delayed scripted focus alone do not open suggestions
until you interact with the page. Mouse clicks open suggestions by
default; disable **Show suggestions when clicking a select** in settings to keep
the browser's native picker on mouse clicks. Touch focus continues to open suggestions.
Keyboard search is always enabled. Arrow keys move the highlight, Enter/Tab confirm,
and Escape clears the query or closes suggestions. After closing with Escape, a
new qualifying key or mouse click can reopen the UI without a focus-change loop.

**Move to the next field after confirming with Enter** is on by default. Turn it
off under **Keyboard controls** to confirm the option, close suggestions, and keep
focus on the same select. Changes apply immediately to open pages and iframes.
Tab and Shift+Tab navigation are unchanged. Older TOML imports that omit
`move_focus_after_enter` preserve the current preference.

The active select is outlined in blue, and the suggestion UI displays its field
name (from ARIA attributes or associated labels), or “Search options” when unnamed.
Mouse-wheel or trackpad scrolling outside the UI dismisses it without confirming
a pending option and returns focus to the select. Scrolling inside the UI keeps it
open. Wheel dismissal is local to the same document, including within iframes.

Options are filtered using prefix or contains mode. No select value changes until
a candidate is confirmed. Mouse clicks on suggestion items also confirm selection.
The former experimental base-select picker-switch setting is obsolete.

The user manual and interactive playground are available at [apricotpersonallabo.github.io/tabbyselect/manual.html](https://apricotpersonallabo.github.io/tabbyselect/manual.html). The source is maintained in `docs/manual.html`.

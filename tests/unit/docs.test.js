const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const docs = path.join(root, "docs");

test("ships a static GitHub Pages support site", () => {
  for (const file of ["index.html", "manual.html", "privacy.html", "styles.css", "site.js", "assets/icon-128.png"]) {
    assert.equal(fs.existsSync(path.join(docs, file)), true, `${file} should exist`);
  }
});

test("keeps support page styles and scripts external", () => {
  for (const file of ["index.html", "manual.html", "privacy.html"]) {
    const html = fs.readFileSync(path.join(docs, file), "utf8");
    assert.doesNotMatch(html, /<style\b/i);
    assert.doesNotMatch(html, /<script(?![^>]+src=)/i);
    assert.doesNotMatch(html, /<!--/);
    assert.match(html, /href="styles\.css"/);
    assert.match(html, /src="site\.js"/);
  }
});

test("links both support pages and provides a native select playground", () => {
  const home = fs.readFileSync(path.join(docs, "index.html"), "utf8");
  const manual = fs.readFileSync(path.join(docs, "manual.html"), "utf8");
  assert.match(home, /href="manual\.html"/);
  assert.match(manual, /href="index\.html"/);
  assert.match(home, /href="privacy\.html"/);
  assert.match(manual, /href="privacy\.html"/);
  assert.match(manual, /data-playground/);
  assert.ok((manual.match(/<select\b/g) || []).length >= 3);
});

test("publishes a complete privacy policy without placeholder URLs", () => {
  const privacy = fs.readFileSync(path.join(docs, "privacy.html"), "utf8");
  const siteScript = fs.readFileSync(path.join(docs, "site.js"), "utf8");
  assert.match(privacy, /data-i18n="privacyProcessedTitle"/);
  assert.match(privacy, /data-i18n="privacySharingTitle"/);
  assert.match(privacy, /data-i18n="privacyRetentionTitle"/);
  assert.doesNotMatch(siteScript, /YOUR_GITHUB_ACCOUNT|DropDownHelper/);
  assert.match(siteScript, /github\.com\/apricotpersonallabo\/tabbyselect/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

function pngDimensions(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

test("ships correctly sized store listing assets", () => {
  assert.deepEqual(pngDimensions("store-listing/assets/chrome-store-icon-128.png"), {
    width: 128,
    height: 128
  });
  assert.deepEqual(pngDimensions("store-listing/assets/small-promo-440x280.png"), {
    width: 440,
    height: 280
  });
  assert.deepEqual(pngDimensions("store-listing/assets/edge-logo-300.png"), {
    width: 300,
    height: 300
  });
  assert.deepEqual(pngDimensions("store-listing/screenshots/01-search.png"), {
    width: 1280,
    height: 800
  });
});

test("ships complete AMO metadata and finalized store copy", () => {
  const metadata = JSON.parse(
    fs.readFileSync(path.join(root, "store-listing/amo-metadata.json"), "utf8")
  );
  const memo = fs.readFileSync(path.join(root, "STORE_SUBMISSION_MEMO.md"), "utf8");
  assert.deepEqual(metadata.categories, ["other"]);
  assert.equal(metadata.version.license, "Apache-2.0");
  assert.ok(metadata.summary["en-US"]);
  assert.ok(metadata.summary.ja);
  assert.doesNotMatch(memo, /YOUR_GITHUB_ACCOUNT|DropDownHelper|TabbyPaste|<要決定/);
});

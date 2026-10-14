# TabbySelect Pages cutover

Only `apricotpersonallabo/tabbyselect` switches production. Tabby Paste and
Tabby BB Monitor retain their current Pages sources and platform pins.

## Production contract

- Source: `site/`, rendered/validated by the full-SHA-pinned site-platform workflow.
- Pages configuration: GitHub Actions (`build_type: workflow`).
- Default Japanese URLs stay `/tabbyselect/index.html`, `manual.html`, `privacy.html`.
- English pages live under `/tabbyselect/en/`. Language switching preserves the page.
- Manual anchors `#setup`, `#keyboard`, `#playground`, `#limitations` remain valid.
- Verification file stays at `/tabbyselect/googlef48cfc175b4cddb4.html` unchanged.
- `docs/` is retained byte-for-byte as a legacy rollback snapshot; don't edit it.
- No extension runtime, manifest, store package, or store publication changes.

Before merging, require extension CI, reusable preview (schema/build/HTML/links,
mobile/desktop/axe) and product-specific site tests (both real-extension Playground
locales). The copy parity test compares every localized main-content key against
the legacy site's runtime translations, including the complete privacy policy.
The new site uses the shared platform layout rather than the legacy page design.

After merge, verify the deploy workflow succeeds and test the public Japanese and
English pages, native-select Playground, icon, stylesheet/script and verification
response. A generated production page must not display a migration/fallback notice.

## Rollback

1. Revert the TabbySelect cutover PR on main, restoring the previous deploy workflow,
   preview pin, and production-source instructions. `docs/` has not been changed.
2. Restore Pages source through repository Settings → Pages → Deploy from a branch,
   branch `main`, folder `/docs` (`build_type: legacy`).
3. Wait for the Pages build to succeed and verify index/manual/privacy and Google
   verification at their existing URLs. The former deploy workflow may also be
   dispatched with the docs artifact if Actions publishing is preferred.

Revert the cutover workflow before changing Pages settings so a subsequent push
cannot redeploy the new site. Do not modify the other products or delete the legacy
snapshot during rollback. Record the successful production run in the cutover PR.

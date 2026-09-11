# Card editor copy cleanup

Date: 2026-09-11. Builds on `1fc79d8`, branch `feat/formal-baseline-refinement`.

## Scope

- Remove the editor's AI polishing button, import, handler, loading state, completion note, related disabled conditions and unused styling. Manual biography entry remains available.
- Remove repeated editor marketing captions, English section labels, explanatory footnotes and empty preview sections. Preserve concise field limits, optional markers, save/error feedback and accurate local-storage/contact scope.
- Use an opt-in `concisePreview` component property only in the editor. Other uses retain their existing rendering. Data filtering, contact permissions and verification checks are unchanged.
- No image files, other page layouts, dependencies or cloud source changed. No AI provider or account is configured or removed by this UI change.

## Verification

- `npm run build`: exit 0. Foundation validation: 339 passed, 0 failed. Tests: 402 total, 396 passed, 0 failed, 6 optional component-simulation tests skipped. Package checks passed.
- Added checks that the editor no longer exposes the AI feature; manual name/city validation, saving and native sharing still use the entered data. Added opt-in preview/empty-section and unchanged privacy-filter checks.
- Actual WeChat Developer Tools: entered synthetic name, profession, Hangzhou city, custom tag and biography through the form controls; selected ink theme; clicked Save and observed completed preview with the saved content.
- Actual editor screenshot confirms no AI button; optional phone/email and field limits remain. Preview screenshot confirms simplified header and no empty gallery.
- Invoked the actual `onShareAppMessage` handler; its promise returned a receiver route with a snapshot and prepared cover. Opened that route in the simulator and verified the same test name and manually entered biography. This is simulator verification, not delivery between two physical WeChat accounts.
- Restored all app-owned storage used by the tests and returned to the original Discover route. Synthetic test identity is not shipped.
- `git diff --check`: exit 0. Image file diff is empty.
- Developer Tools preview: exit 0, `preview` success. Package bytes: total 2,234,754; main 1,895,772; Card 117,746; Admin 67,164; Art 67,372; Events 32,191; Social 54,509.

Artifacts are local under `E:\Temp\abclub-formal-refinement-verification\`: `build-editor-cleanup.log`, `editor-cleanup-form.png`, `editor-cleanup-preview.png`, `preview-editor-cleanup-info.json`, and `preview-editor-cleanup-qr.png`.

Runtime remains `OFFLINE_DEMO`. No CloudBase deployment, public release, review submission or physical-account delivery is implied.

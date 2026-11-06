# IDW browser verification

**Result: IDW journey passed; heading localization gap found and corrected.** Tested the dev-only harness
`/tests/idw.html?module=maps` and `?module=maps&incomplete` on the running
NitroCrop web workflow. All data were invented and the observation responses
were in-memory mocks; no authentication, real data, API server, or database
was accessed. No dependencies were changed.

## Observed results

- Uploaded only `tests/fixtures/idw.kml`: one synthetic polygon and four GPS
  observations (`QA-IDW-1`–`QA-IDW-4`), all at 30.0 kg/ha. IDW produced 100
  grid points with min/mean/max 30.0 kg/ha, in UTM 33N.
- UI summary: area 0.99 ha; planned 100 kg N/ha and 99.5 kg total; applied +
  IDW 50 kg N/ha and 49.7 kg total; savings 50 kg N/ha, 50.0%, and 49.7 kg
  total. The total follows the polygon's unrounded UTM area, not rounded 0.99 ha.
- Switching Italian → English → Spanish → Italian did not rerun or clear the
  result. Summary, explanatory copy, comparison rows/headers, map-inspection
  copy, statistics, and export controls followed the selected language.
  Clicking inside the polygon showed an interpolated 30.0 kg N/ha cell at
  42.000481, 12.000641 (not a GPS reading); values persisted. Survey → Maps
  also preserved the result and selected inspection.
- Fresh processing was repeated with English and Spanish selected before
  import/process; both first-render results had the same values and translated
  result copy.
- At 390 × 844, the 49.7 kg and 50.0% headline values and comparison rows were
  stacked/readable. The page measured 375 px wide in a 390 px viewport and the
  savings region was 301 px wide / 299 px scroll width (no savings-panel or
  page-level horizontal overflow). The GPS input table has its own horizontal
  scrollbar. Viewport was restored to 1280 × 900.
- In `&incomplete`, processing still produced the map/result and both download
  buttons, but savings correctly displayed `—`, not zero. Status, reason,
  recovery guidance, and accessible names translated in Spanish, English, and
  Italian (`no disponible`, `not available`, `non disponibile`).

## Exports

All six files were downloaded using the UI and saved under
`artifacts/ndvi-tabacco/generated-artifacts/idw-browser/`:
`it|en|es-shapefile.zip` and `it|en|es-result.tif`. Parsed using the workspace
`jszip`, `shpjs`, and `geotiff` packages. Each ZIP contains SHP/SHX/DBF/PRJ
and nitrogen-summary CSV; `shpjs` parsed 100 Point features. Attributes and
CSV agree on 100/50/50 kg N/ha and 99.5/49.7/49.7 kg totals. Each TIFF is a
single-band 10 × 11 `Float32Array`, WGS84 EPSG:4326, NODATA −9999; its raster
values are 30 and −9999. All three languages' machine fields, filenames,
values, and Italian ImageDescription metadata are identical, as expected.

## Issue and limitations

- **Localization gap found during the browser pass:** with English or Spanish selected, the page heading
  remains Italian: `[data-testid="module-heading"]` /
  `[data-testid="text-module-title"]` = `Elaborazioni e Mappe`. The header
  links also remain bilingual (`Mappe / Maps`, `Rilievo / Survey`), and the
  static QA notice contains `solo GPS sintetici` in Italian. The missing plain
  heading catalogue entry was subsequently added with exact regression
  assertions for English and Spanish. The test header now follows the selected
  language too. This small copy fix was verified by unit tests and a screenshot,
  not by repeating the full browser pass. Result-panel copy itself was
  translated. Fixture labels (`Campo sintetico IDW`, `QA sintetico`)
  are data and were not counted as untranslated UI copy.
- One generic resource 404 appeared in the browser log after import; the log
  did not expose a URL. Satellite imagery rendered in later map views and the
  IDW overlay/inspection worked. This is recorded separately as an optional
  basemap/network observation, not an IDW failure.
- This verifies the explicitly dev-only in-memory integration harness, not
  authentication, production deployment, real observations, or server-side
  persistence. The incomplete scenario's map and download controls were
  available; incomplete-mode files were not downloaded.

The runner exposes screenshot references rather than workspace file paths, so
no screenshot files were fabricated. Relevant browser-observation IDs:
`5dspht` (fixture/four GPS observations), `3x4729` (map inspection),
`noefw3` (390 px savings rows), and `x4dxd2` (Italian unavailable savings/map).
These can be attached from the original browser run.

`tests/idw-browser-pass.mjs` retains a reusable helper that accepts an injected
Playwright `page`; it adds no dependency. It was not run as a standalone script
because this workspace does not include a Playwright Node package.

## Final checks after the copy correction

- `pnpm --filter @workspace/ndvi-tabacco test`: 49 passed, including the
  plain module-heading English/Spanish catalogue regression.
- `pnpm --filter @workspace/ndvi-tabacco typecheck`: passed; fixtures and
  the development harness are included in TypeScript checking.
- Production Vite build: passed; `dist/public/tests/idw.html` is absent.
  Existing chunk-size and mixed static/dynamic import warnings remain.
- English heading screenshot: `screenshots/idw-heading-en.jpg` shows
  “Processing and maps” with English selected, along with localized test
  navigation. The workflow restarted cleanly. A generic resource 404 still
  appears in the screenshot browser log without identifying the resource.
- Download output folders are excluded from Git and deployment inputs.

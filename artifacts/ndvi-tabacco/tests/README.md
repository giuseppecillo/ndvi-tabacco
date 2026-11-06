# IDW: synthetic browser verification

The development-only entry `/tests/idw.html?module=maps` renders the real `App`,
`ElaborazioniMappe`, `NitrogenSavings`, language selector and Vite localization
transform. It does not render authentication: this is a component integration
test, not a verification of account access. The production entry and build are
unchanged.

All observation fetches are fulfilled in memory with `fixtures/idw.ts`; every
other `fetch` fails explicitly. No database, credentials, real observations or
write endpoints are used. Leaflet basemap image requests are independent of
`fetch`; their availability is not necessary to test the IDW overlay.

## Reproduce

1. Start the existing NitroCrop web workflow.
2. Open `/tests/idw.html?module=maps`. Select Italiano.
3. Upload `tests/fixtures/idw.kml` using the polygon input.
4. Confirm four GPS observations. Run “Spazializza i tuoi dati”.
5. Expected per-hectare comparison: planned **100**, applied + IDW **50**,
   saved **50 kg N/ha**, saving **50.0%**. Area is about **0.99 ha**;
   saved total is about **49.7 kg N**. Use the actual UTM polygon area,
   not rounded hectares, to check totals.
6. After the result, change to English, Español and back to Italiano.
   Labels, explanatory text, map inspection, stats and download buttons must
   follow the selected language without recomputing or losing numeric values.
   Customer, polygon name and observation IDs must stay unchanged.
7. Visit Survey and return to Maps using the test header links. Results remain.
8. Download Shapefile ZIP and GeoTIFF in each language. Parse the files, not only
   the download event: ZIP contains SHP/SHX/DBF/PRJ and nitrogen CSV; TIFF is a
   Float32 WGS84 raster with NODATA -9999 and the nitrogen summary.
   Machine field names, filenames and current export metadata stay stable
   across UI languages; these files do not promise localized metadata.
9. Repeat the result/language checks at 390px width. Both headline values and
   stacked comparison rows must be readable without horizontal scrolling.
10. Open `/tests/idw.html?module=maps&incomplete`, import and process again.
    One synthetic observation lacks planned N. The map and downloads remain
    available, but savings must be unavailable, never an invented zero.
    The explanation and unavailable aria-labels must translate in all languages.

Existing algorithm, export parsing and catalogue regression tests:
`pnpm --filter @workspace/ndvi-tabacco test`.

## KMZ / Shapefile import verification

`fixtures/idw-imports.mjs` generates tiny, entirely invented binary fixtures in
memory: root and nested-KML KMZ, a clockwise WGS84 polygon Shapefile ZIP, and a
four-point Shapefile ZIP with `DOSE=60` and `KG_HA=30`. It does not reuse the
application export writer. Neither fixture creation nor test execution uses
credentials, APIs or a database.

Check the fixture structure with an independent Shapefile reader:
`node --test tests/import-fixtures.test.mjs` (from this artifact directory).

With an existing Playwright `page`, call
`runIdwImportBrowserPass(page, { baseURL, downloadDir })` from
`idw-import-browser-pass.mjs`. The single journey covers desktop (1280 px) and
phone (390 px), all three languages and:

- equivalent 100-cell geometry/doses for KML, both KMZ variants and polygon ZIP;
- localized polygon count, point-field feedback and invalid-KMZ errors;
- automatic `DOSE` selection (60), explicit `KG_HA` selection (30), and parsed
  exported grid equivalence to the synthetic observation baseline;
- unavailable savings (not zero), translated explanations and aria-labels for
  external points without a complete N plan;
- stale geometry/results cleared after invalid imports and recovery on a new ZIP.

The browser helper additionally aborts every `/api/**` request. Save downloaded
evidence under ignored `generated-artifacts/`, not in the source fixture folder.

### Verification performed

The isolated browser journey was checked at 1280 px and 390 px. KML, root KMZ,
nested KMZ and polygon ZIP produced equivalent 100-cell IDW grids (UTM zone 33).
The maximum coordinate difference was 1.42e-14 degrees; dose rounding noise was
at most 7.11e-15 kg/ha. The registry baseline showed 50% savings. External point
fields produced 60 (`DOSE`) and 30 (`KG_HA`) kg/ha with unavailable savings.
Italian, English and Spanish import/unavailable feedback, invalid-KMZ clearing,
ZIP recovery and the phone layout were verified.

The remote runner could not execute the Node helper or independently parse
downloaded exports. It instead compared the actual browser parser/IDW output
through `geoUtils.ts`; Node fixture tests independently parsed the input ZIPs.
This is an import verification, not a new claim about downloaded-export fidelity.

## Multi-layer Shapefile archives

Polygon import intentionally includes **all Polygon/MultiPolygon layers** and
shows the original layer name and feature ID beside each field name. Two fields
with the same name or ID in different layers remain separate selectable fields.
Non-polygon geometries are excluded, as stated in the localized import message.

Point import intentionally uses **one layer at a time**. A multi-point-layer
archive requires an explicit selection; a single compatible layer is selected
automatically. Switching layers replaces (never appends) control points and
clears computed results. Overlapping coordinates/IDs across layers therefore
cannot accidentally double their IDW weight. Fields are detected separately per
layer and must be numeric for all its points; absent/blank doses are not zero.
This does not deduplicate records within a source layer.

`fixtures/idw-imports.mjs:createMultiLayerFixtures()` creates real ZIPs with
two polygon layers, two point layers (same IDs/coordinates, different rates and
schemas), mixed layers and each incompatible-first ordering. No production
data, writer, credentials or database is used. ZIP bytes are generated in
memory, rather than committed as opaque binaries.

Run the regression suite with the normal artifact `test` command or just:
`pnpm --filter @workspace/ndvi-tabacco exec tsx --test tests/multilayer.test.mjs`.
For UI reproduction, call `runMultiLayerBrowserPass(page, { baseURL })` from
`multilayer-browser-pass.mjs` with a Playwright page and the existing dev preview.
It targets the same isolated `/tests/idw.html?module=maps` harness and aborts
`/api/**`; covers desktop/mobile, all three languages, layer selection, unchanged
names/IDs, field switching, four-not-eight points, stale-result clearing,
mixed geometries, corrupt-file clearing and recovery.

Verified in the isolated browser harness: both polygon layers and IDs, required
point-layer selection, four rows (not eight), 60/90 kg/ha layer-specific rates,
result clearing on layer change, mixed-layer compatibility, IT/EN/ES policies
and corrupt-file errors, rejection of incompatible-only archives and recovery.
Desktop was checked at 1280px and the narrow layout at 390px without horizontal
overflow. The runner used request-context synthetic JSON payloads because local
Node helper imports were unavailable; API abort routing stayed enabled. These
checks do not claim an authenticated-account or database verification.

## Interior exclusions (holes)

`pnpm --filter @workspace/ndvi-tabacco test` includes `holes.test.mjs`, using only
the invented `fixtures/idw-holes.kml` and in-memory KMZ/Shapefile archives.
`@xmldom/xmldom` supplies the XML DOM only inside Node tests.

The suite compares KML, KMZ and Shapefile imports of the same two holes, verifies
MultiGeometry/MultiPolygon ring ownership, namespaces, open/closed/reversed
rings, excluded control points and boundary inspection, and compares net metric
area and nitrogen totals. A varying-dose regression confirms that retained grid
nodes keep the exact same IDW values. Legacy no-hole imports keep 100 cells.
SHP/DBF/CSV and Float32 GeoTIFF downloads are reopened with independent readers:
no exported point is inside a hole; raster pixels whose centres are in holes
are NODATA. Raster masking remains limited by the existing pixel resolution.

For a native-canvas visual check, open `/tests/idw-holes.html` in the existing
web workflow. This development-only page renders the actual map and nitrogen
summary, without authentication, APIs or storage. Before rendering, it checks
transparent pixels inside both holes (including near edges) and a painted
cultivated pixel. A failed check throws rather than displaying PASS. Click/tap
in either outlined hole to confirm the normal no-dose inspection feedback.
Basemap tiles may load independently, but are not required for these checks.

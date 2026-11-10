## Storico e cancellazione — due contesti browser isolati

Con il workflow web NitroCrop attivo, dalla radice del workspace:

```sh
BASE_URL="https://<preview-di-sviluppo>" \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/repl/tools/bin/chromium \
node artifacts/ndvi-tabacco/tests/observation-deletion-browser-pass.mjs
```

Il percorso Chromium è opzionale se il browser Playwright è già installato.
Il comando non avvia backend, non effettua login e non consulta database.
Monta il vero `App` nell'entry DEV `observation-deletion.html`; due contesti
separati condividono soltanto record inventati nella memoria del runner tramite
`qaObservationTransport`. API reali, richieste esterne, scritture di rete,
service worker e WebSocket sono bloccati prima della navigazione.

Verificati con esito positivo: sincronizzazione dopo focus e intervallo reale
di 30 secondi; GET ritardati ignorati dopo cancellazione su entrambe le viste;
storico conservato dopo errore di rete e ripristino dell'aggiornamento; conferma
annullata senza DELETE; rifiuto della cancellazione singola senza perdita del
record; cancellazione massiva dei soli recenti; uguaglianza degli ID tra registro
e storico, senza duplicati. Pulsanti scaduti/legacy e spiegazioni controllati in
IT/EN/ES a 1280×900 e 390×844. Tabelle larghe scorrono internamente; il documento
mobile non presenta overflow orizzontale.

Report JSON/Markdown e screenshot sono salvati sotto
`generated-artifacts/observation-deletion/` (ignorato da Git e deployment).
Questa è una simulazione Chromium, non una prova di Safari o di dispositivi
fisici. Gli inserimenti sono sintetici: non verifica salvataggio reale,
autenticazione o sincronizzazione del backend. Dettagli e limiti:
[`docs/observation-deletion-verification.md`](../docs/observation-deletion-verification.md).

## Dose precision after reload — standalone browser regression

From the workspace root run:

```sh
pnpm --filter @workspace/ndvi-tabacco test:dose-browser
```

Requires Playwright Chromium (`pnpm --filter @workspace/ndvi-tabacco exec
playwright install chromium`) and Poppler's `pdftotext` on PATH. Optionally set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium binary.
The command owns a private loopback Vite server on a free port and cleans up
the browser/server on success or failure. No running API, account, secrets,
database, BASE_URL or previous generated fixtures are used. It never logs in
or changes authentication; the existing DEV-only synthetic harness mounts the
real components with its localStorage fetch substitute.

Covers four real UI saves (tomato/Kiwi, residual 0.06/0.16), reload, legacy
0.006, registry/chart accessible table/history/details/GPS, and real downloaded
PDF/XLSX/CSV bytes compared by ID. KML is generated in the test. APIs, external
hosts, non-read HTTP requests, service workers and WebSockets are blocked before
navigation. Reports/downloads/screenshots go under this artifact's ignored
`generated-artifacts/catalogue-dose-regression/`. Failures exit nonzero and
write `failure.json` plus a screenshot.

Independent export-reader positive/negative unit tests run with the usual
artifact `test` command (`tests/catalogue-dose-exports.test.mjs`). Full scope,
prerequisites and limitations: `docs/precisione-dosi-pomodoro-catalogo.md`.

# IDW: synthetic browser verification

## Compiled GIS regression

Run `pnpm --filter @workspace/ndvi-tabacco test:gis-compiled`.
Install Chromium once with
`pnpm --filter @workspace/ndvi-tabacco exec playwright install chromium`, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium executable
(in this workspace: `/repl/tools/bin/chromium`).

This command loads the real `vite.config.ts` in production mode, including
localization and ES-module workers, but selects `tests/gis-compiled.html` as a
separate test-only entry. It builds twice, at `/` and `/qa/nitrocrop/`, then runs
the shared GIS browser journey in fresh browser contexts. A loopback-only static
server serves the built files: no Vite development middleware, SPA fallback,
API proxy, account, secrets or database. Browser routing blocks APIs and external
hosts; CSP additionally disables network connections, including in workers.
Observation reads are answered in memory with the invented fixture.

Checks cover KML, KMZ (root and nested uppercase KML), real polygon/point SHP
ZIPs, all six excessive archives (including false ZIP sizes), a 10 MiB + 1 byte
file on both importers, IT/EN/ES errors and 390px recovery. Each rejection must
remove the map, visible point rows where applicable and download controls, and
disable computation. No download event is allowed. A UI heartbeat must advance
after each rejection and never stall for two seconds across the journey.

The command checks that the emitted GIS worker **and its actual dynamic-import
chunk filenames** are requested successfully under each prefix, and confirms
native `DOMParser` is absent in a real module worker. Successful KML/KMZ imports
therefore exercise the bundled XML parser, not the page's native DOM.
Finally, the normal application is built separately and checked for accidental
inclusion of the synthetic harness/data. Normal application build inputs and
authentication are not changed.

Outputs, screenshots and `report.json` are under
`generated-artifacts/gis-compiled/` (ignored by Git and deployment).
The runner exits nonzero on failure, stores failure evidence, and closes its
browser/static servers automatically. This is a Chromium component regression;
it does not verify signed-in flows, production data or other browser engines.

## Browser GIS resource budgets

Imports are local only: maximum **10 MiB file**, **32 MiB actual expanded ZIP
data**, **128 ZIP entries**, **16 layers**, **10,000 features** and **100,000
vertices**, summed across layers. KML folders count toward the layer budget;
all ZIP members (even unrelated attachments) count toward the byte budget.
Encrypted, multipart and ZIP64 archives are unsupported. Failed imports discard
the whole attempt, never a silently truncated subset.

The browser parses KML/KMZ/SHP in a dedicated module worker with a **15-second
deadline**. Replacement/unmount terminates obsolete workers. ZIP directory sizes
are checked before inflation, and sequential streamed inflation checks the real
output too, so lying headers cannot bypass the byte budget. SHP/DBF record
counts are checked before the Shapefile parser allocates output.

`gis-limits.test.mjs` generates all archives in memory, including forged ZIP
size fields, and verifies limits, translation, clearing/recovery and worker
deadline/cancellation. Run with the normal `test` command.
`runGisLimitsBrowserPass(page, { baseURL })` in `gis-limits-browser-pass.mjs`
checks the real component import/reject/recover journey without auth or APIs.
It verifies that result/export controls disappear and spatialization is blocked
after either failed importer, with IT/EN/ES messages and narrow-screen recovery.
It uses only `fixtures/gis-limits.mjs` and `fixtures/idw-imports.mjs`; no database
or real observations are involved.

Verified in the isolated browser: valid polygon ZIP/KMZ and four-point ZIP
recovery, all six excessive-archive fixtures, a 10 MiB + 1 byte file, translated
size errors in all three languages, and cleared map/rows/exports with disabled
compute after rejection. A UI heartbeat advanced during forged-size rejection.
Recovery and export-control visibility were also checked at 390px. This does
not claim verification of authenticated accounts, databases or export contents.

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

## Account-switch races in observation history

Run the isolated regression against the already-running NitroCrop preview:

```sh
BASE_URL=https://<preview> node artifacts/ndvi-tabacco/tests/observation-scope-browser-pass.mjs
```

This pass is also included in `observation-deletion-browser-pass.mjs`.
It uses the development-only deletion harness with synthetic account buttons,
not authentication. The runner supplies separate in-memory records per account,
including an intentionally identical observation ID in both accounts.
Real API traffic, network writes, external hosts and WebSockets remain blocked;
no API server, database, credentials or localStorage observation seed is needed.

The hook probe changes `storageScope` without remounting and records committed
renders. It checks immediate clearing while B's GET is held, rejection of A's
late GET, and an A→B→A→B round trip with an obsolete error. The real App cases
hold both A's GET and its single/bulk DELETE, switch to B, then release successful
and failed mutations before or after B's response. B must keep its own shared-ID
record, show no stale error, have enabled controls and receive no refresh from
A's mutation completion. The synthetic transport intentionally ignores aborts.

Reports and screenshots go to `generated-artifacts/observation-scope/` (or the
full deletion pass's `account-switch/` directory), outside Git. Chromium results
do not verify real authentication, physical iPhones, Safari or production data.

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

### Holes crossing the equator

Run just this regression with
`pnpm --filter @workspace/ndvi-tabacco exec tsx --test tests/holes.test.mjs`.
`createEquatorHoleImportFixtures()` generates invented KML, KMZ and real binary
Shapefile ZIPs in memory. Both the field and its rectangular hole cross latitude
zero, with field centres at +0.00005° and -0.00005° selecting UTM 33N and 33S.
Each format checks equivalent varying-dose grids, excluded interior/edge/vertex
controls, no-dose inspection, and unchanged retained nodes against a no-hole
baseline. Reopened point Shapefiles contain only cultivated nodes; reopened
EPSG:4326 GeoTIFFs preserve georeferencing and dose values, with NoData pixels
inside the hole on **both** sides of the equator. Rectangle-based expectations
are independent of production point-in-field logic, and positive node/pixel
counts prevent empty-output false passes. No browser, API, secrets or database
are involved; this does not claim a visual canvas or pointer-event check.

For a native-canvas visual check, open `/tests/idw-holes.html` in the existing
web workflow. This development-only page renders the actual map and nitrogen
summary, without authentication, APIs or storage. Before rendering, it checks
transparent pixels inside both holes (including near edges) and a painted
cultivated pixel. A failed check throws rather than displaying PASS. Click/tap
in either outlined hole to confirm the normal no-dose inspection feedback.
Basemap tiles may load independently, but are not required for these checks.

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

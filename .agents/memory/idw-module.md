---
name: IDW module architecture
description: Key decisions for the Elaborazioni e Mappe IDW interpolation module
---

## Architecture

- `src/utils/geoUtils.ts` — all spatial utilities: KML parser, IDW engine, shapefile writer, GeoTIFF writer, CSV export
- `src/ElaborazioniMappe.tsx` — UI component; receives `osservazioni: Observation[]` from App

## CRS pipeline

1. Input: WGS84 (EPSG:4326) — KML polygons + GPS observation coordinates
2. Grid generation: UTM (auto-zone via `Math.floor((lng+180)/6)+1`), `proj4` library
3. Distance computation for IDW: metres (UTM) — **why**: degree-based distances give incorrect weights at non-equatorial latitudes
4. Output: WGS84 — all exports (Shapefile, GeoTIFF, canvas preview)

## IDW formula

Shepard (1968): `Z(p) = Σ[zᵢ/dᵢᵖ] / Σ[1/dᵢᵖ]`
- Default power p=2
- Coincident point threshold: d < 0.001 m → return exact value

## Control point sources

- `"db"`: from observations in PostgreSQL with GPS coords; auto-matched to polygon by `appezzamento` name (substring match)
- `"shp"`: user-uploaded ESRI Shapefile ZIP; numeric .dbf field selection for dose

**Why two sources**: field technicians may have legacy GPS measurements outside the app.

## Grid cell size

10×10 m in UTM space. Cell size in degrees computed as:
- `latRes = 10 / 111319.9`
- `lonRes = 10 / (111319.9 * cos(lat * π/180))`

Used for GeoTIFF pixel scale tags.

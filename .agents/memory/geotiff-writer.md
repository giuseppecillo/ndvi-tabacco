---
name: GeoTIFF writer
description: Manual Float32 GeoTIFF encoder; no external write library needed
---

## Implementation

Written from scratch in `geoUtils.ts` → `downloadGeoTiff()`. No write-capable GeoTIFF npm library used (geotiff.js v2 is read-only).

## TIFF layout (little-endian)

```
[0-7]   TIFF header (magic 0x4949, version 42, IFD offset)
[8-n]   IFD: 14 entries × 12 bytes
[n+]    Extra data area: pixelScale (DOUBLE[3]), tiepoint (DOUBLE[6]),
        geoKeyDirectory (SHORT[16]), GDAL_NODATA ASCII string
[*]     Float32 image strip (row-major, north→south), 4-byte aligned
```

## Required GeoTIFF tags

| Tag   | Name                  | Value |
|-------|-----------------------|-------|
| 33550 | ModelPixelScaleTag    | [cellSizeLon, cellSizeLat, 0] |
| 33922 | ModelTiepointTag      | [0,0,0, west, north, 0] |
| 34735 | GeoKeyDirectoryTag    | WGS84 EPSG:4326 |
| 42113 | GDAL_NODATA           | "-9999" (ASCII) |

**Why GDAL_NODATA tag**: without it, QGIS shows -9999 pixels as valid data (black cells outside polygon).

## GeoKey configuration

```
[1,1,0,3]           — KeyDirectory header (version 1.1, 3 keys)
[1024,0,1,2]        — GTModelTypeGeoKey = Geographic (2D)
[1025,0,1,1]        — GTRasterTypeGeoKey = PixelIsArea
[2048,0,1,4326]     — GeographicTypeGeoKey = WGS84
```

## NoData

- Value: -9999 (Float32)
- Pixels outside polygon boundary: filled with -9999
- Multiple IDW points mapping to same pixel: keep highest dose (conservative)

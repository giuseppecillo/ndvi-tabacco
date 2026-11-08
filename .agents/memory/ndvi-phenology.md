---
name: NDVI phenology reference
description: Decisions for keeping the tobacco NDVI reference, seedling age, and nitrogen interpretation agronomically coherent.
---

**Rule:** Calculate optimal NDVI from a continuous post-transplant phenology curve. For tobacco, use an operational 0.70/55 DAT, 0.79/65 DAT, 0.80/75–85 DAT reference before flowering decline. Translate seedling age at transplant into equivalent phenological days instead of adding a fixed NDVI increment.

**Why:** A fixed NDVI offset produces artificial discontinuities and keeps affecting the result at late stages, while a developmental-age offset is naturally reflected in the curve as the crop matures. Literature supports NDVI as a canopy-status indicator but not a universal tobacco threshold independent of cultivar, density, sensor, soil and stress.

**How to apply:** Keep the biological NDVI reference independent of the nitrogen dose to avoid circular reasoning. Compare total nitrogen with yield-based uptake separately, use NDVI variance/CV to decide whether the field mean is representative enough for a uniform recommendation, and label the curve as an operational reference requiring field confirmation.

**Rule:** Qualitative cultivar earliness alone does not authorize an NDVI-amplitude
offset at an already confirmed phase. Keep known varietal phase targets unless
an independently validated calibration supports changing them.

**Why:** The user requested an earliness-based improvement; the offline
leave-one-cultivar-out assessment did not establish an improvement, and catalogue
reconstruction is not field validation. Earliness concerns developmental timing,
not an automatically transferable NDVI increment.

**How to apply:** Require quantitative phenological timing and independent,
adequate-nitrogen reference measurements before activating such adjustments.
Preserve the arithmetic midpoint rule and never silently recalculate historical
observations to match a new reference.
---
name: IDW nitrogen savings
description: Defines the accepted basis and presentation for nitrogen savings after IDW processing.
---

Use the total planned nitrogen (`Kg di azoto totale`) as the comparison basis. Compare it with nitrogen already distributed plus the IDW-indicated dose. Present per-hectare values, totals over the full polygon, and the estimated saving in kg and percent.

**Why:** The user explicitly chose total planned N rather than nitrogen remaining after previous applications, and requested a direct planned-versus-IDW comparison over the polygon.

**How to apply:** Interpolate planned N, already-distributed N, and indicated dose from GPS observations. Calculate polygon area metrically and multiply per-hectare means by hectares. Never count already-distributed N as savings or report a negative saving.

For polygons with explicit interior exclusions, “the full polygon” means its
cultivated net area, not the gross outer boundary. Excluded land must not
contribute to doses, nitrogen totals or savings.

**Why:** The user requires internal uncultivated zones (ponds, buildings or
excluded areas) to be excluded without changing the nitrogen dose model.

**How to apply:** Preserve imported exclusions throughout map calculation,
inspection and exports; keep per-hectare nitrogen formulas unchanged.

The savings comparison must remain visible after interpolation on phones, tablets and PCs, including when switching to Rilievo e dati and back during the same session. Show kg and percent without requiring sideways scrolling.

**Why:** the user reported the savings table disappearing on smartphones and explicitly requested that it remain available after interpolation.

**How to apply:** keep the result available across module switches. If the planned-N baseline is missing or incomplete, keep the comparison visible with an explanation and unavailable values; do not infer a complete plan from only some observations or substitute an apparent zero saving.
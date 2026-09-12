---
name: IDW nitrogen savings
description: Defines the accepted basis and presentation for nitrogen savings after IDW processing.
---

Use the total planned nitrogen (`Kg di azoto totale`) as the comparison basis. Present a table after the IDW map showing planned N per hectare, IDW-indicated N per hectare, both totals over the full polygon, and the estimated saving.

**Why:** The user explicitly chose total planned N rather than nitrogen remaining after previous applications, and requested a direct planned-versus-IDW comparison over the polygon.

**How to apply:** Interpolate the plan and indicated dose from GPS observations, calculate polygon area metrically, and multiply the interpolated per-hectare means by hectares. Do not report a negative saving.
---
name: NDVI point-N indication
description: Common nitrogen-indication rule for tobacco and durum wheat point observations.
---

**Rule:** When mean NDVI is equal to or greater than its phenological reference, indicate zero nitrogen. Below reference, use the positive deficit as a percentage of the reference and apply that percentage to the crop’s optimal N quota.

**Why:** The user requires that adequate or higher vegetation vigor never triggers an N input, and that a low-NDVI indication has a clear, proportional relationship to the observed deficit rather than a hidden coefficient or fixed minimum.

**How to apply:** Tobacco uses its calculated optimal N requirement and caps the result at total plan N minus already distributed N. Durum wheat uses the confirmed BBCH phase quota and caps it at the residual N plan. Keep client calculation, API validation, visible formula, and regression tests aligned.

**Rule:** Preserve the existing dose precision (tenths for tobacco, whole kg N/ha for grain), but round the residual cap down, never to nearest. Do not add an epsilon that can make the dose exceed the actual unrounded subtraction, even if a decimal boundary then loses one dose increment.

**Why:** Rounding to nearest can prescribe more nitrogen than remains. Returning a raw fractional cap instead would allow the displayed dose to round upwards again.

**How to apply:** Keep the deficit quota's existing rounding unchanged; apply a conservative representable residual cap in the shared models, and never allow API numeric tolerance to bypass the real residual or a required zero dose. Apply to new observations only, not historical records.
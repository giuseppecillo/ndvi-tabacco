---
name: NDVI point-N indication
description: Nitrogen indication and conservative dose precision across crops, without rewriting history.
---

**Rule:** When mean NDVI is equal to or greater than its phenological reference, indicate zero nitrogen. Below reference, use the positive deficit as a percentage of the reference and apply that percentage to the crop’s optimal N quota.

**Why:** The user requires that adequate or higher vegetation vigor never triggers an N input, and that a low-NDVI indication has a clear, proportional relationship to the observed deficit rather than a hidden coefficient or fixed minimum.

**How to apply:** Tobacco uses its calculated optimal N requirement and caps the result at total plan N minus already distributed N. Durum wheat uses the confirmed BBCH phase quota and caps it at the residual N plan. Keep client calculation, API validation, visible formula, and regression tests aligned.

**Rule:** Preserve the existing dose precision (tenths for tobacco, whole kg N/ha for grain), but round the residual cap down, never to nearest. Do not add an epsilon that can make the dose exceed the actual unrounded subtraction, even if a decimal boundary then loses one dose increment.

**Why:** Rounding to nearest can prescribe more nitrogen than remains. Returning a raw fractional cap instead would allow the displayed dose to round upwards again.

**How to apply:** Keep the deficit quota's existing rounding unchanged; apply a conservative representable residual cap in the shared models, and never allow API numeric tolerance to bypass the real residual or a required zero dose. Apply to new observations only, not historical records.

**Rule:** Pomodoro and catalogue crops also use tenths for new point doses. Floor both the residual and the phase-quota caps, without epsilon; dose and saved nitrogen quota must exactly match the API's canonical dose. Preserve legacy fractions rather than rounding them upwards or recalculating them for display.

**Why:** Capping a dose at a raw fraction is not enough: formatting 0.06 to one decimal presents 0.1. A shared representable precision is needed from calculation through storage and exports; old records are evidence, not new recommendations.

**How to apply:** Keep existing proportional deficit rounding. Use conservative caps for new writes, and distinguish recorded point doses from derived IDW cells/statistics, which have separate precision requirements.
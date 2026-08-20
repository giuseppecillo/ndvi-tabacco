---
name: NDVI point-N indication
description: Common nitrogen-indication rule for tobacco and durum wheat point observations.
---

**Rule:** When mean NDVI is equal to or greater than its phenological reference, indicate zero nitrogen. Below reference, use the positive deficit as a percentage of the reference and apply that percentage to the crop’s optimal N quota.

**Why:** The user requires that adequate or higher vegetation vigor never triggers an N input, and that a low-NDVI indication has a clear, proportional relationship to the observed deficit rather than a hidden coefficient or fixed minimum.

**How to apply:** Tobacco uses its calculated optimal N requirement and caps the result at half of entered total N. Durum wheat uses the confirmed BBCH phase quota and caps it at the residual N plan. Keep client calculation, API validation, visible formula, and regression tests aligned.
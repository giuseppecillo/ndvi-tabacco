---
name: Grain dose API integrity
description: Safety rule for persisting grain nitrogen recommendations.
---

The API must enforce grain nitrogen-advice invariants independently of the browser, including when a legacy crop alias is supplied.

**Why:** Client-side controls can be bypassed by direct requests. A plausible-looking record can otherwise save a nitrogen dose that was never produced by the agronomic safeguards.

**How to apply:** When changing the grain advice flow, update API enforcement at the same time and test both normal UI saves and tampered direct requests.

Keep the app and API regression expectations independently specified, even when both use the same pure agronomic module.

**Why:** Deriving expected values from the shared implementation would make both suites accept the same agronomic regression.

**How to apply:** Preserve explicit expected phase quotas, NDVI references and residual-cap cases in both suites; do not replace them with calls to the production formulas. This independence also applies to tobacco: keep explicit curve, nursery-age and one-decimal dose expectations on both sides when changing shared rules.

Preserve the existing order of PMG conversion and nitrogen rounding when tightening API validation; do not add an epsilon or normalize intermediate values as part of a validation-only change.

**Why:** Equivalent seed-unit inputs can land on opposite sides of a half-unit floating-point boundary. Normalizing that difference silently changes the app's existing agronomic recommendation, rather than merely verifying it.

**How to apply:** Share the original conversion implementation with the API and retain explicit boundary-case expectations. Treat any numerical-normalization change as a separate agronomic decision.
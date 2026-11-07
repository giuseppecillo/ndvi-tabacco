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
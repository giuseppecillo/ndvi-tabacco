---
name: Grain dose API integrity
description: Safety rule for persisting grain nitrogen recommendations.
---

The API must enforce grain nitrogen-advice invariants independently of the browser, including when a legacy crop alias is supplied.

**Why:** Client-side controls can be bypassed by direct requests. A plausible-looking record can otherwise save a nitrogen dose that was never produced by the agronomic safeguards.

**How to apply:** When changing the grain advice flow, update API enforcement at the same time and test both normal UI saves and tampered direct requests.
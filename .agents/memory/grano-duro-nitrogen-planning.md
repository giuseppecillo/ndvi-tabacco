---
name: Grano duro nitrogen planning
description: Agronomic guardrails for the grano duro seed-density conversion and phased nitrogen advice.
---

**Rule:** Convert kg seed/ha and seeds/m² using the variety's thousand-kernel weight (PMG): `seeds/m² = kg/ha × 100 / PMG(g)`. Calculate total N from expected yield, apply only the documented bounded density correction, and constrain the current phase suggestion within that phase's disciplinary range.

**Why:** A unit error in seed conversion changes the interpreted density by an order of magnitude. A purely proportional phase split can also recommend a dose outside the disciplinary interval when the total target is low or high.

**How to apply:** Treat the total-N value as a calculated planning result, not a second editable input. Show the original phase interval alongside the recommendation and flag total plans outside the combined reference intervals for technical review.
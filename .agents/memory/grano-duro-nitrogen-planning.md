---
name: Grano duro nitrogen planning
description: Agronomic guardrails for the grano duro seed-density conversion and phased nitrogen advice.
---

**Rule:** Keep each variety’s seed-density (seeds/m²) and seed-dose (kg/ha) ranges separate. Validate the direct input against its matching range; use the PMG conversion only as an explicitly indicative equivalence when the disciplinary does not state a PMG. Calculate total N from expected yield, apply only the documented bounded density correction, and constrain the current phase suggestion within that phase's disciplinary range.

**Why:** A unit error in seed conversion changes the interpreted density by an order of magnitude, while a derived/rounded PMG can make a valid kg/ha dose look slightly outside its separate seeds/m² range. A purely proportional phase split can also recommend a dose outside the disciplinary interval when the total target is low or high.

**How to apply:** Treat the total-N value as a calculated planning result, not a second editable input. Use confirmed BBCH as the source of truth for the current phase; DAS windows are only configurable local estimates that may prefill, never replace, field confirmation. A DAS prefill must leave confirmation false and must not unlock phase quota calculation or persistence. Show the original phase interval alongside the recommendation and flag total plans outside the combined reference intervals for technical review.
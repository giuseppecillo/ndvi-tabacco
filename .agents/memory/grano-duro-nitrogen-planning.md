---
name: Grano duro nitrogen planning
description: Agronomic guardrails for the grano duro seed-density conversion and phased nitrogen advice.
---

**Rule:** Keep each variety’s seed-density (seeds/m²) and seed-dose (kg/ha) ranges separate. Validate the direct input against its matching range; use the PMG conversion only as an explicitly indicative equivalence when the disciplinary does not state a PMG. Calculate total N from expected yield, apply only the documented bounded density correction, and constrain the current phase suggestion within that phase's disciplinary range.

**Why:** A unit error in seed conversion changes the interpreted density by an order of magnitude, while a derived/rounded PMG can make a valid kg/ha dose look slightly outside its separate seeds/m² range. A purely proportional phase split can also recommend a dose outside the disciplinary interval when the total target is low or high.

**How to apply:** Treat the total-N value as a calculated planning result, not a second editable input. Use confirmed BBCH as the source of truth for the current phase; DAS windows are only configurable local estimates that may prefill, never replace, field confirmation. A DAS prefill must leave confirmation false and must not unlock phase quota calculation or persistence. Show the original phase interval alongside the recommendation and flag total plans outside the combined reference intervals for technical review.

**Phenology alignment:** The local calendar must distinguish leaf development from tillering; DAS ranges, BBCH labels, and the continuous NDVI reference must agree, while BBCH confirmation remains authoritative.

**Why:** A conflated early-season DAS range can present an N-phase indication before the crop has reached the corresponding phenological stage.

**How to apply:** When adjusting the local calendar, preserve continuous non-overlapping phase coverage and surface a warning when DAS-derived timing conflicts with the confirmed BBCH phase.

**NDVI reference calibration:** Use the user-confirmed practical ranges for the N phases: accestimento 0.40–0.55, inizio levata 0.65–0.72, and foglia a bandiera 0.73–0.85.

**Why:** The earlier curve overstated early-season vigor, including NDVI values above 0.55 during accestimento.

**How to apply:** Keep the client curve, API validation curve, displayed calendar, and regression tests synchronized; these are reference values for technical advice, not automatic thresholds.

**Point-N indication from NDVI:** A grain point at or above its NDVI reference receives no indicated nitrogen. Below the reference, calculate the positive NDVI deficit as a proportion of the reference and apply that proportion to the phase's optimal N quota, capped by the remaining N plan.

**Why:** The user requires that an NDVI meeting or exceeding the target never trigger an N input; a below-target point needs a transparent, proportional link from its NDVI deficit to N units instead of a fixed phase minimum.

**How to apply:** Keep client and API calculations identical, show the deficit, its percentage, the phase quota, and the residual-plan cap in the result. Never reintroduce a phase minimum that turns a zero or negative deficit into a positive dose.
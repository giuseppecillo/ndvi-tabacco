---
name: Campaign calibration safeguards
description: Guardrails for comparing nitrogen density corrections with historical tobacco campaigns.
---

**Rule:** Do not render an aligned/deficit/surplus nitrogen verdict for a campaign until its identifying name, seed rate, establishment, observed stand, harvested yield, and actual applied nitrogen are all present and valid. Keep campaigns per variety and persist them locally.

**Why:** Pre-filled varietal defaults can look like measured farm data and falsely validate an agronomic decision. The comparison must use harvested yield separately from the live target-yield recommendation, with observed stand as the basis of the density correction.

**How to apply:** Treat a new campaign as incomplete by default. When changing reference seed or density parameters, retain historical campaign entries and flag seed/establishment values that disagree materially with the observed stand instead of silently replacing the data.
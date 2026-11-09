---
name: IDW calculation budgets
description: Why grid calculations need a separate conservative workload budget.
---

Reject excessive IDW requests as a whole; do not silently coarsen the 10 m
grid, sample controls, or truncate cells to fit a budget.

**Why:** Import byte limits cannot bound a large field's grid. Polygon area
also understates the cost for thin fields and holes: every bounding-box cell
is scanned, each boundary is tested, and complete nitrogen budgets require
three interpolation passes. Changing resolution or dropping controls would
change the prescription without the user's knowledge.

**How to apply:** Budget bounding-box scans, boundary complexity and control
count before filtering or interpolation, including zero-width geometry.
Clear the selected old result before a failed retry and do not register quota
usage for a request rejected by preflight. Any future worker should retain
allocation limits for the final map and exports.

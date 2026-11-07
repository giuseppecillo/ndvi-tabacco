---
name: GIS resource policy
description: Why local GIS budgets need both actual byte accounting and isolated decoding.
---

Treat ZIP metadata as an early rejection hint, not a trustworthy allocation
budget. Keep actual decompressed-byte accounting and a terminable parser worker
even if future limits are raised.

**Why:** Central-directory sizes can be forged. A small compressed file can expand
substantially, and bounded bytes alone do not bound the CPU cost of malformed
geometry or XML. A deadline on the UI thread cannot interrupt a synchronous parser.

**How to apply:** Any new local GIS format must use the same reject-whole-import
policy and clear previous geometry/results before asynchronous work begins.
Do not replace rejection with silent truncation: partial fields or control points
can change agronomic output without the user noticing.

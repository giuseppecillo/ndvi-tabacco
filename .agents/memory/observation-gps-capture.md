---
name: Observation GPS capture
description: Reliability rule for saving observations that optionally request device geolocation.
---

**Rule:** Treat GPS coordinates as optional enrichment: save the observation promptly even when the browser delays, denies, or does not resolve a geolocation request.

**Why:** Browser permission handling can leave the geolocation callback pending, which otherwise prevents the save request from ever reaching the API and gives the user no useful feedback.

**How to apply:** Use a short fallback to persist without coordinates, accept coordinates only when available first, and surface a visible error when the server rejects a save.
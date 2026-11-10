---
name: Observation history semantics
description: Survey-day grouping, save timestamps and consistent NDVI deviations in customer reports.
---

Group the survey history by customer and the date of the observation, not the date it was saved. Keep each recorded point separate within that group, including different fields and coordinates.

**Why:** The user wants to review and export the complete visit to a customer on a particular survey day, including the individual point doses, rather than an aggregate across fields.

**How to apply:** Searches that match one point should retain the complete matching customer/day group for review and export.

Display NDVI deviation consistently as mean minus optimal, with relative deviation based on the optimal value. Preserve the original stored deviation separately.

**Why:** Historical crop-specific calculations use different deviation conventions; relabeling their raw values as one common signed metric would misrepresent the observations.

**How to apply:** Derive comparison metrics for display and export without rewriting historical agronomic results. A missing or zero optimal value cannot produce a meaningful relative percentage.

Keep server save timestamps distinct from observation dates, and do not fabricate times for legacy records without timestamps.

**Why:** A record may be saved on a different day from the actual field survey.

**How to apply:** Show missing-time status explicitly, and use the observation date for visit grouping.

Gli utenti possono cancellare i propri rilievi entro 24 ore dalla creazione,
non dalla data del sopralluogo. Non estendere implicitamente questo permesso
ai record storici o senza data di creazione verificabile.

**Why:** il titolare ha richiesto una finestra di cancellazione di 24 ore;
lo storico e i dati dei clienti devono restare conservati oltre tale finestra.

**How to apply:** applicare il limite lato server anche alle cancellazioni massive,
senza deroghe amministrative automatiche. Richieste puntuali del titolare per
eliminare dati storici e procedure privacy restano distinte.

Registro e storico degli utenti devono essere coerenti tra versione web e
smartphone, senza duplicare i rilievi già presenti.

**Why:** il titolare ha richiesto di mantenere sempre questa integrazione e
confronto rispetto ai rilievi effettuati dagli utenti.

**How to apply:** condividere i dati dello stesso account sul sito pubblico,
aggiornare le viste dopo scritture e al ritorno da un altro dispositivo.
La richiesta non autorizza a copiare la produzione nella preview isolata.

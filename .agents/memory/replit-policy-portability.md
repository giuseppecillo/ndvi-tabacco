---
name: Portabilità delle policy tra ambienti Replit
description: Vincolo di portabilità delle policy locali durante Publish, distinto dal backend Supabase operativo.
---

Le policy dello sviluppo Replit devono essere trasferibili al database gestito
Replit di produzione, anche quando il backend operativo dell'app usa Supabase.
Non assumere che il ruolo proprietario abbia lo stesso nome nei due ambienti.

**Why:** Publish confronta comunque gli schemi gestiti Replit; riferimenti a ruoli
esclusivi dello sviluppo possono bloccare la validazione prima dell'avvio dell'app.

**How to apply:** confrontare ruoli e policy tramite metadati prima di correggere
il lato sviluppo. Per accessi riservati al proprietario usare condizioni legate
al proprietario effettivo, senza concedere privilegi generali e senza modificare
le policy specifiche dei ruoli del Supabase operativo. Non aggirare Publish con
DDL di produzione o automatismi all'avvio.

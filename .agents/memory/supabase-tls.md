---
name: TLS del pooler Supabase
description: Il pooler può richiedere la CA ufficiale Supabase anziché sole CA pubbliche del sistema.
---

Non presumere che il Session pooler Supabase sia verificabile con le sole CA
pubbliche del sistema. Nella verifica TLS senza credenziali del 6 novembre 2026,
il pooler Irlanda presentava un certificato *.pooler.supabase.com e una catena
con nomi Supabase Intermediate 2021 CA / Supabase Root 2021 CA; il trust store
disponibile l'ha rifiutata come self-signed certificate in certificate chain.

**Why:** il certificato scaricabile dalla dashboard non è necessariamente
limitato all'endpoint diretto. La documentazione ufficiale SSL Enforcement usa
la CA della dashboard anche in un esempio di collegamento al pooler.

**How to apply:** verificare la catena attuale e confrontarla con la CA ottenuta
dal canale ufficiale prima di usarla, perché i certificati possono ruotare.
Non fidarsi automaticamente della radice inviata dal server. Configurare la
fiducia solo nel runner autorizzato, senza modificare il trust store globale,
mantenendo verifica hostname e rejectUnauthorized. Non cambiare Enforce SSL,
endpoint o privilegi per aggirare un errore TLS.

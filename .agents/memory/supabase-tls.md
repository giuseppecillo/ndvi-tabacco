---
name: TLS del pooler Supabase
description: CA ufficiale del pooler e verifica TLS del socket, distinta da pg_stat_ssl del backend.
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

Nel Session pooler anche pg_stat_ssl può riportare ssl=false pur con socket
client cifrato, certificato autorizzato dalla CA ufficiale e hostname corretto.

**Why:** il controllo iniziale della creazione dello schema si è fermato
perché confondeva il tratto backend con il collegamento client al pooler.
La successiva diagnosi READ ONLY ha verificato TLSv1.3 sul socket effettivo.

**How to apply:** mantenere CA ufficiale e rejectUnauthorized, verificare
encrypted, authorized, assenza di authorizationError, certificato, hostname
esplicito e protocollo TLSv1.2/1.3 prima delle query di identità. Trattare
pg_stat_ssl come diagnostica separata; non certificare la cifratura del tratto
interno. Testare il rifiuto di un socket non verificato anche con ssl=true SQL.

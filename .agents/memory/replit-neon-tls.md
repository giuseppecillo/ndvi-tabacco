---
name: Verifica TLS Replit Neon
description: Distinguere TLS del client da pg_stat_ssl dietro il proxy della sorgente Replit Neon.
---

Per la sorgente Replit su Neon, verificare il socket TLS effettivo del client,
non usare pg_stat_ssl come unica prova del collegamento client→endpoint.

**Why:** sul primario verificato pg_stat_ssl riportava ssl=false, mentre il
socket client aveva TLSv1.3, catena autorizzata e hostname corretto. Il dato SQL
riguarda il backend dietro al proxy e aveva prodotto un blocco diagnostico.

**How to apply:** prima dell'SQL richiedere encrypted=true, authorized=true,
assenza di authorizationError, certificato presente, controllo esplicito
hostname e protocollo TLSv1.2/1.3. Non disabilitare rejectUnauthorized né
accettare certificati non verificati. Tenere il dato pg_stat_ssl come diagnostica
separata, senza dedurre che il tratto interno sia cifrato. I mock devono rifiutare
un socket non verificato anche se il risultato SQL dichiara SSL attivo.

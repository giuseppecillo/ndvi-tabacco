---
name: Verify backend routing per consumer
description: A successful Supabase startup diagnostic does not establish which connection each application module uses.
---

Non considerare il collaudo della connessione Supabase come prova che tutti
i moduli applicativi la stiano usando.

**Why:** un controllo centrale riusciva mentre il catalogo passava da una
connessione separata e restituiva 503; i dati e i privilegi Supabase erano integri.

**How to apply:** prima di dichiarare conclusa una migrazione o proporre nuovi
import, verificare il percorso effettivo della connessione del modulo interessato.
Non reimportare un catalogo già identico per correggere un errore di instradamento.
Non spostare in blocco altre letture o scritture senza valutare origine, dati
successivi alla migrazione e autorizzazione: il cambio può nascondere dati recenti.

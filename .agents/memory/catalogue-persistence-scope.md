---
name: Perimetro del catalogo persistente
description: Consenso limitato alla preparazione offline del catalogo, distinto da dati cliente e attivazione agronomica.
---

La preparazione del catalogo selezionato non autorizza l'applicazione al Supabase
Agri Precision attivo: servono prima merge e autorizzazione specifica. Non
equivale all'attivazione di nuove colture o dei loro calcoli.

**Why:** il titolare richiede un catalogo distinto dai dati cliente e nessun
aggiornamento o cancellazione di rilievi, account e storico; la disponibilità
di una tabella completa non certifica i parametri agronomici.

**How to apply:** tenere separate preparazione, applicazione SQL, contratto di
lettura nell'app e abilitazione dei calcoli. Non collegare importazioni o
migrazioni ad avvio/post-merge; ogni annullamento deve riguardare solo la release
di catalogo approvata, senza cancellare dati cliente o altre versioni.

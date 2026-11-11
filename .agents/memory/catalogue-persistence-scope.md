---
name: Perimetro del catalogo persistente
description: Consenso limitato alla preparazione offline del catalogo, distinto da dati cliente e attivazione agronomica.
---

La sola preparazione del catalogo non autorizza l'applicazione al Supabase
Agri Precision attivo né equivale all'attivazione di nuove colture o calcoli.
Il consenso va riferito al contenuto e all'operazione richiesta.

**Why:** il titolare richiede un catalogo distinto dai dati cliente e nessun
aggiornamento o cancellazione di rilievi, account e storico; la disponibilità
di una tabella completa non certifica i parametri agronomici.

**How to apply:** tenere separate preparazione, applicazione SQL, contratto di
lettura nell'app e abilitazione dei calcoli. Non collegare importazioni o
migrazioni ad avvio/post-merge; ogni annullamento deve riguardare solo la release
di catalogo approvata, senza cancellare dati cliente o altre versioni.

Per l'Excel di aglio, cipolla, olivo, zucchino, melanzana e ciliegio il titolare
ha successivamente richiesto esplicitamente integrazione nei calcoli e
tabella dedicata su Supabase comprendente tutte le colture e varietà.

**Why:** il titolare considera attendibili quei valori e vuole lo stesso
funzionamento e formato delle colture già presenti, non sola consultazione.

**How to apply:** non riapplicare il vecchio limite di sola preparazione a
questo contenuto autorizzato; non estendere però il consenso ad altri dataset,
piani utenti, account, cambi di connessione o pubblicazioni.

Il titolare vuole tutte le colture e varietà presenti prima degli aggiornamenti
più le nuove, sia nel catalogo sia nel rilievo, nei parametri colturali.
Quando la tabella è completa, autorizza la migrazione su Supabase e poi
commit e push su Git.

**Why:** richiesta esplicita del titolare, con completezza della tabella come
condizione precedente alla migrazione.

**How to apply:** verificare conservazione del catalogo precedente e copertura
delle aggiunte prima di applicare la release del solo catalogo. Non anticipare
la migrazione con profili incompleti e non estendere il consenso a modifiche
dei rilievi, degli account o a una pubblicazione dell'app.

Il titolare ha successivamente ridotto il perimetro: «INSERISCI SOLO LE
COLTURE E VARIETA' VERIFICATE». Non è più necessario attendere la copertura
di tutte le colture candidate per inserire il sottoinsieme completo verificato.

**Why:** nuova istruzione esplicita del titolare, successiva alla richiesta
di completare tutta la tabella prima dell'integrazione.

**How to apply:** mantenere tutti i profili precedenti e ammettere soltanto
aggiunte complete con evidenze controllate, incluse le medie della stessa
coltura già autorizzate. I risultati bibliografici parziali restano fuori
dal catalogo operativo e dai calcoli; non descrivere queste esclusioni
come colture integrate né medie autorizzate come calibrazioni sperimentali.

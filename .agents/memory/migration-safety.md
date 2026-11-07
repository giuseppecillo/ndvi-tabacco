---
name: Vincoli di migrazione e sviluppo
description: Vincoli richiesti dal titolare per Supabase, sviluppo su Replit e continuità delle identità Clerk.
---

Il titolare vuole un unico database Supabase e tre ruoli applicativi PostgreSQL: app_runtime per l'applicazione Replit pubblicata, app_readonly per controlli di sviluppo in sola lettura e app_migrator per modifiche strutturali autorizzate. Netlify è escluso dalla fase attuale; sviluppo, esecuzione e pubblicazione restano su Replit con Clerk invariato. Per questa migrazione non creare un secondo database o progetto Supabase, nemmeno per il collaudo.

**Why:** evitare che Replit Agent possa modificare accidentalmente i dati di produzione.

**How to apply:** non rendere disponibili nello sviluppo ordinario credenziali scrivibili di produzione o amministrative. Esplicitare che i test di salvataggio non sono possibili con la sola lettura; qualsiasi accesso QA aggiuntivo o database temporaneo richiede approvazione, non una deroga implicita.

Il titolare ha creato il progetto Supabase “Agri Precision” nella regione
West EU (Ireland). Questa è la destinazione dichiarata per la fase successiva;
non presumere più che il target Supabase sia nel Regno Unito.

**Why:** il titolare ha comunicato la regione del progetto effettivamente creato.

**How to apply:** confermare project reference/endpoint prima di qualsiasi
connessione; nome e stato Healthy dichiarato non costituiscono verifica del
server o autorizzazione a SQL, ruoli, tabelle o dati.

Per la migrazione del solo database Clerk deve rimanere invariato, con tutti gli utenti, identificativi e autorizzazioni. Un'eventuale portabilità fuori Replit resta una verifica futura separata, non un prerequisito della fase attuale. Il titolare richiede avvio e post-merge senza modifiche automatiche allo schema, bootstrap o riparazioni dei dati: schema incompatibile significa errore esplicito, non autoriparazione.

**Why:** il titolare vuole che cambiamenti strutturali e trasferimenti avvengano soltanto tramite operazioni specificamente approvate, preservando l'applicazione corrente.

**How to apply:** non creare istanze sostitutive né eliminare quella gestita. Non reintrodurre migrazioni automatiche per risolvere errori di avvio. Connessioni, scritture, credenziali, trasferimenti e pubblicazione richiedono le rispettive autorizzazioni; l'approvazione del piano generale non autorizza tutte le fasi.

Un confronto logico positivo dello schema non autorizza importazioni per posizione: usare liste di colonne esplicite o un restore revisionato degli oggetti applicativi.

**Why:** la ricostruzione da sorgenti può disporre le colonne in ordine diverso da uno schema evoluto con ALTER TABLE, pur conservando nomi e tipi. Un CSV importato per posizione può corrompere i dati.

**How to apply:** confrontare anche l'ordine, non combinare restore completo e baseline, e non considerare la sola uguaglianza degli schemi prova della corrispondenza dei record.

Valutare la protezione readonly con prove negative delle autorizzazioni effettive,
non soltanto con il default di sessione read-only. Un collaudo locale con
superuser non certifica che l'amministratore di un servizio gestito possa
applicare le stesse restrizioni.

**Why:** PUBLIC e routine integrate possono consentire effetti non coperti dai
soli grants delle tabelle; rimuoverli può incidere su altri servizi del provider.
L'assenza di errori nei mock non dimostra l'isolamento sul server.

**How to apply:** nelle sole destinazioni di test autorizzate provare i divieti
anche con il default read-only disattivato; prima dell'attivazione richiedere
verifica specifica dei privilegi e dell'impatto sul target gestito, senza
saltare revoche non autorizzate o non consentite.

---
name: Vincoli di migrazione e sviluppo
description: Vincoli richiesti dal titolare per Supabase, sviluppo su Replit e continuità delle identità Clerk.
---

Il titolare vuole un unico database Supabase e tre ruoli applicativi PostgreSQL: app_runtime per l'applicazione Replit pubblicata, app_readonly per controlli di sviluppo in sola lettura e app_migrator per modifiche strutturali autorizzate. Netlify è escluso dalla fase attuale; sviluppo, esecuzione e pubblicazione restano su Replit con Clerk invariato.

**Why:** evitare che Replit Agent possa modificare accidentalmente i dati di produzione.

**How to apply:** non rendere disponibili nello sviluppo ordinario credenziali scrivibili di produzione o amministrative. Esplicitare che i test di salvataggio non sono possibili con la sola lettura; qualsiasi accesso QA aggiuntivo o database temporaneo richiede approvazione, non una deroga implicita.

Per la migrazione del solo database Clerk deve rimanere invariato, con tutti gli utenti, identificativi e autorizzazioni. Un'eventuale portabilità fuori Replit resta una verifica futura separata, non un prerequisito della fase attuale. Il titolare ha autorizzato soltanto preparazione inattiva, mantenendo i percorsi di avvio e gli automatismi esistenti fino a successiva autorizzazione.

**Why:** il titolare ha ristretto esplicitamente l'ambito alla preparazione del database e confermato di non attivare modifiche che possano interrompere l'applicazione corrente.

**How to apply:** non creare istanze sostitutive né eliminare quella gestita. Non creare Supabase, cambiare credenziali, eseguire SQL sui database esistenti o modificare la pubblicazione senza ulteriore autorizzazione. Per questa fase eseguire solo controlli statici, typecheck e test senza accesso ai database.

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

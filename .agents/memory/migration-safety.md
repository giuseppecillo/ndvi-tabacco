---
name: Vincoli di migrazione e sviluppo
description: Vincoli richiesti dal titolare per Netlify, Supabase e continuità delle identità Clerk.
---

Il titolare vuole un unico database Supabase e tre ruoli applicativi PostgreSQL: app_runtime per Netlify, app_readonly per Replit durante lo sviluppo ordinario e app_migrator per modifiche strutturali autorizzate.

**Why:** evitare che Replit Agent possa modificare accidentalmente i dati di produzione.

**How to apply:** non rendere disponibili nello sviluppo ordinario credenziali scrivibili di produzione o amministrative. Esplicitare che i test di salvataggio non sono possibili con la sola lettura; qualsiasi accesso QA aggiuntivo o database temporaneo richiede approvazione, non una deroga implicita.

La migrazione deve prima verificare la possibilità di mantenere la stessa istanza Clerk, gli utenti, gli identificativi e le autorizzazioni. L'approvazione generale del piano non autorizza modifiche al progetto, configurazioni, credenziali, account o database.

**Why:** il titolare ha richiesto risultati della verifica e una successiva autorizzazione prima di procedere.

**How to apply:** non creare istanze sostitutive né eliminare quella gestita per superare un limite di portabilità. Non promettere la continuità degli identificativi senza prova ufficiale e collaudo autorizzato.

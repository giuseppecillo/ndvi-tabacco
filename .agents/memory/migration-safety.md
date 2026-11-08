---
name: Vincoli di migrazione e sviluppo
description: Vincoli richiesti dal titolare per Supabase, sviluppo su Replit e continuità delle identità Clerk.
---

Il titolare vuole un unico database Supabase e tre ruoli applicativi PostgreSQL: app_runtime esclusivamente per il backend dell'applicazione Replit pubblicata, app_readonly riservato ma con accesso SQL diretto dello sviluppo rinviato, app_migrator per modifiche strutturali autorizzate. app_readonly deve restare NOLOGIN e non assumibile da credenziali di sviluppo. Non introdurre revoche globali TEMP/large object. Le credenziali amministrative e di migrazione non devono essere utilizzate nello sviluppo ordinario. Netlify è escluso dalla fase attuale; sviluppo, esecuzione e pubblicazione restano su Replit con Clerk invariato. Per i prossimi passi di questa migrazione non creare altri database o progetti, nemmeno per il collaudo.

**Why:** evitare che Replit Agent possa modificare accidentalmente i dati di produzione.

**How to apply:** non rendere disponibili nello sviluppo ordinario credenziali scrivibili di produzione o amministrative. Esplicitare che i test di salvataggio non sono possibili con la sola lettura; qualsiasi accesso QA aggiuntivo o database temporaneo richiede approvazione, non una deroga implicita.

Il Secret della connessione app_runtime deve essere disponibile esclusivamente
in Production di Replit, mai nello sviluppo ordinario, nel repository o nei
log. Non creare copie QA del collegamento nello workspace per aggirare questo
vincolo.

**Why:** il titolare ha richiesto esplicitamente questo isolamento anche
durante la preparazione della connessione runtime.

**How to apply:** non usare un modulo Secrets che salvi in Shared per tale
collegamento. Se il collaudo non è eseguibile nel solo ambiente Production
senza una pubblicazione non autorizzata, segnalarlo come bloccato e chiedere
conferma prima di cambiare il perimetro.

Per impostare password di ruoli PostgreSQL, una schermata protetta non prova
che l'implementazione eviti SQL contenente password o verificatori SCRAM.
Anche un verificatore va trattato come materiale di autenticazione sensibile.

**Why:** l'analisi del percorso Studio dei ruoli personalizzati ha mostrato
la generazione di SQL anche dalle finestre password; la mascheratura della
normale riga di log non copre necessariamente errori e statistiche.

**How to apply:** attestare il percorso effettivo prima di creare credenziali,
non usare il reset della password postgres per configurare un ruolo
applicativo e non introdurre silenziamenti dei log come ripiego implicito.

Non presumere che l'amministratore postgres del Supabase gestito possa
disattivare i log, neppure con SET LOCAL: sul progetto effettivo i permessi
necessari sono risultati negati.

**Why:** la lettura autorizzata dei metadati ha escluso la praticabilità
del fallback di logging locale. Una transazione non scavalca le ACL
dei parametri e il nome postgres non equivale a superuser.

**How to apply:** non riproporre tale variante senza un cambiamento
significativo del contesto; non concedere permessi per aggirarla.
Il titolare ha chiesto di segnalare il blocco, senza continuare a preparare
ulteriori alternative complesse.

Il titolare non vuole installare PostgreSQL o altri strumenti sul proprio PC
per questa migrazione. Vuole procedere esclusivamente tramite Replit e il
progetto Supabase Agri Precision; per identificare il primario ha scelto un
Secret temporaneo dedicato, da rimuovere soltanto dopo sua autorizzazione.

**Why:** il titolare ha richiesto questo percorso per accelerare la migrazione.

**How to apply:** non riproporre installazioni locali o ulteriori database.
Riutilizzare i controlli già superati; esportazioni reali, scritture sul target,
cambio DATABASE_URL e blocco delle scritture richiedono conferme specifiche.
Completare importazione predisposta, confronti, credenziali runtime e percorso
di ritorno prima di qualsiasi finestra di manutenzione.

**Why:** il titolare non vuole fermare l'applicazione per poi attendere altre
preparazioni operative.

**How to apply:** chiudere i prerequisiti prima del fermo; non interpretare
l'autorizzazione alla preparazione come consenso a pubblicare, bloccare
le scritture o trasferire dati.

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

**Why:** il collaudo sul Supabase gestito ha confermato che ruoli privi di
scritture applicative possono creare TEMP e large object attraverso routine
integrate. Le sole ACL delle tabelle non garantiscono readonly globale;
rimuovere privilegi condivisi può incidere sui servizi del provider.
L'assenza di errori nei mock non dimostra l'isolamento sul server.

**How to apply:** nelle sole destinazioni di test autorizzate provare i divieti
anche con il default read-only disattivato; prima dell'attivazione richiedere
verifica specifica dei privilegi e dell'impatto sul target gestito, senza
saltare revoche non autorizzate o non consentite.

Distinguere i limiti readonly globali dalla protezione delle tabelle e
dall'esecuzione del trasferimento: creare large object non conferisce
privilegi DML sulle tabelle applicative.

**Why:** un finding su oggetti ausiliari persistenti impedisce di promettere
readonly globale, ma non dimostra che backup/import o backend fidato siano
intrinsecamente insicuri. TEMP comporta anche shadowing dei nomi non qualificati.

**How to apply:** classificare separatamente i due requisiti. Il titolare ha
accettato il rinvio dell'accesso SQL di sviluppo. Non usare credenziali amministrative/
scrivibili nello sviluppo ordinario né deleghe per assumere readonly;
NOLOGIN da solo non garantisce l'esclusione. Non cambiare i gate dei test
per trasformare i finding in successi e non ripetere i controlli superati.

Per collaudare i ruoli NOLOGIN su Supabase, ADMIN OPTION non implica
la possibilità di SET ROLE: verificare separatamente l'opzione SET.

**Why:** l'amministratore del progetto può gestire runtime/readonly ma non
assumerli inizialmente. Inoltre SET ROLE da una sessione amministrativa
controlla session_user, non il ruolo simulato: non prova che quest'ultimo
possa effettuare escalation.

**How to apply:** usare solo concessioni SET circoscritte, esplicitamente
autorizzate e dentro una transazione destinata a ROLLBACK; non attivare
LOGIN per il collaudo. Testare DML/DDL come ruolo corrente e valutare
escalation con metadati del ruolo reale, non con SET ROLE dall'admin.

# Fase 1 — solo inventario PostgreSQL Supabase

## Autorizzazione e stato

Il titolare ha autorizzato esclusivamente identificazione del progetto e
lettura dei metadati di sistema. Nessun DDL, DML, test sintetico con scritture,
modifica di privilegi/RLS/configurazioni, migrazione o accesso ai dati reali.

Destinazione dichiarata e confermata dal titolare:
- Progetto: Agri Precision; regione dichiarata West EU (Ireland).
- Project reference: `bhnaarbzpmcniesxyldx`.
- Host session pooler: `aws-0-eu-west-1.pooler.supabase.com`.
- Porta attesa: 5432; database atteso: postgres.
- Username del pooler atteso: `postgres.bhnaarbzpmcniesxyldx`.

**Stato dopo il primo tentativo autorizzato: bloccato dalla verifica TLS.**
Il runner ha restituito `TLS_TRUST_FAILED` durante la connessione al solo endpoint
confermato. Nessuna sessione PostgreSQL autenticata e nessuna query di inventario
eseguita. Non è stato tentato un altro host né disabilitata la verifica TLS.
Il codice pubblico di errore non distingue, da solo, CA non riconosciuta,
catena non verificabile, scadenza o nome del certificato non valido: non
attribuire la causa precisa senza ulteriori elementi.

Non sono ancora noti
versione, oggetti, privilegi effettivi, supporto delle opzioni di connessione
o esposizione Data API del progetto. Nessun Secret è contenuto in questi file.

Per proseguire occorre autorizzare una procedura di verifica del certificato e,
se appropriato all'endpoint, fornire la CA pubblica ufficiale Supabase. Non
servono chiavi private, nuove password o modifiche alle impostazioni server.
Nessuna modifica ai grants di TEMP/large objects, ruoli, RLS, schema o dati.

## Controlli verificati prima della connessione

55 test offline superati, senza socket o letture di credenziali reali:
destinazioni Replit/Neon/locali rifiutate; host esatto e project reference
separatamente confermati; username del pooler vincolato; solo porta 5432 e
database postgres; rifiuto di opzioni URI aggiuntive o TLS non verificato.

Il processo figlio riceve soltanto quattro variabili QA, senza copia
dell'ambiente dell'app. Rifiuta ogni variabile ereditata extra, incluse
DATABASE_URL, PG*, Clerk, NODE_OPTIONS, HOME e PATH. Il processo padre legge
soltanto SUPABASE_QA_ADMIN_URL e non carica il driver PostgreSQL.
Il driver viene caricato nel figlio soltanto dopo validazione e ambiente pulito.
Nessun import dei pool, dell'avvio API o degli script Drizzle.

Query fisse solo su pg_catalog, transazione REPEATABLE READ READ ONLY, controllo
dell'identità postgres e dei due valori read-only su server, chiusura con ROLLBACK.
Limiti di tempo e numero di righe; errori/risultati incompleti bloccano il
collaudo, senza fallback o altre connessioni. TLS deve essere verificato.
Driver error, stack, URL, password e stderr del processo non vengono stampati.

Questi sono blocchi contro instradamenti accidentali del runner, non un confine
di sicurezza assoluto per ogni processo del workspace. Non revocano né cambiano
gli accessi dell'app esistente. Per eliminare anche la disponibilità delle
credenziali Replit servirebbe un esecutore separato, da autorizzare.

## Configurare il Secret senza mostrarlo

Soltanto `SUPABASE_QA_ADMIN_URL`: stringa PostgreSQL Session pooler dalla sezione
Connect del progetto confermato, con la password del suo ruolo postgres.
Non usare chiavi anon/service_role, URL dell'API o la password di un altro
progetto. Non cambiare/reset password per questo inventario senza consenso.

Inserire il valore soltanto nel modulo sicuro Replit Secrets oppure in
Tools > Secrets. Non incollarlo in chat, file, comandi o screenshot.
Password con caratteri riservati: codifica URI nel valore del Secret secondo
le indicazioni Supabase, senza usare strumenti online esterni.
Se presente sslmode deve essere verify-full; il runner impone comunque TLS
verificato tramite configurazione esplicita pg.

Nessun DATABASE_URL/PG* modificato; nessun altro Secret necessario in fase 1.
Il nome QA non impedisce ad altri processi dello stesso progetto di leggere un
Secret disponibile al workspace: non è una credenziale da lasciare nello
sviluppo ordinario dopo il collaudo. Concordarne rimozione al termine.

## Esecuzione manuale, solo dopo inserimento sicuro

Compilare dalla radice (non apre connessioni):

```sh
pnpm --filter @workspace/api-server exec esbuild ../../lib/db/migration-preparation/inventory/run.ts --bundle --platform=node --format=cjs --outfile=/tmp/nitrocrop-inventory.cjs
```

L'invocazione manuale seguente userà il solo Secret QA nel processo isolato,
mai una URL come argomento. **Non è stata eseguita durante la preparazione.**

```sh
node /tmp/nitrocrop-inventory.cjs --project-ref bhnaarbzpmcniesxyldx --host aws-0-eu-west-1.pooler.supabase.com --metadata-only
```

Non collegare il comando a workflow, avvio, build, pubblicazione, cron o
post-merge. Non eseguire run-isolated.sh/synthetic.test.ts contro Supabase.

## Metadati previsti e limiti

16 sezioni: identità/versione e read-only, ACL database, ruoli (senza password),
membership, schemi, relazioni/sequenze, colonne/grants, vincoli, indici,
metadati delle routine, default ACL, RLS/policy, estensioni, trigger/event trigger,
indizi di configurazione degli schemi API.

Non leggere righe applicative/Auth/Storage, conteggi di clienti/rilievi, default
letterali, corpi SQL, espressioni delle policy, opzioni di server remoti o user
mappings, password/credenziali. Non eseguire routine applicative o delle estensioni.
I metadati omessi richiederanno valutazione distinta prima di un confronto
semantico completo. Gli indizi SQL non dimostrano l'effettiva esposizione Data API:
può servire conferma manuale delle impostazioni dashboard, senza cambiarle.

Esaminare i grants esistenti di TEMP/CREATE e delle routine large object: questa
fase li misura soltanto, non li modifica né esegue prove mutanti. Non dichiarare
readonly protetto perché non sono ancora stati fatti test dei divieti.

Se falliscono autenticazione, TLS, supporto delle opzioni/sessione, permessi di
lettura cataloghi o identità attesa: fermarsi, presentare solo diagnosi filtrata
e chiedere conferma prima di cambiare metodo, configurazione, CA o privilegi.
Non allentare TLS/read-only e non ripiegare su altri host/database.

## Verifiche offline riproducibili

```sh
pnpm --filter @workspace/api-server exec esbuild ../../lib/db/migration-preparation/inventory/inventory.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/nitrocrop-inventory.test.cjs
node --test /tmp/nitrocrop-inventory.test.cjs
pnpm --filter @workspace/db exec tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node migration-preparation/inventory/guard.ts migration-preparation/inventory/catalog.ts migration-preparation/inventory/run.ts migration-preparation/inventory/inventory.test.ts
```

# Adeguamento del solo programma QA — verifica offline

## Stato e ambito

Modifiche autorizzate al programma di inventario; nessuna autorizzazione alla
nuova esecuzione completa. **Non sono state aperte connessioni in questa fase.**
Sono stati eseguiti soltanto test mock, typecheck e compilazione.
Nessun default/ruolo/grant/RLS/schema Supabase, DATABASE_URL, configurazione
applicativa o workflow modificato. Nessuna credenziale letta per i test.

## Modifiche effettuate

| File | Cambiamento |
|---|---|
| catalog.ts | Barriera comune per diagnosi e inventario: BEGIN READ ONLY, probe prima di ogni SELECT, elenco esatto di query consentite, ROLLBACK obbligatorio |
| catalog.ts | Default della sessione soltanto informativo; stato read-only della transazione e identità attese restano obbligatori |
| catalog.ts / run.ts | Chiusura connessione anche in errore; successo emesso solo dopo completamento di ROLLBACK e chiusura |
| guard.ts | Eliminata dalle opzioni di startup la richiesta di cambiare default_transaction_read_only; TLS, CA/hostname, target e ambiente isolato invariati |
| inventory.test.ts | Verifiche positive/negative di tutta la sequenza, SQL/funzioni vietate e pulizia su ogni percorso |

Sequenza prevista, non eseguita sul server in questa fase:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT pg_catalog.current_setting('transaction_read_only') AS transaction_read_only;
-- Si prosegue SOLO con una riga esatta transaction_read_only = 'on'.
-- Prima di ogni ulteriore SELECT di metadati si ripete questo controllo.
-- Si possono eseguire solo le SELECT fisse autorizzate sui cataloghi.
ROLLBACK;
```

Valori off, assenti, NULL, booleani, ambigui o più righe provocano arresto,
senza eseguire la SELECT di metadati successiva. Un errore di BEGIN, probe o
SELECT porta comunque al tentativo di ROLLBACK e alla chiusura. Errori di
ROLLBACK/chiusura sono dichiarati come fallimenti, mai come successo.
Non vengono inviate istruzioni ALTER/SET per cambiare il default.

L'elenco runtime ammette soltanto gli statement integrali noti, non un generico
prefisso SELECT. Nessun ingresso per SQL fornito dall'utente. Le routine
chiamate sono solo lettori di metadati pg_catalog revisionati. Routine large
object, nextval, set_config, notifiche, routine applicative ed estensioni
non sono eseguite. La query sui permessi delle routine legge i loro cataloghi,
non chiama le routine descritte.

## Risultati dei controlli offline

**85 test superati, 0 falliti, 0 saltati.**

- Sequenza normale: connect → TLS verificato → BEGIN READ ONLY → probe →
  SELECT autorizzata → ROLLBACK → close.
- Stesso percorso obbligatorio per diagnosi e inventario.
- Default sessione off + transazione on: consentito nei mock, senza ALTER/SET.
- Probe non on prima della prima SELECT: arresto; nessun dato di inventario letto.
- Perdita dello stato on prima di una SELECT successiva: quella SELECT non eseguita.
- Query arbitrarie, multistatement o con funzioni mutanti: rifiutate prima
  dell'esecuzione.
- Errori simulati in connessione, TLS, BEGIN, probe, SELECT, ROLLBACK e close:
  propagati e senza report di successo.
- Controlli preesistenti di target, TLS, CA pubblica, variabili ereditate e
  filtraggio credenziali: superati.
- Typecheck TypeScript dei quattro file QA: superato.
- Compilazione bundle QA: superata; bundle NON eseguito.
- `git diff --check`: superato.

Comandi offline dalla radice:

```sh
pnpm --filter @workspace/api-server exec esbuild ../../lib/db/migration-preparation/inventory/inventory.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/nitrocrop-inventory.test.cjs
node --test /tmp/nitrocrop-inventory.test.cjs
pnpm --filter @workspace/db exec tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node migration-preparation/inventory/guard.ts migration-preparation/inventory/catalog.ts migration-preparation/inventory/run.ts migration-preparation/inventory/inventory.test.ts
pnpm --filter @workspace/api-server exec esbuild ../../lib/db/migration-preparation/inventory/run.ts --bundle --platform=node --format=cjs --outfile=/tmp/nitrocrop-inventory.cjs
git diff --check
```

## Limiti e prossimo permesso

Questi risultati provano il comportamento del programma con mock, non sono un
nuovo inventario Supabase né un test di scrittura negata sul provider.
L'account amministrativo non diventa un ruolo readonly: la protezione riguarda
le transazioni e gli statement del runner revisionato, non qualsiasi processo
o altra sessione del workspace.

**Attendere ulteriore autorizzazione prima di eseguire l'inventario completo.**
Restano esclusi test con scritture, creazione oggetti, modifiche privilegi,
funzioni/RLS/configurazioni, dati reali e qualsiasi migrazione.

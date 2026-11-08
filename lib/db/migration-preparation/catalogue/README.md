# Catalogo persistente — preparazione INATTIVA

**Nessuna applicazione al database eseguita.** Questa consegna prepara soltanto
SQL manuale per l'unico Supabase **Agri Precision** esistente. Non aggiunge nuove
colture operative, API, calcoli, migrazioni all'avvio o al post-merge. Clerk,
connessioni, TLS, Secrets e protezioni del runtime restano invariati.

## Contenuto fissato dalla selezione

Input: CSV e `controlli_selezione.json` prodotti da
`scripts/agronomy/catalogue_selection.py`. `selection-lock.json` fissa entrambi
gli SHA-256, il numero di profili, i conteggi per coltura e una versione derivata
dai due hash. Non aggiornare il lock per aggirare un errore: una diversa selezione
richiede nuova revisione e approvazione.

| Coltura | Profili |
|---|---:|
| Kiwi | 50 |
| Vite da vino | 55 |
| Vite da tavola | 55 |
| Pere | 55 |
| Mele | 55 |
| Lattuga | 55 |
| Spinacio | 55 |
| Spinacino (4 gamma) | 55 |
| Broccoli | 53 |
| **Totale** | **488** |

Da 516 profili in ingresso ne restano esclusi **28**:

- Tomuri, Matua, Chieftain e Belen (impollinatori), Bounty71 (portinnesto);
- tutti i **23 profili aggiuntivi**, per azoto totale non disponibile e assenza
  di valori della stessa coltura da cui ricavarlo. Riguardano Olivo, Ciliegio,
  Aglio, Cipolla, Peperone, Scarola, Bietola da costa/foglia, Bietola da zucchero
  e Zucchino: non sono dichiarati importabili o attivi.

Gli esclusi e i motivi nominativi sono nel controllo originale e nel manifest
persistibile. Potassio, fosforo, acqua e note non entrano nel catalogo persistito.
I 488 profili selezionati non hanno ricevuto medie o nuove fasi nell'output
effettivo. I dati forniti non diventano per questo riferimenti agronomici
validati; **ogni calcolo automatico resta disabilitato**.

## Struttura proposta, distinta dai dati cliente

`schema.sql` crea soltanto lo schema `agronomy_catalogue`:

- `versions`: versione immutabile, manifest con hash/conteggi/esclusioni e flag
  calcoli vincolato a `false`;
- `profiles`: chiave composta versione + UUID, dati tabellari e provenienza
  tecnica separata. Le stringhe CSV e le virgole decimali sono conservate senza
  conversioni o arrotondamenti.

UUID v5 derivato dalla coppia JSON esatta `[Coltura, Varietà]` in un namespace
fisso: indipendente da ordine, valori numerici e release. Niente fusione di
sinonimi o modifiche ai nomi. Cambiare un nome comporta una nuova identità e
richiede una decisione esplicita, non una riscrittura dei rilievi.

Non esistono riferimenti a osservazioni, utenti, account o storico; nessuna loro
chiave viene aggiornata. Non ci sono sequenze, funzioni persistenti, trigger
applicativi, puntatori alla versione “attiva” o cancellazioni a cascata.
Una release successiva convive con quelle precedenti.

Proprietario: `app_migrator`, già esistente. Schema e due tabelle non concedono
accesso a PUBLIC, anon, authenticated, app_runtime o app_readonly; RLS attiva,
nessuna policy. **Il runtime non legge ancora queste tabelle.** Il futuro
contratto di lettura autorizzato richiederà privilegi/policy dedicati e controlli
di accesso API, senza esporre il catalogo tramite la Data API.
Nessuna modifica a ruoli, LOGIN, membership o privilegi globali TEMP/large object.

## Preparare e controllare senza connessioni

Dalla radice del repository, con allegato originale disponibile:

```sh
python scripts/agronomy/catalogue_selection.py \
  attached_assets/Database_Colture_1794160273520.csv
python scripts/agronomy/catalogue_persistence.py
```

Il generatore riproduce la selezione dagli input revisionati e confronta CSV,
controllo, hash, completezza, identità e conteggi prima di produrre qualsiasi
file. CSV, controllo e SQL contenenti i dati sono in `generated-artifacts/`,
già escluso da Git e dal deploy. Non commettere i file grandi generati.
Se manca l'allegato in un checkout, fermarsi e recuperare l'originale dal
titolare: nessun dataset sintetico o CSV diverso può sostituirlo.

Output in `generated-artifacts/catalogue-persistence/`:

| File | Effetto **solo se successivamente autorizzato ed eseguito** |
|---|---|
| `apply.sql` | Inserisce l'intera release in un'unica transazione. Se già presente, confronta tutto senza aggiornare o riparare record. Divergenze: errore e rollback. |
| `verify.sql` | Transazione READ ONLY: manifest completo, dati e provenienza confrontati in entrambi i sensi, numero totale e conteggi per coltura. Manca una riga, ne compare una extra o cambia un valore: errore. Ripetibile. |
| `rollback.sql` | Confronta prima la release completa e immutata, poi elimina soltanto i suoi profili e la sua riga versione. Una release già assente è un no-op; una release divergente blocca la cancellazione. Non elimina tabelle, schema o altre versioni. |
| `package.json` | Versione, conteggi, stato `prepared-not-applied`, SHA-256 dei tre SQL e dello schema. Non è un attestato di applicazione. |

I tre SQL hanno payload autosufficiente e non richiedono `COPY`, percorsi locali,
estensioni o password. Nessun runner apre connessioni. Il guardiano rifiuta owner
o struttura incompatibili, RLS forzata, trigger/regole applicative, policy non
revisionate e foreign key non previste (incluse quelle verso tabelle esterne).
Le operazioni di scrittura prendono lock solo sulle due tabelle del catalogo,
con timeout. Il lock consultivo comune serializza le procedure predisposte.

## Passaggio futuro — dopo merge E autorizzazione specifica

Questa sezione **non è un'autorizzazione a eseguire**:

1. Far approvare destinazione esatta, schema e contenuto identificato dagli hash.
   Unico target: Agri Precision, reference `bhnaarbzpmcniesxyldx`, database
   `postgres`; endpoint approvato e TLS con verifica completa come nella
   configurazione esistente `lib/db/src/runtime-connection-config.ts`.
   Verificare destinazione effettiva: il solo nome del progetto non basta.
2. Usare esclusivamente la sessione amministrativa/migrator autorizzata fuori
   dallo sviluppo ordinario. Niente credenziali runtime, nuove credenziali QA,
   cambi di Secrets, database temporanei o nuovi progetti. Mantenere Clerk,
   i preflight e i gate di migrazione esistenti.
3. Prima del DDL controllare metadati, owner, ACL/default ACL, membership,
   eventuali event trigger e dipendenze del target gestito. Con oggetti
   incompatibili fermarsi: non ripararli automaticamente né eseguire la baseline,
   `roles.sql` storica o migrazioni generiche. Lo schema dedicato non deve essere
   aggiunto agli schemi esposti Supabase.
4. Verificare hash locali rispetto a `package.json`. Approvare separatamente
   `schema.sql` e `apply.sql`. La sessione deve già poter assumere app_migrator;
   per creare il solo schema serve l'amministratore autorizzato. Non concedere
   CREATE sull'intero database al migrator. Eseguire ogni file senza spezzarne
   la transazione e fermarsi al primo errore (se si usa psql: ON_ERROR_STOP).
   Non eseguire questi passaggi dall'avvio API o dal post-merge.
5. Eseguire `verify.sql`, conservare esito, versione/hash e conteggi, senza
   esportare dati cliente. Non basta il conteggio: serve il confronto completo.
   Una ripetizione di `apply.sql` deve lasciare la release identica.
6. Un eventuale annullamento richiede un'approvazione esplicita per
   `rollback.sql` e la verifica che nessun consumatore dipenda dalla release.
   Dopo l'annullamento verificare assenza della sola versione; una seconda
   esecuzione è un no-op. Lo schema vuoto resta deliberatamente disponibile.
   Non eliminare altro per “pulizia”.

## Verifiche offline e limiti

I test usano `pglast` (dipendenza Python di sviluppo, dal lock uv) per analizzare
SQL e blocchi PL/pgSQL **senza avviare PostgreSQL né creare database**.

```sh
uv run --frozen python -m unittest discover \
  -s scripts/agronomy -p 'test_*.py' -v
git diff --check
```

Coprono rigenerazione riproducibile, hash alterati, input diversi, conteggi,
UUID stabili, escaping, delimitatori, destinazioni protette, SQL limitato al
catalogo, confronto completo, cancellazione circoscritta e mancato collegamento
ad avvio/post-merge. I dati sintetici restano solo nei test e non nel pacchetto.

Queste prove **non** attestano esecuzione, idempotenza effettiva, permessi o
tempi sul Supabase gestito. Il collaudo transazionale sul target e l'applicazione
reale restano operazioni successive autorizzate: nessuna connessione o lettura
di dati cliente è necessaria per preparare questa consegna.

# Consumi: benchmark sintetico e limiti di scala

## Perimetro e autorizzazioni

Misura offline dell'8 novembre 2026. Nessun collegamento a database, dato reale,
nuova risorsa, SQL applicato, privilegio modificato o pubblicazione.
Non sono state lette credenziali. Fixture e confronti importano solo il modello
e il riduttore puro, non pool, route, middleware o moduli di connessione.
I test dello store intercettano query/connect prima di usare lo store.
Gli output generati sono in `generated-artifacts/`, esclusa da Git e deploy.

L'intervento applicato è solo codice: aggregazione **in memoria per richiesta**,
non tabella di aggregati, cache condivisa, modifica dei dati o attivazione SQL.
L'esecuzione del backend non è stata riavviata per questo collaudo: l'avvio
verifica schema e mapping amministrativo sul database configurato e questo
incarico non autorizza accesso ai dati esistenti. Nessun controllo reale di
startup o percorso autenticato è dichiarato superato da questi test offline.

**50.000.000.000 byte è la quota applicativa Pro, non spazio infrastrutturale
prenotato, disponibile o garantito.** La capacità e i costi del provider vanno
verificati separatamente. Il benchmark non rappresenta 50 GB di dati.

## Costo prima e dopo

Definizioni: A account richiesti, N osservazioni attribuibili, R righe
`app_plan_state` restituite, E eventi di consumo, H contratti storici, P periodi.

Prima, il riduttore filtrava R righe per ciascun account, tratteneva un array
di eventi validati per account e lo filtrava due volte per ogni periodo.
Costo CPU indicativo: O(A×R + somma(E_utente×P_utente) + A²), oltre al parsing
JSON e all'ordinamento dei contratti. La scansione dei conteggi osservazioni
e byte personali usava ricerche lineari ripetute.

Ora si indicizzano i risultati per proprietario; ogni riga metadati viene
validata una volta e si conservano solo contatori visit/map per periodo,
byte e contratti. Costo atteso con Map: O(A+R+H log H), memoria aggiuntiva
O(A+P+H), oltre ai risultati SQL già ricevuti O(R). Nessuna copia persistente
degli eventi validati. L'ordinamento e tutti i campi della risposta restano
identici, inclusi ordine degli account e ordinamento storico per decorrenza.
Non si usa una cache: cancellazioni, ripristini e rinnovi non possono lasciare
un riepilogo locale riutilizzato da una richiesta successiva.

Nuova mappa Pro: dopo l'INSERT dell'evento si esegue una sola `usageFor`
per controllo e risposta anziché due. Lo stesso lock dell'account e advisory
lock transazionale precedono inserimento, misura e COMMIT. Byte oltre soglia
causano ancora ROLLBACK dell'evento e non una risposta di successo.
Non sono cambiati i percorsi di retry o il salvataggio delle osservazioni.

## Riproduzione

```sh
pnpm --filter @workspace/api-server run test:plans
pnpm --filter @workspace/api-server run bench:plans
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run test
```

Il benchmark avvia un processo Node separato per scenario e strategia, genera
gli stessi dati deterministici, esegue cinque misure e confronta il digest
dell'intera risposta con il riduttore originale congelato nel supporto test.
Non usa dati casuali, rete o stringhe di connessione. GC esplicita prima di
ciascun campione, esclusa dal cronometro; il primo campione include il primo
utilizzo completo/JIT. Digest e generazione fixture esclusi dal cronometro.
Minimo/mediana/massimo, heap fixture e massimo RSS dell'intero processo vengono
stampati in JSON. Nessuna soglia temporale fragile nei test automatici:
un test strutturale controlla una sola visita a ogni riga metadati.

Ambiente osservato: Node v24.22.1, Linux, Intel Xeon Platinum 8581C 2,30 GHz,
container condiviso. Le durate non sono una garanzia di latenza in produzione.

| Scenario | Account | Eventi totali | Periodi/account | Prima min/mediana/max ms | Ora min/mediana/max ms | RSS massimo prima/ora MB |
|---|---:|---:|---:|---:|---:|---:|
| Singolo archivio | 1 | 100.000 | 20 | 380 / 413 / 430 | 315 / 318 / 438 | 315 / 291 |
| Lista amministrativa | 100 | 100.000 | 5 | 422 / 446 / 501 | 333 / 359 / 505 | 291 / 292 |
| Lista amministrativa grande | 100 | 1.000.000 | 20 | 5.133 / 5.369 / 5.650 | 3.367 / 3.429 / 3.959 | 972 / 971 |

Mediana ridotta rispettivamente del 23%, 20%, 36% circa. Il massimo non migliora
in tutti gli scenari: non si promette un guadagno uniforme per ogni richiesta.
Il RSS include Node, fixture, stringhe JSON, input e GC, **non** solo il riduttore:
non emerge una riduzione sostanziale della memoria al milione di eventi.
Già circa 3,43 s di sola CPU e 971 MB totali impediscono di considerare risolto
il problema per archivi Pro grandi o molte richieste contemporanee.

Le fixture dei conteggi osservazioni descrivono rispettivamente 1, 1 e 10 milioni
di osservazioni tramite risultati **già aggregati** (10 punti per evento):
queste osservazioni NON sono state generate, inserite, scansionate o cronometrate.
I byte delle righe sono valori sintetici, non misure PostgreSQL.
La misura comprende parsing/validazione JSON, conteggi, ordinamento e costruzione
della risposta. Esclude SQL, TLS/rete, pool, lock, disco, TOAST, serializzazione
HTTP e carico concorrente. Non è un benchmark PostgreSQL né una prova di restore.

## Costo che rimane nel database

`usageFor` continua a eseguire quattro SELECT quando la tabella è disponibile
(controllo esistenza, aggregazione osservazioni, byte personali, metadati).
Osservazioni e byte vengono calcolati nel database; al processo arrivano solo
conteggi per account, ma arrivano ancora **tutti** gli eventi piani/consumi.

- `count(*)`, `count(DISTINCT (cliente normalizzato,data))` e
  `sum(pg_column_size(o))` devono visitare N righe attribuibili. Il DISTINCT
  può richiedere sort/hash, memoria e spill su disco. Nessuna stima in ms
  attendibile senza esecuzione PostgreSQL autorizzata.
- L'indice sorgente `osservazioni_owner_display_idx` ha `owner_id` come primo
  campo; l'SQL piani predisposto prevede un indice proprietario. Questi sono
  riscontri nei file, non attestazioni degli indici effettivi nel database.
  Anche un buon indice non rende costante la somma delle tuple complete.
- `privacy_requests.user_id` non ha un indice dichiarato nello schema sorgente;
  non è stato verificato il database effettivo. Anche questo costo è da misurare.
- `uses` nei salvataggi e nelle mappe legge ancora tutti gli eventi del singolo
  account, anche storici; `left(key,length(prefix))=prefix` non è un intervallo
  indicizzato sulla chiave. L'indice per proprietario limita gli altri account,
  non l'intero storico di quello richiesto. Il retry mappe deve restare valido
  anche dopo il rinnovo: filtrare solo il periodo corrente lo romperebbe.
- La prima assegnazione legge le visite esistenti del periodo e inserisce un
  evento alla volta: non è stata accelerata né misurata qui.
- Il lock timeout resta 5 s, lo statement timeout 15 s nelle mutazioni: ogni
  statement ha il proprio limite, non l'intera richiesta. Parsing JS e attesa
  pool non sono limitati da questi timeout. Le letture di riepilogo fuori da
  `locked` non acquisiscono automaticamente tali timeout.
- Una lista amministrativa in più SELECT conserva la consistenza preesistente
  READ COMMITTED, non una fotografia atomica di tutti gli utenti. Non usarla
  come autorizzazione quota: le mutazioni misurano sotto lock nella transazione.

`storageBytes` rimane la somma di `pg_column_size` delle stesse righe e tabelle.
Non viene sostituito da lunghezza JSON, stima media, dimensione ZIP o dimensione
totale del provider. I campi non riconosciuti del namespace continuano a
contribuire ai byte; JSON malformato e identità/chiavi incoerenti dei record
riconosciuti continuano a causare errore esplicito.

## Evoluzione proposta, NON applicata

### 1. Letture mirate e misura PostgreSQL

Prima autorizzare esplicitamente un luogo di prova con soli dati sintetici:
nessun database o progetto temporaneo viene creato implicitamente; Agri Precision
e i database esistenti non vengono usati o popolati senza consenso specifico.
Non usare dati veri per simulare lo storico né duplicarli in workspace.

In quell'ambiente: registrare versione/configurazione, schema/indici/ACL,
distribuzione utenti piccoli e utente dominante, periodi, larghezza righe,
volumi 100k/1M/10M osservazioni e 100k/1M eventi; imporre budget di spazio e
tempo approvati prima della generazione. Usare `EXPLAIN (ANALYZE, BUFFERS)`
solo sulle SELECT sintetiche autorizzate. Misurare p50/p95, RSS backend,
byte trasferiti, blocchi letti/temp, attesa pool/lock con 1/5/20 richieste,
cache calda/fredda dove disponibile, e prima assegnazione oltre ai riepiloghi.
Concordare obiettivi p95 e risorse accettabili prima di certificare la capacità.

Valutare query per owner+periodo+tipo, conteggio del solo periodo richiesto
ed EXISTS per l'idempotenza globale della mappa. Storico e byte restano distinti.
Se si aggrega in SQL il JSON, preservare validazione di versione/schema,
ownership e chiavi, senza ignorare silenziosamente eventi corrotti.
Valutare campi tipizzati/indici nella sola tabella piani dedicata; non trasferire
queste scritture su `security_state`, che resta SELECT-only al runtime.
Indici, nuove colonne, backfill e relativa applicazione richiedono consenso:
nessuna istruzione eseguibile viene aggiunta ad avvio, post-merge o Drizzle push.
Il risultato HTTP e le regole di piano non cambiano.

### 2. Aggregati transazionali, solo se la misura li giustifica

Proporre separatamente schema/SQL e autorizzazione prima di implementare:

- Ledger immutato come fonte ricostruibile; contatori distinti per proprietario,
  periodo e tipo; indice globale per retry mappe attraverso i rinnovi.
  Non confondere visite ancora presenti con visite consumate nell'anno.
- Dato/evento/contatore/controllo soglia sotto gli stessi lock e nella medesima
  transazione. Aggiornare il contatore solo se l'INSERT idempotente ha inserito
  una riga; errore significa ROLLBACK di tutto. Nessun job asincrono può
  autorizzare una scrittura usando valori eventualmente obsoleti.
- Byte misurati sulla stessa espressione di riga PostgreSQL usata ora; confronti
  esatti su INSERT/UPDATE/DELETE, incluse variazioni di account, contratti,
  metadati e richieste privacy. Includere l'ingombro attribuibile di eventuali
  nuovi contatori, definendolo esplicitamente, senza passare a stime JSON.
  Verificare anche righe ampie/TOAST e comportamento UPDATE; non assumere che
  una misura di tuple prima del salvataggio equivalga a quella dopo.
- Coprire **tutti** i writer, cancellazioni privacy e manutenzione autorizzata;
  privacy sempre disponibile anche oltre soglia. Cancellare un'osservazione
  riduce i byte presenti, non restituisce una visita annuale consumata.
- Rinnovo crea solo il nuovo periodo: non azzera byte o archivio. Cambio piano
  conserva i consumi, retry rinnovo non duplica contatori, decorrenza futura
  e scadenza mantengono le stesse regole. Nessuna pulizia per liberare quote.
- Backfill e riconciliazione con snapshot coerente/lock e verifica esatta
  prima dell'attivazione; in caso di incongruenza bloccare l'attivazione,
  non usare zero o contatori potenzialmente sottostimati.
- Export/restore devono includere ledger, contratti e aggregati oppure
  ricostruirli e validarli prima della riapertura delle scritture. Non far
  ricomparire dati cancellati per privacy; coordinare con la procedura di
  cancellazione/ripristino già prevista, senza provarla su dati reali qui.
- Cancellazione account elimina anche contatori e ledger per quel proprietario.
  RLS, API amministrativa solo aggregati e isolamento per account invariati.
  Nessun privilegio in più sulle tabelle di sicurezza o ruolo nuovo.

## Copertura offline

Confronto integrale col riduttore originale su 80.000 eventi/40 account e
milione di eventi nel benchmark, storico multi-periodo, account codificati,
admin, non assegnati, periodi orfani, byte numerici/stringa, stato temporale,
errori JSON/schema/ownership/chiavi, righe sconosciute, account estranei,
assenza di mutazioni e ricostruzione da una copia sintetica. Test strutturale
anti-regressione sulla traversata lineare.

Store con pool simulato: quota 50/51, visite ripetute, idempotenza mappe anche
attraverso rinnovi, byte oltre quota e ROLLBACK dato/evento, misura unica Pro,
storico conservato, cancellazione per proprietario, prima assegnazione e
tabella opzionale assente. Nessuna prova di concorrenza PostgreSQL effettiva,
ACL/RLS reali, backup o prestazioni SQL viene sostituita da questi mock.

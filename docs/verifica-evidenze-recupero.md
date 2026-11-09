# Recupero in Agri Precision — verifica delle sole evidenze

Data: 8 novembre 2026.

## Ambito autorizzato e conclusione

Il titolare ha scelto **«Verificare solo le evidenze»** dopo essere stato
informato che il verbale più recente descrive Agri Precision già popolato e
operativo. Questa consegna è una verifica documentale, non una nuova prova di
restore, né una verifica dello stato attuale del database.

**Esito: trasferimento e parità dei dati attestati dai verbali esistenti;
integrità dei file cifrati locali riscontrata. Ripristino completo degli
oggetti applicativi dal backup NON certificato.**

Nessuna connessione ai database, lettura di record reali, decifratura,
esecuzione degli strumenti operativi, modifica di ruoli, dati o configurazioni,
pubblicazione o cancellazione è stata effettuata in questa verifica.
Non sono state aperte chiavi private né lette credenziali.

## Evidenze esaminate

- [Programma del backup, sezione 8](migrazione-punto-3.md#8-ripristino-futuro-cancello-separato-solo-agri-precision):
  requisiti originali della prova di ripristino.
- [Procedura backup/restore](../lib/db/migration-preparation/BACKUP_RESTORE.md):
  criteri di selezione degli oggetti, confronto e arresto.
- [Rapporto del backup preliminare reale](../lib/db/migration-preparation/backup/REAL_BACKUP_REPORT.md):
  archivio del 7 novembre, verifiche di lettura e download dichiarato dal titolare.
- [Risultati punto 4](../lib/db/migration-preparation/operational/POINT4_RESULTS.md):
  struttura protetta e tabelle allora vuote.
- [Risultati punto 5](../lib/db/migration-preparation/operational/POINT5_RESULTS.md):
  privilegi provati e limiti TEMP/large object, non isolamento globale.
- [Verbale operativo definitivo](../lib/db/migration-preparation/operational/FINAL_MIGRATION_RUNBOOK.md):
  backup finale, importazione, confronto, collaudo e riapertura dell'8 novembre.
- Lettura statica di `operational/import.ts`, `data.mjs`, `compare.ts`,
  `integrity.sql`, `import-final-checks.sql` e `verify-structure.ts`, sotto
  `lib/db/migration-preparation/`. Il codice chiarisce la copertura prevista;
  la sua presenza non dimostra da sola l'esecuzione.

I documenti preparatori che indicano «non eseguito» descrivono fasi precedenti:
non annullano i verbali successivi, ma non vanno reinterpretati come prove di
restore. Il verbale definitivo dichiara espressamente la propria precedenza
cronologica sulle checklist storiche.

## Riscontro locale degli archivi cifrati

Letti soltanto i nomi dei campi dei manifest e i byte cifrati per ricalcolare
SHA-256. Nessun contenuto applicativo decifrato. Entrambi i file sono presenti
nelle cartelle indicate nei rispettivi verbali, sotto
`generated-artifacts/production-backup/`.

| Archivio | Byte riscontrati | SHA-256 ricalcolato, coincidente con il verbale |
| --- | ---: | --- |
| Preliminare, 7 novembre | 16.127 | `3c565b60b8a2e1e1ddf29b7105e8b42fa1f6b7871e6cc05c98c0936e788aab38` |
| Finale, 8 novembre | 16.127 | `b985567eaea8f6f886f258bdd40962e7d3c0e2c0f6c8807f8c6db7f21c07eb55` |

Questo riscontro prova la corrispondenza dei file locali con le impronte
documentate, non la custodia esterna, la disponibilità futura della chiave o
la recuperabilità SQL. Decifratura e parsing integrale sono attestati dai
verbali precedenti, non ripetuti qui. Il download dichiarato per il preliminare
non prova la consegna del successivo archivio finale.

## Copertura e limiti

| Requisito | Evidenza disponibile | Valutazione |
| --- | --- | --- |
| Unico target Agri Precision | Punti 4/5 e verbale definitivo | Attestato storicamente; nessuna riconferma live in questa attività |
| Target vuoto | Punto 4: cinque tabelle senza righe; import: controllo iniziale e sotto lock | Vuoto di dati prima dell'importazione attestato; gli oggetti di baseline esistevano già |
| Recupero dati dal backup finale | Verbale: `IMPORTED_NOT_CUT_OVER`; codice: decifratura e sole sezioni COPY con colonne esplicite | Importazione dati attestata, non restore delle definizioni |
| Tutte le tabelle e 60 colonne | Verbale: `ALL_60_COLUMNS_MATCH_NO_CUTOVER`, conteggi e SHA-256 identici per tabella | Parità al momento del trasferimento attestata; non nuova verifica indipendente |
| ID, Clerk, titolarità, stati, consensi, date e campi agronomici | Inclusi nelle colonne confrontate; diagnostiche integrità e amministratore | Copertura prevista dal codice e successo riportato nel verbale; nessun ID o dato personale ripubblicato |
| NULL, stringa vuota, zero | Serializzazione PostgreSQL JSONB testuale, UTC, ordine per PK e nomi di colonna espliciti | Distinzioni preservate dal confronto previsto |
| Ownership, RLS e Data API | Punti 4/5; verbale: gate pre-COMMIT positivi, 15 policy e FORCE ripristinato | Garanzie circoscritte documentate; nessuna certificazione readonly globale o nuova prova HTTP Data API |
| Schema e oggetti recuperati dal dump | Baseline predisposta; parser importa solo COPY e scarta il restante SQL | Non dimostrato il restore di tipi/default/vincoli/indici/sequenze/funzioni/trigger/policy dal backup |
| Snapshot archiviato e confronto | Dati importati dall'archivio finale; confronto con sorgente dichiarata congelata, quiete prima/dopo backup | Non individuato, tra le evidenze esaminate, un manifesto di fingerprint per tabella acquisito nello snapshot del dump |
| Risultati analitici ripetibili | Verbale sintetico di uguaglianza; codice produce digest per tabella | Il verbale non riporta i digest per tabella: non è possibile ricostruire qui quel confronto dai soli risultati pubblicati |
| Stato finale concordato | Verbale: collaudo del titolare e riapertura su Supabase | Target operativo da preservare; nessuna pulizia o nuova importazione |

Conteggi storici riportati prima del collaudo applicativo:

| Tabella | Origine e destinazione secondo il verbale |
| --- | ---: |
| app_users | 1 |
| security_state | 1 |
| privacy_requests | 0 |
| security_events | 1 |
| osservazioni | 22 |

I conteggi non sono rilevati oggi. Dopo riapertura, login, audit e nuove
scritture possono legittimamente cambiare dati e impronte. Non confrontare
automaticamente il target operativo con lo snapshot storico e non correggere
differenze per ricreare artificialmente l'uguaglianza.

## Arresto della prova originaria e stato finale

La procedura originaria richiedeva uno spazio applicativo vuoto, selezione
revisionata degli oggetti e restore senza baseline sovrapposta. Il percorso
successivamente approvato e documentato ha invece usato baseline protetta più
importazione dei soli dati. L'esito positivo del trasferimento non sostituisce
la prova originaria di ricostruzione degli oggetti dal dump.

In base all'ultimo verbale Agri Precision è operativo: non è un target
ammissibile per ripetere quella prova. Si applica STOP, senza `--clean`,
DROP, TRUNCATE, reset, schema alternativo, secondo database/progetto o
modifica del servizio. Lo stato live non è stato interrogato.

Questa verifica documentale è conclusa nel nuovo ambito scelto dal titolare.
Non assegna l'esito `RESTORE_VERIFICATO`. Non autorizza ulteriori operazioni,
creazione di ruoli, cambio DATABASE_URL, cutover, pubblicazione, eliminazione
dell'origine o delle copie. Attestazioni dei fornitori, consegna del backup
finale e prova che dati cancellati non ricompaiano restano nelle attività
distinte già previste.

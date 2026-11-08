# Gestione utenti, piani e consumi

## Stato dell'attivazione

Struttura applicata su Agri Precision dopo consenso esplicito del titolare,
con COMMIT confermato e controlli su RLS, ACL e ruoli NOLOGIN.
Rapporto senza credenziali: `generated-artifacts/user-plans-activation-result.json`.
La tabella è stata creata vuota: nessun contratto è stato assegnato.
Nessun SQL di questo aggiornamento viene eseguito automaticamente.
L'applicazione controlla in sola lettura l'esistenza di `public.app_plan_state`.
Se manca, mostra statistiche reali sui dati esistenti e l'avviso di attivazione
in attesa, disabilita assegnazioni/inviti con piano e conserva il comportamento
operativo degli account già esistenti. Non mostra contatori annuali inventati.

La precedente configurazione concede al runtime solo SELECT su `security_state`:
questa protezione resta invariata. Serve una sola nuova tabella backend-only,
non un nuovo database, progetto, ruolo o Secret.

## Operazione che richiede autorizzazione separata

Eseguire `USER_PLANS_MANUAL.sql` **esclusivamente su Agri Precision**, con il
canale amministrativo già autorizzato per le migrazioni e TLS verificato.
La singola transazione crea una tabella vuota, una FK con cancellazione
per account, un indice proprietario e tre policy, revoca accessi Data API
solo alla nuova tabella e assegna i privilegi applicativi necessari.
Verifica ACL/RLS prima del COMMIT; su errore ROLLBACK e arresto.
Nessuna modifica a colonne o dati delle cinque tabelle, utenti, rilievi o ruoli esistenti;
la nuova FK aggiunge la sola dipendenza verso l'account proprietario.
Non sono previste revoche globali o modifiche ai privilegi predefiniti.

SQL revisionato offline e applicato al Supabase reale con verifica delle protezioni.
Non sono state eseguite prove CRUD su contratti reali o sintetici sul target.
L'applicazione non deve invocarlo all'avvio/post-merge
o con Drizzle push. Pubblicazione e attivazione sul sito pubblico restano
operazioni separate che richiedono consenso.

## Regole

- Standard: 50 visite (cliente senza spazi iniziali/finali + data rilevamento)
  e 50 mappe IDW per periodo annuale; più punti della stessa visita contano una volta.
- Pro: 50.000.000.000 byte (50 GB decimali), senza limiti numerici visite/mappe.
  È una quota applicativa: non prenota spazio nel database né modifica i limiti
  o i costi dell'hosting, che devono consentire la capacità venduta.
- Solo l'amministratore sceglie piano e data di decorrenza. La durata è un anno
  di calendario, con 29 febbraio riportato al 28 febbraio nell'anno successivo.
  Le date di decorrenza sono giorni UTC; la scadenza è esclusiva e viene resa
  nell'interfaccia con la localizzazione prevista.
- Un cambio Standard/Pro senza rinnovo conserva periodo, decorrenza e contatori.
- Il rinnovo deve essere selezionato esplicitamente: crea un nuovo periodo
  e azzera i contatori, ma conserva contratti precedenti e tutti i rilievi.
  La nuova decorrenza sostituisce il periodo corrente: scegliere una data futura
  rende il nuovo piano programmato, non ancora operativo, fino a quella data.
- Alla prima assegnazione vengono conteggiate le visite già salvate nel periodo
  scelto (in base a `created_at`). Non vengono inventate date per i record legacy.
- I vecchi utenti senza piano restano sotto le regole di accesso precedenti:
  non vengono associati automaticamente a Standard o Pro.
- Gli inviti nuovi e l'approvazione delle iscrizioni richiedono piano e data.
  L'approvazione non firma contratti, non riscuote denaro e non attiva rinnovi automatici.

## Persistenza e controlli

Il backend serializza salvataggi e cambi piano per proprietario con advisory lock
transazionale e lock dell'account. Una richiesta concorrente non può consumare
la cinquantunesima quota. Lo stesso identificativo di elaborazione non viene
addebitato due volte, neppure dopo un rinnovo. Gli errori causano ROLLBACK.
Il limite Pro viene misurato dopo la scrittura, nella stessa transazione:
se superato, vengono annullati sia dato sia consumo, senza eliminare lo storico.
La cancellazione esplicita di un'osservazione non restituisce quote annuali.

I contatori separati dallo storico non richiedono cron o azzeramenti massivi.
Le chiavi delle visite sono hash del raggruppamento, non copie di nomi o GPS.
L'amministratore riceve solo aggregati, non contenuti delle osservazioni altrui.
La RLS consente accesso al backend fidato; l'isolamento per proprietario è
applicato nelle API Express, non tramite identità Clerk impersonate nel database.

## Significato dei consumi

`storageBytes` somma `pg_column_size` delle righe PostgreSQL attribuibili
all'utente: osservazioni, account, richieste privacy e metadati piani/consumi.
MB = byte / 1.000.000. Non è lo spazio totale fatturato dal provider:
sono esclusi indici condivisi, pagine libere, WAL, backup, audit di servizio,
identità Clerk e file esportati solo sul dispositivo.
L'app non archivia automaticamente raster/ZIP esportati.

Le mappe vengono ancora calcolate nel browser. Il client verifica il piano,
calcola, registra il successo con UUID idempotente e mostra/esporta il risultato
solo se il server accetta la quota. Calcoli falliti non vengono addebitati.
Questo limita il flusso applicativo supportato, non l'esecuzione autonoma del
codice di interpolazione copiato fuori dall'app. Le mappe precedenti alla
prima assegnazione non hanno un contatore ricostruibile: l'interfaccia indica
esplicitamente da quando sono registrate.

Le richieste privacy restano possibili anche a quota esaurita; il loro piccolo
ingombro può pertanto superare la soglia, ma nuovi salvataggi operativi saranno
bloccati. Scadenza e quote non cancellano dati. Consultazione ed esportazione
dello storico restano disponibili per gli account attivi, anche a contratto
scaduto; restano in vigore isolamento, cancellazioni privacy e conservazione concordata.
L'eliminazione dell'account rimuove anche i suoi metadati piani/consumi.

## Verifiche

`pnpm --filter @workspace/api-server run test:plans`: modello e store con pool
interamente simulato, nessuna connessione reale. Controlli su soglie, rinnovo,
idempotenza, lock/ROLLBACK, isolamento e cancellazione per proprietario.
`tests/admin-plans.html`: interfaccia reale con rete intercettata e dati
sintetici, solo in sviluppo. Non elude le protezioni dell'applicazione reale.

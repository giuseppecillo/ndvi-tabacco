# Procedura operativa: scadenza quinquennale per account

## 1. Ambito e limiti

**Nessuna cancellazione automatica o massiva è introdotta da questa procedura.**
Il titolare incarica un responsabile operativo e un verificatore amministrativo.
Il report è un promemoria in sola lettura, non un’autorizzazione a cancellare.
Non invia email, non sospende account e non pianifica esecuzioni periodiche.
La sua adozione richiede l’assegnazione effettiva degli incarichi e delle verifiche.

La scadenza unica è il quinto anniversario di `app_users.created_at`, creazione
amministrativa dell’account, non accettazione dell’invito, ultimo accesso,
rinnovo o scadenza dell’abbonamento. Vale anche per dati aggiunti in seguito:
un rilievo creato il giorno prima della scadenza ha ancora quella scadenza.
Si usano anni di calendario e istante UTC; un account del 29 febbraio scade il
28 febbraio del quinto anno, alla stessa ora UTC. Mostrare la data all’utente
anche nell’ora locale italiana, indicando il fuso.

L’esenzione dell’amministratore dall’abbonamento **non** è un’esenzione dalla
conservazione. La sua scadenza richiede un piano separato: l’eliminazione
amministratore è vietata dalle API correnti e non va aggirata, né va alterato
il riferimento al primo amministratore senza una procedura autorizzata.

## 2. Report e avvisi amministrativi

Il responsabile esegue il report almeno settimanalmente; per account entro
30 giorni dalla scadenza il controllo diventa giornaliero.

```sh
# Esempio completamente sintetico, senza database o invii:
pnpm --filter @workspace/api-server retention:report --example

# Dati reali: solo un operatore infrastrutturale autorizzato.
# Usare l'ambiente voluto, verificato prima di eseguire il comando.
pnpm --filter @workspace/api-server retention:report --database \
  --reviews=/percorso-protetto/revisioni-conservazione.json
```

Il comando si collega al database già configurato per il processo; non sceglie
automaticamente produzione e non richiede di stampare o copiare credenziali.
La transazione è `REPEATABLE READ READ ONLY`; non chiama Clerk o altre API.
Per una verifica offline usare `--snapshot=/percorso-protetto/snapshot.json`.
I report contengono identificatori interni e conteggi, non nomi, email,
coordinate o contenuti delle richieste. Sono comunque dati riservati:
accesso solo agli incaricati, niente Git, ticket pubblici, email non protette
o report condivisi con altri clienti. Eliminare le copie di lavoro al termine
della pratica secondo le istruzioni del titolare.

Stati del report:
- `not_due`: oltre 90 giorni; nessuna azione di eliminazione.
- `warning_90d`: aprire una pratica, identificare titolare operativo e copie.
- `warning_30d`: controllare eccezioni e richieste privacy; predisporre il piano.
- `warning_7d`: verificare identità dell’account e conferma del responsabile.
- `due`: scadenza raggiunta o superata, anche se sospeso o con abbonamento valido.
  Non è una selezione da inviare in blocco a un endpoint di cancellazione.

Il responsabile registra data e destinatario degli avvisi nel sistema di
pratiche riservato. Se comunica con l’utente, usa i canali aziendali verificati,
senza includere dati di altri account. Il report non spedisce notifiche.
Alla scadenza, dopo autorizzazione, sospendere gli accessi operativi per evitare
nuove scritture durante l’intervento; non presentare tale sospensione come
una cancellazione. Le richieste privacy devono continuare a essere gestite.

## 3. Registro delle eccezioni: revisione obbligatoria

Prima di una cancellazione un incaricato verifica obblighi legali, controversie,
richieste di limitazione e richieste privacy ancora aperte. Una richiesta
`completed` o `rejected` non dimostra da sola l’assenza di un obbligo legale.
L’abbonamento rinnovato o una semplice preferenza commerciale non costituiscono
automaticamente una base per prolungare la conservazione.

Il registro riservato contiene, per ciascun ID account, decisione, base
giuridica/motivazione, categorie strettamente necessarie, approvatore,
scadenza dell’eccezione e successiva revisione. Conservare i dettagli nella
pratica protetta, non nel codice o nei log. Al report basta un riferimento:

```json
[
  {
    "accountId": "ID-ACCOUNT-SINTETICO",
    "decision": "hold",
    "reviewedAt": "2031-10-27T10:00:00Z",
    "reviewUntil": "2031-11-03T10:00:00Z",
    "reviewer": "OPERATORE-SINTETICO",
    "reference": "PRATICA-SINTETICA"
  }
]
```

`no_hold` attesta una verifica senza eccezioni; **non** autorizza la cancellazione.
La finestra di revisione del report è al massimo 30 giorni: è un controllo
operativo, non un nuovo termine legale di conservazione. La scadenza della
revisione di un `hold` non lo rilascia: resta bloccante fino a nuova valutazione.
Registro assente, dati incoerenti o revisione scaduta richiedono verifica.
L’assenza di una riga non equivale a “nessuna eccezione”.

Il report segnala inoltre richieste aperte, cancellazioni già in corso,
account amministratore e log condivisi. Tutte le righe riportano
`deletionAuthorized: false`, anche dopo una verifica senza eccezioni.
Questi blocchi sono **procedurali**: non esiste un nuovo vincolo tecnico
sull’endpoint di eliminazione; l’amministratore deve rispettare la pratica.

## 4. Piano per un solo account e conferma

Il responsabile prepara una scheda separata con:

1. Ambiente, ID account completo, creazione e scadenza ricalcolate; verifica
   che l’ID sia quello dell’account, non l’ID visuale di un rilievo (che può
   essere identico in account diversi).
2. Conteggi e inventario: account, osservazioni del solo `owner_id`, richieste
   del solo `user_id`, riferimenti ai log, identità e inviti, copie esportate,
   browser/dispositivi e backup pertinenti. Dati senza proprietario non vanno
   assegnati o cancellati in blocco: aprire una verifica individuale.
3. Eccezioni motivate e loro ambito. Non cancellare interamente un account se
   contiene dati soggetti a un’eccezione; far approvare una gestione selettiva
   fuori da questa procedura di eliminazione completa.
4. Scelta approvata: cancellazione completa oppure un progetto di
   anonimizzazione irreversibile verificato. Cambiare nome/email, togliere
   l’ID o arrotondare il GPS non dimostra anonimizzazione: verificare
   ricollegabilità, combinazioni di date/appezzamenti e chiavi esterne.
   Non esiste un comando di anonimizzazione in questo aggiornamento.
5. Piano di propagazione e ripristino, con incaricato per ogni copia/servizio.
6. Conferma esplicita dell’amministratore sul singolo ID, dopo controllo
   dell’ambiente e della pratica, e registrazione del verificatore. Vietato
   trasformare le righe `due` in una lista di cancellazioni automatiche.

Per l’eliminazione ordinaria usare la funzione già disponibile in Gestione
utenti e la sua conferma, solo dopo i controlli sopra. Non creare query massive,
non modificare la data di creazione per rinviare la scadenza e non riaprire un
account per azzerare il termine di dati precedenti.

## 5. Cosa esegue oggi l’eliminazione e cosa resta da verificare

L’endpoint amministrativo corrente, per un utente non amministratore:
- imposta prima lo stato `deleting`;
- elimina l’identità Clerk oppure revoca gli inviti pendenti dell’account;
- nella transazione locale elimina le osservazioni per quell’`owner_id`
  e l’account; la FK elimina le richieste privacy di quell’`user_id`;
- rimuove dai log i riferimenti `actor_id` e `target_id` dell’account;
- registra un evento `account_deleted` senza identificativo del destinatario.

Le azioni sono limitate all’account selezionato. Non cancellare un evento
condiviso solo perché uno dei suoi identificativi è in scadenza: l’altro
soggetto può avere una scadenza o eccezione diversa. La rimozione dei riferimenti
esistente non certifica che azione e timestamp siano anonimi; un incaricato
valuta il rischio di ricollegamento e l’eventuale ulteriore trattamento.
Gli eventi già privi di riferimenti non hanno una scadenza per-account
ricostruibile con certezza: non attribuirli arbitrariamente a un account
né cancellarli globalmente. Formalizzare una politica separata per tali eventi.
Il conteggio `unlinkedSecurityEvents` include anche riferimenti a ID account
non più presenti, che richiedono la stessa verifica.

Se Clerk fallisce, l’account resta disabilitato/in cancellazione: non segnare
la pratica conclusa. Se fallisce la transazione locale dopo il passaggio
esterno, verificare e ritentare il solo account. Non riabilitarlo o ricreare
l’identità per aggirare l’errore.

## 6. Propagazione, copie e verifica finale

Per ciascun fornitore effettivamente attivo (oggi hosting/database, Clerk e
cartografia), documentare quali dati sono trattati, quale cancellazione è
possibile e la risposta o scadenza contrattuale. Per dati del browser, mappe
e log infrastrutturali non presumere che l’eliminazione dell’account locale
esegua una cancellazione remota. Richiedere assistenza al fornitore quando
non è disponibile una funzione per il singolo interessato; mai eliminare
un intero servizio o database condiviso. Aggiornare l’inventario prima di
usare nuovi servizi, inclusi Supabase o Netlify.

Inventariare download GIS/PDF/JSON, copie operative, cache/dispositivi
autorizzati e copie di backup. Revocare accessi non cancella file già scaricati
o archivi locali: affidare all’incaricato la verifica e la rimozione delle
copie controllate dal titolare. Richiedere istruzioni per copie non
raggiungibili, senza dichiarare una cancellazione già avvenuta.

Per i backup registrare soggetto responsabile, copie interessate, finestre
contrattuali di eliminazione e impedimenti tecnici, accessi limitati e
gestione dell’eventuale eccezione documentata. Non dichiarare cancellazione
immediata o cinque anni effettivi senza evidenza dei fornitori.
L’informativa riporta l’impegno confermato dal titolare di eliminare i backup
entro 24 ore dalla cancellazione dei dati: registrare l’istante dell’intervento
sui sistemi attivi, la scadenza delle 24 ore e l’evidenza del completamento.
Se l’evidenza manca o il termine non è rispettato, mantenere aperta la pratica
e segnalare immediatamente lo scostamento al titolare; non attestare una
cancellazione completata. Un’eventuale eccezione va motivata e autorizzata,
non dedotta automaticamente da una difficoltà tecnica.
Ogni ripristino va isolato dagli utenti finché il registro riservato delle
cancellazioni non è stato riapplicato e verificato. La prova operativa di
eliminazione/ripristino dei backup è un’attività distinta: questa procedura
non modifica i backup e non la sostituisce.

Il verificatore autorizzato controlla dopo l’intervento: account assente,
zero rilievi e richieste per il solo ID, nessun riferimento residuo nei
log locali, identità/inviti non più utilizzabili e assenza di variazioni
per un account di controllo distinto. Non stampare contenuti personali.
Distinguere “sistemi attivi completati” da “copie/fornitori ancora in attesa”.
Chiudere la pratica solo con evidenze e tempi residui espliciti, mai in base
al semplice aggiornamento dello stato di una richiesta privacy.

La prova della cancellazione deve essere minimizzata, protetta e avere una
base e un termine di conservazione approvati; non conservare copie dei dati
cancellati o un elenco identificabile illimitato “per sicurezza”.

## 7. Verifica ripetibile senza dati reali

```sh
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server retention:report --example
```

I test coprono anniversario/leap day e istante UTC, soglie 90/30/7/0,
scadenza unica non estesa da nuovi dati o sospensione, amministratore,
eccezioni mancanti/scadute, richieste aperte, log condivisi, isolamento dei
conteggi e transazione in sola lettura con rollback su errore.
L’esempio non contatta servizi, non spedisce avvisi e non cancella account.

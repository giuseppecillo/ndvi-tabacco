# Accesso riservato e privacy — NitroCrop NDVI

## Prima attivazione

1. L’indirizzo amministrativo autorizzato è configurato in `ADMIN_BOOTSTRAP_EMAIL`,
   separatamente dalle credenziali gestite da Clerk.
2. Nella pagina pubblica, nella sezione di prima attivazione, richiedere l’invito
   dell’amministratore. La mail viene inviata solo all’indirizzo configurato,
   al massimo una volta ogni 15 minuti.
3. Aprire l’invito nella stessa istanza dell’app, scegliere una password personale
   e prendere visione dell’informativa.
4. Da **Amministrazione**, creare gli utenti inserendo nome ed email.
   Gli invitati scelgono autonomamente la propria password; gli inviti scadono
   dopo sette giorni.

Non utilizzare password condivise né password comunicate in chat. L’amministratore
non può leggere le password degli utenti. Il recupero è disponibile nel modulo
di accesso, e il cambio password nel profilo di sicurezza.

Per una configurazione iniziale assistita è disponibile il comando manuale
`pnpm --filter @workspace/api-server setup:admin`, che richiede il segreto
`NITROCROP_ADMIN_PASSWORD` inserito tramite il modulo sicuro. Non legge password
da file o argomenti e non viene eseguito all’avvio. Agisce solo sull’amministratore
iniziale autorizzato e usa le regole di robustezza del fornitore. Dopo il successo
rimuovere il segreto temporaneo: la credenziale è già custodita dal gestore di
autenticazione. L’operazione riguarda l’istanza Clerk dell’ambiente corrente.

## Dati e autorizzazioni

### Durata degli abbonamenti

L’amministratore è esente da scadenza. Per gli utenti ordinari, la durata iniziale
predefinita è di 30 giorni ed è modificabile, da 1 a 3650 giorni, durante la creazione.
La durata decorre dalla creazione, non dall’accettazione dell’invito.
Gli utenti ordinari già presenti all’introduzione della funzione ricevono 30 giorni
dalla migrazione, una sola volta: i successivi riavvii non rinnovano l’abbonamento.

“Imposta da oggi” sostituisce la scadenza con l’istante attuale del server più
il numero indicato di periodi di 24 ore. Non somma i giorni residui e non riattiva
un account sospeso. Le scadenze sono visualizzate nell’ora italiana.
I giorni residui sono arrotondati per eccesso; alla scadenza diventano zero.

La scadenza blocca le API dei rilievi e la pagina operativa senza cancellare dati.
Rimangono disponibili account, esportazione personale e richieste privacy.
Si tratta di gestione manuale degli accessi: nessun pagamento o rinnovo automatico.

- Le osservazioni preesistenti sono attribuite una sola volta all’amministratore
  iniziale, senza modificarne il contenuto.
- Ogni account vede, esporta e cancella solo le proprie osservazioni.
- L’amministratore gestisce account e richieste privacy, ma il suo registro non
  comprende automaticamente i rilievi di altri utenti.
- La sospensione blocca subito le successive richieste API; le pagine aperte
  ricontrollano lo stato ogni 15 secondi.
- La cancellazione amministrativa richiede conferma e rimuove identità di accesso,
  account, osservazioni e richieste associate dai sistemi attivi.
- Una richiesta privacy non equivale alla cancellazione automatica: deve essere
  valutata dal titolare. Aggiornarne lo stato non esegue azioni sui dati.

## Prima della pubblicazione

L’informativa è esplicitamente una bozza. Il titolare deve completare sede legale,
tempi di conservazione, accordi con i responsabili del trattamento e verifica di
eventuali trasferimenti, servizi esterni e backup. Nessuna certificazione GDPR
è implicita nell’implementazione tecnica.

L’indirizzo per assistenza password e quello per la privacy sono contatti
applicativi. Non è stato configurato un mittente aziendale per le email:
l’invio di inviti e recuperi è gestito dal fornitore di autenticazione.

Clerk separa gli utenti di sviluppo da quelli di produzione. Dopo la
pubblicazione, il database e la prima autorizzazione amministrativa sono
inizializzati nell’ambiente di destinazione; l’account deve essere attivato
anche lì tramite il proprio invito. Non copiare identità o chiavi di produzione
nel database di sviluppo.

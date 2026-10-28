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

**Stato: informativa aggiornata con le informazioni confermate dal titolare.**
Versione del testo pubblico e della presa visione API: `2026-10-28.5`.
Le modifiche sostanziali richiedono una nuova presa visione, non consenso marketing.

Informazioni confermate dal titolare:
- Taurus Agriculture Solution SRL, Viale Giustiniano n. 8, Milano:
  ha sviluppato il software NitroCrop NDVI, ne è il fornitore ed è titolare
  del trattamento.
- Conservazione di 5 anni per ogni categoria: account, dati cliente,
  rilievi/GPS/NDVI e parametri agronomici, log di sicurezza, richieste privacy.
  Il termine decorre per tutte le categorie dalla creazione dell’account da
  parte dell’amministratore, anche per dati aggiunti successivamente.
- Basi giuridiche distinte: contratto per il servizio (art. 6.1.b GDPR),
  legittimo interesse per sicurezza e prevenzione abusi (art. 6.1.f),
  obbligo legale per le richieste di esercizio dei diritti (art. 6.1.c).

Ulteriori conferme ricevute dal titolare:
- Taurus Agriculture Solution SRL gestisce il servizio oltre ad averlo sviluppato.
- I contratti con Aruba, Replit, Supabase e Netlify sono correttamente gestiti
  e controfirmati e comprendono gli accordi privacy richiesti dal GDPR.
  L’app esplicita anche Clerk per l’autenticazione ed Esri per le mappe; l’elenco
  dei contratti dichiarati non prova che ogni fornitore riceva tutti i dati.
- Paese di hosting: Regno Unito. Per i trasferimenti coperti si applica la
  decisione UE di adeguatezza ai sensi dell’art. 45 GDPR, rinnovata il
  19 dicembre 2025. Non si dichiara trattamento esclusivo UE/Regno Unito;
  per ulteriori trasferimenti sono necessarie le garanzie del capo V.
- Backup incrementali continui, cifrati in transito e a riposo; eliminazione
  entro **24 ore dalla cancellazione dei dati**, non dalla creazione della copia.
  Sono informazioni confermate dal titolare, non risultati di un audit tecnico.

Riferimento ufficiale verificato per il Regno Unito:
https://commission.europa.eu/document/download/b36eedab-43b8-46eb-ac30-a8d1e6e69f51_en?filename=Renewal%20UK%20adequacy%20GDPR.pdf

Responsabilità operative da mantenere:
- Il titolare deve eseguire la cancellazione/anonimizzazione alla scadenza unica
  quinquennale. Questo aggiornamento non introduce cancellazioni automatiche.
- Conservare gli accordi applicabili, verificare i subfornitori e gestire copie
  e ripristini senza reintrodurre dati cancellati. Il testo non modifica i
  sistemi di backup o le loro impostazioni.
- Riesaminare l’informativa se cambiano localizzazione, servizi, cookie,
  garanzie o tempi di conservazione.

Il testo pubblico e gli avvisi sono disponibili in italiano, inglese e spagnolo.
L’aggiornamento non cambia autorizzazioni, isolamento dei rilievi, localizzazione
dei servizi o politiche operative di backup. Nessuna certificazione GDPR è
implicita nell’implementazione tecnica.

L’indirizzo per assistenza password e quello per la privacy sono contatti
applicativi. Non è stato configurato un mittente aziendale per le email:
l’invio di inviti e recuperi è gestito dal fornitore di autenticazione.

Clerk separa gli utenti di sviluppo da quelli di produzione. Dopo la
pubblicazione, il database e la prima autorizzazione amministrativa sono
inizializzati nell’ambiente di destinazione; l’account deve essere attivato
anche lì tramite il proprio invito. Non copiare identità o chiavi di produzione
nel database di sviluppo.

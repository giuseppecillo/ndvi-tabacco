# Release limitata ai profili completi verificati

Il titolare ha ridotto il perimetro alle sole colture e varietà verificate
e ha confermato esplicitamente **«Solo profili colturali completi»**, escludendo
anche l'inserimento di schede bibliografiche parziali consultabili.

## Contenuto autorizzato

- Conservazione esatta dei **1.396 profili precedenti**, senza cambiamenti
  di identità, parametri, fasi o modelli.
- Tre aggiunte di melanzana: **Melana F1, Tasca F1, Egle F1**.
- Totale della release: **1.399 profili**, in **18 colture/gruppi esistenti**.
- Nessuna delle 23 colture candidate della ricerca viene attivata: i dati
  estratti non costituiscono ancora profili completi con tutti i parametri.

Le identità delle tre aggiunte sono documentate dal costitutore. I parametri
sono medie dei 60 profili originari di melanzana già forniti dal titolare:
non sono nuove calibrazioni sperimentali per i tre ibridi. Fonti, metodo,
donatori e valori sono descritti in
[Verifica delle evidenze](catalogue-expansion-evidence-review.md).

## Importazione protetta del sottoinsieme

Il percorso manuale `--apply-approved-verified-catalogue`:

1. Controlla offline il contenuto congelato dei 1.396 profili precedenti.
2. Ammette esattamente le tre aggiunte con impronte complete dei parametri,
   dei dati di visualizzazione e della traccia dei donatori.
3. Rifiuta identità aggiuntive, profili rimossi, duplicati o parametri cambiati.
4. Verifica TLS, identità del database, struttura, permessi e policy.
5. Confronta anche la release precedente realmente conservata su Supabase.
6. Inserisce una nuova release immutabile soltanto nella tabella dedicata
   `agronomy_catalogue.model_profiles`, senza aggiornare o cancellare le
   versioni esistenti.
7. Confronta integralmente tutti i record prima del commit.

Non modifica rilievi, account, storico, connessioni applicative o pubblicazioni.
Il vecchio percorso di ampliamento completo continua a richiedere tutti i 23
gruppi: il nuovo comando non trasforma la copertura parziale in ampliamento completo.

Controllo locale, senza connessione al database:

```sh
node generated-artifacts/catalogue/apply-verified.cjs --check-verified-catalogue
```

Il risultato dell'applicazione è conservato fuori Git in
`generated-artifacts/catalogue-verified-result.json`; una seconda verifica
in transazione di sola lettura usa `--verify-catalogue-only`.

### Esito dell'applicazione

La release `models-acd49d7d5d15e67b0113576f781dafba` è stata applicata
su Supabase e confrontata integralmente prima del commit. La release
precedente è stata confrontata con il riferimento congelato prima
dell'inserimento: tutti i 1.396 profili originari sono conservati.
Una successiva transazione di sola lettura ha nuovamente verificato
tutti i **1.399 record** della nuova versione ed è terminata con rollback.

La connessione ha verificato CA, hostname e TLS 1.3. Policy, RLS forzata,
assenza di accesso Data API e lettura senza scrittura per il ruolo
applicativo sono state controllate. Nessun dato dei clienti è stato
letto o modificato; nessuna pubblicazione è stata eseguita.

Sono passati 24 test fra selezione verificata, conservazione del catalogo
precedente, contratto API e calcoli/Excel. Sono passati anche i controlli
TypeScript del server e dell'app. I test di salvataggio API usano storage
simulato: non scrivono rilievi reali e non costituiscono una prova browser.

## Collegamento con l'app

Le tre aggiunte fanno già parte dell'unica sorgente condivisa utilizzata da
catalogo, selezione dei parametri del rilievo, calcoli, controlli API ed Excel.
Non esistono elenchi paralleli da aggiornare con nomi senza parametri.
In modalità Supabase il servizio controlla che la release persistente
corrisponda integralmente a quella compilata prima di restituire il catalogo.

Questa release completa **il perimetro ridotto autorizzato**, non
l'integrazione delle 23 colture escluse. I relativi riferimenti di ricerca
restano documentazione tecnica, non dati operativi.

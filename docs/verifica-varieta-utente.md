# Verifica del flusso varietà proposte

## Risultati

- Test backend dedicati: 6 superati; includono permessi delle route, identità
  server, nomi duplicati, riferimento della stessa coltura, stato pending,
  decisione atomica, calcolo solo da profilo approvato e rifiuto di dosi alterate.
- Suite backend preesistente: 133 test superati.
- Suite frontend: 198 test superati; include verifica del catalogo e lettura
  dell'archivio XLSX reale contenente varietà approvata e colture native.
- TypeScript e build frontend/backend superati.
- Nuova struttura applicata su sviluppo isolato e Supabase Agri Precision.
  Su Supabase: singola transazione, TLS/CA/hostname verificati, nuova tabella
  vuota, RLS forzata, permessi runtime limitati, nessun privilegio Data API.

## Browser: dati sintetici, non produzione

Pagina: `/tests/variety-proposals.html`, disponibile solo in sviluppo.
Le chiamate API reali sono bloccate, i dati QA persistono soltanto in
sessionStorage della fixture.

Percorso verificato:

1. Kiwi / riferimento Hayward, nuovo nome QA, quote 10/20/30/40, totale 100.
2. Salvataggio esplicito e stato pending, conservato dopo ricaricamento.
3. Ricerca nel catalogo prima dell'approvazione: nessun risultato.
4. Amministrazione: una proposta, dettaglio delle quote e riferimenti NDVI;
   seconda conferma necessaria per approvare.
5. Dopo approvazione: zero proposte in attesa, una riga nel catalogo,
   totale 100 e quota F2 20.
6. Selezione della nuova varietà nel form reale dei rilievi, fase F2 e
   cinque letture 0.42/0.38/0.41/0.39/0.40: media 0.4, dose 7.3 kg N/ha.
   Nessun salvataggio di osservazioni reali.
7. Smartphone 390px: nessun overflow della pagina; tabelle con scroll proprio.
   Titoli e salvataggio verificati in italiano, inglese e spagnolo.
8. Dose negativa bloccata. Errore POST simulato: valori digitati conservati,
   messaggio visibile, nessuna falsa conferma di salvataggio.

Il download browser dell'Excel non è stato confermato durante quel passaggio:
la prima fixture ometteva i profili tabacco richiesti dal generatore.
La fixture è stata corretta; un test offline legge ora l'OOXML effettivamente
generato e verifica la presenza della nuova varietà, tabacco, pomodoro e grano.

Non è stato eseguito un invio di proposta da un account reale sul sito pubblicato.
I risultati del browser simulato non sono una dichiarazione di collaudo live.

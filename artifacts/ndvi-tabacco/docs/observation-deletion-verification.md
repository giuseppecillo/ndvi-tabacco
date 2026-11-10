# Storico e cancellazione tra desktop e smartphone

## Esito

Collaudo browser completato con esito positivo su componenti reali, con due
contesti Chromium distinti e stato sintetico condiviso esclusivamente nella
memoria del runner. Sono stati registrati 35 controlli riepilogativi.

| Ambito | Evidenza |
| --- | --- |
| Dati iniziali | Cinque ID sintetici identici nelle due viste, senza duplicati |
| Focus | Nuovi record sintetici visibili in entrambe le viste dopo focus |
| Intervallo | Nuovo record visibile dopo il vero intervallo di aggiornamento di 30 secondi |
| GET fallito | Storico conservato su entrambe le viste; avviso italiano e successiva scomparsa dopo recupero |
| Conferma annullata | Nessuna richiesta DELETE e record conservato |
| Cancellazione negata | Record conservato, errore inglese e successiva traduzione spagnola |
| GET precedente alla cancellazione | Snapshot trattenuto e rilasciato dopo DELETE e aggiornamento successivo; nessuna ricomparsa, sia desktop/IT sia smartphone/ES |
| Altro contesto | Convergenza dopo aggiornamento successivo alla cancellazione |
| Cancellazione massiva | Azioni reali smartphone/ES e desktop/IT; conservati esattamente `QA-expired` e `QA-legacy` |
| Registro e storico | Stessi ID finali in entrambe le viste e in tutte le lingue |
| Pulsanti protetti | Disabilitati nel registro e nei dettagli dello storico, con motivazioni in IT/EN/ES, a entrambe le risoluzioni |
| Smartphone | 390×844, nessun overflow del documento; scorrimento interno previsto per le tabelle |

## Isolamento

- Entry esclusivamente di sviluppo: `tests/observation-deletion.html`.
- Componenti applicativi, hook, conferme e navigazione non sostituiti.
- Solo il trasporto dati è sintetico; nessuna API reale raggiunta.
- Routing preventivo per vietare API, host esterni e scritture di rete.
- Service worker bloccati; quattro connessioni WebSocket di sviluppo bloccate.
- Nessun account modificato, autenticazione eseguita, backend avviato,
  database consultato o dato di produzione utilizzato.
- Il trasporto ritardato ignora intenzionalmente AbortSignal: il test verifica
  che l'hook rifiuti comunque la risposta obsoleta.

## Riproduzione ed evidenze

Istruzioni in `tests/README.md`; runner:
`tests/observation-deletion-browser-pass.mjs`.

L'esecuzione produce nella radice del workspace:

- `generated-artifacts/observation-deletion/browser-pass.json`: controlli,
  versione del browser e traccia delle chiamate sintetiche.
- `generated-artifacts/observation-deletion/browser-pass.md`: riepilogo.
- `generated-artifacts/observation-deletion/screenshots/`: entrambe le viste in
  italiano, inglese e spagnolo.

Il controllo TypeScript dell'artifact è passato. Non sono stati ripetuti i test
API o le analisi database già completati.

## Limiti

Le risoluzioni 1280×900 e 390×844 simulano viste desktop e smartphone in
Chromium, non dispositivi fisici né Safari/iOS o una PWA installata.
Gli inserimenti avvengono nella memoria del runner: non sono una verifica del
salvataggio reale. Non sono verificati login, backend o sincronizzazione tra
account autenticati. Le schermate di errore non costituiscono una matrice
esaustiva di ogni azione in ogni lingua: gli scenari e le lingue effettivamente
esercitati sono indicati nella tabella.

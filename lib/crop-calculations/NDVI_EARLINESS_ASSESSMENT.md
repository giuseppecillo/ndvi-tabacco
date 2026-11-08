# Precocità varietale e riferimento NDVI: esito della verifica

## Decisione

**Non attivare correzioni numeriche dell'NDVI basate soltanto sulla classe di
precocità.** Conservare i riferimenti specifici di varietà e fase già forniti,
la media aritmetica degli intervalli NDVI e la conferma della fase in campo.
Non riscrivere osservazioni, dosi o riferimenti storici.

La precocità può contribuire a stimare il momento del raggiungimento di una
fase. Non determina da sola di quanto alzare o abbassare il valore NDVI alla
stessa fase. Mancano finestre temporali varietali quantitative calibrate,
dati termici ed evidenze di campo indipendenti su piante con azoto adeguato.

## Dati e confronto riproducibile

Fonte esclusiva: parametri del catalogo locale, nessun dato dei clienti.
Analizzati **1.373 profili**: 848 del modello generico e 525 pomodoro,
16 colture, quattro riferimenti per profilo, **5.492 valori**.
Tabacco (9 profili) e grano duro (14) non hanno nei parametri attuali una
calibrazione varietale quantitativa di precocità utilizzabile per questo test.
Restano invariati i loro modelli e gli eventuali aggiustamenti fenologici
già esplicitamente supportati, come l'età della piantina del tabacco.

Test: ricostruire il riferimento NDVI di una varietà lasciandola fuori
dall'addestramento. Tutti gli omonimi della varietà esclusa sono rimossi.
Confronto appaiato fra:

1. media dei riferimenti di altre varietà della stessa coltura, destinazione,
   impiego, fase e BBCH;
2. stessa media, limitata anche alla classe di precocità.

Ogni varietà donatrice ha peso uguale. Servono almeno tre **altre** varietà
in entrambi gli stimatori; nessun prestito fra colture o destinazioni diverse.
Non sono introdotti moltiplicatori arbitrari, anticipo/ritardo in giorni
inventati o una scala numerica arbitraria per le classi qualitative.

Confronti utilizzabili: **5.348**. Esclusi **144** per insufficienza di varietà
donatrici della stessa classe. Esclusioni esplicite, non fallback nascosti.

| Indicatore, unità NDVI | Senza classe di precocità | Con classe di precocità |
|---|---:|---:|
| Scostamento assoluto medio (MAE) | 0,00934546 | 0,00949515 |
| Radice dell'errore quadratico medio (RMSE) | 0,01457034 | 0,01479734 |

Il MAE aumenta di circa **1,60%**, non diminuisce. Alcuni sottoinsiemi mostrano
variazioni positive minime, altri peggiorano; non si selezionano a posteriori
i soli risultati favorevoli per attivare correzioni sulle dosi.

**Questi errori misurano la ricostruzione dei parametri di catalogo, NON
l'accuratezza agronomica dell'app sul campo.** I parametri noti della singola
varietà sono già utilizzati direttamente dall'app. Sostituirli con una media
di gruppo perderebbe informazione. Né il confronto positivo né quello negativo
dimostrano da soli la validità biologica di una soglia ottimale.

## Esecuzione e controlli

```sh
pnpm --filter @workspace/ndvi-tabacco exec tsx --test ../../scripts/agronomy/evaluate-earliness.test.mjs
pnpm --filter @workspace/ndvi-tabacco exec tsx ../../scripts/agronomy/evaluate-earliness.mjs
```

Cinque test: segnale sintetico effettivamente informativo, esclusione degli
omonimi dall'addestramento, isolamento delle colture, donatori insufficienti,
input non validi e copertura del catalogo. Risultati per coltura nello stdout
JSON, senza credenziali, connessioni DB o dati cliente.

Il catalogo Supabase non richiede una nuova versione: nessun riferimento
agronomico è stato cambiato. La verifica esplicita in sola lettura sul progetto
Agri Precision ha restituito **verified-without-changes**: tutti i 1.396 profili
persistiti coincidono integralmente con i modelli compilati della versione
`models-d28bdc2a58ae971aa9b7d95bf79aad98`.
TLS 1.3, CA e hostname verificati; transazione READ ONLY verificata,
conclusione con ROLLBACK e chiusura della connessione. Nessuna scrittura
Supabase, nessuna lettura di dati cliente, nessun cambio di DATABASE_URL
o pubblicazione. Rapporto: `generated-artifacts/catalogue-readonly-result.json`.
Non eseguire la modalità di applicazione SQL per pubblicare l'esperimento.

## Evidenza scientifica consultata

- Wang et al., *Remote Sensing* 2022, 14(19), 4930,
  [doi:10.3390/rs14194930](https://doi.org/10.3390/rs14194930).
  Le soglie e le date fenologiche variano con contesto e temperatura; lo studio
  calibra con osservazioni fenologiche a terra. Non fornisce coefficienti
  NDVI trasferibili alle varietà di questo catalogo.
- *Optimizing nitrogen rates for winter wheat using in-season crop N status
  indicators*, *Field Crops Research*, 2024, 318, 109545,
  [pagina dell'articolo](https://www.sciencedirect.com/science/article/pii/S0378429024002983).
  Riferimento consultato per contesto sugli indicatori dello stato azotato,
  non fonte di un coefficiente universale di precocità per altre colture.

Un eventuale miglioramento operativo richiede dati di riferimento validati
con varietà, fase/BBCH, date, condizioni di azoto adeguato e sensore noto,
e valutazione su siti/campagne tenuti fuori dalla calibrazione.

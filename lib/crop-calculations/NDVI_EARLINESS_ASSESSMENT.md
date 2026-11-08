# Precocità varietale e riferimento NDVI: esito della verifica

## Stato della validazione indipendente: BLOCCATA

**Non sono disponibili campagne di campo indipendenti idonee.** Nessuna
accuratezza sul campo o riduzione delle dosi è stata dimostrata. Il rapporto
predefinito espone `independentFieldValidation.status = BLOCKED`, zero campioni
e metriche NDVI/dose `null`, separatamente dalla ricostruzione del catalogo.
Non si cercano dati cliente, non si aprono connessioni Supabase e non si
modificano modelli attivi o storico. I numeri di catalogo sotto riportati non
sono risultati della nuova validazione indipendente.

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

Test di ricostruzione: segnale sintetico effettivamente informativo, esclusione
degli omonimi dall'addestramento, isolamento delle colture, donatori insufficienti,
input non validi e copertura del catalogo. Risultati per coltura nello stdout
JSON, senza credenziali, connessioni DB o dati cliente.

### Verifica preesistente del catalogo persistente, non ripetuta da questo strumento

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

## Protocollo offline pronto per dati futuri

Implementazione: `scripts/agronomy/field-earliness.mjs`, richiamata dal comando
esistente. Non importa osservazioni normali e non addestra curve da un catalogo.
Le curve candidate devono essere preparate **solo** sulla partizione di
calibrazione, congelate prima di consultare i risultati di valutazione e
accompagnate da evidenza di provenienza. Dichiarazioni e documenti devono essere
verificati da chi consegna i dati: il codice non può attestare da solo che un
documento agronomico sia autentico o che non si siano consultati i risultati.

### Dati ammessi

Un file JSON locale, de-identificato, con:

- `schemaVersion: 1`, `sourceEvidence` (riferimento al protocollo/provenienza),
  `customerData: false`, `independentFieldData: true`, `synthetic: false`;
- `rows`: misure di riferimento, ognuna con `id` univoco, `split` pari a
  `calibration` o `evaluation`, `crop`, `variety`, `earliness`, `site`, `campaign`;
- `establishedOn` (semina/trapianto) e `date` in formato ISO `YYYY-MM-DD`,
  `day` intero coerente con la differenza delle date, `phase`, `bbch`,
  `phaseConfirmed: true`;
- `sensor` e `sensorProtocol` (strumento, calibrazione e procedura),
  `sourceEvidence`, `origin: "independent-reference-experiment"`,
  cinque `readings` NDVI tra 0 e 1;
- `nitrogen: {status: "adequate", verified: true, method, evidence, verifiedOn}`:
  metodo e prova indipendente dello stato N adeguato alla data di misura.
  Non basta avere applicato del concime o osservare un NDVI alto.
  `verifiedOn` deve coincidere con `date`; una verifica non contemporanea
  richiede un protocollo distinto, non una modifica tacita delle date;
- `modelInput.applied` (kg N/ha già distribuiti). Per il catalogo e pomodoro
  serve anche `yield` (t/ha); per pomodoro `profileId` è l'identificativo
  completo del profilo, non il solo nome omonimo;
- per tabacco: `modelInput.totalN`, `phaseN` (quota/fabbisogno usato nel
  confronto), `planEvidence` e `seedlingAge` (`standard`, `avanzata`, `extra`);
- per grano duro: `modelInput.totalN` e `planEvidence` del piano verificato,
  varietà supportata e fase coerente con BBCH. Una fase senza quota N deve
  essere confermata con `modelInput.zeroNPhase: true`.

I piani N dei modelli nativi sono input documentati del confronto, non stime
del validatore: rimangono identici per riferimento attuale e candidato.
Il modello attuale deriva NDVI da fase/varietà per catalogo e pomodoro,
da giorni/età piantina per tabacco e da DAS per grano duro. I riferimenti
ignoti vengono rifiutati, non sostituiti da valori predefiniti.

### Partizioni e curve congelate

Nessuna cultivar, nessun sito e nessuna campagna della calibrazione può
comparire nella valutazione: i tre insiemi devono essere disgiunti
**separatamente**, non solo per combinazione cultivar/sito/campagna.
Si normalizzano maiuscole, spazi e Unicode per riconoscere le stesse identità.
Gli identificativi e i sinonimi devono comunque essere risolti dal responsabile
del dataset prima della consegna. La valutazione non deve guidare selezione,
taratura, scelta di giorni, classi di precocità o sensori.

Il secondo JSON contiene `id`, `method`, `freezeEvidence`,
`evaluationUsed: false`, `trainedOn` (tutti e soli gli ID di calibrazione,
senza duplicati) e `curves`. Ogni curva ha:

```text
crop, earliness, phase, bbch, sensor, sensorProtocol,
points: [{day: numero, ndvi: numero}, ...]
```

Servono almeno due punti in giorni strettamente crescenti, NDVI > 0 e ≤ 1.
La curva usa interpolazione lineare, nessuna estrapolazione. I contesti devono
essere presenti nella calibrazione e coprire **ogni** campione di valutazione,
altrimenti l'intero confronto è rifiutato. Nessuna eliminazione silenziosa di
campioni sfavorevoli, prestito tra sensori o dati sintetici ammessi come evidenza.
Questo formato permette di confrontare curve future, ma non ne inventa alcuna.

### Esecuzione autorizzata

Non esiste attualmente un file di campagne da passare al comando. Non
costruirlo esportando dati cliente senza autorizzazione. Quando un responsabile
avrà fornito dati di riferimento autorizzati, conservarli fuori da Git e dalla
pubblicazione, per esempio in `generated-artifacts/`, già esclusa da entrambi.

```sh
pnpm --filter @workspace/ndvi-tabacco exec tsx \
  ../../scripts/agronomy/evaluate-earliness.mjs \
  --field ../../generated-artifacts/reference-campaigns.json \
  --candidate ../../generated-artifacts/frozen-earliness-curves.json \
  --authorized-reference-data
```

L'opzione esplicita autorizza soltanto la lettura dei due file locali indicati,
non accessi a clienti, database o rete. Non stampare i dati di ingresso:
l'output contiene aggregati per coltura, sensore e campagna de-identificata.
Exit code: `1` per input rifiutati, `2` per dataset vuoto o violazioni di
sicurezza, `0` per un confronto completato senza violazioni. Il comando senza
argomenti conserva il report di catalogo e indica il blocco della sezione di
campo; il suo exit code `0` non significa validazione di campo superata.

### Risultati e vincoli

MAE e RMSE appaiati confrontano riferimento attuale e candidato con la media
misurata su piante ad azoto adeguato, **solo nella valutazione**. L'impatto
dose, in kg N/ha, riporta media attuale/candidata, variazione media e assoluta,
massima variazione e conteggio degli aumenti/riduzioni. È una sensibilità della
raccomandazione, non un errore di dose rispetto a una dose ottimale misurata:
non è stata fornita una verità di riferimento per quest'ultima.

La ponderazione è per misura; campioni ripetuti non sono repliche indipendenti.
I riepiloghi per campagna e sensore rendono visibili gli effetti eterogenei.
Non sono stabilite soglie arbitrarie di promozione o significatività; servono
un disegno sperimentale e criteri agronomici concordati prima di interpretare
un risultato come miglioramento.

Per entrambi i modelli si verificano dose non negativa, limite del residuo
**non arrotondato** e della quota di fase, zero a/sopra riferimento, zero in
fase N=0 e con piano esaurito. Le sonde ai limiti sono controlli meccanici
distinti dalle misure di campo. Sono inclusi residui frazionari per non
nascondere eventuali superamenti introdotti dall'arrotondamento nei modelli
attuali: il validatore li segnala (`SAFETY_FAILED`), non corregge o tronca il
risultato per far passare il confronto.

I test includono esclusione indipendente di cultivar/siti/campagne, rifiuto
di carenze N e metadati incompleti, curve non congelate, contaminazione dei
manifest, mancata copertura e interpolazione, confronto con i modelli puri
esistenti e controlli di sicurezza. Le fixture inventate rimangono nei test
e non costituiscono una campagna indipendente né un miglioramento simulato.

Qualunque esito, anche metriche migliori e nessuna violazione, mantiene
`decision: DO_NOT_ACTIVATE`. Nessuna migrazione SQL, scrittura Supabase,
pubblicazione o riscrittura dello storico fa parte di questa procedura.

# Precisione delle dosi: pomodoro e colture del catalogo

## Regola per nuovi rilievi

La dose indicata/salvata è in decimi di kg N/ha. Il calcolo proporzionale NDVI
mantiene il precedente arrotondamento; residuo e quota di fase diventano limiti
in decimi arrotondati **per difetto**. La dose non supera mai né il residuo grezzo
né la quota grezza. Nessun epsilon aumenta questi limiti.

Esempi indipendenti, con deficit sufficiente e quota di fase non limitante:

| Residuo approssimativo | Nuova dose |
| --- | --- |
| 0,01 / 0,04 / 0,06 / 0,09 | 0,0 |
| 0,11 / 0,16 / 0,19 | 0,1 |
| 0,26 | 0,2 |

La sottrazione binaria resta vincolante: per esempio 250 − 249,9 è appena
inferiore a 0,1, quindi la dose è 0,0, non 0,1. La stessa precauzione vale
per quote di fase sotto il decimo dovute alla proporzione sulla resa.

`dose` e `quotaAzoto` nei POST devono coincidere esattamente con la dose
canonica ricalcolata, senza tolleranza numerica sulle dosi. Gli altri parametri
mantengono i loro controlli. Non cambia il contratto dei campi né lo schema dati.

## Inventario dei consumatori in `artifacts/ndvi-tabacco/src`

- `components/PomodoroParameters.tsx` e `components/CatalogueCropParameters.tsx`:
  risultati di calcolo e dose della coltura.
- `App.tsx`: salvataggio di `dose`/`quotaAzoto` direttamente dai modelli condivisi;
  tabella storico con dose registrata.
- `components/ObservationList.tsx`: elenco raggruppato, dettaglio dose e quota.
- `observationDistribution.ts` e `ObservationDistributionChart.tsx`: serie,
  tooltip e tabella del grafico, con valori registrati e non ricalcolati.
- `ElaborazioniMappe.tsx`: tabella dei punti GPS del registro e tooltip dei
  punti di controllo. La coltura accompagna il punto per formattare lo storico.
- `utils/observationPdf.ts`: dose nel PDF, nei tre formati locali.
- `utils/observationExcel.ts`: celle numeriche dose e quota; formato a un
  decimale per le nuove dosi, formato generale per le frazioni storiche.
- `utils/geoUtils.ts`: CSV dei rilievi, dose senza arrotondamento dei valori storici.
- `utils/observationDose.ts`: formattazione comune. I nuovi decimi sono mostrati
  con un decimale; le vecchie frazioni mantengono la rappresentazione numerica
  salvata, anche sotto il centesimo, senza alterare gli oggetti.

Le **celle interpolate IDW**, le relative statistiche, i riepiloghi di risparmio
e gli export GIS derivati non sono nuove dosi puntuali salvate: mantengono
precisioni proprie (CSV/DBF quattro decimali, GeoTIFF Float32, riepiloghi un
decimale). Non si modifica il modello IDW né il trattamento dei punti importati.
Tabacco e grano mantengono i rispettivi calcoli e formati.

## Storico e verifiche

Nessuna migrazione, UPDATE massivo o ricalcolo in GET. Le dosi storiche restano
identiche, anche quando non rispettano la nuova precisione; un nuovo POST è
invece sottoposto alla regola corrente.

- `src/utils/observationDose.test.ts`: aspettative letterali sotto il decimo,
  tutte le colture del catalogo, limiti di fase, API pure, PDF/Excel/CSV,
  immutabilità dei dati e serie del grafico.
- `api-server/src/routes/osservazioni.test.ts`: POST/GET con archivio simulato,
  verifica dose e quota, rigetto prima della scrittura e storico invariato.
- `/tests/dose-precision.html`: anteprima di sviluppo isolata dalla rete,
  con pomodoro e coltura del catalogo a residuo 0,06 e vecchie frazioni visibili.

## Verifica browser isolata del 8 novembre 2026

Esito: **superata**, in una singola verifica con prosecuzione dopo la
correzione di un blocco nella sola fixture. L'entry di sviluppo
`/tests/catalogue-calculations.html` monta i componenti reali, ma sostituisce
`fetch` con un archivio sintetico in localStorage. Il mock ora seleziona il
validatore condiviso corretto per pomodoro oppure catalogo; prima respingeva
il pomodoro come coltura non appartenente al catalogo.
Nessuna modifica al codice applicativo, all'autenticazione o allo storage reale.

### Dati inseriti dall'interfaccia

Cliente inventato, appezzamenti distinti, data 2026-11-08, cinque NDVI zero,
fase osservata selezionata e confermata:

| Coltura e profilo | Resa t/ha | N totale | N già distribuito | Residuo | Dose e quota salvate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pomodoro Abraracourcix | 100 | 250 | 249,94 | 0,06 | 0 |
| Pomodoro Abraracourcix | 100 | 250 | 249,84 | 0,16 | 0,1 |
| Kiwi Hayward | 31,3 | 151 | 150,94 | 0,06 | 0 |
| Kiwi Hayward | 31,3 | 151 | 150,84 | 0,16 | 0,1 |

Pomodoro in Fioritura (quota 75); Kiwi in F3, Accrescimento dei frutti
(quota 68). GPS simulato: 45.123456, 12.345678.
Quattro click effettivi su Salva, verifica di `dose` e `quotaAzoto` nel
payload locale e ricaricamento completo del documento.
Un quinto record storico Kiwi è stato seminato **solo nella fixture**,
copiando un record sintetico e impostando dose/quota a 0,006, senza POST.

### Collegamenti e download verificati

- Risultati prima del salvataggio: 0,0 e 0,1 kg N/ha.
- Dopo reload: cinque record con dosi invariate nel registro generale,
  nello storico raggruppato e nella tabella accessibile del grafico.
  Dettaglio storico espanso: dose e quota legacy restano 0.006 kg N/ha.
- Mappe: import di un confine KML inventato per esporre la tabella dei
  punti GPS del registro. Cinque ID, coordinate e dosi corretti, incluso
  0.006. Nessuna interpolazione o esportazione GIS avviata.
- Excel: click sul pulsante del gruppo storico e download `.xlsx` reale.
  ZIP OOXML riaperto: colonne N (dose) e Q (quota) numeriche, valori
  0 / 0,1 / 0 / 0,006 / 0,1; stile generale per il valore storico,
  formato a un decimale per quelli nuovi.
- PDF: click sul pulsante del registro e download reale; testo estratto
  con `pdftotext`, cinque ID e dosi 0,0 / 0,1 / 0,006 confermati per riga.
- CSV: click sul pulsante del registro e download reale UTF-8 con BOM;
  dose e quota verificate per ID, compreso il valore numerico `0.006`.

File effettivi, report esteso, KML e script di riproduzione sono conservati
in `generated-artifacts/catalogue-dose-precision/`, ignorato da Git e dalla
pubblicazione. File principali: `history.xlsx`, `observations.pdf`,
`observations.csv`, `README.md`, `reproduce-save-block.mjs`.
Lo script è una trascrizione riproducibile del percorso, controllata
sintatticamente ma non rilanciata come seconda batteria.

### Confini della verifica

Contesto browser isolato; blocco di rete installato prima della navigazione
su `/api/**` e host esterni, con soli worker blob dello stesso origin
consentiti. Nessun accesso a Clerk, credenziali o dati cliente; nessun riavvio
del backend. I file remoti sono stati acquisiti con `Download.saveAs()`
(`Download.path()` non disponibile nel runner) e i loro byte ispezionati.
Verifica in italiano sui componenti di sviluppo: non prova autenticazione,
persistenza nel database, tooltip del grafico, altri browser, altre lingue
o build di produzione. La verifica del grafico usa la sua tabella accessibile.

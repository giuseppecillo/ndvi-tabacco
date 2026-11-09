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
e gli export GIS derivati non sono nuove dosi puntuali salvate.
La loro regola distinta è descritta qui sotto.
Tabacco e grano mantengono i rispettivi calcoli e formati puntuali.

## Precisione dei derivati IDW

Il valore canonico di ogni cella è la media IDW (Shepard, distanze UTM e
potenza invariati), limitata al residuo interpolato quando il bilancio è
completo, poi quantizzata **per difetto a quattro decimali** di kg N/ha.
Non si aggiunge epsilon. La quantizzazione è idempotente e verifica il confronto
con il numero binario d’ingresso anche ai bordi dei passi decimali.
Non dipende dalla coltura: anche una mappa mista usa la stessa precisione.

Esempio riproducibile senza dati reali: un punto con dose 0 e residuo 0,01,
un altro con dose 0,1 e residuo 0,11. Fra loro, una dose IDW circa 0,06 ha
residuo circa 0,07: mostrarla a un decimale produce 0,1, sopra il residuo,
pur partendo da punti sicuri.

- Dose di cella, tooltip, ispezione, legenda e DBF: lo stesso valore canonico
  a quattro decimali, mai arrotondato al più vicino.
- Minimo, massimo e media sono calcolati dalle dosi canoniche. La media viene
  mostrata per difetto a quattro decimali, non viene ricalcolata dalle stringhe.
- Risparmio: piano e già distribuito mantengono la precisione del calcolo;
  l’indicazione è già distribuito + media delle dosi canoniche.
  Nessun taglio nasconde un già distribuito maggiore del piano; in quel caso il
  risparmio è zero. Totali = valori per ettaro × superficie netta non arrotondata.
  UI, CSV, DBF e descrizione TIFF mostrano tutti i valori di azoto per difetto
  a quattro decimali (anche kg totali e percentuali). I valori visualizzati
  indipendentemente possono non sommarsi esattamente. Area: due decimali come prima.
- GeoTIFF: resta Float32; se la conversione aumenta il valore si usa il
  Float32 immediatamente inferiore. Un pixel geografico che riceve più celle UTM
  usa la dose minima dei contributori, non la massima; non supera così nessuno
  dei loro residui noti. Non è un nuovo campionamento IDW al centro del pixel:
  la griglia di calcolo rimane UTM e il raster WGS84 è una rappresentazione.
- Bilancio completo: tutti i controlli effettivamente usati hanno piano finito
  non negativo e distribuito finito non negativo (assente = zero, come prima).
  Piano e distribuito usano esattamente gli stessi pesi della dose.
- Punti importati senza piano, bilanci parziali o invalidi: si produce la dose
  IDW conservativa senza inventare residui dai soli punti completi; confronto e
  risparmio restano non disponibili, campi riepilogo DBF vuoti e CSV omesso.
  Non si può garantire un limite agronomico senza un bilancio.
- Vecchie dosi oltre residuo sono limitate **solo nel derivato**, mai riscritte.
  La lista e i tooltip dei controlli mantengono i valori registrati/importati.

Verifiche sintetiche: `src/utils/idwPrecision.test.ts` legge i veri DBF,
CSV e GeoTIFF esportati, verifica celle/residui, confini binari, colture miste,
bilanci incompleti, immutabilità e componente del risparmio.
`tests/holes.test.mjs` mantiene i controlli su buchi e superficie netta.
`/tests/idw-precision.html` è un’anteprima solo sviluppo senza API o login;
non è inclusa nella build ordinaria.

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

## Verifica EN/ES isolata del 9 novembre 2026

Esito: **superata**. Usata la stessa entry di sviluppo
`/tests/catalogue-calculations.html` e i suoi pulsanti `test-language-en`,
`test-language-es`, `test-language-it`. Nessuna modifica al codice applicativo,
ai calcoli, all'autenticazione, alle API o al database.

### Dati e percorso

Sei record inventati definiti in
`artifacts/ndvi-tabacco/tests/fixtures/dose-export-languages.mjs`, nel solo
archivio `nitrocrop-catalogue-synthetic-only`: cliente `Synthetic EN ES`,
data 2026-11-09, pomodoro Abraracourcix e Kiwi Hayward.
Per ciascuna coltura sono presenti `ZERO` (dose/quota 0), `TENTH` (0,1) e
`LEGACY` (0,006), con ID `QA-T-*` e `QA-K-*`. I record sono seminati nella
fixture, non creati tramite POST; lo storico non viene ricalcolato.

Controllati cambio lingua, registro generale, tabella accessibile del grafico,
gruppo storico espanso e dettagli completi di tutti i punti, inclusa quota
azotata. ID, cliente, appezzamenti e varietà restano invariati.
Nelle viste di archivio i numeri restano **0.0 / 0.1 / 0.006** anche in ES:
è il formato già usato dai consumatori senza locale, non una perdita di
precisione. Nei risultati di calcolo e nel PDF il separatore segue la lingua.

Controllati anche i risultati del modulo reale, senza salvataggio, in EN e ES:
cinque NDVI zero; pomodoro resa 100, Fioritura confermata, N distribuito
249,94 e 249,84; Kiwi resa 31,3, F3 confermata, N distribuito 150,94 e 150,84.
I residui 0,06 e 0,16 producono rispettivamente **0,0 e 0,1 kg N/ha**
(in EN `0.0` e `0.1`). Il solo controllo ES Kiwi a residuo 0,06 è stato
completato in prosecuzione nello stesso contesto, senza ripetere la batteria.

### File realmente scaricati dai pulsanti

Sei download, non soltanto generatori chiamati direttamente:

| Controllo | EN | ES |
| --- | --- | --- |
| PDF del registro | `0.0 / 0.1 / 0.006` | `0,0 / 0,1 / 0,006` |
| Excel dello storico, dose N e quota | numeri `0 / 0.1 / 0.006` | numeri `0 / 0.1 / 0.006` |
| CSV del registro, dose N e quota | numeri con punto decimale | identici byte a EN |

PDF: titolo tradotto e dose estratta **per ID** con `pdftotext -layout`;
non esiste una colonna quota in questo PDF. Excel: ZIP OOXML riaperto,
intestazioni tradotte, colonne N/Q numeriche; nuove dosi con formato `0.0`,
storico con General. L'indice `s=3` è zero-based in `cellXfs` e rinvia a
`numFmtId=165`, **non** al terzo `numFmt`: un dubbio iniziale del collaudo
è stato ritirato dopo la verifica dei file, senza modificare l'export.
CSV: BOM UTF-8, nomi macchina stabili, dose e quota esatte per ID,
coltura/varietà/cliente non tradotti. I due CSV sono identici byte per byte.

Archivio locale confrontato byte per byte dopo cambi lingua, navigazione,
download e ritorno IT: invariato; zero scritture sulla chiave osservazioni.
Anche la prosecuzione ES Kiwi ha conservato gli stessi byte, terminando
sulla relativa vista ES. Non sono stati effettuati salvataggi o cancellazioni.

### Riproduzione e regressioni

- Test automatico, incluso nel normale comando `test` dell'artifact:
  `src/utils/observationExportLanguages.test.ts`. Sequenza IT → EN → ES → IT,
  PDF reale e righe localizzate, CSV invariato, intestazioni Excel, valori
  numerici dose/quota e risoluzione effettiva dei formati OOXML, sorgenti immutate.
- Controlli eseguiti:
  `pnpm --filter @workspace/ndvi-tabacco exec tsx --test src/utils/observationExportLanguages.test.ts src/utils/observationDose.test.ts`
  e `pnpm --filter @workspace/ndvi-tabacco typecheck`.
- Script di riproduzione del percorso archivio/download:
  `BASE_URL=https://<origine-anteprima> node artifacts/ndvi-tabacco/tests/dose-export-languages-browser-pass.mjs`.
  Richiede Chromium Playwright o `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
  È stato controllato sintatticamente, non rilanciato come seconda batteria;
  i controlli interattivi dei risultati di calcolo sopra descritti sono manuali
  nel collaudo browser e non fanno parte di questo script.
- Controllo indipendente **eseguito sui file scaricati**:
  `python artifacts/ndvi-tabacco/tests/check-dose-export-downloads.py`.
  Usa solo libreria standard e `pdftotext`; verifica sei ID, intestazioni,
  valori, stili Excel risolti, PDF localizzato e uguaglianza binaria dei CSV.

Evidenze ignorate da Git e pubblicazione:
`generated-artifacts/dose-export-languages/{en,es}/home.pdf`, `home.csv`,
`history.xlsx`, `README.md` e `download-checks.json`.

### Isolamento e limiti

Browser Chromium isolato; API, host esterni e WebSocket bloccati prima della
navigazione; `fetch` soddisfatto dalla fixture sintetica. Gli errori HMR di
connessione sono previsti perché anche il suo WebSocket è bloccato.
Nessun accesso a credenziali, Clerk, clienti o database; nessun riavvio backend.
Non verifica login, persistenza server, produzione, altri browser, tooltip,
recupero rete del catalogo o IDW. Non ripete il collaudo di salvataggio/reload.

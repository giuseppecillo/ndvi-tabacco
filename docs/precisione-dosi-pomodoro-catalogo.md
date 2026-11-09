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

## Regressione browser ripetibile nel repository

Eseguire dalla radice:

```sh
pnpm --filter @workspace/ndvi-tabacco exec playwright install chromium
pnpm --filter @workspace/ndvi-tabacco test:dose-browser
```

Prerequisiti: dipendenze workspace installate, Chromium Playwright e
`pdftotext` (Poppler) nel PATH. Per usare un Chromium di sistema impostare
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/percorso/chromium`.
Non occorrono `BASE_URL`, workflow attivi, backend, credenziali o file generati
da verifiche precedenti.

`tests/catalogue-dose-browser.mjs` avvia e chiude un Vite privato su loopback
e porta libera, usando la configurazione/localizzazione reale e la fixture
DEV `catalogue-calculations.html`. Un contesto browser nuovo per ogni esecuzione
parte senza cookie né localStorage. Prima della navigazione vengono bloccati
API reali, richieste non GET/HEAD, host esterni, WebSocket e service worker;
un secondo blocco sul server vieta comunque `/api`. Il solo `fetch` della
fixture continua a usare archivio sintetico locale e validatori condivisi.
L'autenticazione applicativa non è modificata né collaudata.

La regressione ripete i quattro salvataggi della tabella precedente con ID
P06/P16/K06/K16, inserisce L006 legacy senza POST e ricarica il documento.
Controlla dose/quota e parametri salvati, registro, tabella accessibile del
grafico, storico raggruppato, dettagli dose/quota e tabella GPS dopo import di
un KML generato nel test. Verifica anche che le viste e gli export non cambino
i record persistiti. Non esegue interpolazioni.

I tre download partono dai pulsanti reali e vengono acquisiti con `saveAs`:
PDF riletto tramite `pdftotext -layout`, XLSX aperto come ZIP OOXML (celle
numeriche N/Q e formati General/decimi), CSV UTF-8 con BOM letto come RFC4180.
I confronti avvengono per ID, non per indice della riga; l'archivio viene
deliberatamente riordinato prima del reload. I lettori dei file non importano
gli helper di esportazione applicativi; i relativi test unitari includono
righe riordinate, perdita di precisione, quote errate, duplicati e ID mancanti.

Esito non zero su errore, report e download sotto
`artifacts/ndvi-tabacco/generated-artifacts/catalogue-dose-regression/`,
ignorato da Git e pubblicazione. I risultati precedenti vengono rimossi
all'avvio: un vecchio report PASS non può mascherare un errore nuovo.
Questa è una regressione italiana su Chromium in sviluppo; non sostituisce
verifiche di autenticazione/database, altre lingue, altri browser, tooltip
interattivi o build di produzione.
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

## Verifica aggiuntiva Firefox e WebKit — 9 novembre 2026

**Esito: Firefox 159.0 e WebKit 27.2 superati.**
WebKit è il motore di riferimento per Safari, non una prova del prodotto
Safari distribuito da Apple su macOS o iOS.
Questa verifica riguarda soltanto il percorso archivio/dosi/download EN/ES:
nessuna ripetizione del recupero rete catalogo, dei calcoli interattivi o di IDW.
Nessuna modifica al codice applicativo, nessun login o accesso a dati reali.

### Firefox

Eseguito lo script con Playwright Firefox **159.0**, in contesto nuovo,
con la fixture e i sei ID sintetici già descritti sopra. Verificati registro,
tabella accessibile del grafico, gruppo storico, dettagli dose/quota,
EN → ES nel registro, ES → EN nello storico e ritorno IT.
Valori per ID: `0.0`, `0.1`, storico `0.006`, senza ricalcolo.

Sei eventi download effettivi, tutti conclusi senza errore, con file salvati:

| File | EN, byte | ES, byte |
| --- | ---: | ---: |
| PDF registro | 12.714.163 | 12.714.148 |
| CSV registro | 1.682 | 1.682 |
| XLSX storico | 72.226 | 72.280 |

Il verificatore indipendente ha riaperto i file scaricati: PDF localizzato e
dosi per ID tramite `pdftotext`, CSV con BOM e dose/quota esatte, XLSX con
intestazioni tradotte, dose/quota numeriche e formati risolti tramite `cellXfs`.
CSV EN/ES identici byte per byte. Dimensioni e SHA-256 sono confrontati con
il manifesto dei download. Quindici confronti dell'archivio locale:
byte invariati e nessuna scrittura rilevata. Nessun errore JavaScript.

API, host esterni, richieste non GET/HEAD e WebSocket bloccati prima della
navigazione; il fetch dell'app usa soltanto la fixture. Registrati quattro
tentativi WebSocket chiusi (HMR), nessun tentativo HTTP API/esterno.
Per il certificato dell'anteprima, Firefox richiedeva l'opzione esplicita
`PLAYWRIGHT_IGNORE_HTTPS_ERRORS=1` dopo `SEC_ERROR_UNKNOWN_ISSUER`.
È una deroga TLS del solo contesto di collaudo, non una verifica del certificato;
non modifica i blocchi di destinazione né la configurazione dell'app.

Evidenze locali ignorate da Git/pubblicazione:
`generated-artifacts/dose-export-languages/firefox/` contiene
`browser-pass.json` (versione, user agent, dimensioni, SHA-256, isolamento),
`download-checks.json`, `history-it.png` e i sei file sotto `en/` e `es/`.

### Riproduzione per motore

Lo script ora accetta `BROWSER=chromium|firefox|webkit`, con default Chromium;
le nuove evidenze sono separate per motore e non sovrascrivono quelle precedenti.
I binari e le librerie richieste dal motore devono essere disponibili.

```sh
BROWSER=firefox PLAYWRIGHT_IGNORE_HTTPS_ERRORS=1 \
  BASE_URL=https://<origine-anteprima> \
  node artifacts/ndvi-tabacco/tests/dose-export-languages-browser-pass.mjs
python artifacts/ndvi-tabacco/tests/check-dose-export-downloads.py \
  generated-artifacts/dose-export-languages/firefox
```

Per WebKit sostituire `firefox` con `webkit` in entrambi i comandi.
Il verificatore senza argomento ora usa la sottocartella `chromium`;
per le vecchie evidenze Chromium passare esplicitamente la cartella padre.

### Blocco iniziale WebKit, poi risolto

Il primo pacchetto Playwright WebKit **27.2, build 2388**, variante Ubuntu,
non si avviava: inizialmente mancava `libatk-1.0.so.0`.
L'installazione automatica delle dipendenze non riesce nell'ambiente disponibile.
La ricerca delle librerie già presenti in Nix lascia comunque mancanti ICU 74
(`libicudata`, `libicui18n`, `libicuuc`), `libjpeg.so.8` e `libjxl.so.0.8`;
un percorso librerie esteso introduce inoltre incompatibilità GLIBCXX/CXXABI
per Node. Non sono stati introdotti collegamenti a librerie ABI incompatibili.

Il blocco è stato risolto nella prosecuzione usando la variante ufficiale
Playwright **Debian 13** dello stesso WebKit 27.2/build 2388, compatibile con
i SONAME disponibili in Nix. Non sono stati creati alias a librerie ABI diverse.
Un wrapper limitato al processo browser rende esplicite le librerie e usa
lo stesso loader Nix per MiniBrowser e processi figli. I soli interpreti ELF
dei binari scaricati nella cache ignorata vengono adattati con `patchelf`;
nessun binario applicativo viene modificato. `glib-networking` fornisce il
modulo GIO TLS necessario per l'anteprima HTTPS. Nessun percorso librerie
globale viene passato a Node o ai server dell'app.

L'helper `artifacts/ndvi-tabacco/tests/prepare-webkit-nix.py` genera wrapper e
inventario dipendenze in `generated-artifacts/dose-export-languages/webkit-runtime/`.
Fallisce esplicitamente se manca un SONAME esatto. Richiede `patchelf`,
`glib-networking` e le librerie Nix presenti nell'ambiente del collaudo;
non è un'installazione autonoma di tutte le dipendenze per altri ambienti.

```sh
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=debian13-x64 \
  PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright-debian13" \
  pnpm --filter @workspace/ndvi-tabacco exec playwright install webkit
python artifacts/ndvi-tabacco/tests/prepare-webkit-nix.py \
  .cache/playwright-debian13/webkit-2388
BROWSER=webkit PLAYWRIGHT_IGNORE_HTTPS_ERRORS=1 \
  PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
  PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH="$PWD/generated-artifacts/dose-export-languages/webkit-runtime/webkit.sh" \
  BASE_URL=https://<origine-anteprima> \
  node artifacts/ndvi-tabacco/tests/dose-export-languages-browser-pass.mjs
python artifacts/ndvi-tabacco/tests/check-dose-export-downloads.py \
  generated-artifacts/dose-export-languages/webkit
```

`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS` salta soltanto il controllo
preventivo dei pacchetti Ubuntu: il loader verifica le dipendenze effettive,
il motore si avvia realmente e tutte le asserzioni del percorso restano attive.
La deroga al certificato HTTPS è identica a quella dichiarata per Firefox.

### WebKit: percorso e risultati effettivi

Eseguita soltanto la prosecuzione mancante WebKit; nessuna ripetizione di
Firefox, Chromium, recupero rete catalogo o IDW.
Versione restituita dal browser avviato: **27.2**. L'user agent presenta
`AppleWebKit/605.1.15` e `Version/27.2 Safari/605.1.15`, ma questo **non**
significa che sia stato eseguito Safari Apple: è WebKit Playwright su Linux.

Stesse fixture, stessi sei ID e stesse verifiche su registro, tabella
accessibile del grafico, gruppo storico, dettagli completi e ritorno IT.
Tutti e sei gli eventi download sono conclusi con file non vuoti.
Il verificatore indipendente eseguito sui download WebKit ha superato:
PDF tradotto e dosi per ID; CSV con BOM, dose/quota numeriche e byte EN/ES
identici; XLSX con intestazioni localizzate, dose/quota numeriche e formati
`0.0` per ZERO/TENTH e General per LEGACY. Valori attesi `0 / 0.1 / 0.006`.

| File | EN, byte | ES, byte |
| --- | ---: | ---: |
| PDF registro | 12.714.163 | 12.714.148 |
| CSV registro | 1.682 | 1.682 |
| XLSX storico | 69.438 | 69.492 |

I byte XLSX non devono coincidere tra motori: contano contenuti OOXML e stili,
verificati per ID. Anche il PDF può differire per metadati di generazione.
Il contenuto CSV, invece, coincide tra lingue e tra motori.

Archivio: **15 confronti superati, byte invariati, zero scritture rilevate**.
SHA-256 archivio iniziale/finale (identico anche in Firefox):
`52311ad28ad6103fe0c45ca668a565c133f76e3362fc91459a01c4187159153c`.
Nessun errore JavaScript. Quattro tentativi WebSocket chiusi, nessun tentativo
HTTP verso API o host esterni; restrizioni installate prima della navigazione.
Nessun salvataggio, cancellazione, credenziale, dato cliente o accesso database.

Evidenze: `generated-artifacts/dose-export-languages/webkit/` contiene
`browser-pass.json`, `download-checks.json`, `history-it.png` e i sei download.

SHA-256 dei file WebKit effettivamente scaricati e verificati:

| File | SHA-256 |
| --- | --- |
| EN PDF | `3f85ea50b231a1fbf0ed1242c19edc1d788404a7453824f1e8bd5dd10cc7117d` |
| ES PDF | `2fbece0d4cbaefe1e487c4ba59252192ec5627c7cb044075ae001f34023245f7` |
| EN/ES CSV | `9d037006b3ed39d9a6897f587abb3bd20a5f677021bf88ac75e8b462f2b80d84` |
| EN XLSX | `a317931d027abd2d5917104ef4fd400cbdce1140401c43344e6f2431b7ede63d` |
| ES XLSX | `fc7f0a0f0671f018ec394d38cd73a1eceaed3cf09f836937190255ff57cfd0bf` |

Il percorso richiesto sui due motori diversi da Chromium è confermato.
Resta distinta, non coperta da questa prova, l'esecuzione su Safari reale
macOS/iOS, inclusi interfaccia download e gestione file del sistema operativo.

# Verifica browser del catalogo — 2026-11-08

## Ambiente e isolamento

Verificata l'app reale su `/user-portal?module=catalogue`, con accesso Clerk
programmatico sintetico, `SecurityRoot`, `AccountGate` e navigazione `TopBar`.
Non è stata utilizzata una pagina di anteprima del solo componente.

Prima della navigazione tutte le richieste `/api/**` sono state intercettate:
account approvato sintetico, storico vuoto, consumi sintetici e catalogo con
le 24 intestazioni della fonte e 51 righe inventate. Le altre richieste
erano bloccate. Nessuna lettura di dati cliente e nessun salvataggio o
cancellazione: **zero tentativi di scrittura alle API**.

## Risultati

Tutti i seguenti controlli sono passati sia a **390×844** sia a **820×1180**:

- Compilazione di cliente, appezzamento, resa e letture NDVI sintetici;
  apertura del catalogo e ritorno tramite il menu reale con input conservati.
- Presenza delle 24 colonne e delle 51 righe sintetiche.
- Ricerca senza distinzione di maiuscole e accenti (`vArIeTa elite`),
  ricerca con più termini su colonne diverse e filtro coltura combinato.
- Nessun risultato: messaggio e conteggio zero; azzeramento filtri:
  ripristino delle 51 righe.
- Cambio IT/EN/ES dal selettore reale: titoli, intestazioni, ricerca e
  opzioni tradotti; ricerca dei nomi localizzati delle colture funzionante.
  Valori canonici del filtro, nomi varietali e numeri invariati.
- Scorrimento orizzontale fino a `NDVI F4`, intestazioni ferme durante
  lo scorrimento verticale e colonna varietà ferma a sinistra.
  Hit-test della cella varietale visibile e dell'intestazione superati.
- Nessuna eccedenza orizzontale del documento; ricerca e filtro esposti
  rispettivamente come searchbox e combobox accessibili.

| Viewport | Riquadro tabella | Scorrimento X massimo | Scorrimento Y massimo | Documento: clientWidth / scrollWidth |
| --- | --- | --- | --- | --- |
| 390×844 | 343×590,8 px | 1945 px | 1346 px | 375 / 375 px |
| 820×1180 | 672×826 px | 1676 px | 1115 px | 805 / 805 px |

Lo scorrimento verticale interno è stato controllato a 500 px. La prima
riga parzialmente passata sotto l'intestazione era correttamente coperta
dall'intestazione fissa; una riga inferiore restava visibile e selezionabile.
Le misure includono il gutter del browser, non una perdita di larghezza.

## Riproduzione

1. Preparare il contesto browser alla risoluzione desiderata e intercettare
   tutte le API prima di aprire l'app, negando quelle non simulate.
2. Accedere con un'identità Clerk sintetica, simulando un account attivo,
   con informativa accettata e abbonamento non scaduto.
3. Compilare il rilievo senza salvarlo. Usare `button-brand-menu` e
   `link-nav-catalogue`, senza ricaricare il documento.
4. Provare `input-catalogue-search`, `select-catalogue-crop`,
   `button-catalogue-clear` e il selettore lingua reale.
5. In `table-catalogue-scroll`, raggiungere
   `scrollLeft = scrollWidth - clientWidth` e `scrollTop = 500`.
   Controllare geometria e `elementFromPoint` per intestazione e varietà.
6. Tornare al rilievo dal menu e confrontare tutti gli input compilati.

Il collaudo riguarda viewport browser emulati e API sintetiche:
non certifica hardware fisico né integrazione con i dati di produzione.
Non sono state necessarie modifiche al codice dell'app.

## Controlli aggiuntivi

- `pnpm --filter @workspace/ndvi-tabacco run typecheck`: superato.
- `pnpm --filter @workspace/ndvi-tabacco exec tsx --test src/catalogue/filterCatalogue.test.ts src/i18n/runtime.test.ts`:
  17 test superati.

Report esteso e catture della sessione sono risultati generati esclusi
da Git; il report esteso si trova in
`generated-artifacts/catalogue-responsive/report.md`.

## Recupero dopo ritardo o errore di rete — 2026-11-08

Collaudo completato sull'app reale, non sulla pagina del solo componente:
`SecurityRoot`, `AccountGate`, `TopBar`, modulo catalogo e form del rilievo.
La matrice automatizzata finale ha superato **138 controlli: 23 per caso**.

| Viewport | Lingua | Caricamento e vuoto | 503 e Riprova → righe | Input conservati | Larghezza documento client/scroll |
| --- | --- | --- | --- | --- | --- |
| 390×844 | IT | Superato | Superato | Sì | 390/390 |
| 390×844 | EN | Superato | Superato | Sì | 390/390 |
| 390×844 | ES | Superato | Superato | Sì | 390/390 |
| 820×1180 | IT | Superato | Superato | Sì | 820/820 |
| 820×1180 | EN | Superato | Superato | Sì | 820/820 |
| 820×1180 | ES | Superato | Superato | Sì | 820/820 |

### Isolamento

- Nessun backend avviato, nessuna credenziale letta, nessun dato cliente usato.
- Identità autenticata **simulata esclusivamente nel contesto browser**:
  sostituzione della dipendenza ESM Clerk con hook sintetici. Il codice
  dell'autenticazione e delle guardie dell'app non è stato modificato.
  Nessun ticket o scambio con Clerk: il collaudo non certifica il login reale.
- Intercettazione installata prima della prima navigazione. Solo quattro letture
  API ammesse, tutte soddisfatte in memoria: account, consumi, osservazioni vuote
  e catalogo. Ogni altra API, incluse quelle Clerk, viene bloccata.
- Richieste diverse da GET/HEAD bloccate; **zero tentativi di scrittura** in
  tutti i contesti. Zero richieste API non previste; zero errori JavaScript.
- Tutte le richieste HTTP esterne e tutti i WebSocket bloccati, incluso HMR.
  Il foglio Google Fonts è stato bloccato: le catture usano font di fallback.
  Sono ammessi gli asset statici locali necessari all'app.
- Nascosto soltanto il banner flottante dell'editor Replit per non interferire
  con i clic. Nessun controllo, pannello o overlay dell'app è stato rimosso.

### Sequenza verificata in ogni caso

1. Selezione della lingua dal selettore reale. Compilazione senza salvataggio
   di cliente e appezzamento sintetici, resa `4.7` e cinque letture
   `0.51`, `0.53`, `0.55`, `0.57`, `0.59`.
2. GET catalogo trattenuta: sei Skeleton e `aria-busy`, nessuna tabella,
   nessun errore né falso vuoto; ricerca editabile e filtro abilitato.
   Ritorno al rilievo e riapertura del catalogo mentre la risposta è sospesa:
   valori identici e navigazione operativa.
3. Rilascio di `{ columns: [], rows: [] }`: messaggio di catalogo realmente
   vuoto, nessun busy/errore/tabella; nuovo ritorno al rilievo senza perdite.
   Due GET sintetiche 200 osservate per questo percorso in ogni caso.
4. Nuovo contesto isolato per il caso errore, con gli stessi input reinseriti:
   tutte le GET catalogo restituiscono 503. Nessuna alterazione delle opzioni
   React Query dell'app: quattro tentativi iniziali, altri quattro al
   rimontaggio dopo il ritorno al rilievo. Errore e pulsante tradotti e
   raggiungibili; input conservati.
5. Dopo aver atteso il termine dei retry automatici, clic sul vero Riprova
   con risposta di successo trattenuta. La richiesta aumenta di uno e il
   controllo di navigazione resta abilitato. Non si naviga né si rimonta il
   catalogo prima del recupero: il clic sul brand riporterebbe al rilievo
   e potrebbe generare un refetch distinto, falsando la prova del retry.
6. Rilascio del successo: tre righe inventate con 24 colonne; varietà e
   valori numerici invariati, conteggio localizzato, alert rimosso. Infine
   ritorno al rilievo e confronto esatto di tutti gli otto input compilati.
   Il percorso errore/recupero registra otto 503 seguiti da un solo 200,
   quello del retry manuale sulla stessa vista montata, senza richieste reali.

Durante il retry manuale, l'app mantiene visibile l'alert precedente:
`busy=0`, `alert=1`, `table=0`. Non è un secondo caricamento iniziale;
la risposta riuscita rimuove l'alert. Non si dichiara un nuovo Skeleton
durante il refetch.

| Stato | IT | EN | ES |
| --- | --- | --- | --- |
| Etichetta accessibile caricamento | Caricamento… | Loading… | Cargando… |
| Vuoto | Il catalogo è vuoto. | The catalogue is empty. | El catálogo está vacío. |
| Errore | Impossibile caricare il catalogo colture. | Unable to load the crop catalogue. | No se puede cargar el catálogo de cultivos. |
| Riprova | Riprova | Retry | Reintentar |
| Conteggio recuperato | 3 di 3 varietà | 3 of 3 varieties | 3 de 3 variedades |

È stato corretto un difetto dell'app emerso nel collaudo: l'etichetta
accessibile di Skeleton era sempre `Caricamento`. Ora usa la traduzione
esistente `Caricamento…`, verificata nelle tre lingue. Il pulsante Riprova
ora richiama esplicitamente la traduzione anche nel sorgente di ErrorNote;
prima la traduzione del testo JSX era applicata dal compilatore Vite
`localizeUi`, motivo per cui il primo collaudo browser già lo mostrava tradotto.

### Riproduzione automatizzata ed evidenze

Script completo, fixture e adattatore browser-only:
`tests/catalogue-network-browser-pass.mjs`. Avviare soltanto il workflow web
esistente, quindi dalla radice del workspace:

```sh
BASE_URL="https://$REPLIT_DEV_DOMAIN" \
  pnpm --filter @workspace/ndvi-tabacco exec node tests/catalogue-network-browser-pass.mjs
```

Se Playwright non trova il proprio Chromium, impostare anche
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` al binario Chromium già installato
nell'ambiente. Non è necessario installare un altro browser o allentare
l'intercettazione. Il runner richiede l'app Vite di sviluppo perché sostituisce
la dipendenza ESM precompilata di Clerk: non è un test della build distribuita.

Risultati finali in `generated-artifacts/catalogue-network/report.json`;
il runner esteso produce 48 screenshot PNG (caricamento, vuoto ed errore/recupero
per ciascuno dei tre tipi di guasto, in ogni combinazione) nella stessa
directory. Sono output generati esclusi da Git e dalla
distribuzione. Il precedente `partial-report.md`, se presente, descrive solo
il tentativo iniziale incompleto ed è superato dalla matrice finale JSON.

Ulteriori controlli superati: TypeScript, sintassi dello script e i 17 test
di filtri catalogo/localizzazione. Nessuna garanzia estesa a dispositivi
fisici, dati reali, autenticazione reale o condizioni di rete non simulate.

## Estensione: connessione interrotta e richiesta abortita — 2026-11-08

Lo stesso script mantiene il percorso HTTP 503 e aggiunge due contesti browser
nuovi e indipendenti per ogni combinazione di viewport e lingua:

- `route.abort("connectionreset")`: chiusura sintetica della connessione,
  rilevata da Chromium come `net::ERR_CONNECTION_RESET`.
- `route.abort("aborted")`: richiesta sintetica interrotta, rilevata come
  `net::ERR_ABORTED`. Non è un test dell'AbortController dell'app.

In questi scenari non viene fornito alcun codice HTTP: il runner registra
gli eventi `requestfailed` e `response` del browser, oltre all'esito scelto
nell'intercettazione. Per ciascuna interruzione sono attesi otto eventi
`requestfailed` e **nessuna risposta HTTP fallita**; l'unica risposta HTTP
del catalogo è il 200 successivo a Riprova. Per il confronto 503 sono attese
otto risposte HTTP 503 e nessun `requestfailed`, poi il singolo 200.
Questo evita di scambiare una risposta server non riuscita per una disconnessione.

La rete viene ripristinata soltanto nell'intercettazione della GET catalogo:
non si porta offline l'intero browser, così navigazione, asset e adattatore
restano disponibili. Prima di ripristinarla si verifica l'errore tradotto,
si torna al rilievo, si confrontano gli otto input e si riapre il catalogo.
Si attendono tutti i retry automatici anche dopo il rimontaggio.
Il successivo clic sul pulsante tradotto Riprova genera **una sola GET**,
trattenuta per osservare la navigazione ancora abilitata. Il rilascio delle
tre righe sintetiche avviene senza navigazioni o rimontaggi intermedi.
Si verificano rimozione dell'alert, conteggio esatto localizzato, valori
varietali/numerici invariati e, tornando al rilievo, tutti gli input originali.

L'adattatore Clerk rimane esclusivamente nel browser. Nessun account reale,
ticket, credenziale o dato reale è necessario. Lo script non avvia né utilizza
il backend: le quattro API consentite sono risposte sintetiche; API non
previste, scritture, richieste esterne e WebSocket restano bloccati in tutti
i nuovi contesti, con service worker disabilitati.
Non sono state modificate le impostazioni dei retry o il codice dell'app.

Il report mantiene `error`/`recovery` per il caso 503 e aggiunge
`errorScenarios.503`, `errorScenarios.connectionreset`,
`errorScenarios.aborted`, con evidenze HTTP/trasporto e controlli distinti
per tipo di guasto. Le catture nuove terminano in `connectionreset`,
`connectionreset-recovered`, `aborted`, `aborted-recovered`; il recupero 503
è ora `503-recovered`. Eventuali vecchie catture `recovered` non appartengono
alla nuova matrice.

### Esito della matrice estesa

Esecuzione completata con Chromium, usando il comando di riproduzione sopra:
**354/354 controlli superati, 59 per combinazione**, exit code 0.
Sono stati verificati 18 percorsi errore/recupero indipendenti, oltre ai sei
percorsi caricamento/vuoto già presenti.

| Viewport | Lingua | HTTP 503 | Connessione interrotta | Richiesta abortita | Input conservati |
| --- | --- | --- | --- | --- | --- |
| 390×844 | IT | Superato | Superato | Superato | Sì, in tutti i percorsi |
| 390×844 | EN | Superato | Superato | Superato | Sì, in tutti i percorsi |
| 390×844 | ES | Superato | Superato | Superato | Sì, in tutti i percorsi |
| 820×1180 | IT | Superato | Superato | Superato | Sì, in tutti i percorsi |
| 820×1180 | EN | Superato | Superato | Superato | Sì, in tutti i percorsi |
| 820×1180 | ES | Superato | Superato | Superato | Sì, in tutti i percorsi |

In ciascun percorso: errore e Riprova nella lingua selezionata, navigazione
durante il guasto, singolo retry manuale con rete ripristinata, tre righe
recuperate e otto valori del rilievo identici. Zero tentativi di scrittura,
zero API non previste e zero errori JavaScript in tutti i contesti.
Le sole risposte HTTP del catalogo nei due nuovi scenari sono i 200 finali;
gli otto fallimenti di trasporto per scenario sono confermati dai relativi
eventi browser. Le risposte 503 restano invece eventi HTTP, non `requestfailed`.
I WebSocket osservati sono chiusi dall'intercettazione prima di collegarsi.

Confermati anche sintassi dello script, TypeScript e **18 test** di filtri
catalogo/localizzazione (il totale attuale comprende un test aggiuntivo
rispetto alla verifica storica sopra).
Sono presenti 48 catture PNG della matrice estesa nella directory ignorata
`generated-artifacts/catalogue-network/`, insieme al report JSON.
La prova non certifica autenticazione reale, rete fisica, dispositivi fisici,
altri motori browser o build di produzione.

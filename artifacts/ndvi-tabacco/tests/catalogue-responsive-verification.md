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
24 screenshot PNG (caricamento, vuoto, 503, recupero per ogni combinazione)
nella stessa directory. Sono output generati esclusi da Git e dalla
distribuzione. Il precedente `partial-report.md`, se presente, descrive solo
il tentativo iniziale incompleto ed è superato dalla matrice finale JSON.

Ulteriori controlli superati: TypeScript, sintassi dello script e i 17 test
di filtri catalogo/localizzazione. Nessuna garanzia estesa a dispositivi
fisici, dati reali, autenticazione reale o condizioni di rete non simulate.

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

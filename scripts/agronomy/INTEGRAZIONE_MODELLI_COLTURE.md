# Catalogo operativo: completezza e integrazione

## Perimetro

488 profili produttivi, suddivisi in Kiwi (50), Vite da vino (55),
Vite da tavola (55), Pere (55), Mele (55), Lattuga (55), Spinacio (55),
Spinacino (4 gamma) (55), Broccoli (53).
I cinque profili di kiwi non produttivi non sono riattivati.
Potassio, fosforo, acqua e note non entrano nei modelli.

La fonte condivisa è `lib/crop-calculations/src/catalogue.json`:
gli stessi dati alimentano consultazione, selezione e ricalcolo API.
Lo spostamento del precedente snapshot non cambia le 488 righe.
Non sono richiesti nuovi schemi, migrazioni o modifiche ai rilievi esistenti.

## Completezza prima dell'attivazione

Tutti i profili attuali possiedono densità, resa di riferimento, N totale
e quattro fasi con nome, quota N, BBCH e NDVI. Sono verificati:
valori finiti e positivi, NDVI nel dominio (0,1], quattro identificatori
di fase distinti, formato BBCH e somma delle quote compatibile con gli
arrotondamenti originari. La presenza di una lacuna non risolvibile
impedisce l'attivazione dell'intero catalogo, anziché generare dosi con
parametri predefiniti di un'altra coltura.

Questa è completezza dei dati e del modello informatico, non prova
di calibrazione sperimentale indipendente per ciascuna varietà.
I parametri restano riferimenti agronomici di supporto.

## Riferimenti per affinità

Se un profilo è incompleto, si cerca esclusivamente nella stessa coltura
un profilo completo con la stessa destinazione, impiego, precocità e fasi
fenologiche compatibili. Fra i candidati si privilegia la vicinanza di resa
e densità, con ordinamento deterministico. È affinità agronomica di impiego
e fenologia, non un'affermazione di parentela genetica.

Il modello usa l'intero profilo di riferimento, senza combinare arbitrariamente
curve e quote di varietà diverse. Identità selezionata e varietà di riferimento
rimangono distinte. La varietà affine è indicata nell'interfaccia e nella
provenienza salvata. Nessun passaggio automatico fra colture è ammesso.

**Situazione dei dati attuali:** 488 riferimenti diretti completi; nessuna
sostituzione necessaria. Il percorso per affinità è collaudato con lacune
introdotte esclusivamente in copie sintetiche dei profili.

## Calcolo e persistenza

- Il totale N e le quote di fase sono proporzionati alla resa desiderata
  rispetto alla resa del riferimento. La densità è registrata, senza inventare
  un coefficiente azotato assente dai dati.
- La fase deve essere selezionata e confermata in campo; non viene stimata
  dall'età dell'impianto. Il BBCH del catalogo è un intervallo di riferimento,
  non un codice puntuale rilevato automaticamente.
- Per intervalli numerici si considera la media aritmetica degli estremi.
- Media, varianza, deviazione standard e CV provengono dalle cinque letture.
- Dose = quota della fase × max(0, NDVI riferimento − NDVI medio) / NDVI riferimento.
- La dose è limitata alla quota della fase e all'azoto residuo del piano;
  vale zero con NDVI al riferimento/superiore o piano esaurito.
- L'API ricalcola i risultati, controlla metadati e GPS, e rifiuta dosi,
  riferimenti e totali incoerenti. Non si fida dei risultati del browser.
- Il salvataggio riutilizza le colonne esistenti e l'isolamento per proprietario.
  La rilettura conserva coltura, varietà, fase, provenienza, NDVI, dose e GPS,
  senza trasformare le nuove colture in tabacco.
- Per le nuove colture i giorni dall'impianto non sono usati per il modello;
  il campo tecnico è 0 e la visualizzazione/esportazione mostra un trattino.

## Verifica ripetibile, senza dati reali

```sh
pnpm --filter @workspace/ndvi-tabacco exec tsx --test src/catalogue/calculations.test.ts
pnpm --filter @workspace/api-server test:catalogue
pnpm run typecheck
```

I test coprono tutti i 1.952 abbinamenti varietà/fase, i limiti della dose,
le letture non valide, i riferimenti per affinità della stessa coltura,
le alterazioni del payload, la rilettura delle nove colture con storage simulato
e le traduzioni IT/EN/ES. Le regressioni dei tre modelli preesistenti
rimangono nelle rispettive suite.

Il percorso browser sintetico `tests/catalogue-calculations.html` monta
il vero componente applicativo e intercetta ogni `fetch`: non può scrivere
su database reali. Le sue osservazioni rimangono soltanto nel localStorage
isolato del contesto di prova. Non equivale a un collaudo di scrittura
autenticato in Production.

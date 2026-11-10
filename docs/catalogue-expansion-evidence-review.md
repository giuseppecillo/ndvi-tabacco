# Ampliamento del catalogo: verifica delle evidenze

## Esito dopo l'autorizzazione alle medie di coltura

Sono stati aggiunti alla sorgente applicativa tre profili completi di
melanzana: Melana F1, Tasca F1 ed Egle F1. Identità e precocità sono state
verificate nel catalogo del costitutore citato sotto. Gli altri valori sono
medie aritmetiche dei **60 profili originari di melanzana** forniti dall'utente
e già utilizzati dal modello. Non sono nuove calibrazioni sperimentali.

Le altre 23 colture richieste restano escluse dall'ampliamento visibile:
negli archivi forniti non esiste un campione completo per queste colture e
le fonti finora consultate non completano tutti i parametri operativi. Non
vengono utilizzati dati del tabacco, del pomodoro o del grano duro per creare
medie di specie diverse.

Non sono state eseguite scritture su Supabase, pubblicazioni o modifiche ai
rilievi. Il lavoro non completa ancora l'intero ampliamento richiesto.

Questo documento è un rapporto sulle fonti, non un catalogo di profili parziali.
Non certifica l'assenza di altri studi: descrive i limiti delle fonti effettivamente
consultate. Non dichiara completata l'integrazione richiesta.

## Aggiornamento del criterio di misura NDVI

Il titolare ha successivamente autorizzato anche **NDVI da satellite e drone**.
Non è quindi richiesta una fonte da sensore portatile come condizione di
ammissione. Il metodo di acquisizione resta documentato nella traccia tecnica:
piattaforma, bande, risoluzione, eventuale mascheratura di suolo/interfila,
date e fasi fenologiche. La diversa piattaforma, da sola, non esclude un dato.

Non si deduce però l'equivalenza numerica fra piattaforme e non si confondono
NDVI con NDRE, SPAD, fluorescenza o rapporti normalizzati rispetto a una
parcella di riferimento. Restano necessari densità, resa, N fertilizzante
totale e per fase, con NDVI associato alle medesime fasi. È ammessa la
composizione di riferimenti documentati della stessa coltura, verificandone
la compatibilità; non occorre che tutti i parametri provengano dallo stesso
esperimento. Non si richiede una nuova calibrazione sperimentale per ogni
varietà per poter applicare le medie autorizzate.

La ricerca aggiuntiva e la situazione dei 23 gruppi sono riportate nel
[registro tecnico di approfondimento](catalogue-expansion-research-update.md).
Quel registro non aggiunge profili al catalogo e non costituisce una release
da applicare al database.

## Perimetro richiesto

Ventiquattro gruppi colturali: grano tenero, orzo, avena, triticale, melanzana,
melone, carciofo, cavolo cappuccio, cavolo verza, cavolo nero, cavolini di
Bruxelles, cavolfiore, patata, carota, rucola, fragola, pesco, albicocco,
peperone, miglio, fagiolino, fava, favino ed erba medica.

La melanzana passa da 60 a 63 profili nella sorgente applicativa; gli originali
non sono stati duplicati o ricertificati. Fava e favino restano distinti;
non si confondono produzioni da granella, prodotto fresco o foraggio. Per la
rucola occorre inoltre distinguere Eruca sativa da Diplotaxis tenuifolia.

## Criterio di ammissione

Un nuovo profilo deve avere identità varietale verificata, contesto produttivo,
precocità, densità con unità corretta, resa con unità e base del prodotto,
azoto fertilizzante totale e ripartizione per le fasi, identificazione delle
fasi e riferimenti NDVI coerenti con fase e modalità di misura.

Ogni parametro deve essere ricondotto alla fonte pertinente o a un riferimento
documentato per affinità **della stessa coltura**, con metodo di trasferimento
esplicito nella documentazione tecnica. Non è sufficiente citare uno studio
che tratta genericamente la specie.

La media di un intervallo è utilizzabile soltanto dopo aver verificato che
l'intervallo rappresenti la grandezza cercata: non si mediano indiscriminatamente
trattamenti con carenza, controlli eccessivamente fertilizzati e condizioni
produttive incompatibili per creare un valore «ottimale».

La diffusione commerciale va documentata separatamente dalla disponibilità
online. Statistiche storiche e cataloghi commerciali non sono una classifica
attuale di quote di mercato.

## Fonti consultate e limiti verificati

### 1. Varietà commerciali e diffusione

- **CREA — Dinamica delle quantità certificate, campagne 2017–2022**:
  [documento](https://www.crea.gov.it/documents/63509/2309351/Dinamica-cereali-21.pdf/57452858-9fd9-5413-6902-21a40787eea5?t=1694445230852).
  Documenta quantità certificate per varietà di cereali, tra cui frumento tenero,
  orzo e avena. È utile per la selezione iniziale; non prova la quota di mercato
  attuale né fornisce tutte le calibrazioni NDVI varietali.
- **Vilmorin-Mikado — Catalogo orticolo Italia 2020**:
  [documento](https://www.vilmorinmikado.it/sites/italie.sam/files/PDF/CATALOGUE%20HOBBY%20ITALIA%202020%20-%20OK%20BD.pdf).
  Verifica identità commerciali, tipologie e cicli di alcune brassiche e
  melanzane. I giorni dal trapianto alla raccolta non forniscono da soli
  fabbisogni azotati e soglie NDVI per ogni fase. Un catalogo storico non
  dimostra che una varietà sia ancora tra le più vendute.

### 2. Dose di fertilizzante e resa di riferimento

- **Regione Lombardia — Schede a dose standard per colture orticole**:
  [documento](https://www.fitosanitario.regione.lombardia.it/wps/wcm/connect/ce9cc134-3296-4fd9-b61a-6adfd3c261d5/All+5_Colture+Orticole_2025.pdf?MOD=AJPERES).
  Il testo recuperato reca l'intestazione 2026, mentre il nome del file riporta
  2025: conservare questa distinzione, senza dedurre l'edizione dal solo URL.
  Le schede definiscono dosi standard condizionate a resa, suolo e altri fattori;
  non dosi univoche specifiche per ciascuna varietà.
- **Regione Emilia-Romagna — Fava e favino da granella 2025**:
  [documento](https://agricoltura.regione.emilia-romagna.it/produzioni-agroalimentari/agricoltura-sostenibile/agricoltura-integrata/Collezione-dpi/dpi_2025/norme-tecniche-di-coltura/erbacee/erbacee/nta-fava-e-favino-2025.pdf/@@download/file/NTA%20FAVA%20e%20FAVINO%202025.pdf).
  Riporta, nel contesto della scheda, dose standard 40 kg N/ha per produzioni
  1,6–2,4 t/ha e l'eventuale apporto in copertura. Questo impedisce sia di
  imporre automaticamente zero a tutte le leguminose, sia di trasferire la
  scheda da granella alla fava raccolta fresca. Mancano nella scheda le soglie
  NDVI operative varietali richieste.

### 3. NDVI e risposta all'azoto

- **Aranguren et al., 2020 — Wheat Yield Estimation with NDVI Values Using a
  Proximal Sensing Tool**, Remote Sensing 12, 2749,
  [DOI 10.3390/rs12172749](https://www.mdpi.com/2072-4292/12/17/2749).
  Il lavoro sulla varietà Cezanne con RapidScan CS-45 riporta soglie
  0,70–0,75 a GS32, GS37 e GS65, ma non stabilisce con precisione la soglia a
  GS30. La semina è espressa in kg di seme/ha: non va convertita in piante/ha
  senza i dati necessari. Il lavoro non giustifica un profilo completo con
  quattro soglie ottimali trasferibile automaticamente a ogni frumento tenero;
  può concorrere al completamento con altre fonti compatibili della stessa
  coltura.
- **Povh et al., 2008 — Behavior of NDVI obtained from an active optical sensor
  in cereals**, Pesquisa Agropecuária Brasileira 43, 1075–1083,
  [DOI 10.1590/S1678-3921.pab2008.v43.194](https://apct.sede.embrapa.br/pab/article/view/194).
  Documenta risposta del segnale ad apporti di N per frumento, triticale e
  orzo e interferenza varietale nelle letture. Non equivale a una tabella
  universale di valori ottimali.
- **Ji et al., 2017 — In-Season Yield Prediction of Cabbage with a Hand-Held
  Active Canopy Sensor**, Sensors 17, 2287,
  [DOI 10.3390/s17102287](https://pmc.ncbi.nlm.nih.gov/articles/PMC5676655/).
  Studia Jianbao e Pingbao con GreenSeeker e quattro livelli di N; il risultato
  principale è una relazione di previsione della resa dipendente dal momento
  di misura. Non fornisce una giustificazione per attribuire le stesse soglie
  a cappuccio, verza, cavolo nero e Bruxelles.
- **Deidda et al., 2025 — Proximal and Remote Sensing Monitoring of the
  ‘Spinoso sardo’ Artichoke Cultivar on Organic and Conventional Management**,
  Horticulturae 11, 961,
  [DOI 10.3390/horticulturae11080961](https://www.mdpi.com/2311-7524/11/8/961/htm).
  Distingue fluorimetria prossimale e indice ottenuto da rilievo aereo. Non è
  corretto usare automaticamente i risultati di questi due strumenti come
  soglie equivalenti a un sensore NDVI portatile. Dopo l'autorizzazione agli
  NDVI aerei, la componente NDVI da drone è una fonte ammissibile in sé;
  rimane da completare la copertura delle fasi e degli altri parametri.

### 4. Assorbimento e concimazione non sono la stessa grandezza

- **de Paz, Ramos e Visconti, 2022 — Critical nitrogen dilution curve and dry
  matter production parameters for several Mediterranean vegetables**,
  Scientia Horticulturae,
  [testo presso IVIA](https://redivia.gva.es/bitstream/handle/20.500.11939/8448/2022_de-Paz_Critical.pdf?isAllowed=y&sequence=1).
  Fornisce parametri di diluizione dell'azoto e produzione di sostanza secca;
  non autorizza a trasformare direttamente la concentrazione critica di N o
  l'assorbimento totale in dose di concime da distribuire.
- **Feller e Fink, 1999 — Estimation of nitrogen uptake of field vegetables**:
  [testo presso IGZ](https://www.igzev.de/publikationen/Feller_and_Fink_1999_EN.pdf).
  Confronta stime dell'assorbimento basate sul tempo e sulle fasi e ne
  quantifica gli errori, anche elevati nel cavolo cappuccio. Non è una fonte
  di soglie NDVI.

## Conseguenze per l'integrazione

1. Non copiare soglie tra colture diverse per ottenere record apparentemente
   completi.
2. Non presentare indici fogliari di clorofilla, NNI, NDRE e NDVI come
   intercambiabili.
3. Non attribuire una quota azotata positiva a ogni fase solo per raggiungere
   quattro righe.
4. Le leguminose richiedono un contesto che distingua nutrizione complessiva,
   azotofissazione ed eventuali apporti di fertilizzante. Un NDVI basso non
   diagnostica da solo una carenza risolvibile con N minerale.
5. Il catalogo attualmente pubblicato, il database Supabase e lo storico
   restano invariati. La sorgente locale contiene i tre nuovi profili, ma
   la release persistente corrispondente non è stata applicata.

Per sbloccare un nuovo profilo occorre completarne le evidenze parametro per
parametro, inclusa una relazione utilizzabile e documentata fra fase, NDVI e
azoto fertilizzante. In mancanza di queste evidenze il profilo resta escluso,
come richiesto dall'utente.

## Medie introdotte e tracciabilità

I tre nuovi profili condividono densità 16.000 piante/ha, resa di riferimento
45,23 t/ha e azoto totale di riferimento 179,28 kg N/ha. Le quote per le quattro
fasi sono 35,86 / 53,78 / 71,71 / 17,93 kg N/ha; gli NDVI medi corrispondenti
sono 0,351 / 0,698 / 0,851 / 0,752.

Queste cifre sono **medie del catalogo fornito**, non valori sperimentali
pubblicati per i tre ibridi. La precocità rimane quella descritta dal costitutore:
precoce per Melana F1, medio-precoce per Tasca F1 ed Egle F1. Non è dedotta
facendo una media delle etichette.

Le fasi e i codici BBCH sono conservati soltanto perché tutti i donatori
condividono lo stesso schema. Non vengono mediati codici o nomi di fase.
La precisione numerica del calcolo della media non rappresenta accuratezza
agronomica o strumentale.

La traccia tecnica restituita da `cropMeanExpansion` conserva donatori,
numerosità, minimo, massimo, media, fonte dell'identità e assenza di
validazione sperimentale. Per i nuovi record la stessa traccia entra nel
manifest versionato destinato alla persistenza.

I nuovi profili riutilizzano il modulo esistente di parametri colturali,
piano per fase, confronto NDVI e dose, senza creare un'interfaccia differente.
Le esportazioni includono gli stessi dati dei calcoli.

## Pubblicazione e Supabase

Il totale del catalogo base nella sorgente applicativa passa da 1.396 a 1.399
varietà, ancora su 18 colture complessive. Eventuali proposte già approvate
dagli amministratori restano separate e non sono incluse in questo conteggio.
Le nuove 23 colture non risultano aggiunte.

Il manifest cambia versione: **non ripubblicare questa revisione prima di
avere autorizzato e applicato la corrispondente release del catalogo su
Supabase**. Il controllo esistente rifiuta una release persistente assente o
diversa; non è stato indebolito né aggirato.

L'eventuale aggiornamento deve inserire la nuova release immutabile della sola
tabella del catalogo e verificarne integralmente contenuto, hash e protezioni.
Non occorrono nuove colonne né modifiche ai rilievi. Lo strumento manuale
esistente resta soggetto ad autorizzazione: non è stato eseguito.

## Verifiche eseguite

- TypeScript dell'intero workspace e del frontend: superati.
- 27 test mirati: superati; medie, esclusioni, invariabilità degli originali,
  calcoli per fase, ricomputazione API, collegamento persistente simulato,
  esportazioni Excel complete in italiano, inglese e spagnolo.
- Compilazioni di frontend e API: superate.
- Avvio dei workflow di sviluppo: riuscito; controllo schema in sola lettura,
  migrazioni automatiche disabilitate, backend di preview Replit.
- Anteprima mobile a 390 px del modulo condiviso con Melana F1: verificata
  visivamente con dati locali e richieste di rete isolate, senza login né dati
  dei clienti. Non è un collaudo autenticato o una prova su Safari reale.

# Ampliamento del catalogo: verifica delle evidenze

## Esito

La ricerca svolta non ha ancora prodotto nuovi profili che soddisfino **tutti**
i requisiti di completezza e tracciabilità richiesti. Non è quindi stata
modificata la sorgente del catalogo operativo, non sono state eseguite scritture
su Supabase e non sono stati attivati nuovi calcoli.

Questo documento è un rapporto sulle fonti, non un catalogo di profili parziali.
Non certifica l'assenza di altri studi: descrive i limiti delle fonti effettivamente
consultate. Non dichiara completata l'integrazione richiesta.

## Perimetro richiesto

Ventiquattro gruppi colturali: grano tenero, orzo, avena, triticale, melanzana,
melone, carciofo, cavolo cappuccio, cavolo verza, cavolo nero, cavolini di
Bruxelles, cavolfiore, patata, carota, rucola, fragola, pesco, albicocco,
peperone, miglio, fagiolino, fava, favino ed erba medica.

La melanzana è già presente con 60 profili; non sono stati duplicati o
ricertificati come risultato di questa ricerca. Fava e favino restano distinti;
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
  quattro soglie ottimali trasferibile automaticamente a ogni frumento tenero.
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
  soglie equivalenti a un sensore NDVI portatile.

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
5. Il catalogo operativo attuale e lo storico restano invariati. Nessuna
   migrazione può essere dichiarata necessaria o conclusa sulla base di una
   lista di colture o di una bibliografia.

Per sbloccare un nuovo profilo occorre completarne le evidenze parametro per
parametro, inclusa una relazione utilizzabile e documentata fra fase, NDVI e
azoto fertilizzante. In mancanza di queste evidenze il profilo resta escluso,
come richiesto dall'utente.

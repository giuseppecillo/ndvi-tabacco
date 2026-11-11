# Ampliamento: nuovi dati numerici e criterio per il frumento tenero

## Ambito e stato effettivo

Il titolare ha autorizzato l'uso di NDVI e azoto medi del frumento duro per il
frumento tenero. È un'eccezione al vincolo della stessa coltura, limitata a
questi parametri; non comprende automaticamente densità o resa. Per triticale
e miglio restano riferimenti della stessa specie. Per le altre colture la
ricerca è stata estesa a lavori di remote sensing, materiali e metodi,
letteratura tecnica e presentazioni.

Sono state eseguite 33 ricerche tematiche, con più formulazioni per argomento.
Sono stati cercati anche risultati di Google Scholar, senza ottenere una
consultazione sistematica del suo indice: non si dichiara di aver esaminato
ogni articolo esistente o di avere esaurito la letteratura. Le fonti citate
sotto sono state recuperate presso editori, università, enti o archivi.

I risultati numerici sono in
`scripts/agronomy/research-numeric-evidence.json`, marcato
`research-only-not-catalogue`, **non importato dall'applicazione**. Il file
contiene undici schede di evidenza, non undici profili colturali completi.
Restano separati la ricerca, l'ammissione dei profili, l'integrazione operativa
e la successiva migrazione autorizzata. Nessuna delle 23 nuove colture è stata
attivata in questa fase.

## 1. Frumento tenero: preparato il riferimento sostitutivo autorizzato

`scripts/agronomy/bread-wheat-reference.ts` calcola offline:

- la media dei piani N delle 14 varietà native di duro alle rispettive rese di
  riferimento dell'app e fattore densità 1: **152,142857… kg N/ha**;
- la curva NDVI media: essendo comune alle 14 varietà, coincide con la curva
  nativa per giorni dalla semina; non è la media di punti di età diverse;
- le medie delle quote N all'interno di schemi fenologici compatibili,
  conservando distinti il gruppo di 13 varietà e RGT NATUR.

Il totale è una **media dei piani del modello già presente**, non un nuovo
risultato sperimentale sul tenero. Le quote native arrotondate non sommano
sempre esattamente al totale del piano: non vengono alterate in silenzio.
Il riferimento non inventa densità o resa del tenero e non assegna codici
BBCH alla curva NDVI per giorni. Non costituisce ancora un profilo ammesso.

Verifica riproducibile dalla radice:

```sh
pnpm --filter @workspace/api-server exec esbuild \
  ../../scripts/agronomy/bread-wheat-reference.test.ts \
  --bundle --platform=node --format=cjs \
  --outfile=/tmp/nitrocrop-bread-wheat-reference.test.cjs
node --test /tmp/nitrocrop-bread-wheat-reference.test.cjs
```

## 2. Triticale: recuperate e verificate le tabelle originali

**Karaman, 2023, Relationship between physiological characteristics and grain
yield of triticale genotypes**, Bangladesh Journal of Botany.
[PDF dell'editore](https://www.banglajol.info/index.php/BJB/article/download/65250/44166).

Materiali e metodi: Mus, Turchia, due annate in asciutta; **450 semi/m²**,
**90 kg N/ha**, di cui **30 alla semina e 60 a GS23**.
Non si convertono i semi seminati in piante misurate.

Tabella 5, pagina stampata 192, e tabella 6, pagina 193:

| Stadio dichiarato | NDVI medio pubblicato |
|---|---:|
| GS49 | 0,632 |
| GS60 | 0,616 |
| GS70.1 | 0,597 |
| GS83 | 0,548 |
| GS85 | 0,509 |

La resa media pubblicata è **2.983 kg/ha**. Il campione è di 18 genotipi,
comprendenti linee sperimentali: non è una media delle sole cultivar
commerciali.

Sono trascritti separatamente resa e cinque NDVI di **13 varietà nominate**:
Mehmetbey, Özer, Esin, Tatlıcak-97, Ayşehanım, Ümranhanım, Alperbey,
Mikham-2002, Karma, Melihbey, Bc Goran, Bera e Presto. Non si sostituiscono
i loro valori specifici con la media dei 18 genotipi. L'identità di varietà
nello studio non prova la loro attuale diffusione commerciale italiana.

L'estrazione testuale automatica disallineava le colonne della tabella 5;
sono state lette le pagine originali renderizzate e ruotate. In particolare,
la media GS83 è **0,548**. I file PDF e le immagini di verifica sono in
`generated-artifacts/agronomy/`, esclusi dal versionamento.

Resta da mantenere distinta la cronologia degli interventi N precoci dalle
letture NDVI successive; GS70.1 è uno stadio Zadoks dichiarato dall'autore,
non un BBCH intero da attribuire automaticamente. Non si inventano letture
NDVI alla semina o all'accestimento.

È stato inoltre recuperato il PDF completo di **Povh et al., 2008**,
[10.1590/S1678-3921.pab2008.v43.194](https://apct.sede.embrapa.br/pab/en/article/download/194/5618).
L'esperimento 4 riporta BRS-203, **70 piante per metro lineare** e interfila
**0,17 m**: qui l'unità dichiarata è effettivamente piante, non semi o spighe.
È un ulteriore riferimento colturale della stessa specie, distinto dalla
densità di semina della prova Karaman. I **40 kg N/ha basali** non vanno
dimenticati quando si considerano le dosi sperimentali in copertura
0–160 kg N/ha. Il rilievo NDVI a 85 giorni non risolve da solo le fasi precoci.

## 3. Miglio: letta la tabella satellitare mancante

**An Assessment of Proso Millet as an Alternative Summer Cereal Crop in the
Mediterranean Basin**, Agronomy 2022, DOI
[10.3390/agronomy12030609](https://www.mdpi.com/2073-4395/12/3/609).

La tabella 3, pagina 10 del PDF originale, contiene nove misure per il
**Panicum miliaceum**, distinte dal mais e dal diverso indice NDWI:

| Stadio principale BBCH | Annate disponibili | Valori NDVI | Media aritmetica |
|---|---|---|---:|
| 3, levata | 2021 | 0,58 | 0,58 |
| 6, fioritura | 2019, 2020, 2021 | 0,80; 0,62; 0,77 | 0,73 |
| 7, maturazione lattea | 2019 | 0,80 | 0,80 |
| 8, maturazione piena | 2019, 2020, 2021 | 0,65; 0,77; 0,74 | 0,72 |
| 9, senescenza | 2020 | 0,63 | 0,63 |

Non si media per colonna di data quando le date rappresentano stadi
diversi. Il numero di osservazioni varia fra stadi ed è conservato.
Le medie descrivono le osservazioni delle annate, non dimostrano una soglia
di sufficienza N universale. Sono disponibili per la composizione del
riferimento della stessa specie con la prova Sunrise già documentata,
senza inventare una redistribuzione N quando la prova fertilizza alla semina.

Riletta anche la tabella 2 della prova **Sunrise di Palchetti et al., 2023**
nel [PDF CNR](https://iris.cnr.it/retrieve/70354edd-4a81-416d-ad98-dda6c3385176/agriculture-13-01657-v2.pdf):

| Fattore N | Resa marginale kg/ha | Fattore densità | Resa marginale kg/ha |
|---|---:|---|---:|
| 0 kg N/ha | 2.705 | 55 piante/m² | 2.758 |
| 50 kg N/ha | 2.896 | 111 piante/m² | 3.020 |
| 100 kg N/ha | 3.123 | 222 piante/m² | 3.211 |
| 150 kg N/ha | 3.263 | — | — |

Si conservano le medie marginali separatamente: **3.211 è il valore del
fattore densità 222**, mentre **3.263 è quello del fattore N150**.
Non si crea la resa di una combinazione densità×N accostando i due massimi.
La prova non contiene misure NDVI.

## 4. Avena: dati tecnici italiani, distinti dalle prove da foraggio

- **ARSARP, Banca del germoplasma, Avena di Carpinone**:
  [scheda recuperata](https://www.arsarp.it/bancadelgermoplasma/bancadati/erbacee/avena/avena).
  Investimento previsto **250–350 piante/m²**, seme **150–200 kg/ha**,
  N di riferimento **70 kg/ha**, distribuito per **un terzo alla preparazione
  del letto di semina e due terzi in copertura**. Il BBCH della copertura non
  è specificato.
- **Regione Toscana, disciplinare 2025**:
  [scheda recuperata](https://www.regione.toscana.it/documents/d/guest/fase-agronomica-avena-2).
  Dose standard **60 kg N/ha** in situazione normale per produzione
  **3,2–4,8 t/ha**, con incrementi/decrementi contestuali. Non si media
  automaticamente questa dose con quella ARSARP.
- Riletto **Optical-Sensor-Based Nitrogen Management in Oat for Yield
  Enhancement**, Sustainability 2021,
  [10.3390/su13126955](https://www.mdpi.com/2071-1050/13/12/6955):
  PARC Oat da foraggio, NDVI a due stadi principali, accestimento e
  botticella. Non fornisce quattro letture né una curva da granella completa.

Le ricerche hanno incluso anche presentazioni e PDF tecnici. Non è stata
attribuita a un PowerPoint non recuperato l'origine dei numeri sopra.

## 5. Orzo: frazionamenti e rese di una prova italiana

**Fabbri et al., 2020, A Sustainability Assessment of the Greenseeker N
Management Tool**, Sustainability,
[10.3390/su12187303](https://www.mdpi.com/2071-1050/12/18/7303).

Firenze, 2017–2018, vasche di 1 m³, **400 semi/m²**. Nessun N alla semina.
Due coperture, 26 marzo e 24 aprile:

| Trattamento | N totale kg/ha | Frazioni kg/ha | Resa granella t/ha |
|---|---:|---|---:|
| Convenzionale CF | 150 | 75 + 75 | 4,3 |
| Guidato dal sensore RF | 75 | 37,5 + 37,5 | 3,5 |

La decisione al sensore è a BBCH39. Le due rese non sono statisticamente
diverse nella prova, ma restano risultati numerici distinti. Non si
attribuisce la resa CF alla dose RF. La curva NDVI va ancora estratta per
trattamento; il target iniziale di 7 t/ha non è la resa raccolta.

Individuati inoltre lavori di fenologia satellitare Sentinel-2 su frumento
e orzo e algoritmi specifici per l'orzo: sono ulteriori piste, non dati
già ammessi sulla base dell'abstract.

## 6. Cavolfiore: nuovi riferimenti NDVI lungo il ciclo

**University of Arizona, Desert Ag Solutions**,
[Cauliflower](https://desertagsolutions.org/research-areas-and-initiatives/increasing-irrigation-efficiency/water-use-and-management/updated-crop-evapotranspiration-et-salinity-management/cauliflower).
Tabella tecnica recuperata integralmente:

| Punto di transizione FAO-56 | NDVI |
|---|---:|
| INI | 0,103 |
| INI/DEV | 0,154 |
| DEV/MID | 0,857 |
| MID/END | 0,857 |
| END | 0,505 |

È una fonte tecnica universitaria pertinente, non soltanto l'annuncio di
un progetto UAV. I punti di transizione non sono automaticamente medie
temporali di fase né soglie N ottimali. Occorrono ancora cultivar,
densità/resa/piano N compatibili e una rappresentazione coerente degli
stadi FAO-56: non sono codici BBCH.

## 7. Peperone e patata: nuovi materiali e metodi numerici

### Peperone

**Koksal et al., Crop Evapotranspiration Estimations of Red Pepper Using
Field Level Remote Sensing Data and Energy Balance**,
[testo recuperato](http://www.pjoes.com/pdf-85351-28002?filename=Crop%20Evapotranspiration.pdf).
Yalova Yağlık 28, sesto **0,70 × 0,40 m**, circa **100 kg N/ha**,
metà prima del trapianto e metà durante la stagione. NDVI definito
**(R800 − R680)/(R800 + R680)**, circa **0,1 al trapianto**. Le curve vanno
estratte mantenendo distinti i trattamenti irrigui; resa commerciabile e
ulteriore frazionamento non sono stati completati.

**Haytova et al., 2024**, Slonsko uho,
[Relationship between NDVI and in situ data in pepper plantations on open
field conditions](https://horticulturejournal.usamv.ro/pdf/2024/issue_1/Art57.pdf):
recuperati testo e metodi Sentinel-2. Gli stadi di rilevamento e i dati
satellitari sono pertinenti. La biomassa fresca di foglie, fusti e frutti
non viene riportata come resa commerciale dei soli frutti.

### Patata

**Active Optical Sensors to Develop Nitrogen Fertilizer Recommendations
for Potato Crop**, Iraqi Journal of Agricultural Sciences 2023,
[PDF recuperato](https://jcoagri.uobaghdad.edu.iq/index.php/intro/article/download/1725/1221/2877).
Russet Burbank, Shepody e Superior, sesto **0,90 × 0,30 m**;
dosi sperimentali **0, 56, 112, 168, 224 e 280 kg N/ha**. Il lavoro riporta
168 kg N/ha come trattamento di massima resa e letture a **4, 8, 10, 12,
16 e 20 foglie**, con GreenSeeker e Crop Circle. Restano da estrarre
NDVI/resa associati e tempi N; non si sostituisce il massimo trattamento
con una raccomandazione universale.

## 8. Altre fonti recuperate e limiti specifici

- **Carota:** individuata la tesi di Metiva nel
  [repertorio Michigan State University](https://d.lib.msu.edu/etd/49723),
  collegata alla prova su gestione N e remote sensing. L'estrazione
  restituisce solo parte del testo: la ripresa a indice 50.000 non ha
  restituito altro contenuto. Non è stata dichiarata letta l'intera tesi.
- **Fragola:** il PDF della tesi di Ibrahim nel
  [repertorio Ain Shams](https://research.asu.edu.eg/bitstream/123456789/173347/1/V5502.pdf)
  recuperato contiene frontespizi, abstract e indice, non le tabelle dei
  risultati. Il lavoro su Yotsuboshi,
  [Sensors 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13210912/),
  rimuove i fiori per mantenere le piante vegetative: non completa un
  profilo con resa di frutti.
- **Verza:** recuperato
  [Antoshkina et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10005640/),
  su Vertu 1340, Golubtsy e Melissa, con rese e pigmenti, ma non una curva
  NDVI verificata. Il testo recuperato non comprende ancora tutti i metodi:
  non sono dedotte dosi N dai pigmenti.
- **Bruxelles:** recuperato il lavoro di
  [Biemond et al., 1995](https://library.wur.nl/ojs/index.php/njas/article/download/564/278/366).
  Distingue esperimenti in vaso e campo, con interventi N specifici.
  Nessuna conversione automatica da g/vaso a kg/ha; non completa NDVI.
- **Erba medica:** recuperato
  [Monitoring Rainfed Alfalfa Growth in Semiarid Agrosystems Using Sentinel-2](https://academica-e.unavarra.es/server/api/core/bitstreams/898d6e60-68d4-440f-9949-9765ed694b5e/content).
  Fenologia e NDVI sono pertinenti, ma copertura vegetale, biomassa,
  dose minerale e fissazione restano grandezze distinte.
- **Albicocco:** il documento
  [NDVI Time Series for Crop Phenology Mapping](https://dergipark.org.tr/tr/download/article-file/726825)
  parla di un territorio a colture miste, includendo l'albicocco nel
  calendario. Non è una curva numerica varietale di albicocco.
- **Fagiolino:** individuato e recuperato
  [Growth Stage Classification and Harvest Scheduling of Snap Bean Using
  Hyperspectral Sensing](https://www.mdpi.com/2072-4292/12/22/3809).
  La classificazione iperspettrale delle fasi non fornisce da sola il
  piano N richiesto.
- **Fava/favino, pesco, carciofo, cappuccio, rucola e cavolo nero:** riesaminate
  le piste specifiche e cercati riferimenti aggiuntivi; non risultano
  assemblati nuovi profili completi ammissibili. I risultati su camelina,
  melo o mais non sono stati trasferiti a queste colture.

### Ulteriori verifiche sui gruppi con dati più scarsi

- Recuperato **Effect of Two Seeding Rates on Nitrogen Yield and Nitrogen
  Fixation of Winter and Spring Faba Bean**, Plants 2023,
  [10.3390/plants12081711](https://www.mdpi.com/2223-7747/12/8/1711).
  Diva e Hiverna autunnali, Alexia primaverile; **25 e 50 semi germinabili/m²**,
  **nessuna fertilizzazione**. Nella scheda di evidenza il N minerale rimane
  quindi **0 kg/ha**, distinto dal fabbisogno biologico, dall'azoto accumulato
  e dalla fissazione. Il risultato su *Vicia faba minor* non diventa senza
  verifica un riferimento per fava da consumo fresco.
- Recuperato il PDF completo di **The Capabilities of Optical and C-Band
  Radar Satellite Data to Detect and Understand Faba Bean Phenology over a
  6-Year Period** presso l'archivio dell'autore. Le misure francesi non
  vengono attribuite alle parcelle della prova austriaca. Occorre ancora
  consolidare destinazione, parametri colturali e stadi della combinazione.
- Recuperato **Utilization of single-image normalized difference vegetation
  index (SI-NDVI) for early plant stress detection**, Beisel et al., 2018,
  [testo completo](https://pmc.ncbi.nlm.nih.gov/articles/PMC6201722/).
  Include *Eruca sativa* sottoposta a stress da nitrato ammonico, ma non
  costituisce un piano di concimazione di campo della rucola: non si
  convertono concentrazioni del trattamento in kg N/ha senza le basi
  necessarie, né si assume automaticamente la calibrazione di un sensore
  satellitare per una camera SI-NDVI.
- Recuperato **Impact of Nitrogen Fertilizer Application Rates on Plant
  Growth and Yield of Organic Kale and Swiss Chard in Vertical Farming
  System**, 2025,
  [10.3390/horticulturae11070827](https://www.mdpi.com/2311-7524/11/7/827).
  Contiene effettivamente **Lacinato**, non soltanto kale viola. Il contesto
  è però un sistema verticale in contenitori, con concentrazioni N in ppm:
  non è stata dedotta una dose di campo kg/ha o una curva NDVI dalla sola
  presenza del nome varietale.
- Recuperato il PDF completo di **Panek et al., 2020**, Agronomy,
  [10.3390/agronomy10111842](https://www.mdpi.com/2073-4395/10/11/1842).
  Distingue triticale e tenero per sito e anno. Le tabelle dei coefficienti
  di correlazione NDVI–resa non sono tabelle di valori NDVI: non sono state
  trascritte come tali.
- Recuperato anche il PDF completo di **An Automated Crop Growth Detection
  Method Using Satellite Imagery Data**,
  [10.3390/agriculture12040504](https://www.mdpi.com/2077-0472/12/4/504).
  La curva per età non consente di saltare la verifica dell'identità del
  gruppo colturale, dei parametri N e della corrispondenza delle fasi.

## Cosa non è stato eseguito

Non sono stati modificati i parametri delle colture operative, i rilievi,
Supabase o le traduzioni. Non è stata effettuata una migrazione né un push
Git della tabella completa, perché tale tabella non è ancora completa.
I nuovi dati numerici e il riferimento per il tenero sono preparazione
offline verificabile, non una conclusione dell'ampliamento richiesto.

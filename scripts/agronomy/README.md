# Revisione offline delle identità del catalogo

Questa procedura non importa colture nell'app e non apre connessioni di rete o
database. Non modifica osservazioni, dati utente o Production. Nessun piano N/NDVI
è validato dalla verifica dei nomi.

## Rigenerazione

Dalla radice del progetto, senza dipendenze Python aggiuntive:

```sh
python scripts/agronomy/review-crop-catalogue.py \
  attached_assets/Database_Colture_1794160273520.csv

python -m unittest discover -s scripts/agronomy -p 'test_*.py' -v
```

Gli output sono in `generated-artifacts/crop-review/`, esclusi da Git e dal
deploy:

- `colture_revisionate.csv`: 493 righe nello stesso ordine, identità originali,
  parametri preliminari già revisionati e nuove colonne di verifica nominativa;
- `controlli_catalogo.json`: esito per riga, hash degli input, fonti, classificazioni,
  relazioni e conteggi per coltura;
- `verifica_identita.html`: rapporto autonomo, senza risorse esterne, con tutti
  gli esiti, link delle fonti e limiti della consultazione;
- `revisione_agronomica.html`: rapporto preliminare precedente, con rimando alla
  verifica delle identità.

Il CSV allegato non è incluso in Git. Su un checkout senza allegato i soli test
di integrazione con quel file sono esplicitamente saltati; i test del verificatore
rimangono eseguibili con dati sintetici.

## Metodo e significato

`catalogue-identities.json` conserva le decisioni documentali, la data della
consultazione e i limiti di ciascuna fonte. Il confronto copre tutte le righe
tramite le fonti della coltura, non è una ricerca individuale esaustiva in tutti
i registri internazionali. Le attestazioni positive sono esplicite: non vengono
ricavate automaticamente da una ricerca testuale, da nomi simili, da incroci o
dal campo «Similar» di una descrizione varietale.

- **DOCUMENTATO**: attestato il nome o il tipo indicato, non necessariamente
  una cultivar. Non equivale a iscrizione attuale in Italia, verifica del clone,
  destinazione commerciale o validità dei valori agronomici.
- **PARZIALMENTE_VERIFICATO**: resta da risolvere un marchio, una denominazione
  abbreviata, un clone o un possibile sinonimo.
- **NON_VERIFICATO**: evidenza insufficiente o ambigua nelle fonti consultate.
  Non significa inesistente, inventato, vietato o non registrato.

Per ogni profilo sono conservate separatamente fonti dell'attestazione e fonti
consultate per coltura: un riferimento consultato senza riscontro non diventa una
prova positiva. Gli estratti indicizzati e le letture parziali sono dichiarati.
Le fonti storiche documentano nomi, non lo stato legale corrente. Le accessioni
dei conservatori non garantiscono la corrispondenza con il materiale di un vivaio.

I nomi originali rimangono le chiavi: la colonna «Denominazione documentata o
candidata» è informativa, non una correzione automatica. Le relazioni esplicite
segnalano sinonimie documentate, candidati, omonimie e impieghi diversi, senza
accorpare righe né copiare parametri da un profilo a un altro.

Tomuri, Matua, Chieftain e Belen sono maschili; Bounty71 è un portinnesto.
Restano anagrafiche con parametri produttivi **vuoti**, mai zero. Tutte le
493 righe mantengono il calcolo automatico disabilitato.

## Aggiornare le evidenze

1. Consultare una fonte varietale, del costitutore o tecnica identificabile;
   registrare URL, contesto e limiti effettivi della lettura.
2. Aggiungere un'attestazione per il nome esatto del CSV e la coltura; non
   promuovere un nome dalla sola somiglianza o da un risultato assente.
3. Esplicitare l'incertezza e le eventuali relazioni, mai una fusione.
4. Se cambia il CSV, effettuare una nuova revisione dell'intero perimetro prima
   di aggiornare l'hash e il numero atteso. Un hash diverso blocca la procedura,
   evitando di applicare vecchi esiti a un nuovo allegato.
5. Rigenerare e verificare gli output. Nessuna modifica al catalogo applicativo
   o agli identificatori delle osservazioni fa parte di questa procedura.

## Ampliamento separato — ricerca ancora incompleta

`catalogue-additions.json` conserva una selezione nominativa documentata, con
riscontri, sezioni delle fonti, data di consultazione e limiti. Non è ancora
il dataset agronomico completo e **non costituisce una consegna definitiva**.
Le due destinazioni della bietola sono separate; il nome della coltura è
`Peperone`, non `Peperonone`. I sinonimi, i tipi e le tecnologie commerciali
non sono aggiunti come osservazioni varietali indipendenti.

Per rigenerare il controllo senza CSV:

```sh
python scripts/agronomy/catalogue_expansion.py \
  attached_assets/Database_Colture_1794160273520.csv
```

Questo comando scrive i controlli e termina intenzionalmente con **codice 2**:
non è un errore da aggirare, ma il blocco della consegna per dati applicabili
mancanti. Non produce alcun CSV finale. Non cambiare lo stato a mano per
simulare il completamento.

Per ottenere anche la **sola bozza diagnostica**, con celle ancora vuote:

```sh
python scripts/agronomy/catalogue_expansion.py \
  attached_assets/Database_Colture_1794160273520.csv --draft
python -m unittest discover -s scripts/agronomy -p 'test_*.py' -v
```

Output in `generated-artifacts/crop-expansion/`, esclusi da Git e dal deploy:

- `BOZZA_INCOMPLETA_colture_ampliate.csv`: UTF-8 con BOM, separatore `;`,
  virgole decimali originali, 493 identità originali in ordine e nuove identità;
- `controlli_ampliamento.json`: hash degli input e della revisione base,
  conteggi effettivi, matrice completa record/parametro, lacune e integrazioni
  separate ai record preesistenti;
- `lacune_ampliamento.html`: rapporto leggibile, fonti consultate, limiti e
  parametri mancanti per ogni record interessato.

La procedura richiama i controlli originali (hash, numero di righe, identità,
numeri e quote N) senza modificarli. Non si fida di un CSV revisionato
precedentemente generato. La vecchia procedura e i suoi output restano separati.
Solo nella nuova bozza, le cinque rese fruttifere dei maschili/portinnesto sono
esplicitate come `NON APPLICABILE`, con motivo e fonte del ruolo nella matrice.
Le altre lacune di quei profili restano impedimenti: un maschile ha un reale
fabbisogno N e una densità d'impianto, non fabbisogno nullo né automaticamente
non applicabile.

### Passaggi ancora necessari prima della consegna

- Definire contesto produttivo e criteri di comparabilità per densità, resa e
  precocità: regione, stagione, pieno campo/serra, sistema d'impianto, portinnesto,
  raccolte singole o ripetute. Le descrizioni britanniche non stabiliscono
  automaticamente classi di precocità italiane.
- Raccogliere riferimenti N totale/per fase distinguendo dose fertilizzante,
  fabbisogno e asportazioni. Nessuna ripartizione universale viene introdotta.
- Definire sensore, bande, risoluzione/distanza, geometria, maschera suolo/chioma
  e fasi NDVI. Gli studi consultati non forniscono curve comparabili per tutti
  i nuovi record. Lo studio sulla cipolla usa SAVI: non è una fonte di valori NDVI.
- Risolvere la divergenza interna alla scheda FIAMMETTA KWS: sottotitolo
  «Precoce» ma tabella di raccolta «Da Media a Tardiva».
- Completare le osservazioni numeriche indipendenti e i contesti di confronto.
  `catalogue_averages.py` applica la media solo entro la stessa coltura,
  destinazione, precocità, ciclo e sistema produttivo. Con un solo riferimento
  si parla di valore trasferito, non media. I dati specifici hanno priorità.
  Ogni risultato espone riferimenti, unità, contesto, numerosità varietale,
  campioni della fonte separati dalla numerosità varietale, metodo, intervallo
  e precisione non superiore a quella della fonte meno precisa.
  Sono rifiutati duplicati/sinonimi conteggiati due volte, confronti incompatibili
  e uso ricorsivo di analogie o valori originali non validati. Per NDVI devono
  coincidere anche fase, BBCH, sensore, bande, geometria e maschera suolo/chioma;
  per N la grandezza (dose, fabbisogno o asportazione) resta distinta.
  Precocità e codici BBCH sono categorie, non numeri da mediare.
- Le prime osservazioni quantitative aggiuntive sono due rese specifiche di
  cipolla della prova NIAB 2010 da bulbilli ESC: Sturon e Red Baron.
  Sono medie della stessa cultivar su due siti, **non** medie di più varietà,
  né rese garantite nel contesto italiano. I lotti ABS non diventano ulteriori
  cultivar. La prova LSU dello zucchino riporta libbre per parcella e raccolta,
  senza interfila sufficiente alla conversione in t/ha: non viene trasferita.
  L'indice Yield 105 del catalogo Red Baron non viene interpretato come t/ha.
- Completare tutti i parametri applicabili nell'intera tabella, tracciando
  separatamente ogni integrazione ai record preesistenti. Il rapporto distingue
  valori originali presenti ma non validati da nuovi dati specifici documentati,
  descrizioni da fonte, veri casi non applicabili e dati applicabili mancanti.

Il codice 0 di `--draft` significa soltanto che la diagnostica è stata generata;
`consegna_completa` resta `false`. Nessuna parte di questa procedura apre
connessioni di rete/database o modifica app, osservazioni, allegato o Secrets.

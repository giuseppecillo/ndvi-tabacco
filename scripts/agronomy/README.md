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

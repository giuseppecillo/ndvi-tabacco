---
name: Parametri esclusi dal catalogo colture
description: Ambito dei dati agronomici richiesto dall'utente per questa applicazione.
---

Per questa applicazione non interessano i dati di potassio, fosforo, acqua e
note presenti nei cataloghi colture forniti.

**Why:** l'utente li ha esclusi esplicitamente dall'integrazione e ha chiesto
di correggere gli altri dati non realistici o agronomicamente conformi.

**How to apply:** non integrarli in interfaccia, calcoli o persistenza. Correggere
gli errori documentabili senza attribuire attendibilità scientifica a valori
N/NDVI semplicemente plausibili.

L'utente ha confermato entrambe le destinazioni della Bietola:
da costa/foglia e da zucchero, da mantenere distinte.

**Why:** sono vincoli espliciti della richiesta dell'utente.

**How to apply:** mantenere separate le destinazioni anche nelle analogie
agronomiche; non trasferire il profilo della radice da zucchero alla coltura
raccolta per coste/foglie. Non dichiarare definitivo un catalogo con parametri
applicabili mancanti e non usare NON APPLICABILE per nascondere quelle lacune.

Per i valori mancanti l'utente chiede la media di tutte le varietà della stessa
coltura. Per le fasi fenologiche chiede varietà simili della stessa classe o,
se non note, le fasi generali della coltura di riferimento. Per collegare fasi
e NDVI autorizza l'uso dei valori di una varietà «standard» conosciuta con dati
disponibili.

**Why:** l'utente ha ribadito esplicitamente il criterio di raggruppamento.

**How to apply:** conservare il dato specifico quando presente; per le fasi
usare un profilo coerente della coltura, senza mediare aritmeticamente nomi o
codici BBCH né mescolare destinazioni incompatibili; mantenere la curva NDVI
di riferimento associata alle sue fasi. Un gruppo senza valori
numerici non consente una media.

L'utente chiede di cancellare dalla tabella impollinatori e portinnesti e le
varietà per cui non si possano riportare resa e azoto totale.

**Why:** l'utente ha esplicitamente sostituito il mantenimento di tutti i profili
con questa selezione.

**How to apply:** applicare la selezione a una copia distinta, conservando
l'allegato originale e la revisione vincolata all'hash.

Nella tabella visibile l'utente non vuole spiegazioni su come è stata costruita,
né indicazioni che distinguano dati specifici, medie o dati da letteratura.

**Why:** l'utente ha ribadito esplicitamente questa regola di presentazione.

**How to apply:** mostrare colture, varietà e parametri senza colonne o etichette
di provenienza nella tabella principale; conservare la tracciabilità nel materiale
tecnico separato senza attribuire ai valori una validazione inesistente.

Il consenso alla sola selezione consultabile non autorizza automaticamente
nuovi calcoli, fallback al tabacco, cambi di identificatori o riscritture dei
rilievi. Le successive richieste esplicite di integrazione operativa vanno
rispettate, mantenendo separati i modelli nativi di grano duro, tabacco e pomodoro.

**Why:** la richiesta distingue esplicitamente i nuovi dati consultabili dai
profili applicativi esistenti; un nome simile non prova l'identità agronomica.

**How to apply:** mantenere indipendente la selezione consultabile anche durante
l'allineamento del database. Prima di qualsiasi futura unione verificare la
coppia coltura/varietà e la destinazione; non deduplicare solo per nome.

Nei menu delle varietà di tutte le colture mostrare soltanto il nome, senza
destinazione, mercato, consumo, impiego o altri suffissi informativi.

**Why:** richiesta esplicita del titolare per rendere più leggibile la lista.

**How to apply:** cambiare solo le etichette dei menu. Non eliminare metadati,
varietà omonime o identificativi composti: possono rappresentare profili diversi.
La richiesta riguarda le liste, non la cancellazione dei dettagli varietali.

Per tutte le nuove colture e varietà usare come formato quello di grano duro
e pomodoro.

**Why:** istruzione esplicita dell'utente per l'ampliamento del catalogo.

**How to apply:** mantenere coerenti selezione varietale, dettagli dei parametri,
piano azotato per fase e risultati NDVI. Non cambiare unità o significato dei
parametri per imitare il formato.

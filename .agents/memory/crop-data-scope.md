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

Per i valori mancanti l'utente chiede «i valori medi delle varietà appartenti
ad una coltura, considera la precocità e fai una media».

**Why:** l'utente ha ribadito esplicitamente il criterio di raggruppamento.

**How to apply:** usare valori disponibili della stessa coltura e precocità,
senza mescolare destinazioni incompatibili; conservare il dato specifico quando
presente. Un gruppo senza osservazioni numeriche non consente una media.

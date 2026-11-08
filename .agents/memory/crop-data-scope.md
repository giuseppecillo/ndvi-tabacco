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

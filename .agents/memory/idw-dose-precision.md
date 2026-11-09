---
name: Precisione delle dosi derivate IDW
description: Perché le dosi interpolate hanno precisione distinta dai rilievi puntuali.
---

La precisione dei derivati IDW non deve seguire il formato della coltura
puntuale, nemmeno nelle mappe miste. Usare quattro decimali conservativi per
evitare che un riepilogo diventi una prescrizione superiore al residuo.

**Why:** Due controlli singolarmente sicuri possono produrre una media
frazionaria che, mostrata a un decimale, supera il residuo interpolato.
Quattro decimali preservano più informazione rispetto al troncamento ai decimi.
La conversione Float32 richiede un controllo separato: anche quella può aumentare
la dose. Le vecchie osservazioni restano prove storiche, non nuove prescrizioni.

**How to apply:** Seguire la politica distinta dei derivati in
`docs/precisione-dosi-pomodoro-catalogo.md`; non estendere automaticamente ai
controlli registrati le scelte di precisione della griglia. Senza bilancio
completo la mappa non può attestare il rispetto del residuo.

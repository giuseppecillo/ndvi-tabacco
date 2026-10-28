---
name: Fedeltà degli import PowerPoint
description: Riempimenti SVG mancanti nonostante un import PowerPoint riuscito.
---

Un import PowerPoint riuscito non garantisce che tutti i riempimenti grafici siano presenti. Controllare in particolare fasce colorate, schede e cornici basate su immagini SVG.

**Why:** un file caricato aveva riempimenti presenti soltanto come SVG nell’archivio PowerPoint, omessi dai componenti importati. Mancavano intestazioni e sfondi delle schede. Per conservarne la resa nel browser è stato necessario recuperarli dall’originale e convertirli in PNG.

**How to apply:** confrontare la grafica importata con l’originale e ispezionare le relazioni multimediali del PowerPoint quando mancano elementi. Recuperare i riempimenti senza ridisegnare le slide; mantenere gli originali e rasterizzare soltanto quando serve alla compatibilità.

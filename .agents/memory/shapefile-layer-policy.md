---
name: Politica dei livelli Shapefile
description: Motivo della diversa gestione di livelli poligonali e puntuali negli ZIP GIS.
---

Importare tutti i livelli poligonali, ma utilizzare un solo livello puntuale alla
volta, richiedendo una scelta quando più livelli contengono punti. Conservare
nomi e identificativi originali, distinti dalla provenienza.

**Why:** Due livelli puntuali possono essere copie o versioni degli stessi
rilievi. Sommarli automaticamente altera il peso IDW anche quando coordinate e
ID sembrano validi. Lo stesso nome/ID in due livelli poligonali, invece, non prova
che un appezzamento sia un duplicato e non giustifica eliminarlo.

**How to apply:** Mantenere questa distinzione quando si ampliano gli import GIS;
un'eventuale fusione di rilievi richiede una scelta separata e una politica
esplicita sui duplicati, non una concatenazione implicita dei livelli.

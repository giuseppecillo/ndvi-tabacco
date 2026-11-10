import type { CropMeanRequest } from "./crop-means";

// Identity and earliness verified in the breeder's Italian catalogue.
// Numeric parameters are NOT attributed to this publication: they are means
// of the original 60 user-supplied Melanzana records, as explicitly requested.
const identitySource = "https://www.vilmorinmikado.it/sites/italie.sam/files/PDF/CATALOGUE%20HOBBY%20ITALIA%202020%20-%20OK%20BD.pdf";
export const researchedVarieties: readonly CropMeanRequest[] = [
  { crop: "Melanzana", name: "Melana F1", destination: "Mercato fresco", use: "Consumo diretto", earliness: "Precoce", identitySource },
  { crop: "Melanzana", name: "Tasca F1", destination: "Mercato fresco", use: "Consumo diretto", earliness: "Precoce-Media", identitySource },
  { crop: "Melanzana", name: "Egle F1", destination: "Mercato fresco", use: "Consumo diretto", earliness: "Precoce-Media", identitySource },
];

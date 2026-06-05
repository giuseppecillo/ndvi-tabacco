---
name: App.tsx exports and HMR behavior
description: Exported symbols from App.tsx and Vite Fast Refresh implications
---

## Exported symbols

- `export type TipoIntervento` — union type used by ElaborazioniMappe
- `export const TIPO_LABELS` — label map (non-component export)
- `export type Observation` — main data type used by ElaborazioniMappe
- `export default function App` — root component

## Vite Fast Refresh warning

`TIPO_LABELS` is a non-component, non-type export from a component file. Vite react-refresh plugin flags this as "incompatible" and falls back to full page reload instead of HMR component swap. **This is a DX-only issue**, not a runtime error.

**How to fix if needed**: move `TipoIntervento`, `TIPO_LABELS`, `Observation` to `src/types.ts` and import from there in both App.tsx and ElaborazioniMappe.tsx.

**Why not fixed immediately**: low priority; doesn't affect production or functionality.

# Policy portabile dei piani nello sviluppo Replit

La tabella `public.app_plan_state` nello sviluppo Replit è gestita esplicitamente,
non dal bootstrap applicativo o da Drizzle push. La sua policy locale deve essere
portabile anche nel confronto automatico degli schemi effettuato da Publish.

Lo sviluppo usa `postgres`, mentre il database gestito Replit di produzione usa
`neondb_owner`: una policy `TO postgres` non è trasferibile tra i due ambienti.
Non creare un ruolo `postgres` in produzione per aggirare questa differenza.

La policy locale `app_plan_state_preview_backend` deve avere questa definizione:

```sql
ALTER POLICY app_plan_state_preview_backend
ON public.app_plan_state
TO PUBLIC
USING (
  CURRENT_USER = (
    SELECT pg_catalog.pg_get_userbyid(c.relowner)
    FROM pg_catalog.pg_class AS c
    WHERE c.oid = 'public.app_plan_state'::regclass
  )
)
WITH CHECK (
  CURRENT_USER = (
    SELECT pg_catalog.pg_get_userbyid(c.relowner)
    FROM pg_catalog.pg_class AS c
    WHERE c.oid = 'public.app_plan_state'::regclass
  )
);
```

`PUBLIC` rende la policy applicabile senza dipendere da ruoli locali, ma non
concede privilegi sulla tabella. Le due condizioni limitano letture e scritture
al suo proprietario corrente. RLS e FORCE RLS rimangono attivi. Come per tutte
le policy RLS, superuser e ruoli BYPASSRLS restano soggetti alle regole PostgreSQL
che consentono di bypassare RLS; non attribuire tali capacità a utenti finali.

Questa è documentazione della correzione sul solo database di sviluppo.
Non eseguire questo SQL automaticamente all'avvio, nel build o nel post-merge.
Non applicarlo a Supabase: lì restano le policy distinte e i privilegi minimi
già configurati per runtime, readonly e migrator.

La successiva pubblicazione ricalcola il diff verso il database gestito Replit.
Il nuovo CREATE POLICY non deve più contenere `TO "postgres"`; deve conservare
entrambe le condizioni sul proprietario. Nessun dato viene trasferito dalla
semplice correzione della policy.

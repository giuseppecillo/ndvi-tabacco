# Preliminary publish: build succeeded, startup preflight failed

Observed 2026-11-08. No deployment was triggered during this investigation.

## Confirmed evidence

- Failed revision: `642a90e0-b09f-4ec6-b51b-3ce30874e2fa`.
- Build and static asset compilation completed successfully.
- At 10:26:00 UTC the API emitted:
  `Database connection preflight failed; startup aborted without schema changes`.
- The API exited with status 1 before opening its HTTP listener.
- Startup health checks failed. They are a consequence of the exit, not
  evidence that the configured application port or health route is wrong.
- A focused read-only investigation of the failed revision's runtime logs
  confirmed the same event, with no more specific error.
- At lookup time the prior successful October 31 release remained serving.

The original cause is NOT yet determined. The logs cannot distinguish:
missing runtime Secret, malformed URL, authentication, TLS, networking,
or the Production-only guard. Do not claim any one of these is proven.

The message about schema changes describes the application's startup
behavior only. It is NOT proof that the platform publish flow applied no SQL.
The publishing SQL diff remains unverified under the owner's accepted risk.

## Bounded workspace correction

The previous code discarded even safe error categories. It now preserves a
closed vocabulary and emits only `preflightCode` in the application error log:

| Example category | Meaning |
| --- | --- |
| RUNTIME_SECRET_MISSING | Dedicated runtime URL is missing/empty in the new process |
| RUNTIME_CONNECTION_INVALID | URL cannot be parsed/decoded |
| RUNTIME_DESTINATION_OR_ROLE_INVALID | URL does not match the approved project/role/endpoint |
| RUNTIME_AUTHENTICATION_FAILED | Driver returned authentication failure SQLSTATE |
| RUNTIME_AUTHORIZATION_FAILED | Driver returned authorization failure SQLSTATE |
| RUNTIME_TLS_CERTIFICATE_REJECTED | A recognized certificate validation error |
| RUNTIME_TLS_HOSTNAME_NOT_VERIFIED | Hostname validation failed |
| RUNTIME_NETWORK_FAILED | Recognized network failure |
| RUNTIME_SESSION_STARTUP_REJECTED | Protocol/startup rejection |
| RUNTIME_PREFLIGHT_PRODUCTION_REQUIRED | Required Production markers are not present |
| RUNTIME_PREFLIGHT_FAILED | Unclassified error, deliberately not printed |

Only exact approved codes/messages are preserved. Unknown messages, SQL,
URLs, error stacks, provider details and causes are discarded.
Synthetic regression tests confirm credential-bearing driver errors cannot
appear in the resulting error stack or logged category.

No preflight or TLS checks were disabled. Backend remains Replit.
No changes to roles, logging parameters, Secrets, DATABASE_URL or schema.
No connections to Supabase using real runtime credentials in development.
No replica provisioning, imports, backups or automatic publishing.

## Verification and next action

21 offline release tests passed; library/API TypeScript and API compilation
passed. This validates the diagnostic correction, not the real connection.

The owner may publish this diagnostic revision once. Inspect the NEW
revision's `preflightCode` if it fails; do not inspect only the old serving
revision, rotate credentials speculatively, or bypass the guard.
Successful startup must still show the Production preflight as passed.
Until then, the original connection issue remains unresolved.

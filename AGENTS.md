# AGENTS.md

## Infrastruktur / Deployment

- **Hosting:** DigitalOcean (Droplet)
- **Deployment-Plattform:** Coolify (self-hosted)
- Die Anwendung läuft als Docker-Compose-Stack auf dem Droplet, verwaltet durch Coolify.
- **NICHT Railway** — ältere Hinweise in `packages/db/drizzle.config.ts` auf Railway sind veraltet.

### Deployment-Flow

1. Merge auf `master` löst CI aus (Docker-Images werden gebaut und zu ghcr.io gepusht).
2. Coolify pullt das neue Image und startet die Services neu.
3. Der `migrate`-Service in `docker-compose.yml` führt DB-Migrationen automatisch aus (`bun run --filter @crikket/db db:migrate`).

### DB-Migrationen

- Migrations liegen in `packages/db/src/migrations/`.
- Lokale Ausführung: `bun run --filter @crikket/db db:migrate` (benötigt `DATABASE_URL`).
- In der Produktionsumgebung laufen Migrationen automatisch über den `migrate`-Docker-Compose-Service.

## Zugangsdaten / Secrets

Secrets werden als Cursor Cloud-Agent-Umgebungsvariablen injiziert:
- `COOLIFY_API_TOKEN` — Coolify-API-Token
- `crikket` — Crikket-Org-API-Token
- `DO_SSH_PRIVATE_KEY` — SSH-Schlüssel für den DigitalOcean-Droplet

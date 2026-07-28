# AGENTS.md

## Infrastruktur / Deployment

- **Hosting:** DigitalOcean Droplet `***REMOVED***` (Hostname: `***REMOVED***`)
- **Deployment-Plattform:** Coolify v4 (self-hosted, läuft auf demselben Droplet)
- **Produktions-URL:** https://report.ewu.tools (Traefik → Caddy → web/server)
- **NICHT Railway** — ältere Hinweise in `packages/db/drizzle.config.ts` und `apps/server/Dockerfile` auf Railway sind veraltet.

### Zugänge (als Cloud-Agent-Umgebungsvariablen injiziert)

- `DO_SSH_PRIVATE_KEY` — SSH-Key für `root@***REMOVED***`
  - Hinweis: Der Key liegt als DER vor; bei Bedarf nach PEM konvertieren: Body base64-dekodieren, dann `openssl rsa -inform DER -in key.der -out key.pem`
- `COOLIFY_API_TOKEN` — Coolify-API-Token (Sanctum-Format `1|...`; enthält ggf. zwei Tokens per `\n` getrennt — das erste verwenden)
  - Coolify-API ist **nur lokal auf dem Droplet** erreichbar: `http://localhost:8000/api/v1` (per SSH)
- `crikket` — Crikket-Org-API-Token (`crk_api_...`) für die Produktiv-Instanz

### Coolify-Struktur

- Service „crikket“: UUID `***REMOVED***` (Projekt `ewu-tools`, Environment `production`)
- Compose-Datei: `/data/coolify/services/***REMOVED***/docker-compose.yml` (+ `.env` dort)
- Services im Stack: `postgres`, `migrate`, `server`, `web`, `caddy`
- **Images werden lokal auf dem Droplet gebaut** (`pull_policy: never`), Tag-Schema: `ewu-crikket-{server,web}:master-<shortsha>`

### Deployment-Flow (manuell per SSH)

```bash
# 1. Repo-Stand übertragen und Images bauen
git archive --format=tar.gz master | ssh root@***REMOVED*** \
  'rm -rf /root/crikket-build && mkdir -p /root/crikket-build && tar -xzf - -C /root/crikket-build'
ssh root@***REMOVED*** 'cd /root/crikket-build && \
  docker build -f apps/server/Dockerfile -t ewu-crikket-server:master-<sha> . && \
  docker build -f apps/web/Dockerfile -t ewu-crikket-web:master-<sha> .'

# 2. Tags in der Compose-Datei anpassen
ssh root@***REMOVED*** 'sed -i "s/master-<alt>/master-<sha>/g" \
  /data/coolify/services/***REMOVED***/docker-compose.yml'

# 3. Stack neu starten (migrate-Service führt DB-Migrationen automatisch aus)
ssh root@***REMOVED*** 'cd /data/coolify/services/***REMOVED*** && \
  docker compose -p ***REMOVED*** up -d'
```

### DB-Migrationen

- Migrationen liegen in `packages/db/src/migrations/`.
- Lokal: `bun run --filter @crikket/db db:migrate` (benötigt `DATABASE_URL`).
- Produktion: laufen automatisch über den `migrate`-Service beim `up -d` (beendet sich mit Exit 0 bei Erfolg).
- Verifizieren: `docker logs migrate-***REMOVED***` und `docker exec postgres-***REMOVED*** psql -U postgres -d crikket`.

### CI

- Push auf `master` baut GHCR-Images (`ghcr.io/ewu-gmbh/crikket-{server,web}:latest`, `sha-<sha>`) — das Package ist **privat** und wird vom Deployment aktuell nicht verwendet (lokaler Build).

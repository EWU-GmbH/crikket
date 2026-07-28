# AGENTS.md

## Infrastruktur / Deployment

- **Hosting:** DigitalOcean Droplet (Host/IP: privates Ops-Runbook)
- **Deployment-Plattform:** Coolify v4 (self-hosted, läuft auf demselben Droplet)
- **Produktions-URL:** https://report.ewu.tools (Traefik → Caddy → web/server)
- **NICHT Railway** — ältere Hinweise in `packages/db/drizzle.config.ts` und `apps/server/Dockerfile` auf Railway sind veraltet.

> **Keine Produktiv-Details im Repo:** Konkrete Werte (Host/IP, SSH-Zugang, Coolify-Service-UUID, Server-Pfade, Volume-Namen, Cron-/Log-Details, Storage-Bucket, Zugänge) gehören absichtlich nicht in dieses öffentliche Repo. Sie sind im privaten Ops-Runbook `AGENTS-infra.private.md` (außerhalb dieses Repos) dokumentiert. Deploys erfolgen nur manuell nach diesem Runbook.

### Zugänge (als Agent-Umgebungsvariablen injiziert)

- `DO_SSH_PRIVATE_KEY` — SSH-Key für den Droplet
- `COOLIFY_API_TOKEN` — Coolify-API-Token (API ist nur lokal auf dem Droplet per SSH erreichbar)
- `crikket` — Crikket-Org-API-Token für die Produktiv-Instanz

### Coolify-Struktur

- Service „crikket" in Coolify (UUID/Projekt/Environment: Runbook); Compose-Datei und Service-`.env` liegen im Coolify-Service-Verzeichnis auf dem Droplet.
- Services im Stack: `postgres`, `migrate`, `server`, `web`, `caddy`
- **Images werden lokal auf dem Droplet gebaut** (`pull_policy: never`), Tag-Schema: `ewu-crikket-{server,web}:master-<shortsha>`
- **`/crikket-capture.js` wird NICHT aus dem Image ausgeliefert:** Caddy serviert die Datei statisch aus einem Host-Verzeichnis (bind mount). Sie muss nach jedem Web-Image-Build manuell aktualisiert werden — Pflichtschritt `scripts/update-capture-static.sh` (Zielverzeichnis per Pflicht-Env-Var `CRIKKET_STATIC_DIR`).
- **kan-Integration:** Bug-Reports und Widget-Feature-Requests werden an kan gesynct (`https://kan.ewu.tools`, separater Dienst, nicht auf diesem Droplet). Env in der Service-`.env`: `KAN_BASE_URL`, `KAN_API_KEY`, `KAN_BUGS_LIST_PUBLIC_ID`, `KAN_FEATURE_REQUESTS_LIST_PUBLIC_ID` (unset = No-op). Per-Org-Routing via `KAN_ORG_LISTS_JSON`: JSON-Mapping `{"<organizationId>":{"bugs":"<listPublicId>","featureRequests":"<listPublicId>"}}` — Org-spezifische Listen gewinnen, sonst Fallback auf die globalen Listen. Konkrete Org-/Listen-Zuordnung: Runbook.

### Deployment-Flow (manuell per SSH)

Platzhalter wie `<droplet-host>`, `<service-uuid>`, `<static-dir>` und `<compose-datei>` mit den Werten aus dem privaten Runbook füllen.

```bash
# 1. Repo-Stand übertragen und Images bauen
git archive --format=tar.gz master | ssh root@<droplet-host> \
  'rm -rf /root/crikket-build && mkdir -p /root/crikket-build && tar -xzf - -C /root/crikket-build'
ssh root@<droplet-host> 'cd /root/crikket-build && \
  docker build -f apps/server/Dockerfile -t ewu-crikket-server:master-<sha> . && \
  docker build -f apps/web/Dockerfile -t ewu-crikket-web:master-<sha> .'

# 2. Statisches Widget-Script aktualisieren (sonst bleibt /crikket-capture.js veraltet!)
#    CRIKKET_STATIC_DIR = statisches Host-Verzeichnis des Services (Runbook)
ssh root@<droplet-host> 'CRIKKET_STATIC_DIR=<static-dir> \
  sh /root/crikket-build/scripts/update-capture-static.sh master-<sha>'

# 3. Tags in der Compose-Datei anpassen
ssh root@<droplet-host> 'sed -i "s/master-<alt>/master-<sha>/g" <compose-datei>'

# 4. Stack neu starten (migrate-Service führt DB-Migrationen automatisch aus)
ssh root@<droplet-host> 'cd <service-verzeichnis> && docker compose -p <service-uuid> up -d'

# 5. (Optional, nach Verifizierung) Alte Image-Tags aufräumen:
#    behält pro Repo die deployed Tags + den neuesten Alt-Tag (Rollback),
#    löscht den Rest + dangling Images. Ältere Stände sind per
#    `git archive <sha>` jederzeit neu baubar.
#    Läuft zusätzlich automatisch per Cron auf dem Droplet (Details: Runbook).
ssh root@<droplet-host> 'CRIKKET_SERVICE_UUID=<service-uuid> bash /root/scripts/prune-old-images.sh'
```

### DB-Migrationen

- Migrationen liegen in `packages/db/src/migrations/`.
- Lokal: `bun run --filter @crikket/db db:migrate` (benötigt `DATABASE_URL`).
- Produktion: laufen automatisch über den `migrate`-Service beim `up -d` (beendet sich mit Exit 0 bei Erfolg).
- Verifizieren: `docker logs migrate-<service-uuid>` und `docker exec postgres-<service-uuid> psql -U postgres -d crikket`.

### CI

- Push auf `master` baut GHCR-Images (`ghcr.io/ewu-gmbh/crikket-{server,web}:latest`, `sha-<sha>`) — das Package ist **privat** und wird vom Deployment aktuell nicht verwendet (lokaler Build).

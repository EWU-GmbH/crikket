# AGENTS.md

## Infrastruktur / Deployment

- **Hosting:** DigitalOcean Droplet `104.248.136.0` (Hostname: `EWU-mirotalk`)
- **Deployment-Plattform:** Coolify v4 (self-hosted, läuft auf demselben Droplet)
- **Produktions-URL:** https://report.ewu.tools (Traefik → Caddy → web/server)
- **NICHT Railway** — ältere Hinweise in `packages/db/drizzle.config.ts` und `apps/server/Dockerfile` auf Railway sind veraltet.

### Zugänge (als Cloud-Agent-Umgebungsvariablen injiziert)

- `DO_SSH_PRIVATE_KEY` — SSH-Key für `root@104.248.136.0`
  - Hinweis: Der Key liegt als DER vor; bei Bedarf nach PEM konvertieren: Body base64-dekodieren, dann `openssl rsa -inform DER -in key.der -out key.pem`
- `COOLIFY_API_TOKEN` — Coolify-API-Token (Sanctum-Format `1|...`; enthält ggf. zwei Tokens per `\n` getrennt — das erste verwenden)
  - Coolify-API ist **nur lokal auf dem Droplet** erreichbar: `http://localhost:8000/api/v1` (per SSH)
- `crikket` — Crikket-Org-API-Token (`crk_api_...`) für die Produktiv-Instanz

### Coolify-Struktur

- Service „crikket“: UUID `vbgof6zwtdrl3fuwf3pmi35m` (Projekt `ewu-tools`, Environment `production`)
- Compose-Datei: `/data/coolify/services/vbgof6zwtdrl3fuwf3pmi35m/docker-compose.yml` (+ `.env` dort)
- Services im Stack: `postgres`, `migrate`, `server`, `web`, `caddy`
- **Images werden lokal auf dem Droplet gebaut** (`pull_policy: never`), Tag-Schema: `ewu-crikket-{server,web}:master-<shortsha>`
- **`/crikket-capture.js` wird NICHT aus dem Image ausgeliefert:** Caddy serviert die Datei statisch aus dem Host-Verzeichnis `/data/coolify/services/vbgof6zwtdrl3fuwf3pmi35m/static/` (bind mount). Sie muss nach jedem Web-Image-Build manuell aktualisiert werden — siehe Deployment-Flow Schritt 2.

### Deployment-Flow (manuell per SSH)

```bash
# 1. Repo-Stand übertragen und Images bauen
git archive --format=tar.gz master | ssh root@104.248.136.0 \
  'rm -rf /root/crikket-build && mkdir -p /root/crikket-build && tar -xzf - -C /root/crikket-build'
ssh root@104.248.136.0 'cd /root/crikket-build && \
  docker build -f apps/server/Dockerfile -t ewu-crikket-server:master-<sha> . && \
  docker build -f apps/web/Dockerfile -t ewu-crikket-web:master-<sha> .'

# 2. Statisches Widget-Script aktualisieren (sonst bleibt /crikket-capture.js veraltet!)
ssh root@104.248.136.0 'sh /root/crikket-build/scripts/update-capture-static.sh master-<sha>'

# 3. Tags in der Compose-Datei anpassen
ssh root@104.248.136.0 'sed -i "s/master-<alt>/master-<sha>/g" \
  /data/coolify/services/vbgof6zwtdrl3fuwf3pmi35m/docker-compose.yml'

# 4. Stack neu starten (migrate-Service führt DB-Migrationen automatisch aus)
ssh root@104.248.136.0 'cd /data/coolify/services/vbgof6zwtdrl3fuwf3pmi35m && \
  docker compose -p vbgof6zwtdrl3fuwf3pmi35m up -d'
```

### DB-Migrationen

- Migrationen liegen in `packages/db/src/migrations/`.
- Lokal: `bun run --filter @crikket/db db:migrate` (benötigt `DATABASE_URL`).
- Produktion: laufen automatisch über den `migrate`-Service beim `up -d` (beendet sich mit Exit 0 bei Erfolg).
- Verifizieren: `docker logs migrate-vbgof6zwtdrl3fuwf3pmi35m` und `docker exec postgres-vbgof6zwtdrl3fuwf3pmi35m psql -U postgres -d crikket`.

### CI

- Push auf `master` baut GHCR-Images (`ghcr.io/ewu-gmbh/crikket-{server,web}:latest`, `sha-<sha>`) — das Package ist **privat** und wird vom Deployment aktuell nicht verwendet (lokaler Build).

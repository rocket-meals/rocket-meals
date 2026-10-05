# Agent Board im Rocket-Meals-Backend (experimentell)

Erreichbar unter `https://<MYHOST>/<ROCKET_MEALS_PATH>/ai/` (Traefik, siehe `apps/backend/docker-compose.yaml`, Service `rocket-meals-agent-board`).

- **Anmeldung Web:** `ADMIN_EMAIL` / `ADMIN_PASSWORD` aus der `.env` (wie der Directus-Admin).
- **Daten:** `rocket-meals/data-ai-agent/` (getrennt von `data/`, wird nicht gesichert).
- **Starten:** `docker compose up -d --build rocket-meals-agent-board` im Repo-Root.

## Schlüssel für Claude (MCP)

```bash
docker compose exec rocket-meals-agent-board node --import tsx src/cli/key.ts create --name claude --role agent --providers claude
```

MCP-Endpunkt: `https://<MYHOST>/<ROCKET_MEALS_PATH>/ai/mcp` mit `Authorization: Bearer <agent-Schlüssel>`.
Watcher/CLI von außen: `AB_URL=https://<MYHOST>/<ROCKET_MEALS_PATH>/ai AB_AGENT_KEY=<schlüssel> npm run watch`.

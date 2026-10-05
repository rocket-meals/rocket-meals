// Einstiegspunkt: Board-Server starten (npm start).
import { networkInterfaces } from "node:os";
import { configFromEnv, isLoopback, startRelayServer } from "./app.ts";
import { Auth } from "./keys.ts";

let cfg: ReturnType<typeof configFromEnv>;
try {
  cfg = configFromEnv();
} catch (e) {
  console.error(`Abbruch: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

// vor dem Lauschen prüfen: ohne Schlüssel nur localhost
const probe = new Auth({ dataDir: cfg.dataDir, agentName: cfg.agent, ...(cfg.apiKey ? { apiKey: cfg.apiKey } : {}), ...(cfg.keys ? { envKeys: cfg.keys } : {}) });
if (!isLoopback(cfg.host) && !probe.enabled) {
  console.error(
    process.env.AB_IN_CONTAINER
      ? "Abbruch: Im Container lauscht der Server auf 0.0.0.0 – ein Schlüssel ist Pflicht (AB_API_KEY oder AB_KEYS in .env, oder data/keys.json per `npm run key -- create …`)."
      : `Abbruch: Bindung an ${cfg.host} (z. B. fürs Handy im WLAN) nur mit Schlüssel (AB_API_KEY, AB_KEYS oder data/keys.json).`,
  );
  process.exit(1);
}

const relay = await startRelayServer(cfg);
// Diese Zeile wird von scripts/e2e.ts ausgewertet – Format beibehalten.
console.log(`agent-board lauscht auf ${relay.url} (Daten: ${cfg.dataDir}, Auth: ${relay.auth.enabled ? "an" : "aus"})`);
if (!isLoopback(cfg.host) && !process.env.AB_IN_CONTAINER) {
  // LAN-Adressen fürs Handy anzeigen
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === "IPv4" && !a.internal) console.log(`  Im WLAN: http://${a.address}:${cfg.port}/`);
  }
}
console.log(`  Nutzer: @${cfg.user}, Agent: ${cfg.agent}`);
console.log(`  MCP über HTTP: ${relay.url.replace("//0.0.0.0:", "//127.0.0.1:")}/mcp${relay.auth.enabled ? " (Authorization: Bearer <agent-Schlüssel>)" : ""}`);

const shutdown = () => {
  void relay.close().then(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

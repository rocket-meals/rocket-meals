// Schlüssel verwalten (data/keys.json, nur SHA-256-Hashes):
//   npm run key -- create --name claude-mac --role agent --providers claude [--author claude]
//   npm run key -- list
//   npm run key -- revoke <name>
import { parseArgs } from "node:util";
import { createKey, keysFile, readKeyFile, revokeKey } from "../server/keys.ts";
import { KEY_ROLES, type KeyRole } from "../shared/types.ts";

const HELP = `Nutzung: npm run key -- <befehl>
  create --name <name> --role admin|agent|program [--providers claude,whisper] [--author <autorpräfix>]
         Legt einen Schlüssel an und gibt ihn EINMAL aus (gespeichert wird nur der SHA-256-Hash).
         agent:   MCP/Watcher/Worker – lesen, claimen, kommentieren, Status, Dateien; --providers beschränkt auf diese Provider.
                  Schreibt als "claude" bzw. "claude:<x>" (ohne claude in --providers: als <name>).
         program: eigene Issues anlegen/lesen/kommentieren/schließen, Dateien hochladen; schreibt als "programm:<name>".
         admin:   alles (Web-Oberfläche, CLI des Menschen); Autor frei.
  list           Schlüssel ohne Geheimnis anzeigen
  revoke <name>  Schlüssel widerrufen (wirkt sofort, ohne Neustart)
Umgebung: AB_DATA_DIR (Standard ./data; im Container /data)`;

function main(argv: string[]): number {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      name: { type: "string" },
      role: { type: "string" },
      providers: { type: "string" },
      author: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const file = keysFile(process.env.AB_DATA_DIR || "./data");
  const [cmd, arg] = positionals;
  switch (cmd) {
    case "create": {
      if (!values.name || !values.role) throw new Error("create braucht --name und --role");
      if (!(KEY_ROLES as readonly string[]).includes(values.role)) throw new Error(`Ungültige Rolle: ${values.role} (${KEY_ROLES.join("|")})`);
      const input: Parameters<typeof createKey>[1] = { name: values.name, role: values.role as KeyRole };
      if (values.providers) input.providers = values.providers.split(",");
      if (values.author) {
        if (values.role === "program" && /^claude\b/i.test(values.author)) throw new Error("Ein program-Schlüssel darf nicht als claude schreiben");
        input.author = values.author;
      }
      const { key, record } = createKey(file, input);
      const scope = record.providers ? `, Provider: ${record.providers.join(",")}` : "";
      console.error(`Schlüssel „${record.name}“ (Rolle ${record.role}${scope}) angelegt in ${file}.`);
      console.error("Er wird nur JETZT angezeigt – in eine Env-Variable bzw. einen Secret-Speicher übernehmen, nie in Prompts/Chats/Repos:");
      console.log(key);
      return 0;
    }
    case "list": {
      const keys = readKeyFile(file);
      if (!keys.length) console.log(`Keine Schlüssel in ${file}.`);
      for (const k of keys) {
        const extra = [k.providers ? `providers=${k.providers.join(",")}` : "", k.author ? `author=${k.author}` : ""].filter(Boolean).join(" ");
        console.log(`${k.name}\t${k.role}\t${k.createdAt}\t${k.hash.slice(0, 8)}…${extra ? `\t${extra}` : ""}`);
      }
      return 0;
    }
    case "revoke": {
      if (!arg) throw new Error("revoke <name>");
      if (!revokeKey(file, arg)) {
        console.error(`Kein Schlüssel „${arg}“ in ${file}.`);
        return 1;
      }
      console.log(`Schlüssel „${arg}“ widerrufen.`);
      return 0;
    }
    default:
      console.error(HELP);
      return values.help ? 0 : 1;
  }
}

try {
  process.exit(main(process.argv.slice(2)));
} catch (e) {
  console.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

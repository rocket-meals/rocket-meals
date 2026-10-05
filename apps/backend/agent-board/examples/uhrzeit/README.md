# uhrzeit – Mini-Testprogramm für das Agent Board

Legt ein Issue „Welcher Tag ist heute und wie spät ist es?“ an (Autor `programm:uhrzeit`, Label `test`), wartet per `waitForReply` auf die Antwort, gibt sie aus, vergleicht die erste Uhrzeit `HH:MM` im Text mit der lokalen Uhr (Abweichung in Minuten, Toleranz ±5 min) und prüft grob, ob das heutige Datum genannt wird. Danach schließt es das Issue mit einem Dankeskommentar.

```bash
cd examples/uhrzeit
npm install                       # bindet den Client per "file:../../client" ein
AB_URL=http://127.0.0.1:4317 AB_API_KEY=<key> npm start
AB_URL=… AB_API_KEY=… npm start -- --timeout 120   # eigenes Zeitlimit in Sekunden (Standard 600)
```

- `AB_URL` und `AB_API_KEY` sind Pflicht. Empfohlen: eigener program-Schlüssel `npm run key -- create --name uhrzeit --role program` (im Hauptordner) – das Programm schreibt als `programm:uhrzeit`, passend zum Schlüsselnamen.
- Strg+C bricht das Warten ab und schließt das Issue mit Hinweis (Exit 130); ohne Antwort im Zeitlimit Exit 2.
- Geantwortet wird von Claude über MCP (z. B. `inbox` → `issue_read` → `comment_add`).
- Automatischer Test: `tests/uhrzeit.test.ts` im Hauptprojekt (Server + simulierter Agent über MCP/HTTP).

// Kleine Webseite um das Uhrzeit-Testprogramm: Knopf drücken → Frage landet als Issue im Agent Board,
// Seite zeigt live den Stand und am Ende die Antwort samt Abgleich mit der echten Uhr.
// Start: AB_URL=http://127.0.0.1:4317 AB_API_KEY=… npm run web   (Port UHRZEIT_PORT, Standard 4320)
import { createServer, type ServerResponse } from "node:http";
import { AgentBoardClient } from "@nils/agent-board-client";
import { checkAnswer, type TimeCheck } from "./zeit.ts";

const baseUrl = process.env.AB_URL;
const apiKey = process.env.AB_API_KEY;
if (!baseUrl || !apiKey) {
  console.error("Bitte AB_URL und AB_API_KEY setzen.");
  process.exit(1);
}
const port = Number(process.env.UHRZEIT_PORT ?? 4320);
const host = process.env.UHRZEIT_HOST ?? "0.0.0.0";
/** Adresse des Boards für Links im Browser (z. B. LAN-IP statt 127.0.0.1). */
const boardPublicUrl = process.env.AB_PUBLIC_URL ?? baseUrl;

const board = new AgentBoardClient({ baseUrl, apiKey, user: "programm:uhrzeit" });

interface Ask {
  id: number;
  state: "waiting" | "answered" | "timeout" | "error";
  askedAt: string;
  answer?: string;
  author?: string;
  check?: TimeCheck;
  error?: string;
}
const asks: Ask[] = [];

async function ask(): Promise<Ask> {
  const issue = await board.createIssue({
    title: "Welcher Tag ist heute und wie spät ist es?",
    body: "Bitte antworte mit dem heutigen Datum (Wochentag, Tag, Monat, Jahr) und der aktuellen Uhrzeit im Format HH:MM (Ortszeit).",
    labels: ["test"],
  });
  const a: Ask = { id: issue.id, state: "waiting", askedAt: new Date().toISOString() };
  asks.unshift(a);
  // im Hintergrund auf die Antwort warten
  board
    .waitForReply(issue.id, { afterSeq: issue.lastSeq, timeoutMs: 15 * 60_000 })
    .then(async (reply) => {
      a.answer = reply.text;
      a.author = reply.comments[0]?.author;
      a.check = checkAnswer(reply.text);
      a.state = "answered";
      await board.close(issue.id, "Danke für die Antwort! (Webseite „uhrzeit“)").catch(() => undefined);
    })
    .catch((e: unknown) => {
      a.state = (e as { code?: string }).code === "timeout" ? "timeout" : "error";
      a.error = e instanceof Error ? e.message : String(e);
    });
  return a;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://x");
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(PAGE.replace("__BOARD__", boardPublicUrl));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/ask") return json(res, 201, await ask());
    if (req.method === "GET" && url.pathname === "/api/asks") return json(res, 200, { now: new Date().toISOString(), asks: asks.slice(0, 10) });
    json(res, 404, { error: "nicht gefunden" });
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}).listen(port, host, () => console.log(`Uhrzeit-Webseite: http://${host}:${port}  (Board: ${baseUrl})`));

const PAGE = /* html */ `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Uhrzeit-Test</title>
<style>
:root { --bg:#f4f5f7; --card:#fff; --fg:#17202b; --muted:#5d6878; --line:#dde2e8; --accent:#2f6fde; --ok:#1d7a46; --warn:#a15c00; --bad:#b3261e; color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root { --bg:#111418; --card:#1a1f26; --fg:#e7ebf0; --muted:#98a2b0; --line:#2b333d; --accent:#7aa7ff; --ok:#6fd39b; --warn:#f0b860; --bad:#ff8a80; } }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font: 16px/1.45 system-ui, -apple-system, sans-serif; }
main { max-width:560px; margin:0 auto; padding: max(16px, env(safe-area-inset-top)) 16px 32px; display:grid; gap:16px; }
h1 { font-size:1.4rem; margin:8px 0 0; }
.clock { font-variant-numeric: tabular-nums; font-size:2.6rem; font-weight:700; letter-spacing:.02em; }
.muted { color:var(--muted); }
.card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; display:grid; gap:8px; }
button { font:inherit; font-weight:600; border:0; border-radius:12px; padding:14px 18px; background:var(--accent); color:#fff; min-height:48px; }
button:disabled { opacity:.6; }
.state { font-weight:600; }
.waiting { color:var(--warn); } .answered { color:var(--ok); } .timeout, .error { color:var(--bad); }
.answer { white-space:pre-wrap; overflow-wrap:anywhere; }
a { color:var(--accent); }
.dot { display:inline-block; width:.6em; height:.6em; border-radius:50%; background:currentColor; margin-right:.4em; animation:p 1.2s infinite; }
@keyframes p { 50% { opacity:.25 } } @media (prefers-reduced-motion: reduce) { .dot { animation:none } }
</style></head>
<body><main>
<h1>Uhrzeit-Test fürs Agent Board</h1>
<div class="card"><span class="muted">Diese Uhr (lokal)</span><div class="clock" id="clock">--:--:--</div><span class="muted" id="date"></span></div>
<button id="ask">Claude fragen: Welcher Tag ist heute und wie spät?</button>
<p class="muted">Die Frage wird als Issue im <a href="__BOARD__" target="_blank" rel="noopener">Agent Board</a> angelegt. Claude sieht es, antwortet dort – und die Antwort erscheint hier automatisch.</p>
<div id="list"></div>
</main>
<script>
const $ = (s) => document.querySelector(s);
const board = "__BOARD__";
function tick() { const d = new Date(); $("#clock").textContent = d.toLocaleTimeString("de-DE"); $("#date").textContent = d.toLocaleDateString("de-DE", { weekday:"long", day:"numeric", month:"long", year:"numeric" }); }
setInterval(tick, 1000); tick();
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const LABEL = { waiting: "Wartet auf Claude", answered: "Beantwortet", timeout: "Keine Antwort (Zeit abgelaufen)", error: "Fehler" };
function render(asks) {
  $("#list").innerHTML = asks.map((a) => {
    const c = a.check;
    let cmp = "";
    if (c) {
      const t = c.deviationMin === undefined ? "Keine Uhrzeit HH:MM gefunden" :
        "Antwort " + c.found + " · lokal " + c.local + " · Abweichung " + (c.deviationMin > 0 ? "+" : "") + c.deviationMin + " min " + (Math.abs(c.deviationMin) <= 5 ? "✅" : "⚠️");
      cmp = '<div>' + esc(t) + '</div><div>Datum: ' + (c.dateOk ? "passt ✅" : "nicht erkannt ⚠️") + '</div>';
    }
    return '<div class="card"><div class="state ' + a.state + '">' + (a.state === "waiting" ? '<span class="dot"></span>' : "") + esc(LABEL[a.state]) +
      ' · <a href="' + board + '/#/issue/' + a.id + '" target="_blank" rel="noopener">Issue #' + a.id + '</a></div>' +
      '<div class="muted">gefragt um ' + new Date(a.askedAt).toLocaleTimeString("de-DE") + '</div>' +
      (a.answer ? '<div class="answer">„' + esc(a.answer) + '“' + (a.author ? ' <span class="muted">– ' + esc(a.author) + '</span>' : "") + '</div>' : "") +
      cmp + (a.error && a.state !== "answered" ? '<div class="muted">' + esc(a.error) + '</div>' : "") + '</div>';
  }).join("");
}
async function load() { try { const r = await fetch("/api/asks"); render((await r.json()).asks); } catch {} }
$("#ask").onclick = async () => { $("#ask").disabled = true; try { await fetch("/api/ask", { method: "POST" }); await load(); } finally { $("#ask").disabled = false; } };
setInterval(load, 2000); load();
</script></body></html>`;

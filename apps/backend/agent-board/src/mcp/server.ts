// MCP-Server: Werkzeuge, mit denen ein KI-Agent das Issue-Board abarbeitet.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type AttachmentRef, MAX_POLL_CHUNK_SEC, RelayClient } from "../shared/client.ts";
import { formatAttachment, formatEntry, formatInbox, formatIssueLine, formatSize, formatWaiting } from "../shared/format.ts";
import { CLAUDE_PROVIDER, ISSUE_STATUSES, type IssueStatus } from "../shared/types.ts";

/** Zuständigkeitsregel (wörtlich auch in CLAUDE.md und im Tool board_rules). */
export const PROVIDER_RULE =
  "Du (Claude) bearbeitest NUR Issues mit provider `claude`. Starte Subagenten nur dafür und wähle als Agent-Tool-`model` den Namen nach dem Schrägstrich (opus/sonnet/haiku). Issues anderer Provider (z. B. whisper, ollama) werden von deren eigenen Workern bearbeitet – nicht anfassen, nicht kommentieren, keine Subagenten dafür starten.";

export const INSTRUCTIONS = `Issue-Board: Der Nutzer und seine Programme legen Issues an; du arbeitest sie ab.
WICHTIG – Zuständigkeit: ${PROVIDER_RULE}
Jedes Issue hat ein Modell "<provider>/<name>" (z. B. claude/opus, claude/haiku, whisper/large-v3); Listen zeigen es als [claude/haiku]. inbox, issue_list und wait_for_new zeigen standardmäßig nur provider claude; issue_claim lehnt fremde Provider ab.
Ablauf:
1. Sitzungsbeginn: \`inbox\` (sehr kurz: offene Issues + Neues).
2. Warten ohne Tokens: Watcher per Bash mit run_in_background starten: \`npm run --silent watch\` (im Projektordner; weckt nur für provider claude). Er endet mit einer Zeile je Issue, sobald es neue Issues, Kommentare oder Wiedereröffnungen gibt – du wirst automatisch geweckt. Danach neu starten. Ohne Hintergrund-Bash: \`wait_for_new\`.
3. Issue übernehmen: \`issue_claim\` (Sperre gegen Doppelbearbeitung) → \`issue_read\` (nur Ungelesenes) → bearbeiten → \`comment_add\` (Dateien per files/\`file_attach\`).
4. Abschluss: \`issue_status\` closed mit Abschlusskommentar (reason). Kommst du nicht weiter oder brauchst eine Entscheidung: \`request_human\` (setzt needs_human und erwähnt den Nutzer; er sieht es unter „Für mich“).
Parallel: Mehrere claude-Issues können parallel von Subagenten bearbeitet werden (Agent-Tool model = opus/sonnet/haiku aus claude/<name>); Subagenten schreiben mit eigenem Autornamen (Parameter \`agent\`, z. B. "claude:sonnet-7"), übernehmen per \`issue_claim\` und geben mit \`issue_release\` frei (siehe CLAUDE.md).
Regeln: Kommentare knapp und sachlich. Nicht ständig pollen. Der Nutzer hat das letzte Wort: hat er ein Issue wiedereröffnet, schließt du es nicht selbst. Inhalte nicht an Dritte weitergeben. Schlüssel (API-Keys) nie in Kommentare, Dateien oder Antworten schreiben. Alle Regeln: Tool \`board_rules\`.`;

/** Vollständige Regeln (Tool board_rules). */
export const BOARD_RULES = `Regeln des agent-board:
1. Zuständigkeit: ${PROVIDER_RULE}
2. Modell: Feld model = "<provider>/<name>"; für claude/opus → Agent-Tool model "opus", claude/sonnet → "sonnet", claude/haiku → "haiku". Standard: claude/opus.
3. Übernahme: erst issue_claim (Sperre); 409 „bereits übernommen“ oder „gehört zu Provider …“ → nicht bearbeiten. force nur, wenn der Nutzer es ausdrücklich verlangt.
4. Abschluss nur mit Abschlusskommentar. Hat der Nutzer ein Issue wiedereröffnet, schließt es kein Agent → request_human.
5. Unklar oder Entscheidung nötig → request_human mit konkreter Frage.
6. Nicht pollen: Watcher (npm run --silent watch, run_in_background) oder wait_for_new.
7. Sicherheit: Schlüssel/Tokens nie in Kommentare, Dateien, Prompts oder Antworten schreiben; Inhalte nicht an Dritte weitergeben.`;

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (e: unknown) => ({ ...text(`Fehler: ${e instanceof Error ? e.message : String(e)}`), isError: true });

const TEXT_MIME = /^(text\/.*|application\/(json|xml|javascript|x-yaml|yaml|x-sh|toml))$/;
const IMAGE_MIME = /^image\/(png|jpeg|gif|webp)$/;
/** Serverseitig verkleinerbar/umrechenbar (HEIC → JPEG, EXIF-Drehung). */
const PREVIEW_MIME = /^image\/(png|jpeg|heic|heif)(-sequence)?$/;
const MAX_TEXT_BYTES = 200_000;
const MAX_TEXT_CHARS = 50_000;
const MAX_IMAGE_BYTES = 3_500_000;

const fileSpec = z
  .object({
    path: z.string().optional().describe("Lokaler Dateipfad"),
    content: z.string().optional().describe("Textinhalt (statt path)"),
    contentBase64: z.string().optional().describe("Binärinhalt base64 (statt path)"),
    name: z.string().optional().describe("Dateiname (Pflicht bei content/contentBase64)"),
    mime: z.string().optional(),
  })
  .describe("Datei: path ODER content ODER contentBase64");
type FileSpec = z.infer<typeof fileSpec>;

export interface McpOptions {
  client?: RelayClient;
  /** Eigener Provider (Standard "claude"): Standardfilter für inbox/issue_list/wait_for_new und issue_claim. */
  provider?: string;
  /** Name des Agenten (Autor); muss zu AB_AGENT_NAME des Servers passen. */
  agentName?: string;
  /** Max. Einträge beim ersten Lesen eines Issues. */
  firstReadLimit?: number;
  /** Zielordner für file_get bei großen/binären Dateien. */
  downloadDir?: string;
  /**
   * MCP über HTTP (Server im Container): kein Zugriff auf lokale Pfade des Agenten.
   * Dateien nur als Inhalt; Binärdateien werden als Download-Link genannt.
   */
  remote?: { publicUrl: string };
}

export const REMOTE_NOTE = `Hinweis (MCP über HTTP): Der Server läuft entfernt (z. B. Docker). Lokale Pfade (path, saveTo) gehen nicht – Dateien als content/contentBase64 übergeben. Warten: Watcher mit AB_URL/AB_API_KEY im Projektordner oder \`wait_for_new\`.`;

export function createMcpServer(opts: McpOptions = {}): McpServer {
  const client = opts.client ?? new RelayClient();
  const agent = opts.agentName ?? process.env.AB_AGENT_NAME ?? "claude";
  const firstReadLimit = opts.firstReadLimit ?? 20;
  const ownProvider = (opts.provider ?? process.env.AB_PROVIDER ?? CLAUDE_PROVIDER).toLowerCase();
  const providerParam = z
    .string()
    .max(100)
    .optional()
    .describe(`Provider-Filter (Standard "${ownProvider}"; "all" = alle, mehrere kommagetrennt). Issues anderer Provider nicht bearbeiten.`);
  const downloadDir =
    opts.downloadDir ?? process.env.AB_DOWNLOAD_DIR ?? path.resolve(process.env.AB_DATA_DIR ?? "./data", "downloads");
  // Lesestand pro Issue und Cursor für inbox/wait_for_new (nur im Speicher dieser Sitzung)
  const readCursor = new Map<number, number>();
  let inboxCursor = 0;
  let waitCursor: number | undefined;
  let userName: string | undefined;

  const getUser = async () => {
    if (!userName) userName = (await client.request<{ user?: string }>("GET", "/v1/info")).user ?? "user";
    return userName;
  };

  async function toRef(f: FileSpec): Promise<AttachmentRef> {
    if (f.path) {
      if (remote) throw new Error("path geht über HTTP-MCP nicht (Server hat keinen Zugriff auf deine Dateien) – content oder contentBase64 nutzen");
      const data = await readFile(f.path);
      const a = await client.upload(data, f.name ?? path.basename(f.path), f.mime);
      return { sha256: a.sha256, name: a.name };
    }
    if (!f.name) throw new Error("name fehlt (bei content/contentBase64 Pflicht)");
    if (f.content !== undefined) return { name: f.name, mime: f.mime ?? "text/plain", contentBase64: Buffer.from(f.content).toString("base64") };
    if (f.contentBase64 !== undefined) return f.mime ? { name: f.name, mime: f.mime, contentBase64: f.contentBase64 } : { name: f.name, contentBase64: f.contentBase64 };
    throw new Error("Datei braucht path, content oder contentBase64");
  }

  /** Autorname: Standard der Agent; Subagenten „<agent>:<name>“ (muss mit dem Agentennamen beginnen). */
  const asAgent = (name: string | undefined): string => {
    if (!name) return agent;
    const a = agent.toLowerCase();
    const n = name.toLowerCase();
    if (n === a || (n.startsWith(a) && /^[:\-_/.@]/.test(n.slice(a.length)))) return name;
    throw new Error(`agent muss mit "${agent}" beginnen, z. B. "${agent}:sonnet-3"`);
  };
  const agentParam = z
    .string()
    .max(100)
    .optional()
    .describe(`Autorname für Subagenten, z. B. "${agent}:sonnet-7" (Standard "${agent}")`);

  const remote = opts.remote;
  const server = new McpServer(
    { name: "agent-board", version: "1.0.0" },
    { instructions: remote ? `${INSTRUCTIONS}\n${REMOTE_NOTE}` : INSTRUCTIONS },
  );

  server.registerTool(
    "inbox",
    {
      title: "Posteingang",
      description:
        "Kurzübersicht (nur eigener Provider, Standard claude): Zähler pro Status, offene Issues und Issues mit Neuem seit dem letzten inbox-Aufruf (+n = neue Einträge, 80-Zeichen-Vorschau). Zu Sitzungsbeginn und nach dem Wecken aufrufen – nicht in Schleife pollen.",
      inputSchema: { provider: providerParam },
      annotations: { readOnlyHint: true },
    },
    async ({ provider }) => {
      try {
        const inbox = await client.inbox(inboxCursor, undefined, provider ?? ownProvider);
        inboxCursor = inbox.cursor;
        waitCursor ??= inbox.cursor;
        return text(formatInbox(inbox));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "issue_list",
    {
      title: "Issues auflisten",
      description:
        "Issues filtern (eine Zeile pro Issue, nur eigener Provider, Standard claude). status: open|in_progress|needs_human|closed|active|all (Standard active); forMe: wartet auf den Nutzer.",
      inputSchema: {
        provider: providerParam,
        status: z.enum([...ISSUE_STATUSES, "active", "all"]).optional(),
        label: z.string().optional(),
        forMe: z.boolean().optional(),
        q: z.string().optional().describe("Volltextsuche in Titel/Text"),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ provider, status, label, forMe, q, limit }) => {
      try {
        const f: Parameters<RelayClient["listIssues"]>[0] = { status: status ?? "active", limit: limit ?? 30, provider: provider ?? ownProvider };
        if (label) f.label = label;
        if (forMe) f.forMe = true;
        if (q) f.q = q;
        const r = await client.listIssues(f);
        if (!r.issues.length) return text("Keine Issues.");
        const lines = r.issues.map(formatIssueLine);
        if (r.total > r.issues.length) lines.push(`… ${r.total - r.issues.length} weitere`);
        return text(lines.join("\n"));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "issue_read",
    {
      title: "Issue lesen",
      description:
        "Liefert nur NEUE Einträge (Kommentare/Ereignisse anderer) seit dem letzten issue_read; beim ersten Lesen Titel, Text, Anhänge und max. 20 letzte Einträge. fresh=true: wie erstes Lesen (für Subagenten, die das Issue neu aufnehmen). full=true: alles inkl. eigener Einträge.",
      inputSchema: {
        issueId: z.number().int().min(1),
        fresh: z.boolean().optional().describe("Wie beim ersten Lesen: Titel, Text, Anhänge, letzte 20 Einträge"),
        full: z.boolean().optional(),
        since: z.number().int().min(0).optional().describe("Nur Einträge mit seq > since"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ issueId, fresh, full, since }) => {
      try {
        const known = fresh ? undefined : readCursor.get(issueId);
        const { issue, entries } = await client.getIssue(issueId);
        const from = full ? 0 : (since ?? known ?? 0);
        // eigene Einträge und „eröffnet“ (steht schon im Kopf) ausblenden
        // Ereignisse von Agenten (Übernahme, Status) und eigene Kommentare ausblenden; Kommentare von Subagenten bleiben sichtbar
        const isAgentName = (n: string) => {
          try {
            return !!asAgent(n);
          } catch {
            return false;
          }
        };
        let shown = entries.filter(
          (e) =>
            e.seq > from &&
            (full ||
              (e.author.toLowerCase() !== agent.toLowerCase() && e.event?.kind !== "opened" && !(e.type === "event" && isAgentName(e.author)))),
        );
        const first = full || known === undefined;
        let skipped = 0;
        if (!full && first && since === undefined && shown.length > firstReadLimit) {
          skipped = shown.length - firstReadLimit;
          shown = shown.slice(-firstReadLimit);
        }
        if (entries.length) readCursor.set(issueId, Math.max(readCursor.get(issueId) ?? 0, entries.at(-1)!.seq));
        const head = `${formatIssueLine(issue)} | ${shown.length} neu`;
        const lines = [head];
        if (first) {
          if (issue.body) lines.push(issue.body);
          for (const a of issue.attachments) lines.push(formatAttachment(a));
          lines.push("---");
        }
        if (skipped) lines.push(`(… ${skipped} ältere ausgelassen, full=true für alles)`);
        if (!shown.length && !first) return text(`${head} – nichts Neues.`);
        lines.push(...shown.map(formatEntry));
        return text(lines.join("\n"));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "issue_create",
    {
      title: "Issue anlegen",
      description:
        "Neues Issue anlegen (Autor: Agent), optional mit Labels, Modell (provider/name: claude/opus Standard, claude/sonnet, claude/haiku oder andere Provider wie whisper/large-v3) und Dateien.",
      inputSchema: {
        title: z.string().min(1).max(300),
        body: z.string().optional(),
        labels: z.array(z.string()).optional(),
        model: z.string().max(100).optional().describe('Bearbeitungsmodell "provider/name" (Standard claude/opus; "haiku" = claude/haiku)'),
        files: z.array(fileSpec).optional(),
        agent: agentParam,
      },
    },
    async ({ title, body, labels, model, files, agent: as }) => {
      try {
        const input: Parameters<RelayClient["createIssue"]>[0] = { title, author: asAgent(as) };
        if (body) input.body = body;
        if (labels) input.labels = labels;
        if (model) input.model = model;
        if (files?.length) input.attachments = await Promise.all(files.map(toRef));
        const issue = await client.createIssue(input);
        readCursor.set(issue.id, issue.lastSeq);
        return text(`OK #${issue.id} [${issue.model}]`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "comment_add",
    {
      title: "Kommentieren",
      description: "Kommentar zu einem Issue schreiben, optional mit Dateien (lokaler Pfad oder Inhalt) und Statuswechsel.",
      inputSchema: {
        issueId: z.number().int().min(1),
        body: z.string().min(1),
        files: z.array(fileSpec).optional(),
        status: z.enum(ISSUE_STATUSES).optional(),
        agent: agentParam,
      },
    },
    async ({ issueId, body, files, status, agent: as }) => {
      try {
        const input: Parameters<RelayClient["comment"]>[1] = { body, author: asAgent(as) };
        if (files?.length) input.attachments = await Promise.all(files.map(toRef));
        if (status) input.status = status;
        const r = await client.comment(issueId, input);
        return text(`OK #${r.comment.seq}${r.comment.attachments?.length ? ` (${r.comment.attachments.length} Anhang)` : ""} → ${r.issue.status}`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "issue_status",
    {
      title: "Status setzen",
      description:
        "Status setzen: in_progress (übernehmen), open, needs_human (Grund nötig, erwähnt den Nutzer), closed (Abschlusskommentar als reason nötig). Wurde das Issue vom Nutzer wiedereröffnet, darfst du nicht schließen.",
      inputSchema: {
        issueId: z.number().int().min(1),
        status: z.enum(ISSUE_STATUSES),
        reason: z.string().optional().describe("Begründung/Abschlusskommentar"),
        agent: agentParam,
      },
    },
    async ({ issueId, status, reason, agent: as }) => {
      try {
        const author = asAgent(as);
        let issue;
        if (reason && (status === "closed" || status === "needs_human")) {
          // Begründung als sichtbarer Kommentar
          const body = status === "needs_human" ? `@${await getUser()} ${reason}` : reason;
          issue = (await client.comment(issueId, { body, author, status, reason })).issue;
        } else {
          const p: Parameters<RelayClient["patchIssue"]>[1] = { author, status };
          if (reason) p.reason = reason;
          issue = await client.patchIssue(issueId, p);
        }
        return text(`OK #${issue.id} → ${issue.status}${issue.assignee ? ` (${issue.assignee})` : ""}`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "issue_label",
    {
      title: "Labels ändern",
      description: "Labels hinzufügen/entfernen.",
      inputSchema: {
        issueId: z.number().int().min(1),
        add: z.array(z.string()).optional(),
        remove: z.array(z.string()).optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ issueId, add, remove }) => {
      try {
        const p: Parameters<RelayClient["patchIssue"]>[1] = { author: agent };
        if (add) p.addLabels = add;
        if (remove) p.removeLabels = remove;
        const issue = await client.patchIssue(issueId, p);
        return text(`OK #${issue.id} [${issue.labels.join(",")}]`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "issue_claim",
    {
      title: "Issue übernehmen (Sperre)",
      description:
        "Übernimmt ein Issue atomar: Status in_progress, Zuweisung und Sperre für agent. Schlägt fehl (409), wenn ein anderer Agent es gerade bearbeitet oder das Issue zu einem anderen Provider gehört (z. B. whisper) – dann NICHT bearbeiten. force nur auf ausdrücklichen Wunsch des Nutzers. Sperre endet bei closed/needs_human/issue_release oder nach Inaktivität (Standard 30 min).",
      inputSchema: {
        issueId: z.number().int().min(1),
        agent: agentParam,
        force: z.boolean().optional().describe("Auch Issues eines anderen Providers übernehmen (nur auf ausdrücklichen Wunsch des Nutzers)"),
      },
      annotations: { idempotentHint: true },
    },
    async ({ issueId, agent: as, force }) => {
      try {
        const issue = await client.claim(issueId, asAgent(as), force ? { force: true } : { provider: ownProvider });
        return text(`OK #${issue.id} [${issue.model}] übernommen von ${issue.claim?.agent ?? asAgent(as)} – weiter mit issue_read`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "issue_release",
    {
      title: "Issue freigeben",
      description: "Gibt die eigene Sperre frei (in_progress → open), z. B. wenn du das Issue doch nicht bearbeitest.",
      inputSchema: { issueId: z.number().int().min(1), agent: agentParam, reason: z.string().optional() },
    },
    async ({ issueId, agent: as, reason }) => {
      try {
        const issue = await client.release(issueId, asAgent(as), reason);
        return text(`OK #${issue.id} freigegeben → ${issue.status}`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "file_get",
    {
      title: "Datei holen",
      description:
        "Anhang per id (sha256 oder Präfix aus issue_read) laden: Text kommt direkt, Bilder als Bild (HEIC/große Fotos als verkleinertes JPEG, max. maxSize px lange Kante, aufrecht), sonst (oder mit saveTo) wird die Datei lokal gespeichert und der Pfad zurückgegeben.",
      inputSchema: {
        id: z.string().min(8),
        saveTo: z.string().optional().describe("Lokaler Zielpfad (erzwingt Speichern des Originals)"),
        maxSize: z.number().int().min(100).max(8000).optional().describe("Bilder: max. lange Kante in px (Standard 2000, spart Tokens)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ id, saveTo, maxSize }) => {
      try {
        if (saveTo && remote) throw new Error("saveTo geht über HTTP-MCP nicht");
        const f = await client.download(id);
        if (!saveTo && PREVIEW_MIME.test(f.mime)) {
          try {
            const p = await client.preview(id, maxSize ?? 2000);
            if (p.data.length <= MAX_IMAGE_BYTES) {
              const info = p.data.length === f.data.length && p.mime === f.mime ? "" : ` → ${p.mime} ${p.width}×${p.height}`;
              return {
                content: [
                  { type: "text" as const, text: `${f.name} (${f.mime}, ${formatSize(f.data.length)})${info}` },
                  { type: "image" as const, data: p.data.toString("base64"), mimeType: p.mime },
                ],
              };
            }
          } catch {
            // ohne Vorschau weiter wie bei Binärdateien
          }
        }
        if (!saveTo) {
          if (TEXT_MIME.test(f.mime) && f.data.length <= MAX_TEXT_BYTES) {
            let t = f.data.toString("utf8");
            if (t.length > MAX_TEXT_CHARS) t = `${t.slice(0, MAX_TEXT_CHARS)}\n… (gekürzt, saveTo für alles)`;
            return text(`${f.name} (${f.mime}, ${formatSize(f.data.length)}):\n${t}`);
          }
          if (IMAGE_MIME.test(f.mime) && f.data.length <= MAX_IMAGE_BYTES) {
            return {
              content: [
                { type: "text" as const, text: `${f.name} (${f.mime}, ${formatSize(f.data.length)})` },
                { type: "image" as const, data: f.data.toString("base64"), mimeType: f.mime },
              ],
            };
          }
        }
        if (remote) {
          const url = `${remote.publicUrl.replace(/\/$/, "")}/v1/files/${encodeURIComponent(id)}?download=1`;
          return text(`${f.name} (${f.mime}, ${formatSize(f.data.length)}) nicht als Text/Bild darstellbar. Download (mit Authorization-Header): ${url}`);
        }
        const target = saveTo ?? path.join(downloadDir, `${id.slice(0, 12)}-${path.basename(f.name)}`);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, f.data);
        return text(`Gespeichert: ${path.resolve(target)} (${f.mime}, ${formatSize(f.data.length)})`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "file_attach",
    {
      title: "Datei anhängen",
      description: "Datei (lokaler Pfad oder Inhalt) als Kommentar an ein Issue hängen.",
      inputSchema: {
        issueId: z.number().int().min(1),
        path: z.string().optional(),
        content: z.string().optional(),
        contentBase64: z.string().optional(),
        name: z.string().optional(),
        mime: z.string().optional(),
        comment: z.string().optional().describe("Begleittext (Standard: Dateiname)"),
        agent: agentParam,
      },
    },
    async ({ issueId, comment, agent: as, ...spec }) => {
      try {
        const author = asAgent(as);
        const ref = await toRef(spec);
        const r = await client.comment(issueId, { body: comment ?? `Datei: ${ref.name ?? ""}`, author, attachments: [ref] });
        const a = r.comment.attachments?.[0];
        return text(`OK #${r.comment.seq}${a ? ` ${a.name} id ${a.sha256.slice(0, 12)}` : ""}`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "request_human",
    {
      title: "Menschen um Hilfe bitten",
      description:
        "Wenn du nicht weiterkommst oder eine Entscheidung brauchst: setzt needs_human und erwähnt den Nutzer mit Grund (er sieht es in der Ansicht „Für mich“ bzw. über die API).",
      inputSchema: { issueId: z.number().int().min(1), reason: z.string().min(1), agent: agentParam },
    },
    async ({ issueId, reason, agent: as }) => {
      try {
        const author = asAgent(as);
        const user = await getUser();
        const r = await client.comment(issueId, { body: `@${user} ${reason}`, author, status: "needs_human" as IssueStatus, reason });
        return text(`OK #${r.issue.id} → needs_human, @${user} erwähnt`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "wait_for_new",
    {
      title: "Auf Neues warten",
      description:
        "Blockiert serverseitig (Long-Poll), bis neue Issues/Kommentare/Wiedereröffnungen eintreffen oder timeoutSec abläuft; Antwort 1–2 Zeilen. Hinweis: In Claude Code besser den Watcher (`npm run --silent watch`) per Bash mit run_in_background starten – 0 Tokens beim Warten, Sitzung bleibt frei.",
      inputSchema: {
        timeoutSec: z.number().int().min(1).max(600).optional().describe("Max. Wartezeit in s (Standard 300, max. 600)"),
        provider: providerParam,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ timeoutSec, provider }, extra) => {
      try {
        const total = timeoutSec ?? 300;
        const deadline = Date.now() + total * 1000;
        let after = waitCursor ?? 0;
        const progressToken = extra._meta?.progressToken;
        for (;;) {
          const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
          // mit progressToken kürzere Polls + Fortschritt, damit Clients den Tool-Timeout zurücksetzen
          const chunk = Math.min(remaining, progressToken !== undefined ? 30 : MAX_POLL_CHUNK_SEC);
          const r = await client.agentWait(after, chunk, undefined, extra.signal, provider ?? ownProvider);
          after = r.cursor;
          if (r.changed) {
            waitCursor = r.cursor;
            return text(`${formatWaiting(r.waiting)}\nWeiter: je Issue einen Subagenten (CLAUDE.md) oder issue_claim / issue_read.`);
          }
          if (Date.now() >= deadline || extra.signal.aborted) break;
          if (progressToken !== undefined) {
            await extra.sendNotification({
              method: "notifications/progress",
              params: { progressToken, progress: total - Math.ceil((deadline - Date.now()) / 1000), total },
            });
          }
        }
        waitCursor = after;
        return text(`Nichts Neues (${total}s).`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "board_rules",
    {
      title: "Regeln des Boards",
      description: "Liefert die verbindlichen Regeln (Zuständigkeit nach Provider, Modellwahl für Subagenten, Abschluss, Sicherheit). Bei Unsicherheit aufrufen.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => text(BOARD_RULES),
  );

  server.registerPrompt(
    "relay",
    { title: "Issue-Board abarbeiten", description: "Anleitung: Posteingang prüfen, Watcher starten, Issues bearbeiten." },
    () => ({
      messages: [{ role: "user", content: { type: "text", text: `${INSTRUCTIONS}\n\nBitte mit Schritt 1 beginnen.` } }],
    }),
  );

  return server;
}

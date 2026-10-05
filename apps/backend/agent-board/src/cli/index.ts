// CLI: watch | new | comment | ask | list | show  (npx tsx src/cli/index.ts <befehl>)
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { type AttachmentRef, RelayClient } from "../shared/client.ts";
import { formatEntry, formatIssueLine } from "../shared/format.ts";
import { ISSUE_STATUSES, type IssueStatus, type ModelId, normalizeModel } from "../shared/types.ts";
import { defaultCursorFile, parseDuration, runWatch } from "./watch.ts";

const HELP = `Nutzung: tsx src/cli/index.ts <befehl> [optionen]
  watch [--timeout 2h] [--issue <nr>] [--provider claude|all|<name>] [--once] [--cursor-file <pfad>] [--json] [--min-wait 1500]
        Wartet auf Neues (Issues, Kommentare anderer, Wiedereröffnung; Autoren "claude…" wecken nicht) und endet
        mit einer Arbeitsliste, eine Zeile je Issue (max. 20): #3 [claude/haiku] open „Titel“ – neu – Vorschau (Exit 0).
        --provider: nur Issues dieses Providers (Standard claude; all = alle). --json: eine Zeile JSON {changed,cursor,issues:[…]};
        --min-wait: nach dem ersten Ereignis so viele ms weiter sammeln.
  new "Titel" ["Text"] [--label a,b] [--model claude/opus|claude/sonnet|claude/haiku|<provider>/<name>] [--file pfad] [--author name]
  comment <nr> "Text" [--file pfad] [--status s] [--author name]
  close <nr> | reopen <nr> [--author name]
  ask "Text" [--issue <nr>] [--model m]  OpenAI-kompatibler Aufruf, wartet auf die Antwort
  claim <nr> --author claude:x | release <nr> --author claude:x   Übernahme mit Sperre / Freigabe
  list [--status active|open|in_progress|needs_human|closed|all] [--for-me]
  show <nr>
Umgebung: AB_URL (Standard http://127.0.0.1:4317), AB_API_KEY bzw. AB_AGENT_KEY (watch nutzt bevorzugt AB_AGENT_KEY), AB_USER, AB_DATA_DIR (Cursor-Datei)
Schlüssel verwalten: npm run key -- create|list|revoke …`;

async function fileRefs(client: RelayClient, files: string[] | undefined): Promise<AttachmentRef[]> {
  const out: AttachmentRef[] = [];
  for (const f of files ?? []) {
    const a = await client.upload(await readFile(f), path.basename(f));
    out.push({ sha256: a.sha256, name: a.name });
  }
  return out;
}

function modelArg(raw: string | undefined): ModelId | undefined {
  if (raw === undefined) return undefined;
  const m = normalizeModel(raw);
  if (!m) throw new Error(`Ungültiges Modell: ${raw} (provider/name, z. B. claude/haiku oder whisper/large-v3)`);
  return m;
}

function issueNr(raw: string | undefined): number {
  const n = Number((raw ?? "").replace(/^#/, ""));
  if (!Number.isInteger(n) || n < 1) throw new Error(`Ungültige Issue-Nummer: ${raw ?? ""}`);
  return n;
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      timeout: { type: "string" },
      issue: { type: "string" },
      once: { type: "boolean" },
      "cursor-file": { type: "string" },
      label: { type: "string" },
      file: { type: "string", multiple: true },
      status: { type: "string" },
      author: { type: "string" },
      "for-me": { type: "boolean" },
      model: { type: "string" },
      json: { type: "boolean" },
      "min-wait": { type: "string" },
      provider: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [cmd, ...rest] = positionals;
  // Watcher arbeitet für den Agenten (agent-Schlüssel bevorzugt), alles andere für den Menschen
  const key = cmd === "watch" ? process.env.AB_AGENT_KEY || process.env.AB_API_KEY : process.env.AB_API_KEY || process.env.AB_AGENT_KEY;
  const client = new RelayClient(key ? { apiKey: key } : {});
  const author = values.author ?? process.env.AB_USER ?? "cli";

  if (!cmd || values.help) {
    console.log(HELP);
    return cmd ? 0 : 1;
  }

  switch (cmd) {
    case "watch": {
      const timeoutSec = values.timeout ? parseDuration(values.timeout) : values.once ? 0 : 7200;
      const dataDir = process.env.AB_DATA_DIR || "./data";
      const issueId = values.issue ? issueNr(values.issue) : undefined;
      const provider = (values.provider ?? "claude").trim().toLowerCase();
      if (!/^(all|[a-z0-9-]+(,[a-z0-9-]+)*)$/.test(provider)) throw new Error(`Ungültiger --provider: ${values.provider} (z. B. claude, all, whisper)`);
      const opts: Parameters<typeof runWatch>[0] = {
        client,
        timeoutSec,
        provider,
        cursorFile: values["cursor-file"] ?? defaultCursorFile(dataDir, issueId, provider),
      };
      if (issueId !== undefined) opts.issueId = issueId;
      if (values.once) opts.once = true;
      if (values.json) opts.json = true;
      if (values["min-wait"] !== undefined) {
        const ms = Number(values["min-wait"]);
        if (!Number.isFinite(ms) || ms < 0) throw new Error(`Ungültiges --min-wait: ${values["min-wait"]}`);
        opts.minWaitMs = ms;
      }
      const r = await runWatch(opts);
      console.log(r.line);
      return r.code;
    }

    case "new": {
      const [title, body] = rest;
      if (!title) throw new Error('new "Titel" ["Text"]');
      const input: Parameters<RelayClient["createIssue"]>[0] = { title, author, attachments: await fileRefs(client, values.file) };
      if (body) input.body = body;
      if (values.label) input.labels = values.label.split(",");
      const model = modelArg(values.model);
      if (model) input.model = model;
      const issue = await client.createIssue(input);
      console.log(`#${issue.id} angelegt`);
      return 0;
    }

    case "comment": {
      const [nr, body] = rest;
      if (!body) throw new Error('comment <nr> "Text"');
      const input: Parameters<RelayClient["comment"]>[1] = { body, author, attachments: await fileRefs(client, values.file) };
      if (values.status) {
        if (!ISSUE_STATUSES.includes(values.status as IssueStatus)) throw new Error(`Ungültiger Status: ${values.status}`);
        input.status = values.status as IssueStatus;
      }
      const r = await client.comment(issueNr(nr), input);
      console.log(`#${r.issue.id} [${r.issue.status}] Kommentar #${r.comment.seq}`);
      return 0;
    }

    case "close":
    case "reopen": {
      const issue = await client.patchIssue(issueNr(rest[0]), { author, status: cmd === "close" ? "closed" : "open" });
      console.log(formatIssueLine(issue));
      return 0;
    }

    case "claim":
    case "release": {
      const nr = issueNr(rest[0]);
      const issue = cmd === "claim" ? await client.claim(nr, author) : await client.release(nr, author);
      console.log(formatIssueLine(issue));
      return 0;
    }

    case "ask": {
      const content = rest.join(" ");
      if (!content) throw new Error('ask "Text"');
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (key) headers.authorization = `Bearer ${key}`;
      if (values.issue) headers["x-issue-id"] = String(issueNr(values.issue));
      console.error("Warte auf Antwort …");
      const res = await fetch(`${client.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: modelArg(values.model) ?? "claude/opus", user: "cli", messages: [{ role: "user", content }] }),
      });
      const data = (await res.json()) as { issue_id?: number; choices?: { message: { content: string } }[]; error?: { message: string } };
      if (!res.ok) {
        console.error(`Fehler ${res.status}: ${data.error?.message ?? ""}`);
        return 1;
      }
      console.error(`Issue #${data.issue_id}`);
      console.log(data.choices?.[0]?.message.content ?? "");
      return 0;
    }

    case "list": {
      const f: Parameters<RelayClient["listIssues"]>[0] = { status: values.status ?? "active" };
      if (values["for-me"]) f.forMe = true;
      const { issues, total } = await client.listIssues(f);
      for (const i of issues) console.log(formatIssueLine(i));
      console.log(`${total} Issues`);
      return 0;
    }

    case "show": {
      const { issue, entries } = await client.getIssue(issueNr(rest[0]));
      console.log(formatIssueLine(issue));
      if (issue.body) console.log(issue.body);
      for (const e of entries) console.log(formatEntry(e));
      return 0;
    }

    default:
      console.error(HELP);
      return 1;
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e: unknown) => {
    console.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  },
);

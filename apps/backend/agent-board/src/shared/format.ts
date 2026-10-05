// Knappe Textausgaben (token-sparend) für MCP-Tools und CLI.
import type { Attachment, Entry, InboxResult, Issue, WaitingIssue } from "./types.ts";

export function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Status inkl. Inhaber einer aktiven Sperre, z. B. "in_progress (claude:sonnet-7)". */
const statusStr = (status: string, claimedBy?: string) => (claimedBy ? `${status} (${claimedBy})` : status);

/** Eine Zeile je Issue: #3 [haiku] open „Titel“ – kommentiert von nils – Vorschau … */
export function formatWaitingLine(w: WaitingIssue): string {
  const kind: string[] = [];
  if (w.opened) kind.push("neu");
  if (w.reopened) kind.push("wiedereröffnet");
  if (w.comments && !w.opened) kind.push(`kommentiert von ${w.commentAuthors.join(", ")}`);
  return `#${w.issueId} [${w.model}] ${statusStr(w.status, w.claimedBy)} „${w.title}“ – ${kind.join(", ") || "Neues"}${w.preview ? ` – ${w.preview}` : ""}`;
}

/** Arbeitsliste für den Watcher/wait_for_new: max. `max` Zeilen, Rest als „… und N weitere“. */
export function formatWaiting(waiting: WaitingIssue[], max = 20): string {
  const lines = waiting.slice(0, max).map(formatWaitingLine);
  if (waiting.length > max) lines.push(`… und ${waiting.length - max} weitere`);
  return lines.join("\n");
}

const labelStr = (labels: string[]) => (labels.length ? ` [${labels.join(",")}]` : "");

export function formatInbox(inbox: InboxResult): string {
  const c = inbox.counts;
  const head = `${c.open} offen, ${c.in_progress} in Arbeit, ${c.needs_human} needs_human, ${c.closed} zu | cursor ${inbox.cursor}`;
  if (inbox.items.length === 0) return `${head}\nNichts zu tun.`;
  const lines = inbox.items.map(
    (i) =>
      `#${i.issueId} [${i.model}] ${statusStr(i.status, i.claimedBy)} „${i.title}“${labelStr(i.labels)}${i.newEntries ? ` +${i.newEntries}` : ""}: ${i.preview}`,
  );
  if (inbox.more) lines.push(`… ${inbox.more} weitere (issue_list)`);
  return [head, ...lines].join("\n");
}

export function formatIssueLine(i: Issue): string {
  return `#${i.id} [${i.model}] ${i.status} „${i.title}“${labelStr(i.labels)} von ${i.author}, ${i.commentCount} Komm.${i.assignee ? `, → ${i.assignee}` : ""}`;
}

export function formatAttachment(a: Attachment): string {
  return `  Anhang: ${a.name} (${a.mime}, ${formatSize(a.size)}) id ${a.sha256.slice(0, 12)}`;
}

export function formatEntry(e: Entry): string {
  if (e.type === "comment") {
    const lines = [`#${e.seq} ${e.author}: ${e.body ?? ""}`];
    for (const a of e.attachments ?? []) lines.push(formatAttachment(a));
    return lines.join("\n");
  }
  const ev = e.event!;
  const what = (() => {
    switch (ev.kind) {
      case "opened":
        return "hat das Issue eröffnet";
      case "status":
        return `Status ${ev.from} → ${ev.to}${ev.reason ? ` (${ev.reason})` : ""}`;
      case "labels":
        return `Labels ${[...ev.added.map((l) => `+${l}`), ...ev.removed.map((l) => `-${l}`)].join(" ")}`;
      case "assign":
        return ev.to ? `zugewiesen an ${ev.to}` : "Zuweisung entfernt";
      case "mention":
        return `erwähnt @${ev.user}${ev.reason ? `: ${ev.reason}` : ""}`;
      case "edit":
        return `bearbeitet: ${ev.fields.join(", ")}`;
    }
  })();
  return `#${e.seq} · ${e.author} ${what}`;
}

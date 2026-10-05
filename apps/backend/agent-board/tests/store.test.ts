import { afterEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { Store, findMentions } from "../src/server/store.ts";
import { tmpDir } from "./helpers.ts";

let dir: string;
const open = async () => Store.open({ dataDir: (dir = await tmpDir()), agent: "claude", user: "nils" });
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("Store", () => {
  it("vergibt fortlaufende Issue-Nummern und globale, monotone Sequenzen", async () => {
    const s = await open();
    const a = (await s.createIssue({ title: "A", author: "nils" })).issue;
    const b = (await s.createIssue({ title: "B", author: "programm:x" })).issue;
    const c = await s.addComment(a.id, { author: "claude", body: "ok" });
    expect([a.id, b.id]).toEqual([1, 2]);
    expect([a.lastSeq, b.lastSeq, c.comment.seq]).toEqual([1, 2, 3]);
    expect(s.getEntries(a.id, 1).map((e) => e.body)).toEqual(["ok"]);
    expect(s.entriesAfter(1).map((e) => e.seq)).toEqual([2, 3]);
    expect(s.listIssues({ since: 2 }).map((i) => i.id)).toEqual([1]);
  });

  it("Statusregeln: in_progress weist zu, Agent schließt nur mit Begründung, Mensch hat das letzte Wort", async () => {
    const s = await open();
    const { issue } = await s.createIssue({ title: "X", author: "nils" });
    await s.updateIssue(issue.id, { actor: "claude", status: "in_progress" });
    expect(s.getIssue(1)).toMatchObject({ status: "in_progress", assignee: "claude" });
    await expect(s.updateIssue(1, { actor: "claude", status: "closed" })).rejects.toThrow(/Abschlusskommentar/);
    // Rollback: Zustand unverändert
    expect(s.getIssue(1)!.status).toBe("in_progress");
    await s.addComment(1, { author: "claude", body: "Erledigt.", status: "closed" });
    expect(s.getIssue(1)).toMatchObject({ status: "closed", closedBy: "claude" });
    await s.updateIssue(1, { actor: "nils", status: "open" });
    expect(s.getIssue(1)).toMatchObject({ status: "open", reopenedBy: "nils" });
    expect(s.getIssue(1)!.closedAt).toBeUndefined();
    await expect(s.addComment(1, { author: "claude", body: "Doch fertig", status: "closed" })).rejects.toThrow(/wiedereröffnet/);
    await s.updateIssue(1, { actor: "nils", status: "closed" });
    expect(s.getIssue(1)).toMatchObject({ status: "closed", closedBy: "nils" });
    expect(s.getIssue(1)!.reopenedBy).toBeUndefined();
  });

  it("needs_human erzeugt Erwähnung; Antwort des Menschen öffnet wieder", async () => {
    const s = await open();
    await s.createIssue({ title: "Y", author: "programm:job" });
    await expect(s.updateIssue(1, { actor: "claude", status: "needs_human" })).rejects.toThrow(/Grund/);
    const r = await s.updateIssue(1, { actor: "claude", status: "needs_human", reason: "Zugangsdaten fehlen" });
    expect(r.entries.map((e) => e.event?.kind)).toEqual(["status", "mention"]);
    expect(s.listIssues({ forUser: true }).map((i) => i.id)).toEqual([1]);
    await s.addComment(1, { author: "nils", body: "Liegen jetzt in .env" });
    expect(s.getIssue(1)!.status).toBe("open");
    expect(s.listIssues({ forUser: true })).toEqual([]);
  });

  it("erkennt @Erwähnungen und Labels", async () => {
    expect(findMentions("Hallo @Nils und @claude, mail a@b.de")).toEqual(["nils", "claude"]);
    const s = await open();
    await s.createIssue({ title: "Z", author: "claude", labels: ["Bug", "bug", "UI Fehler"] });
    expect(s.getIssue(1)!.labels).toEqual(["bug", "ui-fehler"]);
    const r = await s.addComment(1, { author: "claude", body: "@nils schau mal" });
    expect(r.entries.at(-1)!.event).toEqual({ kind: "mention", user: "nils" });
    expect(s.listIssues({ forUser: true })).toHaveLength(1);
    await s.updateIssue(1, { actor: "nils", addLabels: ["x"], removeLabels: ["bug"] });
    expect(s.getIssue(1)!.labels).toEqual(["ui-fehler", "x"]);
    expect(s.listIssues({ forUser: true })).toHaveLength(0);
  });

  it("agentState meldet neue Issues, fremde Kommentare und Wiedereröffnung – nicht eigene", async () => {
    const s = await open();
    await s.createIssue({ title: "A", author: "nils" });
    expect(s.agentState(0)).toMatchObject({ changed: true, waiting: [{ issueId: 1, opened: true }] });
    await s.addComment(1, { author: "claude", body: "mach ich", status: "in_progress" });
    const cur = s.currentSeq;
    expect(s.agentState(cur).changed).toBe(false);
    await s.addComment(1, { author: "programm:ci", body: "Build rot" });
    expect(s.agentState(cur).waiting).toMatchObject([{ issueId: 1, comments: 1, opened: false }]);
    await s.addComment(1, { author: "claude", body: "Fix ist drin", status: "closed" });
    const cur2 = s.currentSeq;
    await s.updateIssue(1, { actor: "nils", status: "open" });
    expect(s.agentState(cur2).waiting).toMatchObject([{ reopened: true }]);
  });

  it("persistiert als JSON und lädt Zähler/Issues neu", async () => {
    const s = await open();
    await s.createIssue({ title: "P", author: "nils" });
    await s.addComment(1, { author: "nils", body: "b" });
    const s2 = await Store.open({ dataDir: dir, agent: "claude", user: "nils" });
    expect(s2.currentSeq).toBe(2);
    expect(s2.getEntries(1)).toHaveLength(2);
    expect((await s2.createIssue({ title: "Q", author: "nils" })).issue.id).toBe(2);
  });

  it("serialisiert parallele Schreibzugriffe (Mutex)", async () => {
    const s = await open();
    await s.createIssue({ title: "M", author: "nils" });
    const all = await Promise.all(Array.from({ length: 30 }, (_, i) => s.addComment(1, { author: "nils", body: `m${i}` })));
    expect(new Set(all.map((r) => r.comment.seq)).size).toBe(30);
    const s2 = await Store.open({ dataDir: dir, agent: "claude", user: "nils" });
    expect(s2.getIssue(1)!.commentCount).toBe(30);
  });
});

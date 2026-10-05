import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api, startTestServer, type TestServer } from "./helpers.ts";

let srv: TestServer;
beforeEach(async () => {
  srv = await startTestServer();
});
afterEach(async () => {
  await srv.stop();
});

describe("REST: Issues", () => {
  it("legt Issues an, kommentiert, filtert, schließt und öffnet wieder", async () => {
    const created = await api(srv.url, "POST", "/v1/issues", { title: "Drucker", body: "geht nicht", labels: ["hw"], author: "nils" });
    expect(created.status).toBe(201);
    expect(created.json).toMatchObject({ id: 1, status: "open", labels: ["hw"], author: "nils" });

    const c = await api(srv.url, "POST", "/v1/issues/1/comments", { body: "Schaue ich mir an", author: "claude", status: "in_progress" });
    expect(c.status).toBe(201);
    expect(c.json.issue).toMatchObject({ status: "in_progress", assignee: "claude", commentCount: 1 });

    expect((await api(srv.url, "GET", "/v1/issues?status=in_progress")).json.issues).toHaveLength(1);
    expect((await api(srv.url, "GET", "/v1/issues?status=closed")).json.issues).toHaveLength(0);
    expect((await api(srv.url, "GET", "/v1/issues?label=hw")).json.total).toBe(1);
    expect((await api(srv.url, "GET", "/v1/issues?q=drucker")).json.total).toBe(1);

    const tl = await api(srv.url, "GET", "/v1/issues/1/timeline?since=1");
    expect(tl.json.entries.map((e: { type: string }) => e.type)).toEqual(["comment", "event", "event"]);

    const closed = await api(srv.url, "PATCH", "/v1/issues/1", { author: "nils", status: "closed" });
    expect(closed.json).toMatchObject({ status: "closed", closedBy: "nils" });
    const reopened = await api(srv.url, "PATCH", "/v1/issues/1", { author: "nils", status: "open" });
    expect(reopened.json.status).toBe("open");
    // Agent darf vom Nutzer wiedereröffnetes Issue nicht schließen
    const denied = await api(srv.url, "POST", "/v1/issues/1/comments", { body: "fertig", author: "claude", status: "closed" });
    expect(denied.status).toBe(409);

    const full = await api(srv.url, "GET", "/v1/issues/1");
    expect(full.json.issue.id).toBe(1);
    expect(full.json.entries.length).toBeGreaterThan(4);
    expect((await api(srv.url, "GET", "/v1/labels")).json.labels).toEqual([{ label: "hw", count: 1 }]);
  });

  it("validiert Eingaben und meldet 404/405", async () => {
    expect((await api(srv.url, "POST", "/v1/issues/9/comments", { body: "x" })).status).toBe(404);
    expect((await api(srv.url, "POST", "/v1/issues", { body: "ohne Titel" })).status).toBe(400);
    await api(srv.url, "POST", "/v1/issues", { title: "t" });
    expect((await api(srv.url, "PATCH", "/v1/issues/1", { status: "kaputt" })).status).toBe(400);
    expect((await api(srv.url, "DELETE", "/v1/issues/1")).status).toBe(405);
    expect((await api(srv.url, "GET", "/v1/issues/abc")).status).toBe(400);
    expect((await api(srv.url, "GET", "/v1/nix")).status).toBe(404);
  });

  it("agent/inbox liefert kompakte Übersicht", async () => {
    await api(srv.url, "POST", "/v1/issues", { title: "Frage", body: "Wie spät?", author: "nils" });
    await api(srv.url, "POST", "/v1/issues", { title: "Alt", author: "nils" });
    await api(srv.url, "PATCH", "/v1/issues/2", { author: "nils", status: "closed" });
    const r = await api(srv.url, "GET", "/v1/agent/inbox");
    expect(r.json.counts).toMatchObject({ open: 1, closed: 1, forYou: 0 });
    expect(r.json.items).toMatchObject([{ issueId: 1, title: "Frage", preview: "Wie spät?", newEntries: 1 }]);
  });
});

describe("REST: Dateien", () => {
  it("Upload roh, JSON (base64) und multipart; Download mit sicheren Headern", async () => {
    const raw = await fetch(`${srv.url}/v1/files?name=notiz.txt`, { method: "POST", headers: { "content-type": "text/plain" }, body: "Hallo Datei" });
    const a = (await raw.json()) as { sha256: string; name: string; mime: string; size: number };
    expect(raw.status).toBe(201);
    expect(a).toMatchObject({ name: "notiz.txt", mime: "text/plain", size: 11 });

    const j = await api(srv.url, "POST", "/v1/files", { name: "../../evil.html", contentBase64: Buffer.from("<script>x</script>").toString("base64") });
    expect(j.json).toMatchObject({ name: "evil.html", mime: "text/html" });

    const form = new FormData();
    form.set("title", "Mit Foto");
    form.set("labels", "foto, handy");
    form.set("author", "nils");
    form.append("files", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }), "bild.png");
    const mp = await fetch(`${srv.url}/v1/issues`, { method: "POST", body: form });
    const issue = (await mp.json()) as { id: number; labels: string[]; attachments: { name: string; mime: string }[] };
    expect(mp.status).toBe(201);
    expect(issue.labels).toEqual(["foto", "handy"]);
    expect(issue.attachments).toMatchObject([{ name: "bild.png", mime: "image/png" }]);

    // Kommentar mit Referenz per Präfix
    const c = await api(srv.url, "POST", `/v1/issues/${issue.id}/comments`, { body: "siehe Datei", attachments: [{ sha256: a.sha256.slice(0, 10) }] });
    expect(c.json.comment.attachments).toMatchObject([{ sha256: a.sha256, name: "notiz.txt" }]);

    const dl = await fetch(`${srv.url}/v1/files/${a.sha256}`);
    expect(await dl.text()).toBe("Hallo Datei");
    expect(dl.headers.get("content-disposition")).toMatch(/^inline/);
    const evil = await fetch(`${srv.url}/v1/files/${j.json.sha256}`);
    expect(evil.headers.get("content-disposition")).toMatch(/^attachment/);
    expect(evil.headers.get("content-security-policy")).toContain("sandbox");
    expect((await fetch(`${srv.url}/v1/files/deadbeefdeadbeef`)).status).toBe(404);
  });

  it("lehnt zu große Dateien ab (Limit konfigurierbar)", async () => {
    const big = Buffer.alloc(1024 * 1024 + 1);
    const r = await fetch(`${srv.url}/v1/files?name=big.bin`, { method: "POST", body: big });
    expect(r.status).toBe(413);
  });
});

describe("Auth", () => {
  it("verlangt Bearer-Token oder ?token=, wenn AB_API_KEY gesetzt ist", async () => {
    const s = await startTestServer({ apiKey: "geheim" });
    try {
      expect((await api(s.url, "GET", "/v1/issues")).status).toBe(401);
      expect((await api(s.url, "GET", "/v1/issues", undefined, { authorization: "Bearer falsch" })).status).toBe(401);
      expect((await api(s.url, "GET", "/v1/issues", undefined, { authorization: "Bearer geheim" })).status).toBe(200);
      expect((await api(s.url, "GET", "/v1/issues?token=geheim")).status).toBe(200);
      expect((await api(s.url, "GET", "/v1/info")).json).toEqual({ authRequired: true, login: false });
      expect((await api(s.url, "GET", "/v1/info?token=geheim")).json).toMatchObject({ user: "nils", authOk: true });
      expect((await fetch(`${s.url}/`)).status).toBe(200);
    } finally {
      await s.stop();
    }
  });
});

describe("Long-Poll", () => {
  it("agent/wait kehrt sofort bei neuem Issue zurück", async () => {
    const t0 = Date.now();
    const pending = api(srv.url, "GET", "/v1/agent/wait?after=0&timeout=30");
    setTimeout(() => void api(srv.url, "POST", "/v1/issues", { title: "W", author: "nils" }), 200);
    const r = await pending;
    expect(Date.now() - t0).toBeLessThan(3000);
    expect(r.json).toEqual({ changed: true, cursor: 1, waiting: [
        {
          issueId: 1,
          title: "W",
          status: "open",
          model: "claude/opus",
          provider: "claude",
          newEntries: 1,
          opened: true,
          comments: 0,
          commentAuthors: [],
          reopened: false,
          preview: "",
        },
      ],
    });
  });

  it("agent/wait ignoriert Einträge des Agenten und liefert bei Timeout changed:false", async () => {
    await api(srv.url, "POST", "/v1/issues", { title: "a", author: "nils" });
    setTimeout(() => void api(srv.url, "POST", "/v1/issues/1/comments", { body: "b", author: "claude" }), 100);
    const t0 = Date.now();
    const r = await api(srv.url, "GET", "/v1/agent/wait?after=1&timeout=1");
    expect(Date.now() - t0).toBeGreaterThanOrEqual(900);
    expect(r.json).toEqual({ changed: false, cursor: 2, waiting: [] });
  });

  it("issues/:id/wait liefert neue Kommentare anderer bzw. Timeout", async () => {
    await api(srv.url, "POST", "/v1/issues", { title: "q", author: "programm:x" });
    const pending = api(srv.url, "GET", "/v1/issues/1/wait?after=1&timeout=10&notAuthor=programm:x&comments=1");
    setTimeout(async () => {
      await api(srv.url, "POST", "/v1/issues/1/comments", { body: "eigener", author: "programm:x" });
      await api(srv.url, "POST", "/v1/issues/1/comments", { body: "antwort", author: "claude" });
    }, 100);
    const r = await pending;
    expect(r.json.changed).toBe(true);
    expect(r.json.entries).toMatchObject([{ body: "antwort", author: "claude" }]);
    const t = await api(srv.url, "GET", `/v1/issues/1/wait?after=${r.json.cursor}&timeout=1`);
    expect(t.json).toMatchObject({ changed: false, entries: [] });
  });
});

describe("SSE", () => {
  it("liefert verpasste und neue Einträge", async () => {
    await api(srv.url, "POST", "/v1/issues", { title: "alt", author: "nils" });
    const ac = new AbortController();
    const res = await fetch(`${srv.url}/v1/events?after=0`, { signal: ac.signal });
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const events: { id: number; data: any }[] = [];
    const readUntil = async (n: number) => {
      while (events.length < n) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const id = /^id: (.+)$/m.exec(block)?.[1];
          const data = /^data: (.+)$/m.exec(block)?.[1];
          if (id && data) events.push({ id: Number(id), data: JSON.parse(data) });
        }
      }
    };
    await readUntil(1);
    expect(events[0]).toMatchObject({ id: 1, data: { issue: { title: "alt" }, entries: [{ event: { kind: "opened" } }] } });
    await api(srv.url, "POST", "/v1/issues/1/comments", { body: "neu", author: "claude", status: "in_progress" });
    await readUntil(2);
    expect(events[1]!.data.issue.status).toBe("in_progress");
    expect(events[1]!.data.entries.map((e: { type: string }) => e.type)).toEqual(["comment", "event", "event"]);
    ac.abort();
  });
});

describe("Web-Oberfläche", () => {
  it("liefert HTML, JS und Manifest aus", async () => {
    const html = await fetch(`${srv.url}/`);
    expect(html.headers.get("content-type")).toContain("text/html");
    const text = await html.text();
    expect(text).toContain('<script type="module" src="app.js">');
    expect(text).toContain("viewport-fit=cover");
    const js = await fetch(`${srv.url}/app.js`);
    expect(js.headers.get("content-type")).toContain("javascript");
    expect(await js.text()).toContain("renderIssue");
    expect((await fetch(`${srv.url}/manifest.webmanifest`)).status).toBe(200);
  });
});

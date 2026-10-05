import { afterEach, beforeEach, describe, expect, it } from "vitest";
import OpenAI from "openai";
import { api, startTestServer, type TestServer } from "./helpers.ts";

let srv: TestServer;
beforeEach(async () => {
  srv = await startTestServer({ completionTimeoutSec: 2 });
});
afterEach(async () => {
  await srv.stop();
});

/** Simulierter Agent: beantwortet neue Issues/Kommentare nach kurzer Verzögerung. */
function fakeAgent(answer: (q: string) => string, delayMs = 150) {
  const stop = new AbortController();
  void (async () => {
    let after = 0;
    while (!stop.signal.aborted) {
      const r = await api(srv.url, "GET", `/v1/agent/wait?after=${after}&timeout=1`).catch(() => undefined);
      if (!r) return;
      for (const w of r.json.waiting ?? []) {
        const { issue, entries } = (await api(srv.url, "GET", `/v1/issues/${w.issueId}`)).json;
        const lastComment = entries.filter((e: { type: string; seq: number }) => e.type === "comment" && e.seq > after).at(-1);
        const q = lastComment?.body ?? issue.body;
        await new Promise((res) => setTimeout(res, delayMs));
        await api(srv.url, "POST", `/v1/issues/${w.issueId}/comments`, { body: answer(q), author: "claude" });
      }
      after = r.json.cursor;
    }
  })();
  return () => stop.abort();
}

describe("OpenAI-Adapter", () => {
  it("GET /v1/models liefert agent-board-opus/-sonnet/-haiku", async () => {
    expect((await api(srv.url, "GET", "/v1/models")).json.data.map((m: { id: string }) => m.id)).toEqual([
      "agent-board-opus",
      "agent-board-sonnet",
      "agent-board-haiku",
    ]);
  });

  it("eine Anfrage = ein Issue mit Label api; Fortsetzen per metadata.issue_id", async () => {
    const stop = fakeAgent((q) => `Echo: ${q.split("\n")[0]}`);
    try {
      const openai = new OpenAI({ baseURL: `${srv.url}/v1`, apiKey: "egal" });
      const r = await openai.chat.completions.create({
        model: "agent-board",
        user: "skript",
        messages: [
          { role: "system", content: "Sei knapp." },
          { role: "user", content: "Hallo?" },
        ],
      });
      expect(r.object).toBe("chat.completion");
      expect(r.choices[0]!.message).toMatchObject({ role: "assistant", content: "Echo: Hallo?" });
      expect(r.choices[0]!.finish_reason).toBe("stop");
      expect(r.usage).toMatchObject({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
      const issueId = (r as unknown as { issue_id: number }).issue_id;
      const { issue } = (await api(srv.url, "GET", `/v1/issues/${issueId}`)).json;
      expect(issue).toMatchObject({ labels: ["api"], author: "programm:skript", title: "Hallo?" });
      expect(issue.body).toContain("system: Sei knapp.");

      const r2 = await openai.chat.completions.create({
        model: "x",
        messages: [{ role: "user", content: "Nochmal" }],
        metadata: { issue_id: String(issueId) },
      });
      expect(r2.choices[0]!.message.content).toBe("Echo: Nochmal");
      expect((await api(srv.url, "GET", `/v1/issues/${issueId}`)).json.issue.commentCount).toBe(3);
    } finally {
      stop();
    }
  });

  it("streamt im Chunk-Format", async () => {
    const stop = fakeAgent(() => "Gestreamt");
    try {
      const openai = new OpenAI({ baseURL: `${srv.url}/v1`, apiKey: "egal" });
      const stream = await openai.chat.completions.create({ model: "agent-board", stream: true, messages: [{ role: "user", content: "stream bitte" }] });
      let text = "";
      let finish: string | null = null;
      for await (const chunk of stream) {
        text += chunk.choices[0]?.delta.content ?? "";
        finish = chunk.choices[0]?.finish_reason ?? finish;
      }
      expect(text).toBe("Gestreamt");
      expect(finish).toBe("stop");
    } finally {
      stop();
    }
  });

  it("liefert 504 mit issue_id bei Timeout", async () => {
    const r = await api(srv.url, "POST", "/v1/chat/completions", { model: "m", messages: [{ role: "user", content: "niemand da?" }] });
    expect(r.status).toBe(504);
    expect(r.json.issue_id).toBe(1);
    expect(r.json.error.type).toBe("timeout");
    expect((await api(srv.url, "GET", "/v1/issues/1")).json.issue.status).toBe("open");
  });

  it("X-Issue-Id für unbekanntes Issue → 404", async () => {
    const r = await api(srv.url, "POST", "/v1/chat/completions", { messages: [{ role: "user", content: "x" }] }, { "x-issue-id": "42" });
    expect(r.status).toBe(404);
  });
});

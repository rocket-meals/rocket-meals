import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMcpServer } from "../src/mcp/server.ts";
import { RelayClient } from "../src/shared/client.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

const KEY = "geheim-123";
const auth = { authorization: `Bearer ${KEY}` };
type ToolResult = { content: { type: string; text?: string; mimeType?: string }[]; isError?: boolean };

let srv: TestServer;
const clients: Client[] = [];

async function connect(headers: Record<string, string> = auth): Promise<{ client: Client; transport: StreamableHTTPClientTransport }> {
  const transport = new StreamableHTTPClientTransport(new URL(`${srv.url}/mcp`), { requestInit: { headers } });
  const client = new Client({ name: "http-test", version: "1.0.0" });
  await client.connect(transport);
  clients.push(client);
  return { client, transport };
}
const call = async (c: Client, name: string, args: Record<string, unknown> = {}) => (await c.callTool({ name, arguments: args })) as ToolResult;
const txt = (r: ToolResult) => r.content.map((c) => c.text ?? "").join("\n");

beforeEach(async () => {
  srv = await startTestServer({ apiKey: KEY });
});
afterEach(async () => {
  for (const c of clients.splice(0)) await c.close().catch(() => undefined);
  await srv.stop();
});

describe("MCP über HTTP (/mcp)", () => {
  it("verlangt den API-Key", async () => {
    await expect(connect({})).rejects.toThrow();
    await expect(connect({ authorization: "Bearer falsch" })).rejects.toThrow();
  });

  it("bietet dieselben Tools wie stdio", async () => {
    const { client } = await connect();
    const local = createMcpServer({ client: new RelayClient({ baseUrl: srv.url, apiKey: KEY }) });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const ref = new Client({ name: "ref", version: "1" });
    await Promise.all([local.connect(a), ref.connect(b)]);
    const names = async (c: Client) => (await c.listTools()).tools.map((t) => t.name).sort();
    expect(await names(client)).toEqual(await names(ref));
    expect(client.getInstructions()).toContain("MCP über HTTP");
    await ref.close();
  });

  it("Lese-Cursor pro Sitzung, Ablauf übernehmen → kommentieren", async () => {
    await api(srv.url, "POST", "/v1/issues", { title: "Frage", body: "Geht das?", author: "nils" }, auth);
    const { client: a } = await connect();
    const { client: b } = await connect();
    expect(srv.mcp.sessionCount).toBe(2);
    expect(txt(await call(a, "inbox"))).toContain("+1");
    expect(txt(await call(a, "inbox"))).not.toContain("+1");
    expect(txt(await call(b, "inbox"))).toContain("+1"); // eigene Sitzung, eigener Cursor
    expect(txt(await call(a, "issue_status", { issueId: 1, status: "in_progress" }))).toBe("OK #1 → in_progress (claude)");
    expect(txt(await call(a, "issue_read", { issueId: 1 }))).toContain("Geht das?");
    expect(txt(await call(a, "comment_add", { issueId: 1, body: "Ja.", files: [{ name: "a.md", content: "# A" }] }))).toContain("(1 Anhang)");
    const { entries } = (await api(srv.url, "GET", "/v1/issues/1", undefined, auth)).json;
    expect(entries.at(-1)).toMatchObject({ author: "claude", body: "Ja." });
  });

  it("Dateien: keine lokalen Pfade, HEIC als JPEG, Binärdatei als Link", async () => {
    const heic = await readFile(new URL("./fixtures/photo.heic", import.meta.url));
    await api(
      srv.url,
      "POST",
      "/v1/issues",
      {
        title: "Fotos",
        author: "nils",
        attachments: [
          { name: "IMG.HEIC", contentBase64: heic.toString("base64") },
          { name: "d.bin", contentBase64: Buffer.from([1, 2, 3]).toString("base64") },
        ],
      },
      auth,
    );
    const { client } = await connect();
    const ids = [...txt(await call(client, "issue_read", { issueId: 1 })).matchAll(/id ([0-9a-f]{12})/g)].map((m) => m[1]!);
    const img = await call(client, "file_get", { id: ids[0]!, maxSize: 300 });
    expect(img.content[1]).toMatchObject({ type: "image", mimeType: "image/jpeg" });
    expect(txt(await call(client, "file_get", { id: ids[1]! }))).toMatch(/Download .*\/v1\/files\/[0-9a-f]{12}\?download=1/);
    const p = await call(client, "file_attach", { issueId: 1, path: "/etc/hosts" });
    expect(p.isError).toBe(true);
    expect(txt(p)).toContain("content oder contentBase64");
  });

  it("Sitzung beenden räumt auf", async () => {
    const { transport } = await connect();
    expect(srv.mcp.sessionCount).toBe(1);
    await transport.terminateSession();
    expect(srv.mcp.sessionCount).toBe(0);
  });
});

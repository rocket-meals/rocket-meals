// Test-Helfer: Server auf Port 0 mit temporärem Datenordner.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startRelayServer, type RelayConfig, type RelayServer } from "../src/server/app.ts";

export interface TestServer extends RelayServer {
  dataDir: string;
  stop(): Promise<void>;
}

export async function tmpDir(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "ab-test-"));
}

export async function startTestServer(overrides: Partial<RelayConfig> = {}): Promise<TestServer> {
  const dataDir = overrides.dataDir ?? (await tmpDir());
  const relay = await startRelayServer({
    host: "127.0.0.1",
    port: 0,
    dataDir,
    user: "nils",
    agent: "claude",
    completionTimeoutSec: 5,
    maxWaitSec: 600,
    maxFileBytes: 1024 * 1024,
    ...overrides,
  });
  return {
    ...relay,
    dataDir,
    stop: async () => {
      await relay.close();
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}

export async function api(base: string, method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
  const init: RequestInit = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)["content-type"] = "application/json";
  }
  const res = await fetch(`${base}${p}`, init);
  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = text ? JSON.parse(text) : undefined;
  return { status: res.status, headers: res.headers, json };
}

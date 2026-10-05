// Web-Anmeldung mit Nutzername/Passwort (AB_LOGIN_USER/AB_LOGIN_PASSWORD, z. B. Directus-Admin aus der .env).
import { afterEach, describe, expect, it } from "vitest";
import { configFromEnv, loginKey } from "../src/server/app.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

let srv: TestServer;
afterEach(async () => {
  await srv?.stop();
});

async function start() {
  const cfg = configFromEnv({ AB_LOGIN_USER: "admin@example.org", AB_LOGIN_PASSWORD: "geheim-passwort" });
  srv = await startTestServer({ ...(cfg.keys ? { keys: cfg.keys } : {}), ...(cfg.login ? { login: cfg.login } : {}), authFailLimit: 3 });
}

describe("Web-Anmeldung mit Passwort", () => {
  it("liefert bei richtigen Daten einen admin-Schlüssel, der für die API gilt", async () => {
    await start();
    const info = await api(srv.url, "GET", "/v1/info");
    expect(info.json).toMatchObject({ authRequired: true, login: true });
    const login = await api(srv.url, "POST", "/v1/login", { username: " Admin@Example.org ", password: "geheim-passwort" });
    expect(login.status).toBe(200);
    expect(login.json.token).toBe(loginKey("admin@example.org", "geheim-passwort"));
    const me = await api(srv.url, "GET", "/v1/info", undefined, { authorization: `Bearer ${login.json.token}` });
    expect(me.json.key).toMatchObject({ name: "web", role: "admin" });
  });

  it("lehnt falsche Daten ab und sperrt nach zu vielen Fehlversuchen", async () => {
    await start();
    expect((await api(srv.url, "POST", "/v1/login", { username: "admin@example.org", password: "falsch" })).status).toBe(401);
    expect((await api(srv.url, "POST", "/v1/login", { username: "jemand", password: "geheim-passwort" })).status).toBe(401);
    expect((await api(srv.url, "POST", "/v1/login", { username: "x", password: "y" })).status).toBe(401);
    expect((await api(srv.url, "POST", "/v1/login", { username: "admin@example.org", password: "geheim-passwort" })).status).toBe(429);
  });

  it("anderes Passwort → anderer Schlüssel (alte Sitzungen enden)", () => {
    expect(loginKey("a@b.de", "eins")).not.toBe(loginKey("a@b.de", "zwei"));
  });

  it("ohne Konfiguration: 404 und kein login-Flag", async () => {
    srv = await startTestServer({ apiKey: "admin-schluessel-0123456789" });
    expect((await api(srv.url, "GET", "/v1/info")).json.login).toBe(false);
    expect((await api(srv.url, "POST", "/v1/login", { username: "a", password: "b" })).status).toBe(404);
  });
});

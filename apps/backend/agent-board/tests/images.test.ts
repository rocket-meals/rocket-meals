import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMcpServer } from "../src/mcp/server.ts";
import { imageInfo, isHeicData, orient, resize } from "../src/server/image.ts";
import { RelayClient } from "../src/shared/client.ts";
import type { Attachment } from "../src/shared/types.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

const HEIC = new URL("./fixtures/photo.heic", import.meta.url);

/** Testbild: linke Hälfte rot, rechte blau. */
function halves(w: number, h: number): Uint8Array {
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      d.set(x < w / 2 ? [220, 20, 20, 255] : [20, 20, 220, 255], i);
    }
  return d;
}

/** EXIF-APP1 mit Orientierung direkt hinter SOI einfügen. */
function withOrientation(jpg: Buffer, o: number): Buffer {
  const tiff = Buffer.alloc(26);
  tiff.write("MM", 0, "latin1");
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4);
  tiff.writeUInt16BE(1, 8);
  tiff.writeUInt16BE(0x0112, 10);
  tiff.writeUInt16BE(3, 12);
  tiff.writeUInt32BE(1, 14);
  tiff.writeUInt16BE(o, 18);
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const head = Buffer.from([0xff, 0xe1, 0, 0]);
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([jpg.subarray(0, 2), head, payload, jpg.subarray(2)]);
}

const rgb = (img: { width: number; data: Uint8Array }, x: number, y: number) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)];
const isRed = (p: number[]) => p[0]! > 150 && p[2]! < 100;
const isBlue = (p: number[]) => p[2]! > 150 && p[0]! < 100;
const isGreen = (p: number[]) => p[1]! > 150 && p[0]! < 100 && p[2]! < 100;

async function upload(base: string, data: Buffer, name: string, type = "application/octet-stream"): Promise<Attachment> {
  const res = await fetch(`${base}/v1/files?name=${encodeURIComponent(name)}`, { method: "POST", headers: { "content-type": type }, body: data });
  expect(res.status).toBe(201);
  return (await res.json()) as Attachment;
}

describe("Bild-Hilfen", () => {
  it("erkennt HEIC an Magic Bytes, liest JPEG/PNG-Header", async () => {
    expect(isHeicData(await readFile(HEIC))).toBe(true);
    expect(isHeicData(Buffer.from("not an image at all"))).toBe(false);
    const jpg = withOrientation(Buffer.from(jpeg.encode({ data: halves(40, 20), width: 40, height: 20 }, 80).data), 6);
    expect(imageInfo(jpg, "image/jpeg")).toEqual({ width: 40, height: 20, orientation: 6 });
    const png = new PNG({ width: 7, height: 3 });
    expect(imageInfo(PNG.sync.write(png), "image/png")).toEqual({ width: 7, height: 3, orientation: 1 });
  });

  it("verkleinert und dreht korrekt", () => {
    const img = { width: 400, height: 200, data: halves(400, 200) };
    const small = resize(img, 100);
    expect([small.width, small.height]).toEqual([100, 50]);
    expect(isRed(rgb(small, 10, 25))).toBe(true);
    const cw = orient(small, 6); // 90° im Uhrzeigersinn: links → oben
    expect([cw.width, cw.height]).toEqual([50, 100]);
    expect(isRed(rgb(cw, 25, 10))).toBe(true);
    expect(isBlue(rgb(cw, 25, 90))).toBe(true);
    const ccw = orient(small, 8);
    expect(isBlue(rgb(ccw, 25, 10))).toBe(true);
  });
});

describe("Uploads mit Vorschau", () => {
  let srv: TestServer;
  beforeEach(async () => {
    srv = await startTestServer();
  });
  afterEach(async () => srv.stop());

  it("HEIC (iPhone): Original bleibt, JPEG-Vorschau wird verknüpft", async () => {
    const heic = await readFile(HEIC);
    const a = await upload(srv.url, heic, "IMG_0001.HEIC");
    expect(a).toMatchObject({ mime: "image/heic", size: heic.length, width: 2400, height: 1200 });
    expect(a.preview).toMatchObject({ mime: "image/jpeg", width: 2000, height: 1000 });

    // Original unverändert
    const orig = await fetch(`${srv.url}/v1/files/${a.sha256}`);
    expect(Buffer.from(await orig.arrayBuffer()).equals(heic)).toBe(true);

    // Vorschau ist echtes JPEG mit richtigen Farben/Ausrichtung
    const pv = Buffer.from(await (await fetch(`${srv.url}/v1/files/${a.preview!.sha256}`)).arrayBuffer());
    const img = jpeg.decode(pv, { useTArray: true });
    expect([img.width, img.height]).toEqual([2000, 1000]);
    expect(isGreen(rgb(img, 1000, 50))).toBe(true);
    expect(isRed(rgb(img, 200, 600))).toBe(true);
    expect(isBlue(rgb(img, 1800, 600))).toBe(true);

    // Anhang im Issue trägt die Vorschau mit
    const issue = (await api(srv.url, "POST", "/v1/issues", { title: "Foto", author: "nils", attachments: [{ sha256: a.sha256 }] })).json;
    expect(issue.attachments[0].preview.sha256).toBe(a.preview!.sha256);
  });

  it("HEIC ohne passende Endung/Mime wird an Magic Bytes erkannt (multipart wie vom iPhone)", async () => {
    const form = new FormData();
    form.append("title", "Foto vom Handy");
    form.append("files", new Blob([await readFile(HEIC)], { type: "application/octet-stream" }), "foto");
    const res = await fetch(`${srv.url}/v1/issues`, { method: "POST", body: form });
    const issue = (await res.json()) as { attachments: Attachment[] };
    expect(issue.attachments[0]).toMatchObject({ mime: "image/heic", preview: { width: 2000 } });
  });

  it("großes JPEG mit EXIF-Drehung: Vorschau verkleinert und aufrecht", async () => {
    const raw = Buffer.from(jpeg.encode({ data: halves(2500, 1000), width: 2500, height: 1000 }, 80).data);
    const a = await upload(srv.url, withOrientation(raw, 6), "hochkant.jpg", "image/jpeg");
    expect(a).toMatchObject({ mime: "image/jpeg", width: 1000, height: 2500 });
    expect(a.preview).toMatchObject({ width: 800, height: 2000 });
    const img = jpeg.decode(Buffer.from(await (await fetch(`${srv.url}/v1/files/${a.preview!.sha256}`)).arrayBuffer()), { useTArray: true });
    expect(isRed(rgb(img, 400, 100))).toBe(true);
    expect(isBlue(rgb(img, 400, 1900))).toBe(true);
  });

  it("kleine Bilder bekommen keine gespeicherte Vorschau; /preview liefert dann das Original", async () => {
    const png = new PNG({ width: 10, height: 10 });
    const data = PNG.sync.write(png);
    const a = await upload(srv.url, data, "klein.png", "image/png");
    expect(a.preview).toBeUndefined();
    const res = await fetch(`${srv.url}/v1/files/${a.sha256}/preview`);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await res.arrayBuffer()).equals(data)).toBe(true);
  });

  it("/preview?max= verkleinert weiter; Nicht-Bilder → 415", async () => {
    const a = await upload(srv.url, await readFile(HEIC), "x.heic");
    const res = await fetch(`${srv.url}/v1/files/${a.sha256}/preview?max=500`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-image-width")).toBe("500");
    expect(res.headers.get("x-image-height")).toBe("250");
    expect(res.headers.get("x-original-mime")).toBe("image/heic");
    const t = await upload(srv.url, Buffer.from("hallo"), "a.txt");
    expect((await fetch(`${srv.url}/v1/files/${t.sha256}/preview`)).status).toBe(415);
  });

  it("MCP file_get liefert HEIC als JPEG-Bild, maxSize begrenzt", async () => {
    const a = await upload(srv.url, await readFile(HEIC), "IMG_0002.heic");
    const server = createMcpServer({ client: new RelayClient({ baseUrl: srv.url }), agentName: "claude" });
    const [t1, t2] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "t", version: "1" });
    await Promise.all([server.connect(t1), client.connect(t2)]);
    type R = { content: { type: string; text?: string; mimeType?: string; data?: string }[] };
    const r = (await client.callTool({ name: "file_get", arguments: { id: a.sha256.slice(0, 12) } })) as R;
    expect(r.content[0]!.text).toContain("image/heic");
    expect(r.content[0]!.text).toContain("→ image/jpeg 2000×1000");
    expect(r.content[1]).toMatchObject({ type: "image", mimeType: "image/jpeg" });
    const small = (await client.callTool({ name: "file_get", arguments: { id: a.sha256, maxSize: 640 } })) as R;
    expect(small.content[0]!.text).toContain("640×320");
    await client.close();
  });
});

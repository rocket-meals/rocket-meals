// Dateiablage: Inhalte unter data/files/<sha256>, Metadaten unter data/files/<sha256>.json.
import { createHash, randomBytes } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Attachment, AttachmentPreview } from "../shared/types.ts";
import { StoreError } from "./errors.ts";
import { PREVIEW_MAX, imageInfo, isHeicData, isHeicMime, makePreview, wantsStoredPreview } from "./image.ts";

export interface FileMeta {
  sha256: string;
  mime: string;
  size: number;
  name: string;
  width?: number;
  height?: number;
  /** Abgeleitete JPEG-Vorschau (Original bleibt unverändert). */
  preview?: AttachmentPreview;
  /** Bei Vorschaudateien: sha256 des Originals. */
  derivedFrom?: string;
}

export function sanitizeName(name: string): string {
  // nur Dateiname, keine Pfade/Steuerzeichen
  const base = path.basename(name.replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (base || "datei").slice(0, 200);
}

const EXT_MIME: Record<string, string> = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
  ".log": "text/plain",
  ".ts": "text/plain",
  ".js": "text/javascript",
  ".py": "text/x-python",
  ".html": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".hif": "image/heif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
};

export function guessMime(name: string, fallback = "application/octet-stream"): string {
  return EXT_MIME[path.extname(name).toLowerCase()] ?? fallback;
}

export class FileStore {
  private metas = new Map<string, FileMeta>();

  private constructor(
    private dir: string,
    readonly maxBytes: number,
  ) {}

  static async open(dataDir: string, maxBytes: number): Promise<FileStore> {
    const fs = new FileStore(path.join(dataDir, "files"), maxBytes);
    await mkdir(fs.dir, { recursive: true });
    for (const n of await readdir(fs.dir)) {
      if (!n.endsWith(".json")) continue;
      try {
        const m = JSON.parse(await readFile(path.join(fs.dir, n), "utf8")) as FileMeta;
        fs.metas.set(m.sha256, m);
      } catch {
        // defekte Metadaten ignorieren
      }
    }
    return fs;
  }

  async put(data: Buffer, name: string, mime?: string): Promise<Attachment> {
    const meta = await this.store(data, name, mime);
    if (!meta.preview && !meta.derivedFrom && wantsStoredPreview(meta.mime, imageInfo(data, meta.mime))) {
      await this.addPreview(meta, data);
    }
    return toAttachment(meta, sanitizeName(name));
  }

  private async store(data: Buffer, name: string, mime?: string, extra: Partial<FileMeta> = {}): Promise<FileMeta> {
    if (data.length > this.maxBytes) {
      throw new StoreError(413, `Datei zu groß (${data.length} B, max. ${this.maxBytes} B)`);
    }
    const sha256 = createHash("sha256").update(data).digest("hex");
    const clean = sanitizeName(name);
    let type = (mime && mime !== "application/octet-stream" ? mime : guessMime(clean, mime)).split(";")[0]!.trim().toLowerCase();
    // iPhone-Fotos kommen oft als octet-stream oder mit falscher Endung → Magic Bytes entscheiden
    if (isHeicData(data) && !isHeicMime(type)) type = "image/heic";
    const file = path.join(this.dir, sha256);
    try {
      await access(file);
    } catch {
      const tmp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
      await writeFile(tmp, data);
      await rename(tmp, file);
    }
    const existing = this.metas.get(sha256);
    if (existing) return existing;
    const meta: FileMeta = { sha256, mime: type, size: data.length, name: clean, ...extra };
    const info = imageInfo(data, type);
    if (info) {
      const swap = info.orientation >= 5;
      meta.width = swap ? info.height : info.width;
      meta.height = swap ? info.width : info.height;
    }
    await this.saveMeta(meta);
    return meta;
  }

  private async saveMeta(meta: FileMeta): Promise<void> {
    await writeFile(path.join(this.dir, `${meta.sha256}.json`), JSON.stringify(meta));
    this.metas.set(meta.sha256, meta);
  }

  /** JPEG-Vorschau erzeugen und als eigene Datei verknüpfen; Fehler brechen den Upload nicht ab. */
  private async addPreview(meta: FileMeta, data: Buffer): Promise<void> {
    try {
      const p = await makePreview(data, meta.mime, PREVIEW_MAX);
      const base = meta.name.replace(/\.[^.]+$/, "");
      const pm = await this.store(p.data, `${base}.vorschau.jpg`, "image/jpeg", { derivedFrom: meta.sha256 });
      meta.width = p.sourceWidth;
      meta.height = p.sourceHeight;
      meta.preview = { sha256: pm.sha256, mime: pm.mime, size: pm.size, width: p.width, height: p.height };
      await this.saveMeta(meta);
    } catch (e) {
      console.error(`Vorschau für ${meta.name} fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Auflösen per vollem Hash oder eindeutigem Präfix (mind. 8 Zeichen). */
  resolve(ref: string): FileMeta {
    const key = ref.toLowerCase();
    const exact = this.metas.get(key);
    if (exact) return exact;
    if (/^[0-9a-f]{8,63}$/.test(key)) {
      const hits = [...this.metas.values()].filter((m) => m.sha256.startsWith(key));
      if (hits.length === 1) return hits[0]!;
      if (hits.length > 1) throw new StoreError(400, `Präfix ${ref} ist nicht eindeutig`);
    }
    throw new StoreError(404, `Datei ${ref} nicht gefunden`);
  }

  /**
   * Bild für Anzeige/Agenten: höchstens maxEdge lange Kante, aufrecht, JPEG/PNG.
   * Liefert das Original, wenn es schon passt, sonst gespeicherte oder frisch berechnete Vorschau.
   */
  async previewFor(meta: FileMeta, maxEdge: number): Promise<{ data: Buffer; mime: string; width: number; height: number }> {
    const orig = await readFile(this.pathOf(meta.sha256));
    const info = imageInfo(orig, meta.mime);
    if (info && info.orientation === 1 && Math.max(info.width, info.height) <= maxEdge) {
      return { data: orig, mime: meta.mime, width: info.width, height: info.height };
    }
    let source = orig;
    let sourceMime = meta.mime;
    if (meta.preview && maxEdge <= PREVIEW_MAX) {
      const stored = await readFile(this.pathOf(meta.preview.sha256)).catch(() => undefined);
      if (stored) {
        if (Math.max(meta.preview.width, meta.preview.height) <= maxEdge) {
          return { data: stored, mime: "image/jpeg", width: meta.preview.width, height: meta.preview.height };
        }
        // kleinere Variante aus der gespeicherten Vorschau rechnen (schneller als HEIC dekodieren)
        source = stored;
        sourceMime = "image/jpeg";
      }
    }
    const p = await makePreview(source, sourceMime, maxEdge);
    return { data: p.data, mime: "image/jpeg", width: p.width, height: p.height };
  }

  pathOf(sha256: string): string {
    return path.join(this.dir, sha256);
  }

  /** Anhang-Referenz prüfen und vervollständigen. */
  attachment(ref: { sha256: string; name?: string }): Attachment {
    const m = this.resolve(ref.sha256);
    return toAttachment(m, ref.name ? sanitizeName(ref.name) : m.name);
  }
}

function toAttachment(m: FileMeta, name: string): Attachment {
  const a: Attachment = { sha256: m.sha256, name, mime: m.mime, size: m.size };
  if (m.width && m.height) {
    a.width = m.width;
    a.height = m.height;
  }
  if (m.preview) a.preview = m.preview;
  return a;
}

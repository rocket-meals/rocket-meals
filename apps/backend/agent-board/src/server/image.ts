// Bildvorschauen ohne native Abhängigkeiten: HEIC per WASM (libheif-js), JPEG/PNG per reinem JS.
// sharp-Prebuilts können HEVC-HEIC nicht dekodieren (libde265 fehlt) – daher bewusst kein sharp.
import decodeHeic from "heic-decode";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

/** Lange Kante gespeicherter Vorschauen (und Standard für MCP file_get). */
export const PREVIEW_MAX = 2000;
const JPEG_QUALITY = 82;

const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"]);
const HEIC_MIME = /^image\/(heic|heif)(-sequence)?$/;

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface ImageInfo {
  width: number;
  height: number;
  /** EXIF-Orientierung 1–8 (nur JPEG). */
  orientation: number;
}

/** HEIC/HEIF an den Magic Bytes erkennen („ftyp“ + Marke). */
export function isHeicData(buf: Uint8Array): boolean {
  if (buf.length < 12) return false;
  if (String.fromCharCode(...buf.subarray(4, 8)) !== "ftyp") return false;
  return HEIC_BRANDS.has(String.fromCharCode(...buf.subarray(8, 12)));
}

export function isHeicMime(mime: string): boolean {
  return HEIC_MIME.test(mime);
}

/** Kann eine Vorschau erzeugt werden? */
export function isPreviewable(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/png" || isHeicMime(mime);
}

/** Abmessungen und EXIF-Orientierung aus dem Header (ohne zu dekodieren); nur JPEG/PNG. */
export function imageInfo(buf: Uint8Array, mime: string): ImageInfo | undefined {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (mime === "image/png") {
    if (buf.length < 24) return undefined;
    return { width: view.getUint32(16), height: view.getUint32(20), orientation: 1 };
  }
  if (mime !== "image/jpeg" || buf[0] !== 0xff || buf[1] !== 0xd8) return undefined;
  let orientation = 1;
  let pos = 2;
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff) return undefined;
    const marker = buf[pos + 1]!;
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) {
      pos += marker === 0xff ? 1 : 2;
      continue;
    }
    const len = view.getUint16(pos + 2);
    const seg = pos + 4;
    if (marker === 0xe1 && String.fromCharCode(...buf.subarray(seg, seg + 4)) === "Exif") {
      orientation = exifOrientation(view, seg + 6) ?? orientation;
    }
    // SOF0–SOF15 außer DHT/JPG/DAC
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (seg + 5 > buf.length) return undefined;
      return { height: view.getUint16(seg + 1), width: view.getUint16(seg + 3), orientation };
    }
    pos = seg + len - 2;
  }
  return undefined;
}

function exifOrientation(view: DataView, tiff: number): number | undefined {
  try {
    const le = view.getUint16(tiff) === 0x4949;
    const ifd = tiff + view.getUint32(tiff + 4, le);
    const count = view.getUint16(ifd, le);
    for (let i = 0; i < count; i++) {
      const e = ifd + 2 + i * 12;
      if (view.getUint16(e, le) === 0x0112) {
        const v = view.getUint16(e + 8, le);
        return v >= 1 && v <= 8 ? v : undefined;
      }
    }
  } catch {
    // kaputtes EXIF ignorieren
  }
  return undefined;
}

async function decode(buf: Uint8Array, mime: string): Promise<RgbaImage> {
  if (isHeicMime(mime) || isHeicData(buf)) {
    // libheif wendet irot/imir (Drehung im Container) selbst an
    const r = await decodeHeic({ buffer: buf });
    return { width: r.width, height: r.height, data: new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength) };
  }
  if (mime === "image/png") {
    const p = PNG.sync.read(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength));
    return { width: p.width, height: p.height, data: p.data };
  }
  if (mime === "image/jpeg") {
    const j = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1536, maxResolutionInMP: 200 });
    return { width: j.width, height: j.height, data: j.data };
  }
  throw new Error(`Keine Vorschau für ${mime}`);
}

/** Verkleinern per Flächenmittel (Box-Filter); nie vergrößern. */
export function resize(img: RgbaImage, maxEdge: number): RgbaImage {
  const { width: w, height: h, data } = img;
  const scale = Math.max(w, h) / maxEdge;
  if (scale <= 1) return img;
  const tw = Math.max(1, Math.round(w / scale));
  const th = Math.max(1, Math.round(h / scale));
  const xs = new Int32Array(tw + 1);
  for (let i = 0; i <= tw; i++) xs[i] = Math.min(w, Math.floor((i * w) / tw));
  const out = new Uint8Array(tw * th * 4);
  const acc = new Float64Array(tw * 4);
  for (let ty = 0; ty < th; ty++) {
    const y0 = Math.floor((ty * h) / th);
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * h) / th));
    acc.fill(0);
    for (let y = y0; y < y1; y++) {
      const row = y * w * 4;
      for (let tx = 0; tx < tw; tx++) {
        const a = tx * 4;
        const xe = Math.max(xs[tx]! + 1, xs[tx + 1]!);
        for (let x = xs[tx]!; x < xe; x++) {
          const p = row + x * 4;
          acc[a] = acc[a]! + data[p]!;
          acc[a + 1] = acc[a + 1]! + data[p + 1]!;
          acc[a + 2] = acc[a + 2]! + data[p + 2]!;
          acc[a + 3] = acc[a + 3]! + data[p + 3]!;
        }
      }
    }
    for (let tx = 0; tx < tw; tx++) {
      const n = (y1 - y0) * (Math.max(xs[tx]! + 1, xs[tx + 1]!) - xs[tx]!);
      const o = (ty * tw + tx) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = Math.round(acc[tx * 4 + c]! / n);
    }
  }
  return { width: tw, height: th, data: out };
}

/** EXIF-Orientierung anwenden (2–8), Ergebnis aufrecht. */
export function orient(img: RgbaImage, o: number): RgbaImage {
  if (o < 2 || o > 8) return img;
  const { width: w, height: h, data } = img;
  const swap = o >= 5;
  const ow = swap ? h : w;
  const oh = swap ? w : h;
  const out = new Uint8Array(data.length);
  // Uint32-Sicht braucht 4-Byte-Ausrichtung
  const aligned = data.byteOffset % 4 === 0 ? data : data.slice();
  const src = new Uint32Array(aligned.buffer, aligned.byteOffset, w * h);
  const dst = new Uint32Array(out.buffer);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx: number, ny: number;
      switch (o) {
        case 2: nx = w - 1 - x; ny = y; break;
        case 3: nx = w - 1 - x; ny = h - 1 - y; break;
        case 4: nx = x; ny = h - 1 - y; break;
        case 5: nx = y; ny = x; break;
        case 6: nx = h - 1 - y; ny = x; break;
        case 7: nx = h - 1 - y; ny = w - 1 - x; break;
        default: nx = y; ny = w - 1 - x; break; // 8
      }
      dst[ny * ow + nx] = src[y * w + x]!;
    }
  }
  return { width: ow, height: oh, data: out };
}

/** RGBA → JPEG (Transparenz auf Weiß). */
export function encodeJpeg(img: RgbaImage, quality = JPEG_QUALITY): Buffer {
  const d = img.data;
  const rgba = Buffer.alloc(d.length);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]! / 255;
    const bg = 255 * (1 - a);
    rgba[i] = d[i]! * a + bg;
    rgba[i + 1] = d[i + 1]! * a + bg;
    rgba[i + 2] = d[i + 2]! * a + bg;
    rgba[i + 3] = 255;
  }
  return jpeg.encode({ data: rgba, width: img.width, height: img.height }, quality).data;
}

export interface Preview {
  data: Buffer;
  width: number;
  height: number;
  /** Maße des Originals (aufrecht). */
  sourceWidth: number;
  sourceHeight: number;
}

// Dekodieren großer Fotos braucht viel Speicher → nacheinander abarbeiten
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

/** JPEG-Vorschau: dekodieren, auf maxEdge verkleinern, EXIF-Drehung anwenden. */
export function makePreview(buf: Uint8Array, mime: string, maxEdge = PREVIEW_MAX): Promise<Preview> {
  return serial(async () => {
    const orientation = mime === "image/jpeg" ? (imageInfo(buf, mime)?.orientation ?? 1) : 1;
    const full = await decode(buf, mime);
    const img = orient(resize(full, maxEdge), orientation);
    const swap = orientation >= 5;
    return {
      data: encodeJpeg(img),
      width: img.width,
      height: img.height,
      sourceWidth: swap ? full.height : full.width,
      sourceHeight: swap ? full.width : full.height,
    };
  });
}

/** Wird beim Upload eine Vorschau gespeichert? HEIC immer, JPEG/PNG nur bei großen Fotos. */
export function wantsStoredPreview(mime: string, info: ImageInfo | undefined): boolean {
  if (isHeicMime(mime)) return true;
  return !!info && Math.max(info.width, info.height) > PREVIEW_MAX;
}

// Typen für heic-decode (libheif-js als WASM, liefert RGBA).
declare module "heic-decode" {
  interface DecodedImage {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }
  function decode(opts: { buffer: Uint8Array | ArrayBuffer }): Promise<DecodedImage>;
  export default decode;
}

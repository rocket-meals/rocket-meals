// Fachlicher Fehler mit HTTP-Status (Store/Dateien).
export class StoreError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

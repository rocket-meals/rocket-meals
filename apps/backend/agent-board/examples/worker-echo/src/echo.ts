// Eigentliche „Verarbeitung“ des Beispiel-Providers echo/v1: Text umdrehen (Unicode-sicher, Graphem-Cluster).
export function reverseText(text: string): string {
  const seg = new Intl.Segmenter("de", { granularity: "grapheme" });
  return [...seg.segment(text)].map((s) => s.segment).reverse().join("");
}

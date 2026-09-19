export type PdfGeneratorOptions = {
  format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid';
  landscape?: boolean;
  printBackground?: boolean;
  /** Must be true for `headerTemplate`/`footerTemplate` to be printed at all. */
  displayHeaderFooter?: boolean;
  /**
   * HTML that Chromium repeats on every page. It is rendered in its own document, so it needs
   * inline styles and an explicit font-size; the classes `pageNumber` and `totalPages` are
   * filled in by Chromium. The margin on that side has to leave room for it.
   */
  headerTemplate?: string;
  footerTemplate?: string;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
};

export type RequestOptions = {
  bearerToken?: string | null;
  mockImageResolution?: boolean; // if true, images are mocked with a placeholder image
};
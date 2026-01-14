export type PdfGeneratorOptions = {
  format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid';
  landscape?: boolean;
  printBackground?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
};

export type RequestOptions = {
  bearerToken?: string | null | undefined;
  mockImageResolution?: boolean; // if true, images are mocked with a placeholder image
};
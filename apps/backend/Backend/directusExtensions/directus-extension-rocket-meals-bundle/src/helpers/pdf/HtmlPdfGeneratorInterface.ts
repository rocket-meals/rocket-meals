import { PdfGeneratorOptions, RequestOptions } from './PdfGeneratorInterfaces';

export type GeneratePdfFromHtmlProps = {
  html: string;
  requestOptions: RequestOptions;
  options?: PdfGeneratorOptions;
};

export interface HtmlPdfGeneratorInterface {
  generatePdfFromHtml(
    data: GeneratePdfFromHtmlProps
  ): Promise<Buffer>;
}

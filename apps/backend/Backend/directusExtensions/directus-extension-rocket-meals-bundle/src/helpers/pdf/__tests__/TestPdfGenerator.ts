// small jest test
import { describe, expect, it } from '@jest/globals';
import { getTestHtmlForBaseGermanMarkdownContent } from '../../html/__tests__/TestHtmlTemplates';
import { TestArtifacts } from '../../TestArtifacts';
import { HtmlTemplatesEnum } from '../../html/HtmlGenerator';
import { PdfGeneratorForJest } from '../PdfGeneratorHelperForJest';
import { PdfGeneratorHelper } from '../PdfGeneratorHelper';
import {GeneratePdfFromHtmlProps} from "../HtmlPdfGeneratorInterface";

const TIMEOUT = 60*1000;

PdfGeneratorForJest.activateForJest(); // activate puppeteer for jest tests

describe('Pdf Generator Test', () => {
//describe('dev', () => {
  it('Test pdf generation from html', async () => {
    let html = await getTestHtmlForBaseGermanMarkdownContent();
    let requestOptions = {
      mockImageResolution: true, // mock image resolution to avoid loading real images
    };
    let data: GeneratePdfFromHtmlProps = {
      html,
      requestOptions,
    };
    let pdfBuffer = await PdfGeneratorHelper.generatePdfFromHtml(data);
    expect(pdfBuffer).toBeTruthy();
    let savePath = TestArtifacts.saveTestArtifact(pdfBuffer, 'pdf/' + HtmlTemplatesEnum.BASE_GERMAN_MARKDOWN_CONTENT + '.pdf');

    expect(true).toBeTruthy();
  }, TIMEOUT);
});

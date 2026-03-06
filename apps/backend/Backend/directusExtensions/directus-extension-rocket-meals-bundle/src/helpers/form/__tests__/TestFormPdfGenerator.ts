// small jest test
import { describe, expect, it } from '@jest/globals';
import { TestArtifacts } from '../../TestArtifacts';
import { FormHelper } from '../FormHelper';
import { PdfGeneratorForJest } from '../../pdf/PdfGeneratorHelperForJest';
import { MyDatabaseTestableHelper } from '../../MyDatabaseHelperInterface';
import { FormHelperCommon } from 'repo-depkit-common';

PdfGeneratorForJest.activateForJest(); // activate puppeteer for jest tests

describe('Pdf Generator Test', () => {
//describe('dev', () => {
  it('Test pdf generation from html', async () => {
    let testForm = FormHelper.getExampleForm();
    let testFormExtractRelevantInformation = FormHelper.getExampleFormExtractRelevantInformation();
    let myDatabaseTestableHelperInterface = new MyDatabaseTestableHelper();

    let requestOptions = {
      mockImageResolution: true, // mock image resolution to avoid loading real images
    };

    let pdfBuffer = await FormHelper.generatePdfFromForm({
      form: testForm,
      formExtractRelevantInformation: testFormExtractRelevantInformation,
      myDatabaseHelperInterface: myDatabaseTestableHelperInterface,
      requestOptions,
    });
    expect(pdfBuffer).toBeTruthy();
    let savePath = TestArtifacts.saveTestArtifact(pdfBuffer, 'form/pdf/' + 'example-form' + '.pdf');
    expect(true).toBeTruthy();
  });

  it('Signature fields are exported as images without size transformation', async () => {
    let testForm = FormHelper.getExampleForm();
    let myDatabaseTestableHelperInterface = new MyDatabaseTestableHelper();
    let serverUrl = myDatabaseTestableHelperInterface.getServerUrl();
    let signatureFileId = 'test-signature-uuid-1234';

    let formExtractRelevantInformation = FormHelper.getExampleFormExtractRelevantInformation();

    // Find the signature field in example data and replace with a DirectusFiles object to test URL generation
    let signatureFieldEntry = formExtractRelevantInformation.find(
      f => f.form_field.field_type === FormHelperCommon.FORM_FIELD_TYPE.FILES_IMAGE_SIGNATURE
    );
    expect(signatureFieldEntry).toBeTruthy();
    if (signatureFieldEntry) {
      signatureFieldEntry.form_answer.value_image = { id: signatureFileId } as any;
    }

    let regularImageFieldEntry = formExtractRelevantInformation.find(
      f => f.form_field.field_type === FormHelperCommon.FORM_FIELD_TYPE.FILES_IMAGE
    );
    let imageFileId = 'test-image-uuid-5678';
    if (regularImageFieldEntry) {
      regularImageFieldEntry.form_answer.value_image = { id: imageFileId } as any;
    }

    let markdownContent = await FormHelper.generateMarkdownContentFromForm(testForm, formExtractRelevantInformation, myDatabaseTestableHelperInterface);

    // Signature should be exported as an image without size transformation
    let signatureExpectedUrl = `${serverUrl}/assets/${signatureFileId}`;
    expect(markdownContent).toContain(`![${signatureFieldEntry?.form_field.alias}](${signatureExpectedUrl})`);
    expect(markdownContent).not.toContain(`${signatureExpectedUrl}?`); // No query params (no transform)

    // Regular image should still have size transformation
    let imageExpectedUrl = `${serverUrl}/assets/${imageFileId}?width=1024&height=1024`;
    expect(markdownContent).toContain(`![${regularImageFieldEntry?.form_field.alias}](${imageExpectedUrl})`);
  });
});

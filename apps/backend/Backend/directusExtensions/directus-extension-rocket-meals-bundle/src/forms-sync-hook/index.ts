import { defineHook } from '@directus/extensions-sdk';
import { EnvVariableHelper, SyncForCustomerEnum } from '../helpers/EnvVariableHelper';
import { FormSyncHannover } from './customers/hannover/FormSyncHannover';
import { registerHookToCreateFormAnswersForFormSubmission } from './RegisterHookCreateFormSubmissionsFormAnswers';
import { CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import { FormSubmissionState } from './FormImportTypes';
import { RegisterFunctions } from '@directus/extensions';
import { ApiContext } from '../helpers/ApiContext';
import { PrimaryKey } from '@directus/types';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { TranslationHelper } from '../helpers/TranslationHelper';
import { FormHelper } from '../helpers/form/FormHelper';
import { MyFileTypes } from '../helpers/FilesServiceHelper';
import {MyDefineHook} from "../helpers/MyDefineHook";
const HOOK_NAME = 'forms-sync-hook';

function registerHookPresentCreateFormSubmissionIllegalState(registerFunctions: RegisterFunctions, apiContext: ApiContext) {
  registerFunctions.filter<Partial<DatabaseTypes.FormSubmissions>>(CollectionNames.FORM_SUBMISSIONS + '.items.create', async (input, meta, eventContext) => {
    if (input.state !== FormSubmissionState.DRAFT && !!input.state) {
      // if state is set and not draft -> throw error
      throw new Error('Only form submissions with state draft are allowed to be created.');
    }
    return input;
  });
}

function registerHookPreventUpdateFormSubmissionIllegalState(registerFunctions: RegisterFunctions, apiContext: ApiContext) {
  registerFunctions.filter<Partial<DatabaseTypes.FormSubmissions>>(CollectionNames.FORM_SUBMISSIONS + '.items.update', async (input, meta, eventContext) => {
    let myDatabaseHelper = new MyDatabaseHelper(apiContext, eventContext);
    let form_submission_ids = meta.keys as PrimaryKey[];
    for (let form_submission_id of form_submission_ids) {
      let formSubmission = await myDatabaseHelper.getFormsSubmissionsHelper().readOne(form_submission_id);
      if (formSubmission.state === FormSubmissionState.SYNCING) {
        if (!!input.state) {
          if (input.state === FormSubmissionState.CLOSED || input.state === FormSubmissionState.FAILED) {
            // Only allow to set the state to closed or failed
          } else {
            throw new Error('Form submission is in state syncing. It is not allowed to update the form submission. Please set the state to closed.');
          }
        }
      }
    }
    return input;
  });
}

function registerHookHandleFormSubmissionDateSubmitted(registerFunctions: RegisterFunctions, apiContext: ApiContext) {
  // Handle the update of the form submission state
  registerFunctions.filter<Partial<DatabaseTypes.FormSubmissions>>(CollectionNames.FORM_SUBMISSIONS + '.items.update', async (input, meta, eventContext) => {
    if (input.state === FormSubmissionState.SUBMITTED) {
      input.date_submitted = new Date().toISOString();
    }
    if (input.state === FormSubmissionState.DRAFT) {
      input.date_submitted = null;
    }
    return input;
  });
}

function registerHookCheckAllRequiredFieldsAreFilled(registerFunctions: RegisterFunctions, apiContext: ApiContext) {
  // Check if all required fields are filled
  registerFunctions.filter<Partial<DatabaseTypes.FormSubmissions>>(CollectionNames.FORM_SUBMISSIONS + '.items.update', async (input, meta, eventContext) => {
    // only if state is set to submitted
    if (input.state === FormSubmissionState.SUBMITTED) {
      if (!!input.form_answers) {
        // tell user to first create/save the form answers
        throw new Error('Please first create/save the form answers.');
      }

      let myDatabaseHelper = new MyDatabaseHelper(apiContext, eventContext);
      let form_submission_ids = meta.keys as PrimaryKey[];
      for (let form_submission_id of form_submission_ids) {
        let formSubmission = await myDatabaseHelper.getFormsSubmissionsHelper().readOne(form_submission_id);
        let form_id = formSubmission.form;
        if (!form_id) {
          throw new Error('Form submission has no form id.');
        }

        // Get the answers of the user
        let form_answers = await myDatabaseHelper.getFormsAnswersHelper().findItems({
          form_submission: formSubmission.id,
        });
        // Get the form fields of the form
        let form_fields = await myDatabaseHelper.getFormsFieldsHelper().findItems({
          form: form_id,
        });

        let required_form_fields = form_fields.filter(ff => ff.is_required);
        for (let required_form_field of required_form_fields) {
          let form_field_id = required_form_field.id;
          let form_answer = form_answers.find(fa => fa.form_field === form_field_id);
          if (!form_answer) {
            throw new Error('Required form answer not found for form field with alias: ' + required_form_field.alias + ' (id: ' + required_form_field.id + ')');
          }
          let value_string_is_set = form_answer.value_string !== null && form_answer.value_string !== undefined;
          let value_number_is_set = form_answer.value_number !== null && form_answer.value_number !== undefined;
          let value_date_is_set = form_answer.value_date !== null && form_answer.value_date !== undefined;
          let value_boolean_is_set = form_answer.value_boolean !== null && form_answer.value_boolean !== undefined;
          let value_custom_is_set = form_answer.value_custom !== null && form_answer.value_custom !== undefined;
          let value_files_is_set = form_answer.value_files !== null && form_answer.value_files !== undefined;
          let value_image_is_set = form_answer.value_image !== null && form_answer.value_image !== undefined;
          let value_is_set = value_string_is_set || value_number_is_set || value_date_is_set || value_boolean_is_set || value_custom_is_set || value_files_is_set || value_image_is_set;
          if (!value_is_set) {
            throw new Error('Please fill out the required form field with alias: ' + required_form_field.alias + ' (id: ' + required_form_field.id + ')');
          }
        }
      }
    }

    return input;
  });
}

function registerHookSetStateToSynchingAfterFormSubmission(registerFunctions: RegisterFunctions, apiContext: ApiContext) {
  registerFunctions.action(CollectionNames.FORM_SUBMISSIONS + '.items.update', async (meta, context) => {
    console.log('Set state to syncing after form submission');
    let myDatabaseHelper = new MyDatabaseHelper(apiContext, context);
    let form_submission_ids = meta.keys as PrimaryKey[];
    for (let form_submission_id of form_submission_ids) {
      let formSubmission = await myDatabaseHelper.getFormsSubmissionsHelper().readOne(form_submission_id);
      if (formSubmission.state === FormSubmissionState.SUBMITTED) {
        console.log('Set state to syncing for form submission id: ' + form_submission_id);
        await myDatabaseHelper.getFormsSubmissionsHelper().updateOne(form_submission_id, {
          state: FormSubmissionState.SYNCING,
        });
      }
    }
  });
}

export type FormExtractFormAnswerValueFileSingle = {
  directus_files_id: string;
  form_answers_id: string;
  id: number;
};
export type FormExtractFormAnswerValueFileSingleOrString = FormExtractFormAnswerValueFileSingle | string;
export type FormExtractFormAnswer = Omit<DatabaseTypes.FormAnswers, 'value_image' | 'value_files'> & {
  value_image: DatabaseTypes.DirectusFiles | undefined | null;
  value_files: FormExtractFormAnswerValueFileSingleOrString[];
};
export type FormExtractRelevantInformationSingle = {
  form_field_id: string;
  sort: number | null | undefined;
  form_field: DatabaseTypes.FormFields;
  form_answer: FormExtractFormAnswer;
};
export type FormExtractRelevantInformation = FormExtractRelevantInformationSingle[];

function registerHookSendMailAfterFormSubmissionStateSyncing(registerFunctions: RegisterFunctions, apiContext: ApiContext) {
  // TODO: Move this into a workflow instead of a hook
  registerFunctions.action(CollectionNames.FORM_SUBMISSIONS + '.items.update', async (meta, context) => {
    console.log('Send mail after form submission state syncing');
    let myDatabaseHelper = new MyDatabaseHelper(apiContext, context);
    let form_submissions_ids = meta.keys as PrimaryKey[];
    for (let form_submission_id of form_submissions_ids) {
      console.log('Check Form submission id: ' + form_submission_id);
      let formSubmission = await myDatabaseHelper.getFormsSubmissionsHelper().readOne(form_submission_id);
      if (formSubmission.state === FormSubmissionState.SYNCING) {
        try {
          console.log('Form submission is syncing. Prepare mail.');
          let form_id: string | undefined;
          if (formSubmission.form) {
            if (typeof formSubmission.form === 'string') {
              form_id = formSubmission.form;
            } else {
              form_id = formSubmission.form.id;
            }
          }
          if (!form_id) {
            throw new Error('Form submission has no form id.');
          }

          // Get the form
          console.log('Get form');
          let form_with_translations = await myDatabaseHelper.getFormsHelper().readOneWithTranslations(form_id);

          // Get the answers of the user
          console.log('Get form answers');
          let form_answers_raw = await myDatabaseHelper.getFormsAnswersHelper().findItems(
            {
              form_submission: formSubmission.id,
            },
            {
              fields: ['*', 'value_image.*', 'value_files.*'], // this allows us to parse as FormExtractFormAnswer
            }
          );
          let form_answers: FormExtractFormAnswer[] = form_answers_raw as FormExtractFormAnswer[];

          //console.log("Form answers: ");
          //console.log(JSON.stringify(form_answers, null, 2));

          /**
           *  Form answers:
           *  [
           *    {
           *      "date_created": "2025-05-13T15:42:17.078Z",
           *      "date_updated": "2025-05-13T15:42:42.560Z",
           *      "form_field": "5aa6c42e-9316-4e19-b012-33e6d3a6a3c4",
           *      "form_submission": "854f22c6-51ac-4b18-97b1-b3695cc2c5ca",
           *      "id": "486e0a7d-cf7c-4c80-b56d-82b9fb458faf",
           *      "sort": null,
           *      "status": "published",
           *      "user_created": "b49bcb9c-97d7-4809-9c64-30cc38c9ad76",
           *      "user_updated": "b49bcb9c-97d7-4809-9c64-30cc38c9ad76",
           *      "value_boolean": null,
           *      "value_custom": null,
           *      "value_date": null,
           *      "value_number": null,
           *      "value_string": null,
           *      "value_files": [
           *        {
           *          "directus_files_id": "24794e32-0db9-4e76-9a35-27545b99e4dd",
           *          "form_answers_id": "486e0a7d-cf7c-4c80-b56d-82b9fb458faf",
           *          "id": 10
           *        }
           *      ],
           *      "value_image": null
           *    },
           *    {
           *      "date_created": "2025-05-13T15:42:17.071Z",
           *      "date_updated": "2025-05-13T15:42:42.568Z",
           *      "form_field": "d5cda419-7a66-4208-b528-b293ead52844",
           *      "form_submission": "854f22c6-51ac-4b18-97b1-b3695cc2c5ca",
           *      "id": "32ab94fc-1273-405e-a9a7-0f0c2149ebdd",
           *      "sort": null,
           *      "status": "published",
           *      "user_created": "b49bcb9c-97d7-4809-9c64-30cc38c9ad76",
           *      "user_updated": "b49bcb9c-97d7-4809-9c64-30cc38c9ad76",
           *      "value_boolean": null,
           *      "value_custom": null,
           *      "value_date": null,
           *      "value_number": null,
           *      "value_string": "Test",
           *      "value_files": [],
           *      "value_image": null
           *    }
           *  ]
           */

          // Get the form fields of the form
          console.log('Get form fields');
          let form_fields = await myDatabaseHelper.getFormsFieldsHelper().findItems(
            {
              form: form_id,
            },
            { withTranslations: true }
          ); // with translations of the form fields

          // send mail
          // get form extracts and send mail according to the form extract fields
          console.log('Get form extracts');
          let formExtracts = await myDatabaseHelper.getFormExtractsHelper().findItems({
            form: form_id,
          });

          for (let form_extract of formExtracts) {
            let form_extract_id = form_extract.id;

            let recipient_emails: string[] = [];

            let recipient_email_static = form_extract.recipient_email_static;
            if (recipient_email_static) {
              recipient_emails.push(recipient_email_static);
            }

            let recipient_email_field_id = form_extract.recipient_email_field; // if the recipient email is dynamic and set by the user in the form
            let dynamic_email_dynamic: string | undefined | null = undefined;
            if (recipient_email_field_id) {
              let form_answer_recipient_email = form_answers.find(fa => fa.form_field === recipient_email_field_id);
              if (!form_answer_recipient_email) {
                throw new Error('Recipient email field not found for id: ' + recipient_email_field_id);
              }
              dynamic_email_dynamic = form_answer_recipient_email.value_string;
              if (dynamic_email_dynamic) {
                recipient_emails.push(dynamic_email_dynamic);
              }
            }

            const recipient_user_raw = form_extract.recipient_user; // if the recipient email is the user who submitted the form
            if (recipient_user_raw) {
              let recipient_user: DatabaseTypes.DirectusUsers | null = null;
              if (typeof recipient_user_raw === 'string') {
                let user = await myDatabaseHelper.getUsersHelper().readOne(recipient_user_raw);
                if (!user) {
                  throw new Error('User not found for id: ' + recipient_user_raw);
                }
                recipient_user = user;
              }
              if (recipient_user) {
                let email = recipient_user.email;
                if (email) {
                  recipient_emails.push(email);
                }
              }
            }

            let atleast_one_recipient_email = recipient_emails.length > 0;
            if (!atleast_one_recipient_email) {
              throw new Error('No recipient email found for form extract id: ' + form_extract_id);
            }

            console.log('Get form_extract_form_fields for form_extract id: ' + form_extract_id);
            let relevant_form_fields: DatabaseTypes.FormFields[] = [];
            if (form_extract.all_fields) {
              relevant_form_fields = form_fields;
            } else {
              let formExtractFields = await myDatabaseHelper.getFormExtractFormFieldsHelper().findItems({
                form_extracts_id: form_extract_id,
              });
              for (let formExtractField of formExtractFields) {
                let form_field_id = formExtractField.form_fields_id;
                let form_field = form_fields.find(ff => ff.id === form_field_id);
                if (!form_field) {
                  throw new Error('Form field not found for id: ' + form_field_id);
                }
                relevant_form_fields.push(form_field);
              }
            }

            let form_answers_relevant_for_form_extract: FormExtractRelevantInformation = [];
            for (let relevant_form_field of relevant_form_fields) {
              let form_field_id = relevant_form_field.id;
              let form_answer = form_answers.find(fa => fa.form_field === form_field_id);
              if (!form_answer) {
                throw new Error('Form answer not found for form field id: ' + form_field_id);
              }
              form_answers_relevant_for_form_extract.push({
                form_field_id: form_field_id,
                sort: relevant_form_field.sort,
                form_field: relevant_form_field,
                form_answer: form_answer,
              });
            }

            // sort the form answers by the sort of the form fields
            form_answers_relevant_for_form_extract.sort((a, b) => {
              if (a.sort === null || a.sort === undefined) {
                return 1;
              }
              if (b.sort === null || b.sort === undefined) {
                return -1;
              }
              // smaller sort values come first
              return a.sort - b.sort;
            });

            // So now we have the fields and answers relevant for the
            await sendFormExtractMail(form_with_translations, form_extract, formSubmission, form_answers_relevant_for_form_extract, recipient_emails, myDatabaseHelper);
          }

          // set state to closed
          console.log('Set form submission state to closed');
          await myDatabaseHelper.getFormsSubmissionsHelper().updateOneWithoutHookTrigger({
            primary_key: formSubmission.id,
            update: {
              state: FormSubmissionState.CLOSED,
            },
          });
        } catch (e: any) {
          console.error('Error while sending mail after form submission state syncing: ' + e.toString());
          console.error(e);
        }
        // set state to closed on error
        console.log('Set form submission state to closed on error');
        await myDatabaseHelper.getFormsSubmissionsHelper().updateOneWithoutHookTrigger({
            primary_key: formSubmission.id,
            update: {
                state: FormSubmissionState.CLOSED,
            }
        });
      }
    }
  });
}

async function sendFormExtractMail(form: DatabaseTypes.Forms, formExtract: DatabaseTypes.FormExtracts, formSubmission: DatabaseTypes.FormSubmissions, formExtractRelevantInformation: FormExtractRelevantInformation, recipient_emails: string[], myDatabaseHelper: MyDatabaseHelper) {
  console.log('Send mail for form extract');
  let form_translated_name = TranslationHelper.getTranslation(form.translations, TranslationHelper.LANGUAGE_CODE_DE, 'name');
  let form_alias = form.alias;
  let form_name = form_translated_name || form_alias || 'Form submission';

  let subject = form_name;
  let form_submission_alias = formSubmission.alias;
  if (form_submission_alias) {
    subject += ' - ' + form_submission_alias;
  }
  console.log('Subject: ' + subject);

  let internalMyDatabaseHelper = myDatabaseHelper.cloneWithInternalServerMode();
  // we need the internal server mode to generate the pdf, as traefik does not route the request correctly
  // TODO: Fix traefik configuration or add server to extra_hosts in docker-compose
  let pdfBuffer = await FormHelper.generatePdfFromForm({
    form,
    formExtractRelevantInformation,
    myDatabaseHelperInterface: internalMyDatabaseHelper,
  });

  console.log('recipient_emails: ');
  console.log(recipient_emails);
  for (let recipient_email of recipient_emails) {
    console.log('Send mail to: ' + recipient_email);
    let newFile = await myDatabaseHelper.getFilesHelper().uploadOneFromBuffer(pdfBuffer, form_name + '.pdf', MyFileTypes.PDF, myDatabaseHelper);
    let attachments = {
      create: [
        {
          mails_id: '+',
          directus_files_id: {
            id: newFile,
          },
        },
      ],
      update: [],
      delete: [],
    };

    let send_attachments_as_links = !!formExtract?.send_attachments_as_links;
    let mail: Partial<DatabaseTypes.Mails> = {
      recipient: recipient_email,
      markdown_content: 'Anbei finden Sie eine Kopie des Formulars: ' + form_name + '\n\n',
      subject: subject,
      send_attachments_as_links: send_attachments_as_links,
      form_submission: formSubmission.id,
      // @ts-ignore - thats how directus allows to set attachments
      attachments: attachments,
    };
    console.log('Send mail to: ' + recipient_email);
    let mail_id = await myDatabaseHelper.sendMail(mail);
    console.log('Mail id: ' + mail_id);
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(HOOK_NAME,async (registerFunctions, apiContext) => {
  // Allow only drafts to be created
  registerHookToCreateFormAnswersForFormSubmission(registerFunctions, apiContext);

  // Allow only drafts to be created
  registerHookPresentCreateFormSubmissionIllegalState(registerFunctions, apiContext);

  // Set the date_submitted to now
  registerHookHandleFormSubmissionDateSubmitted(registerFunctions, apiContext);

  // Check if all required fields are filled
  registerHookCheckAllRequiredFieldsAreFilled(registerFunctions, apiContext);

  // Prevent update of form submission if state is syncing, only allow to set state to closed
  registerHookPreventUpdateFormSubmissionIllegalState(registerFunctions, apiContext);

  // Set the state to syncing after form submission
  registerHookSetStateToSynchingAfterFormSubmission(registerFunctions, apiContext);

  // Send mail after form submission state syncing
  registerHookSendMailAfterFormSubmissionStateSyncing(registerFunctions, apiContext);

  switch (EnvVariableHelper.getSyncForCustomer()) {
    case SyncForCustomerEnum.HANNOVER:
      FormSyncHannover.registerHooks(registerFunctions, apiContext);
      break;
    default:
      break;
  }
});

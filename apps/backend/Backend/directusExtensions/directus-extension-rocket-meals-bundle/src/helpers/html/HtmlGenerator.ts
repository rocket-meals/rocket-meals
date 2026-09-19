import { Liquid } from 'liquidjs';
import path from 'node:path';
import fse from 'fs-extra';
import { PathHelper } from '../PathHelper';
import { MarkdownHelper } from './MarkdownHelper';
import { MyDatabaseTestableHelperInterface } from '../MyDatabaseHelperInterface';
import { ServerInfo } from '../ItemsServiceCreator';
import { DirectusFilesAssetHelper, DirectusFilesAssetHelperOptions } from '../DirectusFilesAssetHelper';

export enum HtmlTemplatesEnum {
  BASE_GERMAN = 'base-german',
  BASE_GERMAN_MARKDOWN_CONTENT = 'base-german-markdown-content',
  CANTEEN_FOOD_FEEDBACK_REPORT = 'canteen-food-feedback-report',
  FORM_DOCUMENT = 'form-document',
  APP_FEEDBACKS = 'app-feedbacks',
}

export class BaseGermanMarkdownTemplateHelper {
  public static readonly TEMPLATE_MARKDOWN_FIELD = 'mailContentFieldRenderedAsHtml';

  public static getTemplateDataForMarkdownContent(markdownContent: string): {
    [key: string]: any;
  } {
    const markdown = MarkdownHelper.renderMarkdownTextToHtml(markdownContent);

    return {
      [BaseGermanMarkdownTemplateHelper.TEMPLATE_MARKDOWN_FIELD]: markdown,
    };
  }
}

export const DEFAULT_HTML_TEMPLATE = HtmlTemplatesEnum.BASE_GERMAN_MARKDOWN_CONTENT;

export const HTML_TEMPLATE_FILE_ENDING = '.liquid';

export type HtmlGeneratorOptions = DirectusFilesAssetHelperOptions;

export class HtmlGenerator {
  public static getPathToHtmlTemplates(): string {
    return PathHelper.getPathToLiquidTemplates();
  }

  public static async getDefaultTemplateData(myDatabaseHelperInterface: MyDatabaseTestableHelperInterface): Promise<{ [key: string]: any }> {
    let serverInfo: ServerInfo = await myDatabaseHelperInterface.getServerInfo();

    const projectLogoAssetId = serverInfo?.project?.project_logo;
    let projectLogoImageUrl: string | null = null;
    if (projectLogoAssetId) {
      projectLogoImageUrl = DirectusFilesAssetHelper.getDirectAssetUrlById(projectLogoAssetId, myDatabaseHelperInterface);
    }

    // https://docs.directus.io/guides/extensions/email-template.html#variables-in-templates
    // we want to use the same variables as in the directus email templates
    return {
      // SYSTEM VARIABLES DEFINED BY DIRECTUS
      projectName: serverInfo?.project?.project_name || 'Rocket Meals',
      project_color: serverInfo?.project?.project_color || '#D14610',
      projectLogo: projectLogoImageUrl || null,
      projectUrl: null, // We don't want to show the backend link in the emails
      // CUSTOM VARIABLES START HERE
      server_url_external: myDatabaseHelperInterface.getServerUrl(), // currently not used
    };
  }

  public static isValidHtmlTemplate(template: string | null | undefined): boolean {
    if (!template) {
      return false;
    }
    return Object.values(HtmlTemplatesEnum).includes(template as HtmlTemplatesEnum);
  }

  public static getHtmlTemplate(template: string | null | undefined): HtmlTemplatesEnum {
    if (!this.isValidHtmlTemplate(template)) {
      return DEFAULT_HTML_TEMPLATE;
    } else {
      return template as HtmlTemplatesEnum;
    }
  }

  public static async generateHtml(variables: { [key: string]: any }, myDatabaseHelperInterface: MyDatabaseTestableHelperInterface, template?: HtmlTemplatesEnum | null | undefined): Promise<string> {
    const rootPath = HtmlGenerator.getPathToHtmlTemplates();

    const liquidEngine = new Liquid({
      root: [rootPath],
      extname: '.liquid',
    });

    if (!template) {
      template = DEFAULT_HTML_TEMPLATE;
    }

    const defaultTemplateData = await this.getDefaultTemplateData(myDatabaseHelperInterface);

    variables = {
      ...defaultTemplateData,
      ...variables,
    };

    const systemTemplatePath = path.join(rootPath, template + HTML_TEMPLATE_FILE_ENDING);
    const templatePath = systemTemplatePath;

    const templateString = await fse.readFile(templatePath, 'utf8');
    const html = (await liquidEngine.parseAndRender(templateString, variables)) as string;

    return html;
  }
}

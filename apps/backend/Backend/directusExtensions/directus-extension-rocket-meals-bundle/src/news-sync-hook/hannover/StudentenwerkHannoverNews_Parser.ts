//import axios from "axios";
import {CheerioAPI, load as cheerioLoad} from 'cheerio';
import type {Element as CheerioElement} from 'domhandler';
import {TranslationHelper} from "../../helpers/TranslationHelper";
import {NewsParserInterface, NewsTypeForParser} from "./../NewsParserInterface";
//import undici, {Agent} from 'undici';
import {DatabaseTypes} from "repo-depkit-common"
import {WorkflowRunLogger} from "../../workflows-runs-hook/WorkflowRunJobInterface";
import {FetchHelper} from "../../helpers/FetchHelper";

//const agent = new Agent({ maxHeaderSize: 32 * 1024 });

export class StudentenwerkHannoverNews_Parser implements NewsParserInterface {

    static baseUrl = 'https://www.studentenwerk-hannover.de';
    static newsUrl = `${StudentenwerkHannoverNews_Parser.baseUrl}/unternehmen/news`;
    static newsDetailArticleUrlStart = "/unternehmen/news";

    constructor() { }

    async getNewsItems(workflowRun?: DatabaseTypes.WorkflowsRuns, logger?: WorkflowRunLogger, limitAmountNews?: number): Promise<NewsTypeForParser[]> {
        let realNewsItems = await this.getRealNewsItems(logger, limitAmountNews);
        return [...realNewsItems];
    }

    async getRealNewsItems(logger?: WorkflowRunLogger, limitAmountNews?: number): Promise<NewsTypeForParser[]> {
        if (logger){
            logger.appendLog("Fetching news from Studentenwerk Hannover");
        }

        try {
            let response = await this.fetchNewsPage();
            return StudentenwerkHannoverNews_Parser.parseNewsItems(response, logger, limitAmountNews);
        } catch (error: any) {
            if (logger){
                logger.appendLog("Error fetching or parsing news page: " + error.toString());
            }
            console.error("Error fetching or parsing news page:", error);
            throw new Error(`Failed to fetch or parse news page: ${error.toString()}`);
        }
    }

    async fetchNewsPage() {
        return await FetchHelper.fetchPage(StudentenwerkHannoverNews_Parser.newsUrl);
    }

    static async fetchArticlePage(articleUrl: string) {
        return await FetchHelper.fetchPage(articleUrl);
    }

    static async parseNewsItems(html: string, logger?: WorkflowRunLogger, limitAmountNews?: number): Promise<NewsTypeForParser[]> {
        if (logger){
            logger.appendLog("Parsing news items from HTML");
        }

        const $newsIndexArticle = cheerioLoad(html);

        let data: NewsTypeForParser[] = [];
        let articleItems = $newsIndexArticle('div.article');
        let limit = limitAmountNews ? Math.min(limitAmountNews, articleItems.length) : articleItems.length;

        if (logger){
            logger.appendLog(`Found ${articleItems.length} articles, limiting to ${limit}`);
        }

        for (let index = 0; index < articleItems.length && index < limit; index++) {
            if( logger){
                logger.appendLog(`Processing article at index ${index}`);
            }

            let element: CheerioElement | undefined = articleItems[index];

            let imageUrl = StudentenwerkHannoverNews_Parser.extractImageUrl($newsIndexArticle, element);
            let header = $newsIndexArticle(element).find('h3').text().trim();

            if (!header) {
                if (logger) {
                    logger.appendLog(`Skipping article at index ${index} due to missing header`);
                }
                continue; // Skip this article if header is missing
            }

            let content = $newsIndexArticle(element).find('div.news_slider-content_teaser').text().trim();
            let articleUrl = StudentenwerkHannoverNews_Parser.extractArticleUrl($newsIndexArticle, element);

            let date = await StudentenwerkHannoverNews_Parser.fetchArticleDate(articleUrl);

            let categories = StudentenwerkHannoverNews_Parser.extractCategories($newsIndexArticle, element);

            data.push({
                basicNews: {
                    external_identifier: "news_" + header.replace(/\W+/g, '_'),
                    image_remote_url: imageUrl,
                    alias: header,
                    date: date,
                    url: articleUrl,
                    categories: categories
                },
                translations: {
                    [TranslationHelper.LANGUAGE_CODE_DE]: {
                        title: header,
                        content: content,
                        be_source_for_translations: true,
                        let_be_translated: false,
                    },
                },
            });
        }

        if (logger) {
            logger.appendLog(`Parsed ${data.length} news items`);
        }

        data.reverse(); // latest news are on top
        return data;
    }

    static extractImageUrl($: CheerioAPI, element: CheerioElement | undefined): string {
        let imageStyle = $(element).find('div.news-slider-image').attr('style');
        let imageUrlMatch = imageStyle ? imageStyle.match(/url\(['"]?(.*?)['"]?\)/) : null;
        return imageUrlMatch ? StudentenwerkHannoverNews_Parser.baseUrl + imageUrlMatch[1] : '';
    }

    static extractArticleUrl($: CheerioAPI, element: CheerioElement | undefined): string | undefined {
        let articleUrl = $(element).find('a.articleLink').attr('href');
        if (articleUrl && articleUrl.startsWith(StudentenwerkHannoverNews_Parser.newsDetailArticleUrlStart)) {
            return StudentenwerkHannoverNews_Parser.baseUrl + articleUrl;
        }
        return undefined;
    }

    static async fetchArticleDate(articleUrl?: string): Promise<string | null> {
        if (!articleUrl) return null;
        try {
            let articleResponse = await this.fetchArticlePage(articleUrl);
            const $articleDetails = cheerioLoad(articleResponse);

            // .news-list-date > time:nth-child(2)
            let datePublishedText = $articleDetails(".news-list-date").text().trim();

            let dateParts = datePublishedText.split('.');

            // @ts-ignore if dateParts is not valid, the Date constructor will throw an error
            let day = parseInt(dateParts[0], 10);
            // @ts-ignore if dateParts is not valid, the Date constructor will throw an error
            let month = parseInt(dateParts[1], 10) - 1;
            // @ts-ignore if dateParts is not valid, the Date constructor will throw an error
            let year = parseInt(dateParts[2], 10);

            let dateAsDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
            return dateAsDate.toISOString();
        } catch (error) {
            console.log("Error fetching article page: " + articleUrl);
            console.log(error);
            return null;
        }
    }

    static extractCategories($: CheerioAPI, element: CheerioElement | undefined): { [key: string]: string } {
        let categories: { [key: string]: string } = {};
        $(element).find('div.news_slider-content_categorie').each((index, el) => {
            let categoryName = $(el).text().trim();
            if (categoryName) {
                categories[categoryName] = categoryName;
            }
        });
        return categories;
    }
}

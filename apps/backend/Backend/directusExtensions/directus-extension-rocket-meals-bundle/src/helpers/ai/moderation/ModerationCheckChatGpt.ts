import OpenAI from 'openai';
import {ModerationCheckInterface, ModerationCheckResult} from "./ModerationCheckInterface";

// https://platform.openai.com/docs/guides/moderation?example=text&lang=node.js
enum ChatGptModeration_MODEL {
    GPT_OMNI = "omni-moderation-latest"
}
/**
 * Check prompt with: https://platform.openai.com/docs/guides/moderation omni-moderation mode
 * Should be free to use: "The moderation endpoint is free to use."
 * Date: 04.11.2025
 */

export type ModerationCheckChatGptProps = {
    apiKey: string;
    model?: ChatGptModeration_MODEL;
}
export class ModerationCheckChatGpt implements ModerationCheckInterface {

    private readonly props: ModerationCheckChatGptProps;
    private readonly openai: OpenAI;

    constructor(props: ModerationCheckChatGptProps){
        this.props = props;
        this.openai = new OpenAI({ apiKey: props.apiKey });
    }

    async checkTextModeration(text: string): Promise<ModerationCheckResult> {
        let model = this.props.model || ChatGptModeration_MODEL.GPT_OMNI;

        const moderation = await this.openai.moderations.create({
            model: model,
            input: text,
        });
        let firstResult = moderation.results[0];
        if(firstResult){
            return {
                flagged: firstResult.flagged,
                categories: firstResult.categories,
                category_scores: firstResult.category_scores
            };
        }

        throw new Error("No moderation result returned from OpenAI");
    }

}

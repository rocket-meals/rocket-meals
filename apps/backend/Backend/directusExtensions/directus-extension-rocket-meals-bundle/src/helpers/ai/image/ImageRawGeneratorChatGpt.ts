import OpenAI from 'openai';
import {ImageRawGeneratorInterface} from "./ImageRawGenerator";

enum ChatGptImage_MODEL {
    GPT_IMAGE_1 = "gpt-image-1",
    GPT_IMAGE_1_MINI = "gpt-image-1-mini",
    DALL_E_2 = "dall-e-2",
    DALL_E_3 = "dall-e-3"
}

/**
 * The size of the generated images. Must be one of 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait), or auto (default value) for gpt-image-1,
 * one of 256x256, 512x512, or 1024x1024 for dall-e-2,
 * and one of 1024x1024, 1792x1024, or 1024x1792 for dall-e-3.
 */
enum ChatGptImage_MODEL_GptImage1_GenerationOptionImageSize {
    SIZE_1024x1024 = "1024x1024",
    SIZE_1536x1024 = "1536x1024",
    SIZE_1024x1536 = "1024x1536",
    SIZE_AUTO = "auto"
}

enum ChatGptImage_MODEL_DallE2_GenerationOptionImageSize {
    SIZE_256x256 = "256x256",
    SIZE_512x512 = "512x512",
    SIZE_1024x1024 = "1024x1024"
}

enum ChatGptImage_MODEL_DallE3_GenerationOptionImageSize {
    SIZE_1024x1024 = "1024x1024",
    SIZE_1792x1024 = "1792x1024",
    SIZE_1024x1792 = "1024x1792"
}

/**
 * GptImage1 - 1024x1024
 * - Time: 22.4
 * - Time: 46.7
 *
 */

/**
 * Image generation cost: https://platform.openai.com/docs/pricing#image-generation
 * 04.11.2025
 * Prices per image.
 * Model	          Quality	1024 x 1024	  1024 x 1536	  1536 x 1024
 * GPT Image 1	      Low	    $0.011	      $0.016	      $0.016
 *                    Medium	$0.042	      $0.063	      $0.063
 *                    High	    $0.167	      $0.25	          $0.25
 * GPT Image 1 Mini	  Low	    $0.005	      $0.006	      $0.006
 *                    Medium	$0.011	      $0.015	      $0.015
 *                    High	    $0.036	      $0.052	      $0.052
 */


/**
 * TODO: Check prompt with: https://platform.openai.com/docs/guides/moderation omni-moderation model
 * Coole idee eigentlich
 */

export enum ChatGptImageQuality {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high"
}

export type FoodImageGeneratorChatGptProps = {
    apiKey: string;
    model?: ChatGptImage_MODEL;
    quality?: ChatGptImageQuality
}
export class ImageRawGeneratorChatGpt implements ImageRawGeneratorInterface{

    private readonly props: FoodImageGeneratorChatGptProps;
    protected openai: OpenAI;

  constructor(props: FoodImageGeneratorChatGptProps) {
    this.props = props;
    this.openai = new OpenAI({ apiKey: props.apiKey });
  }

  /**
   * Takes around 20-30 seconds to generate an image.
   * @param prompt
   * @param food_description
   */
  async generateImage(prompt: string): Promise<Buffer<ArrayBuffer>> {
      let model = this.props.model || ChatGptImage_MODEL.GPT_IMAGE_1_MINI;
      const quality = this.props.quality || ChatGptImageQuality.MEDIUM;

    const result = await this.openai.images.generate({
      model: model,
      prompt: prompt,
      size: ChatGptImage_MODEL_GptImage1_GenerationOptionImageSize.SIZE_1024x1024,
      quality: quality,
    });
    //console.log("Received image generation response.");

    let usage = result.usage;
    let input_tokens = usage?.input_tokens || 0;
    let output_tokens = usage?.output_tokens || 0;
    let total_tokens = usage?.total_tokens || 0;
    //console.log(`Image generation token usage - Input: ${input_tokens}, Output: ${output_tokens}, Total: ${total_tokens}`);

// Save the image to a file
    const resultData = result?.data?.[0];
    const image_base64 = resultData?.b64_json;
    if (image_base64) {
      //console.log("Image data received, saving to file.");
      const image_bytes = Buffer.from(image_base64, "base64");
      return image_bytes;
    }

    throw new Error("Image generation failed, no image data received.");
  }

}

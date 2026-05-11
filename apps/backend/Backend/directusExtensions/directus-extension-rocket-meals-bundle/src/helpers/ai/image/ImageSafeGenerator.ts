import {ModerationCheckInterface} from "../moderation/ModerationCheckInterface";
import {ImageRawGeneratorInterface} from "./ImageRawGenerator";

export type ImageGeneratorProps = {
    moderationCheck: ModerationCheckInterface;
    imageGenerator: ImageRawGeneratorInterface
}

// Just extends ImageRawGeneratorInterface for now
export interface ImageSafeGeneratorInterface extends ImageRawGeneratorInterface {}

export class ImageSafeGenerator implements ImageSafeGeneratorInterface {

  private readonly props: ImageGeneratorProps;

  constructor(props: ImageGeneratorProps) {
    this.props = props;
  }

  public async generateImage(prompt: string): Promise<Buffer<ArrayBuffer>> {
    let moderationResult = await this.props.moderationCheck.checkTextModeration(prompt);
    if(moderationResult.flagged){
      throw new Error("Prompt flagged by moderation check: " + JSON.stringify(moderationResult.categories));
    }

    return this.props.imageGenerator.generateImage(prompt);
  }

}

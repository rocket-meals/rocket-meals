import {ModerationCheckInterface, ModerationCheckResult, ModerationCheckResultHelper} from "./ModerationCheckInterface";

export type ModerationCheckMockProps = {
    badWords?: string[];
}
export class ModerationCheckMock implements ModerationCheckInterface {

    private readonly props: ModerationCheckMockProps | undefined;

    constructor(props?: ModerationCheckMockProps){
        this.props = props;
    }

    async checkTextModeration(text: string): Promise<ModerationCheckResult> {
        let result = ModerationCheckResultHelper.createEmptyModerationCheckResult()
        const badWords = this.props?.badWords;
        if(badWords){
            for(let badWord of badWords){
                if(text.toLowerCase().includes(badWord.toLowerCase())){
                    result.flagged = true;
                }
            }
        }
        return result;
    }

}

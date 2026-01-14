import {join} from "path";
import {readFileSync} from "fs";
import {FileContentReader} from "../FileContentReader";

export class MaxManagerFileContentReader extends FileContentReader{

    public getContent(): string {
        const filePath = join(__dirname, 'speiseplaene', 'max_manager.html');
        let content = readFileSync(filePath, 'utf-8');
        return content;
    }

}

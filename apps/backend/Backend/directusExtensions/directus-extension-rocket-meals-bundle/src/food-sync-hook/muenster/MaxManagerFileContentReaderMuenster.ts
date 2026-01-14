import {join} from "path";
import {readFileSync} from "fs";
import {FileContentReader} from "../helper/FileContentReader";

export class MaxManagerFileContentReaderMuenster extends FileContentReader {

    public getContent(): string {
        const filePath = join(__dirname, 'speiseplaene', 'am_ring.html');
        let content = readFileSync(filePath, 'utf-8');
        return content;
    }

}

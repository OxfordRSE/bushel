import {FileCheck, FileCheckStatusString} from "@/lib/InputDataContext";
import {DataError, DataRowParser} from "@/lib/DataRowParser";

export class CheckTitlesAreUnique implements FileCheck {
    public name: string
    public status: FileCheckStatusString
    public warnings: string[]
    public errors: DataError[]

    constructor(
        public readonly data: Record<string, DataRowParser>
    ) {
        this.name = "Titles are unique";
        this.status = "checking";
        this.warnings = [];
        this.errors = [];
        this.check();
    }

    check() {
        const titles = Object.values(this.data).map(r => r.data?.title);
        const uniqueTitles = new Set(titles);

        if (titles.length === uniqueTitles.size) {
            this.status = "valid";
            return;
        } else {
            // figure out which titles are duplicates
            const duplicates: Record<string, number[]> = {};
            Object.entries(this.data).forEach(([row, parser]) => {
                const title = String(parser.data?.title);
                if (!duplicates[title]) {
                    duplicates[title] = [];
                }
                duplicates[title].push(Number(row));
            });

            Object.entries(duplicates).forEach(([title, rows]) => {
                if (rows.length > 1) {
                    this.errors.push(
                        new DataError(
                            `${rows.length} rows titled "${title}": ${rows.join(", ")}`,
                            "DuplicateTitleError"
                        )
                    );
                }
            });

            this.status = "error";
        }
    }
}
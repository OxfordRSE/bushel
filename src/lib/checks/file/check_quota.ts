import {FileCheck, FileCheckStatusString} from "@/lib/InputDataContext";
import {DataError, DataRowParser} from "@/lib/DataRowParser";

export class CheckQuota implements FileCheck {
    public name: string
    public status: FileCheckStatusString
    public warnings: string[]
    public errors: DataError[]

    constructor(
        public readonly data: Record<string, DataRowParser>,
        public readonly quota: number,
    ) {
        this.name = "Data quota is sufficient";
        this.status = "checking";
        this.warnings = [];
        this.errors = [];
        this.check();
    }

    check() {
        const quotas = Object.values(this.data).map(r => Number(r.internalContext.quotaUsed ?? 0));
        const totalQuota = quotas.reduce((acc, val) => acc + val, 0);
        if (totalQuota <= this.quota) {
            this.status = "valid";
            return;
        } else {
            this.status = "error";
            const overQuota = totalQuota - this.quota;
            this.errors.push(
                new DataError(
                    `Total quota used (${totalQuota}b) exceeds quota (${this.quota}b) by ${overQuota}b`,
                    "QuotaExceededError"
                )
            );
        }
    }
}
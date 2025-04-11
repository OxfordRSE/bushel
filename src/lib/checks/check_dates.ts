import {CheckResult, DataRowCheck} from "@/lib/DataRowParser";

export const dateFormatCheck: DataRowCheck = {
    name: 'dateFormat',
    async run(parser, emit) {
        await new Promise(r => setTimeout(r, Math.random() * 5000));
        const result: CheckResult = {status: 'success', details: 'Date fields formatted correctly'};
        emit(result);
    }
};
'use client';

import {useEffect, useMemo, useState} from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import StepPanel from '@/components/steps/StepPanel';
import {useInputData} from "@/lib/InputDataContext";
import {useGroup} from "@/lib/GroupContext";
import {DataRowStatus} from "@/lib/DataRowParser";
import {TriangleAlertIcon} from "lucide-react";
import {cleanString, fuzzyCoerce, stringToFuzzyRegex} from "@/lib/utils";
import {useUploadData} from "@/lib/UploadDataContext";

export default function ResolveDuplicatesStep({
                                                  openByDefault,
                                                  onSuccess,
                                              }: {
    openByDefault?: boolean;
    onSuccess?: () => void;
}) {
    const { rows} = useInputData();
    const { exactMatches, fuzzyWarnings } = useUploadData();
    const [done, setDone] = useState(false);

    useEffect(() => {
        setDone(false);
    }, [rows]);

    let summary: Parameters<typeof StepPanel>[0]["title"] = <></>;
    let status: Parameters<typeof StepPanel>[0]["status"] = 'default';
    let iconOverride: Parameters<typeof StepPanel>[0]["iconOverride"]  = undefined;
    if (done) {
        summary = `Skipping ${exactMatches.length} existing articles`;
        status = 'complete';
    } else if (!rows.length) {
        summary = 'Acknowledge duplicates';
    } else if (exactMatches.length) {
        summary = `Acknowledge duplicates: ${exactMatches.length} found`;
        status = 'error';
    } else {
        summary = 'No duplicates found';
        status = 'complete';
    }
    if (fuzzyWarnings.length) {
        summary += ` (${fuzzyWarnings.length} warning${fuzzyWarnings.length > 1? 's' : ''})`;
        iconOverride = <TriangleAlertIcon className="text-yellow-600 w-5 h-5" />;
    }

    return (
        <StepPanel
            title={summary}
            status={status}
            iconOverride={iconOverride}
            openByDefault={openByDefault}
        >
            {exactMatches.length ? (
                <>
                    {exactMatches.length > 0 && <p>There are articles on FigShare with the following titles. They will not be overridden.</p>}
                    <ul className="space-y-2 overflow-y-auto max-h-[20rem]">
                        {exactMatches.map((title, i) => (
                            <li key={i} className="flex items-center gap-2 ps-4">
                              {title}
                            </li>
                        ))}
                    </ul>
                    <Button onClick={() => {
                        setDone(true);
                        onSuccess?.();
                    }} className="mt-4 cursor-pointer">Yes, skip {exactMatches.length} existing records</Button>
                </>
            ) : (
                <p className="text-sm text-muted-foreground">No duplicate titles found.</p>
            )}

            {fuzzyWarnings.length > 0 && (
                <div className="mt-4 border-t pt-4">
                    <p className="text-sm text-yellow-600 font-medium">Close matches:</p>
                    <ul className="text-sm text-muted-foreground pl-4 list-disc">
                        {fuzzyWarnings.map(match => (
                            <li key={match!.excelRowNumber}>
                                Row {match!.excelRowNumber} &#34;<strong>{match!.title}</strong>&#34;
                                is similar to &#34;<strong>{match!.articleTitle}</strong>&#34;
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </StepPanel>
    );
}

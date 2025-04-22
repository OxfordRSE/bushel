'use client';

import {useEffect, useMemo, useState} from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import StepPanel from '@/components/steps/StepPanel';
import {useInputData} from "@/lib/InputDataContext";
import {useGroup} from "@/lib/GroupContext";
import {DataRowStatus} from "@/lib/DataRowParser";
import {TriangleAlertIcon} from "lucide-react";

export default function ResolveDuplicatesStep({
                                                  openByDefault,
                                                  onSuccess,
                                              }: {
    openByDefault?: boolean;
    onSuccess?: () => void;
}) {
    const { rows, skipRows, setSkipRows} = useInputData();
    const { articles} = useGroup();
    const articleTitles = useMemo(() => articles?.map(article => article.title) || [], [articles]);
    const [done, setDone] = useState(false);

    useEffect(() => {
        setDone(false);
    }, [rows]);

    const exactMatches = useMemo(() => {
        return rows.filter(r => r.title && articleTitles.includes(r.title));
    }, [rows, articleTitles]);

    const fuzzyWarnings = useMemo(() => {
        const normalize = (s: string) => s.trim().toLowerCase().replace(/[_\s]+/g, ' ');
        const normalizedArticleTitles = articleTitles.map(normalize);
        return rows.map(r => {
            if (!r.title)
                return null;
            const matchIndex = normalizedArticleTitles.findIndex(at => at === normalize(r.title ?? ''));
            if (matchIndex === -1)
                return null;
            return {
                excelRowNumber: r.excelRowNumber,
                title: r.title,
                articleTitle: articleTitles[matchIndex]
            };
        })
            .filter(Boolean)
            .filter(match => !exactMatches.some(r => r.excelRowNumber === match!.excelRowNumber));
    }, [rows, articleTitles, exactMatches]);

    const toggleAll = (check: boolean) =>
        setSkipRows(check ? exactMatches.map(r => r.id) : []);

    const toggleOne = (index: DataRowStatus["id"]) =>
        setSkipRows((sel) =>
            sel.includes(index) ? sel.filter(i => i !== index) : [...sel, index]
        );


    let summary: Parameters<typeof StepPanel>[0]["title"] = <></>;
    let status: Parameters<typeof StepPanel>[0]["status"] = 'default';
    let iconOverride: Parameters<typeof StepPanel>[0]["iconOverride"]  = undefined;
    if (done) {
        summary = `Overwrite ${exactMatches.length - skipRows.length}, skip ${skipRows.length}`;
        status = 'complete';
    } else if (!rows.length) {
        summary = 'Resolve duplicates';
    } else if (exactMatches.length) {
        summary = `Resolve duplicates: ${exactMatches.length} found`;
        status = 'error';
    } else {
        summary = 'No duplicates found';
        status = 'complete';
    }
    if (fuzzyWarnings.length) {
        summary += ` (${fuzzyWarnings.length} warning(s))`;
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
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={skipRows.length === exactMatches.length}
                                onCheckedChange={(checked) => toggleAll(checked === true)}/>
                            <span>Select all</span>
                        </div>
                        {exactMatches.map(row => (
                            <div key={row.id} className="flex items-center gap-2 ps-4">
                                <Checkbox
                                    checked={skipRows.includes(row.id)}
                                    onCheckedChange={() => toggleOne(row.id)}/>
                                <span>
                              Overwrite <strong>{row.title}</strong>
                          </span>
                            </div>
                        ))}
                    </div>
                    <Button onClick={() => {
                        setDone(true);
                        onSuccess?.();
                    }} className="mt-4 cursor-pointer">Done</Button></>
            ) : (
                <p className="text-sm text-muted-foreground">✅ No duplicate titles found.</p>
            )}

            {fuzzyWarnings.length > 0 && (
                <div className="mt-4 border-t pt-4">
                    <p className="text-sm text-yellow-600 font-medium">⚠️ Close matches:</p>
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

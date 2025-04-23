'use client';

import {useEffect, useMemo, useState} from 'react';
import StepPanel from '@/components/steps/StepPanel';
import {useInputData} from "@/lib/InputDataContext";
import {DataRowStatus} from "@/lib/DataRowParser";
import {CogIcon, TriangleAlertIcon} from "lucide-react";
import {useImmer} from "use-immer";
import {clsx} from "clsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import UploadRow from "@/components/UploadRow";
import {Button} from "@/components/ui/button";

export default function UploadStep({
                                       openByDefault,
                                   }: {
    openByDefault?: boolean;
}) {
    const { rows, skipRows} = useInputData();
    const [running, setRunning] = useState(false);
    const [status, setStatus] = useImmer<Record<DataRowStatus["id"], "skipped"|"in progress"|"complete"|"error">>({});

    useEffect(() => setRunning(false), [rows]);

    const overallStatus = useMemo(() => {
        const statuses = Object.values(status);
        if (statuses.length === 0) return 'idle';
        let complete = true;
        for (const s of statuses) {
            if (s === 'error') return 'error';
            if (s !== 'complete') complete = false;
        }
        return complete ? 'complete' : 'in progress';
    }, [status]);

    let summary: Parameters<typeof StepPanel>[0]["title"] = <></>;
    let stepStatus: Parameters<typeof StepPanel>[0]["status"] = 'default';
    let iconOverride: Parameters<typeof StepPanel>[0]["iconOverride"]  = undefined;

    if (overallStatus === 'error') {
        summary = <span className="text-red-600">Error uploading to FigShare</span>;
        stepStatus = 'error';
        iconOverride = <TriangleAlertIcon className="text-red-600" />;
    } else if (overallStatus === 'in progress') {
        summary = 'Uploading...';
        stepStatus = 'default';
        iconOverride = <CogIcon className="animate-spin text-blue-600 w-5 h-5" />;
    } else if (overallStatus === 'complete') {
        summary = 'Upload complete!';
        stepStatus = 'complete';
    } else {
        summary = 'Upload to FigShare';
        stepStatus = 'default';
    }

    return (
        <StepPanel
            title={summary}
            status={stepStatus}
            iconOverride={iconOverride}
            openByDefault={openByDefault}
        >
            <div className="space-y-4">
                <div className="overflow-x-auto border rounded-md bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Upload status</TableHead>
                                <TableHead>File upload status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((r) => {
                                return skipRows.includes(r.id)
                                    ? <TableRow className="opacity-25 bg-grey-50">
                                        <TableCell>{r.excelRowNumber}</TableCell>
                                        <TableCell>{r.title}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    : <UploadRow
                                        row={r}
                                        onError={() => setStatus((draft) => {
                                            draft[r.id] = 'error';
                                            return draft;
                                        })}
                                        onSuccess={() => setStatus((draft) => {
                                            draft[r.id] = 'complete';
                                            return draft;
                                        })}
                                        runQueries={running}
                                    />
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        onClick={() => setRunning(true)}
                        disabled={running}
                        className="w-[50%] cursor-pointer"
                    >
                        Upload!
                    </Button>
                    <Button
                        onClick={() => setRunning(false)}
                        variant="outline"
                        disabled={!running || overallStatus === 'complete'}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </StepPanel>
    );
}

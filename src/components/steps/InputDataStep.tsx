import {useEffect, useMemo, useRef, useState} from 'react';
import { useInputData } from '@/lib/InputDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StepPanel from '@/components/steps/StepPanel';
import {AlertTriangle, CheckSquare, ChevronDown, ChevronUp, CogIcon, InfoIcon, StopCircle} from "lucide-react";
import {DataRowStatus} from "@/lib/DataRowParser";
import {useGroup} from "@/lib/GroupContext";
import {useAuth} from "@/lib/AuthContext";

type RowsSummary = Record<DataRowStatus["status"], number> & {
    total: number;
    // number of errors across all files; number of rows with errors is `error`
    errors: number;
    // number of warnings across all files; number of rows with warnings is `warning`
    warnings: number;
    // number of rows with warnings
    warning: number;
}

export default function InputDataStep({ openByDefault = true, onSuccess }: { openByDefault?: boolean, onSuccess?: () => void }) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const {
        rows,
        file,
        setFile,
        halt,
        reset,
        check,
        ready,
        loadErrors,
        loadWarnings,
        working,
        setParserContext,
        parserContext,
        resetKey,
        fileChecks
    } = useInputData();
    const {targetUser} = useAuth();
    const {group} = useGroup();
    const [maxWarnings, setMaxWarnings] = useState(20);
    const [maxErrors, setMaxErrors] = useState(20);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showChecksList, setShowChecksList] = useState(false);

    const rowsSummary = useMemo(() => {
        const summary: RowsSummary = {
            total: 0,
            valid: 0,
            parsing: 0,
            error: 0,
            errors: 0,
            warning: 0,
            warnings: 0
        }
        rows.forEach(row => {
            summary[row.status] = summary[row.status] + 1;
            summary.total = (summary.total || 0) + 1;
            summary.errors = (summary.errors || 0) + row.errors.length;
            summary.warnings = (summary.warnings || 0) + row.warnings.length;
        });
        summary.warning = rows.filter(r => r.warnings.length > 0).length;
        return summary
    }, [rows]);

    if (rowsSummary.valid === rows.length && rows.length > 0) {
        onSuccess?.();
    } else if ((rowsSummary.errors ?? 0) > maxErrors || (rowsSummary.warnings ?? 0) > maxWarnings) {
        halt();
    }

    const resetFile = (clearInput = true) => {
        if (clearInput && fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        reset(false)
    }

    useEffect(resetFile, [reset, resetKey])

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        resetFile(false)
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setFile(file, true);
        } catch (err) {
            console.error(err);
            alert((err instanceof Error ? err.message : 'Unknown error while parsing file'));
        }
    };

    let summary: Parameters<typeof StepPanel>[0]["title"] = <></>;
    let status: Parameters<typeof StepPanel>[0]["status"] = 'default';
    let iconOverride: Parameters<typeof StepPanel>[0]["iconOverride"]  = undefined;

    if (group && !ready) {
        summary = <>Upload Excel file: loading group details...</>;
        status = undefined;
        iconOverride = <CogIcon className="animate-spin text-blue-600 w-5 h-5" />;
    } else if (!rows.length) {
        summary = <>Upload an Excel file</>;
        status = 'default';
    } else if (rowsSummary.valid === rows.length) {
        if (fileChecks.some(c => c.status === "error")) {
            summary = <span className={"flex items-center"}>
                Rows are incompatible with one another.
            </span>;
        } else if (fileChecks.some(c => c.status === "checking")) {
            summary = <span className="flex items-center">
                All {rows.length} rows checked. Checking inter-row compatibility <CogIcon className={"animate-spin text-blue-600 w-5 h-5"}/>
            </span>;
        } else {
            if (rowsSummary.warnings > 0)
                summary = <span className={"flex items-center"}>
                All {rows.length} rows successfully checked (<AlertTriangle
                    className="inline-block w-4 h-4 text-yellow-600 me-1"/>
                    {rowsSummary.warnings} warnings in {rowsSummary.warning} rows)
            </span>;
            else
                summary = <>All {rows.length} rows successfully checked</>;
            status = 'complete';
        }
    } else if (rowsSummary.errors >= maxErrors || rowsSummary.warnings >= maxWarnings) {
        summary = <span className="flex items-center">
            Checking halted at max {rowsSummary.errors >= maxErrors? 'errors' : 'warnings'}
        </span>;
        status = 'error';
    } else if (rowsSummary.parsing > 0) {
        summary = <span className="flex items-center">
            Checking {rows.length} rows:
            <CheckSquare className="mx-2 h-4 w-4 text-green-600" /> {rowsSummary.valid} /
            <CogIcon className="mx-2 h-4 w-4 text-blue-600" /> {rowsSummary.parsing} /
            <StopCircle className="mx-2 h-4 w-4 text-red-600" /> {rowsSummary.error}
        </span>;
        iconOverride = <CogIcon className="animate-spin text-blue-600 w-5 h-5" />;
    } else {
        summary = <>Checked {rows.length} rows: {rowsSummary.errors} errors in {rowsSummary.error} rows</>;
        status = 'error';
    }

    return (
        <StepPanel
            title={summary}
            status={status}
            iconOverride={iconOverride}
            openByDefault={openByDefault}
        >
            <div className="space-y-4">
                <div className="text-sm text-gray-600 space-y-1">
                    <section className="pl-2 pr-1 pb-4 pt-2 bg-white space-y-2">
                        <button
                            type="button"
                            className="flex items-center justify-between text-left cursor-pointer"
                            onClick={() => setShowAdvanced(o => !o)}
                        >
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold text-lg">Advanced options</h2>
                            </div>
                            {showAdvanced ? <ChevronUp className="w-4 h-4 ms-4"/> :
                                <ChevronDown className="w-4 h-4 ms-4"/>}
                        </button>
                        {showAdvanced && (
                            <div className="space-y-2 text-sm">
                                <p>Validation will halt once the number of warnings or errors exceeds your limits.</p>
                                <div className="flex gap-4">
                                    <Label className="flex items-center gap-2">
                                        Max warnings:
                                        <Input type="number" min={0} value={maxWarnings}
                                               onChange={e => setMaxWarnings(+e.target.value)} className="w-20"/>
                                    </Label>
                                    <Label className="flex items-center gap-2">
                                        Max errors:
                                        <Input type="number" min={0} value={maxErrors}
                                               onChange={e => setMaxErrors(+e.target.value)} className="w-20"/>
                                    </Label>
                                </div>
                                <Label className="flex items-center gap-2">
                                    Min categories:
                                    <Input
                                        type="number"
                                        min={0}
                                        value={parserContext.minCategoryCount ?? 1}
                                        onChange={e =>
                                            setParserContext({...parserContext, minCategoryCount: +e.target.value})
                                        }
                                        className="w-20"
                                    />
                                </Label>
                                <div className="flex gap-4">
                                    <Label className="flex items-center gap-2">
                                        Keywords min:
                                        <Input
                                            type="number"
                                            min={0}
                                            value={parserContext.minKeywordCount ?? 1}
                                            onChange={e =>
                                                setParserContext({...parserContext, minKeywordCount: +e.target.value})
                                            }
                                            className="w-20"
                                        />
                                    </Label>
                                    <Label className="flex items-center gap-2">
                                        Keywords max:
                                        <Input
                                            type="number"
                                            min={0}
                                            value={parserContext.maxKeywordCount ?? 100}
                                            onChange={e =>
                                                setParserContext({...parserContext, maxKeywordCount: +e.target.value})
                                            }
                                            className="w-20"
                                        />
                                    </Label>
                                </div>
                                <Label className="flex items-center gap-2">
                                    FigShare quota remaining (bytes):
                                    <Input
                                        type="text"
                                        disabled
                                        value={(targetUser?.quota ?? 0) - (targetUser?.used_quota ?? 0)}
                                        className="w-20"
                                    />
                                </Label>
                            </div>
                        )}
                    </section>
                </div>

                <Input
                    type="file"
                    accept=".xlsx"
                    ref={fileInputRef}
                    onChange={handleChange}
                    className="cursor-pointer"
                />

                <Button
                    variant="outline"
                    onClick={check}
                    disabled={working || !ready || !file}
                    className="w-full cursor-pointer"
                >
                    {
                        working
                            ? 'Checking...'
                            : 'Check file'
                    }
                </Button>

                {!group && <p><em>A Group must be selected before the file can be checked.</em></p>}
                {!!group && !ready && !!file && <p><em>Awaiting group details from FigShare...</em></p>}

                <Button
                    variant="destructive"
                    onClick={halt}
                    disabled={!working}
                    className={"cursor-pointer"}
                >
                    Halt
                </Button>

                <Button
                    variant="ghost"
                    onClick={() => resetFile()}
                    disabled={!file}
                    className={"cursor-pointer ms-4"}
                >
                    Clear File
                </Button>

                {(rowsSummary.errors >= maxErrors || rowsSummary.warnings >= maxWarnings) && (
                    <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded">
                        Validation stopped: reached max {rowsSummary.errors >= maxErrors ? 'errors' : 'warnings'}.
                    </div>
                )}

                {loadErrors && loadErrors.length > 0 && (
                    <div className="bg-red-100 text-red-800 text-sm p-3 rounded">
                        {loadErrors.map((loadError, i) => (
                            <div key={i}>
                                {loadError.split('\n').map((line, j) => (
                                    <p key={`${i}-${j}`}>
                                        {line}
                                    </p>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {loadWarnings && loadWarnings.length > 0 && (
                    <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded">
                        {loadWarnings.map((loadError, i) => (
                            <div key={i}>
                                {loadError.split('\n').map((line, j) => (
                                    <p key={`${i}-${j}`}>
                                        {line}
                                    </p>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {rowsSummary.errors > 0 && (
                    <div className="bg-red-100 text-red-800 text-sm p-3 rounded">
                        <ul>
                            {rows.filter(r => r.errors.length > 0)
                                .map((r, i) =>
                                    r.errors.map((error, j) => (
                                        <li key={`${i}-${j}`}>
                                            <strong>Row {r.excelRowNumber}:</strong> {error.message} ({error.kind})
                                        </li>
                                    )))}
                        </ul>
                    </div>
                )}

                {rowsSummary.warnings > 0 && (
                    <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded">
                        <ul>
                            {rows.filter(r => r.warnings.length > 0)
                                .map((r, i) =>
                                    r.warnings.map((w, j) => (
                                        <li key={`${i}-${j}`}>
                                            <strong>Row {r.excelRowNumber}:</strong> {w}
                                        </li>
                                    ))
                                )}
                        </ul>
                    </div>
                )}

                {fileChecks.some(c => c.status === "error") && (
                    <div className="bg-red-100 text-red-800 text-sm p-3 rounded">
                        <ul>
                            {fileChecks.filter(c => c.status === "error")
                                .map((c, i) =>
                                    c.errors.map((error, j) => (
                                        <li key={`${i}-${j}`}>
                                            {error.message} ({error.kind})
                                        </li>
                                    )))}
                        </ul>
                    </div>
                )}

                {fileChecks.some(c => c.warnings.length > 0) && (
                    <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded">
                        <ul>
                            {fileChecks.filter(c => c.warnings.length > 0)
                                .map((c, i) =>
                                    c.warnings.map((w, j) => (
                                        <li key={`${i}-${j}`}>
                                            {w}
                                        </li>
                                    ))
                                )}
                        </ul>
                    </div>
                )}
            </div>

            <section className="pl-2 pr-1 pt-4 bg-white space-y-2">
                <button
                    type="button"
                    className="flex items-center justify-between text-left cursor-pointer"
                    onClick={() => setShowChecksList(o => !o)}
                >
                    <div className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5"/>
                        <h2 className="font-semibold text-lg">Checks list</h2>
                    </div>
                    {showChecksList ? <ChevronUp className="w-4 h-4 ms-4"/> : <ChevronDown className="w-4 h-4 ms-4"/>}
                </button>
                {showChecksList && (
                    <div className="text-sm text-gray-500" id="checks-list">
                        <p>Checks will be run on the data in the spreadsheet. The following checks are performed:</p>
                        <dl>
                            <dt>Spreadsheet structure</dt>
                            <dd>The spreadsheet contains the mandatory FigShare columns. Other columns are checked against
                                Custom Fields for the group, and unmatched columns are flagged with warnings.
                            </dd>
                            <dt>Item structure</dt>
                            <dd>Each item is correctly formatted with value in the necessary columns.</dd>
                            <dt>File references</dt>
                            <dd>All file paths in the Files column resolve to existing files in the root directory.</dd>
                            <dt>FigShare Quota</dt>
                            <dd>The combined filesize of all paths in the Files column does not exceed the remaining quota
                                for the uploading account.
                            </dd>
                            <dt>Categories</dt>
                            <dd>All categories are valid and exist in FigShare. Each item has at
                                least {parserContext.minCategoryCount} categories.
                            </dd>
                            <dt>Keywords</dt>
                            <dd>Each item has
                                between {parserContext.minKeywordCount} and {parserContext.maxKeywordCount} keywords.
                            </dd>
                            <dt>Preset field values</dt>
                            <dd>All values in Categories, License, and similar fields are legitimate FigShare values
                                (correcting for capitalisation and similar differences).
                            </dd>
                        </dl>
                    </div>
                )}
            </section>
        </StepPanel>
    );
}

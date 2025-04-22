import { useEffect, useRef, useState} from 'react';
import { useInputData } from '@/lib/InputDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StepPanel from '@/components/steps/StepPanel';
import {AlertTriangle, CheckSquare, CogIcon, InfoIcon, StopCircle} from "lucide-react";
import {DataRowStatus} from "@/lib/DataRowParser";
import {useImmer} from "use-immer";
import DirectoryPicker from "@/lib/DirectoryPicker";
import {useGroup} from "@/lib/GroupContext";

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
    const { rows, file, setFile, halt, reset, check, ready, loadErrors, loadWarnings, working, setParserContext, parserContext } = useInputData();
    const {group} = useGroup();
    const [maxWarnings, setMaxWarnings] = useState(20);
    const [maxErrors, setMaxErrors] = useState(20);
    const [rowsSummary, setRowsSummary] = useImmer<RowsSummary>({
        error: 0,
        parsing: 0,
        valid: 0,
        total: 0,
        errors: 0,
        warnings: 0,
        warning: 0,
    });
    const [showHelp, setShowHelp] = useState(false);

    const resetFile = () => {
        reset(false)
        setRowsSummary({
            error: 0,
            parsing: 0,
            valid: 0,
            total: 0,
            errors: 0,
            warnings: 0,
            warning: 0,
        })
    }

    useEffect(() => {
        const summary: Partial<RowsSummary> = {}
        rows.forEach(row => {
            summary[row.status] = (summary[row.status] || 0) + 1;
            summary.total = (summary.total || 0) + 1;
            summary.errors = (summary.errors || 0) + row.errors.length;
            summary.warnings = (summary.warnings || 0) + row.warnings.length;
        });
        summary.warning = rows.filter(r => r.warnings.length > 0).length;
        setRowsSummary(draft => {
            Object.keys(summary).forEach(key => {
                draft[key as keyof RowsSummary] = summary[key as keyof RowsSummary] || 0;
            });
        });
        if (summary.valid === rows.length) {
            onSuccess?.();
        } else if ((summary.errors ?? 0) > maxErrors || (summary.warnings ?? 0) > maxWarnings) {
            halt();
        }
    }, [rows]);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        resetFile()
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
        summary = <>Loading group details...</>;
        status = undefined;
        iconOverride = <CogIcon className="animate-spin text-blue-600 w-5 h-5" />;
    } else if (!rows.length) {
        summary = <>Upload an Excel file</>;
        status = 'default';
    } else if (rowsSummary.valid === rows.length) {
        if (rowsSummary.warnings > 0)
            summary = <span className={"flex items-center"}>
                All {rows.length} rows successfully checked (<AlertTriangle className="inline-block w-4 h-4 text-yellow-600" />
                {rowsSummary.warnings} warnings in {rowsSummary.warning} rows)
            </span>;
        else
            summary = <>All {rows.length} rows successfully checked</>;
        status = 'complete';
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
                    <p>Validation will halt once the number of warnings or errors exceeds your limits.</p>
                    <div className="flex gap-4 items-center">
                        <label className="flex items-center gap-2">
                            Max warnings:
                            <Input type="number" min={0} value={maxWarnings} onChange={e => setMaxWarnings(+e.target.value)} className="w-20" />
                        </label>
                        <label className="flex items-center gap-2">
                            Max errors:
                            <Input type="number" min={0} value={maxErrors} onChange={e => setMaxErrors(+e.target.value)} className="w-20" />
                        </label>
                    </div>
                    <div className={"flex items-center"}>
                        <DirectoryPicker onSelect={(dir) => {setParserContext({ ...parserContext, rootDir: dir })}} />
                        <Button variant="ghost" className="ms-4 cursor-pointer text-blue-500" onClick={() => setShowHelp(!showHelp)}>
                            <InfoIcon className={"w-4 h-4"} /> {showHelp? 'Hide' : 'Show'} help
                        </Button>
                    </div>
                    {
                        showHelp && (
                            <div className="text-sm text-gray-500 mt-2">
                                <p>The tool will upload files to FigShare as well as the metadata.</p>
                                <p>
                                    Web browsers only allow very tightly controlled access to the files on your computer.
                                    As a result, all files referenced in your Excel spreadsheet must appear inside a &#39;root&#39; directory on your computer.
                                    Selecting the root directory using this button will allow the tool to see all files within that directory.
                                    When files are checked, their paths will be checked <em>relative to the root directory</em>.
                                </p>
                            </div>
                        )
                    }
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
                    onClick={resetFile}
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
                                .map((r, i) => (<>
                                    {
                                        r.errors.map((error, j) => (
                                            <li key={`${i}-${j}`}>
                                                Row {r.excelRowNumber}: {error.message} ({error.kind})
                                            </li>
                                        ))
                                    }
                                </>))}
                        </ul>
                    </div>
                )}

                {rowsSummary.warnings > 0 && (
                    <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded">
                        <ul>
                            {rows.filter(r => r.warnings.length > 0)
                                .map((r, i) => (<>
                                    {
                                        r.warnings.map((w, j) => (
                                            <li key={`${i}-${j}`}>
                                                Row {r.excelRowNumber}: {w}
                                            </li>
                                        ))
                                    }
                                </>))}
                        </ul>
                    </div>
                )}
            </div>
        </StepPanel>
    );
}

'use client';

import {useCallback, useMemo, useState} from 'react';
import StepPanel from '@/components/steps/StepPanel';
import { useAuth } from '@/lib/AuthContext';
import {UploadRowStateWithTitle, useUploadData} from '@/lib/UploadDataContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {CogIcon, Package, Ban, TriangleAlertIcon} from 'lucide-react';
import {useInputData} from "@/lib/InputDataContext";
import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";

export default function UploadStep({ openByDefault }: { openByDefault?: boolean }) {
  const ROW_SUMMARY_LENGTH = 10;
  const [visibleRowCount, setVisibleRowCount] = useState(ROW_SUMMARY_LENGTH);
  const [createInOrder, setCreateInOrder] = useState(false);
  const { impersonationTarget } = useAuth();
  const {rows: parsedRows, fileChecks, markUploadComplete} = useInputData();
  const {
    rows,
    uploadInOrder,
    uploadAll,
    cancelAll,
    cancelRow,
    exactMatches,
    duplicatesAcknowledged,
    fuzzyWarnings,
  } = useUploadData();

  const upload = useCallback(async () => {
    if (createInOrder) {
      await uploadInOrder();
    } else {
      await uploadAll();
    }
    markUploadComplete();
  }, [uploadAll, markUploadComplete, uploadInOrder, createInOrder]);

  const all_rows_valid = useMemo(() => {
    return parsedRows.every(row => row.status === "valid") && fileChecks.every(check => check.status === "valid");
  }, [parsedRows, fileChecks]);

  const overallStatus = useMemo(() => {
    if (!rows.length) return 'idle';
    if (rows.some(r => r.status === 'error')) return 'error';
    if (fileChecks.some(check => check.status === 'error')) return 'error';
    if (rows.every(r => r.status === 'completed' || r.status === 'skipped')) return 'complete';
    if (rows.some(r => r.status === 'uploading')) return 'in progress';
    return 'pending';
  }, [rows, fileChecks]);

  const summary = {
    'error': { title: 'Error uploading to FigShare', status: 'error' as Parameters<typeof StepPanel>[0]["status"], icon: <TriangleAlertIcon className="text-red-600" /> },
    'in progress': { title: 'Uploading...', status: 'default' as Parameters<typeof StepPanel>[0]["status"], icon: <CogIcon className="animate-spin text-blue-600 w-5 h-5" /> },
    'complete': { title: 'Upload complete!', status: 'complete' as Parameters<typeof StepPanel>[0]["status"] },
    'pending': { title: 'Upload to FigShare', status: 'default' as Parameters<typeof StepPanel>[0]["status"] },
    'idle': { title: 'Upload to FigShare', status: 'default' as Parameters<typeof StepPanel>[0]["status"] },
  }[overallStatus];

  if (!all_rows_valid) {
    return <StepPanel
      title="Upload to FigShare"
      iconOverride={<Ban className="text-gray-400 w-5 h-5" />}
      openByDefault={openByDefault}
    >
      <p>All data must be successfully parsed before it can be uploaded to FigShare.</p>
    </StepPanel>
  }

  if (!duplicatesAcknowledged && (exactMatches.length || fuzzyWarnings.length)) {
    return <StepPanel
      title="Upload to FigShare"
      iconOverride={<Ban className="text-gray-400 w-5 h-5" />}
      openByDefault={openByDefault}
    >
      <p>
        There are duplicates or near-duplicates of existing FigShare articles.
        Please check the previous step and acknowledge that you understand the implications of uploading these articles.
      </p>
    </StepPanel>
  }

  const rowStatus = (row: UploadRowStateWithTitle) => {
    if (row.fileProgress?.error) {
      return <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            Upload error
          </TooltipTrigger>
          <TooltipContent side="top">
            {row.fileProgress.error}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>;
    }
    if (row.status === 'error') {
      return <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-red-500">Error</span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {row.error?.message}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>;
    }
    return row.status
  }

  // Figure out which rows to display.
  // Prioritize rows with errors, then those that are uploading, then completed, then skipped.
  // Always order by excelRowNumber.
  // Limit to visibleRowCount.
  let displayedRows = rows;
  if (visibleRowCount < rows.length) {
    const sortedRows = [...rows].sort((a, b) => {
      if (a.status === 'error' && b.status !== 'error') return -1;
      if (b.status === 'error' && a.status !== 'error') return 1;
      if (a.status === 'uploading' && b.status !== 'uploading') return -1;
      if (b.status === 'uploading' && a.status !== 'uploading') return 1;
      if (a.status === 'completed' && b.status !== 'completed') return -1;
      if (b.status === 'completed' && a.status !== 'completed') return 1;
      if (a.status === 'skipped' && b.status !== 'skipped') return -1;
      if (b.status === 'skipped' && a.status !== 'skipped') return 1;
      return a.excelRowNumber - b.excelRowNumber; // Fallback to excelRowNumber
    });
    displayedRows = sortedRows.slice(0, visibleRowCount);
  }

  return (
    <StepPanel
      title={summary.title}
      status={summary.status}
      iconOverride={summary.icon}
      openByDefault={openByDefault}
    >
      <div className="space-y-4">
        <p>
          Ready to upload <strong>{rows.length}</strong> articles.
          Please make sure {impersonationTarget?.first_name ?? 'you'} have enough headroom to create them.
        </p>

        <div className="overflow-x-auto border rounded-md bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Upload status</TableHead>
                <TableHead>File upload status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRows.map(row =>
                exactMatches.includes(row.title ?? "") ? (
                  <TableRow key={row.id} className="opacity-25 bg-gray-50">
                    <TableCell>{row.excelRowNumber}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell colSpan={4}>Skipped</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ) : (<TableRow key={row.id}>
                    <TableCell>{row.excelRowNumber}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell className="capitalize">{rowStatus(row)}</TableCell>
                    <TableCell>
                      {
                        row.fileProgress?.totalFiles
                          ? (<div className="flex gap-1 items-center">
                            {Array.from({ length: row.fileProgress.totalFiles }).map((_, i) => {
                              const fp = row.fileProgress;
                              if (!fp) return <></>;

                              const isDone = i < fp.fileIndex || i === fp.fileIndex && fp.figshareStatus === "completed";
                              const isActive = i === fp.fileIndex;

                              return <TooltipProvider key={i}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Package
                                      key={i}
                                      className={
                                        isDone
                                          ? 'text-green-600'
                                          : isActive
                                            ? fp.error
                                              ? 'text-red-500'
                                              : 'text-blue-600 animate-pulse'
                                            : 'text-gray-300'
                                      }
                                      size={16}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {
                                      isActive && fp.error
                                        ? <>{fp.error}</>
                                        : <>Uploading <strong>{fp.name}</strong><br />(part {fp.partNumber + 1}/{fp.partCount})</>
                                    }
                                    {!isActive && fp.name}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            })}
                          </div>)
                          : <></>
                      }

                    </TableCell>
                    <TableCell className="text-right">
                      {(row.status === 'uploading' || row.status === 'created') && (
                        <Button size="sm" variant="destructive" onClick={() => cancelRow(row.id)}>
                          Stop
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              )}
              {rows.length > visibleRowCount && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleRowCount(Infinity)}
                    >
                      Show all {rows.length} rows
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {rows.length <= visibleRowCount && rows.length > ROW_SUMMARY_LENGTH && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleRowCount(ROW_SUMMARY_LENGTH)}
                    >
                      Show only {ROW_SUMMARY_LENGTH} rows
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center space-x-2 justify-evenly">
          <Button onClick={upload} className="w-[75%] cursor-pointer" disabled={overallStatus === "in progress"}>
            Upload!
          </Button>
          <Button
            onClick={cancelAll}
            variant="outline"
            disabled={overallStatus !== 'in progress'}
            className="w-[20%] cursor-pointer"
          >
            Cancel
          </Button>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            className="cursor-pointer"
            checked={createInOrder}
            onCheckedChange={(checked) => setCreateInOrder(!!checked)}
          />
          <div className="grid gap-2">
            <Label htmlFor="terms-2">Create records in order</Label>
            <p className="text-muted-foreground text-sm">
              Creating records in order is slower, but guarantees records are created in the order they appear in the spreadsheet.
            </p>
          </div>
        </div>

      </div>
    </StepPanel>
  );
}

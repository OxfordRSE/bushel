'use client';

import {useCallback, useState} from 'react';
import StepPanel from '@/components/steps/StepPanel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Ban } from 'lucide-react';
import {useUploadData} from "@/lib/UploadDataContext";

export default function SummaryStep({ openByDefault }: { openByDefault?: boolean }) {
  const { uploadReport } = useUploadData();
  const [downloaded, setDownloaded] = useState<boolean>(false);

  const downloadSummary = useCallback(() => {
    if (!uploadReport) {
      console.warn(`No report available to download`);
      return;
    }
    const csv = uploadReport as string;
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'upload-summary.csv';
    link.click();
    setDownloaded(true);
  }, [uploadReport]);

  if (!uploadReport) {
    return (
      <StepPanel
        title="Download Summary"
        iconOverride={<Ban className="text-gray-400 w-5 h-5" />}
        openByDefault={openByDefault}
      >
        <p>Data must be uploaded to FigShare before you can download a summary.</p>
      </StepPanel>
    );
  }

  return (
    <StepPanel
      title={`Download Summary report`}
      status={downloaded? 'complete' : 'default'}
      openByDefault={openByDefault}
    >
      <div className="space-y-4">
        {[uploadReport].map((report, index) => {
          const [headers, ...rows] = report.split('\n');
          return <div key={index}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  {headers.split(',').map((header, i) => (
                    <TableHead key={i} className="capitalize">
                      {header.trim()}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 4).map((row, rowIndex) => {
                  const cells = row.split(',');
                  return (
                    <TableRow key={rowIndex}>
                      <TableCell>{rowIndex + 1}</TableCell>
                      {cells.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="whitespace-pre-wrap">
                          {cell.trim()}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                {rows.length > 5 && <TableRow key={5}><TableCell
                    colSpan={rows[0].split(',').length}>+ {rows.slice(4).length} rows</TableCell></TableRow>}
              </TableBody>
            </Table>
            <Button
              key={index}
              className="w-full cursor-pointer"
              onClick={() => downloadSummary()}
            >
              Download Summary
            </Button>
          </div>
        })}
      </div>
    </StepPanel>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Folder } from 'lucide-react';

type Props = {
  onSelect: (dir: FileSystemDirectoryHandle) => void;
};

export default function DirectoryPicker({ onSelect }: Props) {
  const [dirName, setDirName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickDirectory = async () => {
    setError(null);
    if (!Object.prototype.hasOwnProperty.call(window, 'showDirectoryPicker')) {
        setError('Directory picker not supported in this browser');
        return;
    }
    try {
      const handle = await (window as typeof window & {showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>}).showDirectoryPicker();
      setDirName(handle.name);
      onSelect(handle);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // user cancelled
      setError('Could not open directory picker');
      console.error(err);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={pickDirectory} variant="outline" className="flex items-center gap-2 cursor-pointer">
        <Folder className="w-4 h-4" />
        {dirName ? `Selected: ${dirName}` : 'Select Root Directory for File paths'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

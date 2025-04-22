// lib/checks/check_files.ts
import { DataRowCheck, DataError } from '@/lib/DataRowParser';

export const fileRefCheck: DataRowCheck = {
  name: 'Check Files',
  async run(parser, emit, context) {
    const files = parser.data?.files;
    const rootDir = context?.rootDir as FileSystemDirectoryHandle | undefined;

    if (!Array.isArray(files)) {
      emit({ status: 'skipped', details: 'No files to check' });
      return;
    }

    // Check actual API use support
    if (typeof FileSystemHandle === 'undefined' || !('getFile' in FileSystemFileHandle.prototype)) {
      emit({
        status: 'failed',
        error: new DataError('This browser does not support the File System Access API', 'UnsupportedBrowser')
      });
      return;
    }

    if (emit({ status: 'in_progress' })) return;

    let all_ok = true;

    for (const filename of files) {
      if (typeof filename !== 'string') {
        if (emit({
          status: 'in_progress',
          error: new DataError(`Invalid file entry: ${JSON.stringify(filename)}`, 'InvalidFileRef')
        })) return;
        all_ok = false;
        continue;
      }

      try {
        let file: File;

        if (rootDir) {
          const fileHandle = await rootDir.getFileHandle(filename);
          file = await fileHandle.getFile();
        } else {
          // We can't check absolute paths without a handle in the browser
          emit({
            status: 'in_progress',
            warning: `Cannot verify "${filename}" without a working directory (treated as absolute)`
          });
          continue;
        }

        if (file.size === 0) {
          if (emit({ status: 'in_progress', warning: `File is empty: ${filename}` })) return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const kind = err instanceof DOMException && err.name === 'NotFoundError'
          ? 'FileNotFound'
          : 'FileAccessError';

        if (emit({
          status: 'in_progress',
          error: new DataError(`Problem accessing "${filename}": ${message}`, kind)
        })) return;
        all_ok = false;
      }
    }

    emit(all_ok ? { status: 'success', details: 'File check completed' } : { status: 'failed' });
  }
};

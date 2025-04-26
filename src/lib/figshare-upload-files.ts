import { createMD5 } from 'hash-wasm';
import {FigshareArticleCreateResponse, FigshareFilePart, FigshareUploadStart} from "@/lib/types/figshare-api";
import {AuthState} from "@/lib/AuthContext";

export type UploadFileStatus = {
  fileIndex: number;
  totalFiles?: number;
  figshareStatus?: string;
  md5?: string;
  name?: string;
  partNumber: number;
  partCount: number;
};

type UploadFilesOptions = {
  files: string[];
  rootDir: FileSystemDirectoryHandle;
  articleId: number;
  fsFetch: AuthState['fsFetch'];
  // Return `true` to stop the upload process
  onProgress?: (status: UploadFileStatus) => void|boolean;
};

async function calculateFileMd5(file: File): Promise<string> {
  const hasher = await createMD5();
  const chunkSize = 1024 * 1024; // 1MB
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    const buf = await chunk.arrayBuffer();
    hasher.update(new Uint8Array(buf));
    offset += chunkSize;
  }

  return hasher.digest();
}

export async function uploadFiles({
                                    files,
                                    rootDir,
                                    articleId,
                                    fsFetch,
                                    onProgress,
                                  }: UploadFilesOptions): Promise<void> {
  // Check actual API use support
  if (typeof FileSystemHandle === 'undefined' || !('getFile' in FileSystemFileHandle.prototype)) {
    throw new Error('This browser does not support the File System Access API');
  }

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const status: UploadFileStatus = {
      fileIndex,
      totalFiles: files.length,
      figshareStatus: undefined,
      md5: undefined,
      name: files[fileIndex],
      partNumber: 0,
      partCount: 0,
    }
    if(onProgress?.({...status})) return;
    const fileHandle = await rootDir.getFileHandle(files[fileIndex]);
    const file = await fileHandle.getFile();
    status.md5 = await calculateFileMd5(file);
    status.name = file.name;

    // Step 1: Initiate upload
    const uploadInit = await fsFetch<FigshareUploadStart>(
        `https://api.figshare.com/v2/account/articles/${articleId}/files`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            md5: status.md5,
          }),
        }
    );

    const uploadUrl = uploadInit.location;
    console.log("uploadInit", uploadInit);

    // Step 2: Get parts list from FigShare
    const partsInfo = await fsFetch<FigshareUploadStart>(uploadUrl);
    status.figshareStatus = partsInfo.status;
    status.partCount = partsInfo.parts?.length ?? 0;
    const parts = partsInfo.parts?.map((p: unknown) => p as FigshareFilePart) ?? [];
    if(onProgress?.({...status})) return;

    // Step 3: Upload parts
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];

      const partUrl = `${uploadUrl}/${part.partNo}`;

      // Get byte range and slice file
      const blobPart = file.slice(part.startOffset, part.endOffset + 1);

      await fsFetch(partUrl, {
        method: 'PUT',
        body: blobPart,
      });

      if(onProgress?.({...status, partNumber: part.partNo})) return;
    }

    // Step 3: Complete upload
    await fsFetch(
        `https://api.figshare.com/v2/account/articles/${articleId}/files/${uploadInit.id}`,
        { method: 'POST' }
    );
    status.figshareStatus = 'completed';
    if(onProgress?.({...status})) return;
  }
}

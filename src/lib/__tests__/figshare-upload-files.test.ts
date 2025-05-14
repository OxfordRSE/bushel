import { describe, it, vi, expect, beforeEach } from 'vitest';
import { uploadFiles } from '@/lib/figshare-upload-files';
import { UploadFileStatus } from '@/lib/figshare-upload-files';

global.FileSystemHandle = class {} as unknown as typeof FileSystemHandle;
global.FileSystemFileHandle = class {
  constructor(private file: File) {}
  async getFile() {
    return this.file;
  }
} as unknown as typeof FileSystemFileHandle;
global.FileSystemFileHandle.prototype.getFile = vi.fn();

global.FileSystemDirectoryHandle = class {
  constructor(private files: Record<string, File>) {}
  async getFileHandle(name: string) {
    if (!this.files[name]) throw new Error('File not found');
    // @ts-expect-error mocked
    return new FileSystemFileHandle(this.files[name]);
  }
} as unknown as typeof FileSystemDirectoryHandle;

vi.mock('hash-wasm', () => ({
  createMD5: async () => ({
    update: vi.fn(),
    digest: vi.fn().mockReturnValue('fake-md5'),
  }),
}));

describe('uploadFiles', () => {
  let mockFile: File;
  let fileHandle: unknown;
  let rootDir: unknown;
  let patchedFetch: <T>(url: (string | URL), options?: (Omit<RequestInit, "body"> & {
    body?: object
  }), internal_options?: {
    returnRawResponse: boolean
  }) => Promise<T>;

  beforeEach(() => {
    const fileContent = 'hello world'; // 11 bytes
    mockFile = new File([fileContent], 'test.txt', { type: 'text/plain' });

    // Patch .slice() to preserve Blob behavior
    // (vitest sometimes mocks File/Blob badly in jsdom)
    const realBlobSlice = Blob.prototype.slice;

    Object.defineProperty(mockFile, 'slice', {
      value(start: number, end: number) {
        const blob = realBlobSlice.call(this, start, end);

        // Patch arrayBuffer only if missing
        if (typeof blob.arrayBuffer !== 'function') {
          blob.arrayBuffer = function () {
            return new Promise<ArrayBuffer>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as ArrayBuffer);
              reader.onerror = () => reject(reader.error);
              reader.readAsArrayBuffer(blob);
            });
          };
        }

        return blob;
      },
    });

    fileHandle = {
      getFile: vi.fn().mockResolvedValue(mockFile),
    };
    rootDir = {
      getFileHandle: vi.fn().mockResolvedValue(fileHandle),
    };

    patchedFetch = vi.fn()
      // Step 1: initiate upload
      .mockResolvedValueOnce({ location: 'https://upload.location/init' })
      // Step 2: get upload location
      .mockResolvedValueOnce({ upload_url: 'https://upload.parts', id: 123 })
      // Step 3: get parts list
      .mockResolvedValueOnce({
        status: 'uploading',
        parts: [{ partNo: 1, startOffset: 0, endOffset: 10 }],
      })
      // Step 4: complete upload
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn(),
      });

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
    } as Response);
  });

  it('uploads files successfully', async () => {
    const progressUpdates: UploadFileStatus[] = [];

    await uploadFiles({
      files: ['test.txt'],
      rootDir: rootDir as FileSystemDirectoryHandle,
      articleId: 42,
      patchedFetch,
      onProgress: (status: UploadFileStatus) => {
        progressUpdates.push(status);
      },
    });

    expect((rootDir as FileSystemDirectoryHandle).getFileHandle).toHaveBeenCalledWith('test.txt');
    expect((fileHandle as FileSystemFileHandle).getFile).toHaveBeenCalled();
    expect(patchedFetch).toHaveBeenCalledTimes(4);
    expect(progressUpdates.some(s => s.figshareStatus === 'completed')).toBe(true);
  });

  it('reports and halts on error during fetch', async () => {
    patchedFetch = vi.fn()
      .mockResolvedValueOnce({ location: 'fail' }) // initiate
      .mockRejectedValueOnce(new Error('network error'));

    const progressUpdates: UploadFileStatus[] = [];

    await uploadFiles({
      files: ['fail.txt'],
      rootDir: rootDir as FileSystemDirectoryHandle,
      articleId: 42,
      patchedFetch,
      onProgress: (status: UploadFileStatus) => {
        progressUpdates.push(status);
      },
    });

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].error).toMatch(/network error/);
  });

  it('throws when File System Access API is unsupported', async () => {
    // Temporarily break support
    const orig = FileSystemFileHandle.prototype.getFile;
    // @ts-expect-error happy to delete non-optional property for testing
    delete FileSystemFileHandle.prototype.getFile;

    await expect(() =>
      uploadFiles({
        files: [],
        rootDir: rootDir as FileSystemDirectoryHandle,
        articleId: 42,
        patchedFetch,
      })
    ).rejects.toThrow('This browser does not support the File System Access API');

    FileSystemFileHandle.prototype.getFile = orig;
  });

  it('stops upload early if onProgress returns true', async () => {
    const progressSpy = vi.fn().mockReturnValueOnce(true);

    await uploadFiles({
      files: ['test.txt'],
      rootDir: rootDir as FileSystemDirectoryHandle,
      articleId: 42,
      patchedFetch,
      onProgress: progressSpy,
    });

    expect(progressSpy).toHaveBeenCalled();
    expect(patchedFetch).not.toHaveBeenCalled();
  });
});

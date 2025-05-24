import { beforeEach, describe, expect, it, vi } from "vitest";
import { fileRefCheck } from "@/lib/checks/row/check_files";
import { DataError } from "@/lib/DataRowParser";

// TypeScript-compatible mock for FileSystemHandle
class MockFileSystemHandle implements FileSystemHandle {
  kind: FileSystemHandleKind = "file" as const;
  name = "mock.txt";
  isSameEntry(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class MockFileSystemFileHandle implements FileSystemFileHandle {
  kind = "file" as const;
  constructor(
    public name: string,
    private readonly data: File,
  ) {}
  isSameEntry(): Promise<boolean> {
    return Promise.resolve(true);
  }
  async getFile(): Promise<File> {
    return this.data;
  }
  async createWritable(): Promise<FileSystemWritableFileStream> {
    throw new Error("Not implemented");
  }
}

class MockFileSystemDirectoryHandle implements FileSystemDirectoryHandle {
  kind = "directory" as const;
  name: string;
  #files: Record<string, File>;
  constructor(name: string, files: Record<string, File>) {
    this.name = name;
    this.#files = files;
  }
  async getFileHandle(name: string): Promise<FileSystemFileHandle> {
    const file = this.#files[name];
    if (!file) throw new DOMException("File not found", "NotFoundError");
    return new MockFileSystemFileHandle(name, file);
  }
  // Minimal stub implementations
  isSameEntry(): Promise<boolean> {
    return Promise.resolve(true);
  }
  getDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    throw new Error("Not implemented");
  }
  removeEntry(): Promise<void> {
    throw new Error("Not implemented");
  }
  resolve(): Promise<string[] | null> {
    throw new Error("Not implemented");
  }
}

beforeEach(() => {
  (globalThis as unknown as { FileSystemHandle: unknown }).FileSystemHandle =
    MockFileSystemHandle;
  (
    globalThis as unknown as { FileSystemFileHandle: unknown }
  ).FileSystemFileHandle = MockFileSystemFileHandle;
});

const emit = vi.fn();

function makeParser(files: unknown[], ctx: Record<string, unknown> = {}) {
  return {
    data: { files },
    internalContext: ctx,
    setInternalContextEntry: (k: string, v: unknown) => (ctx[k] = v),
  };
}

describe("fileRefCheck", () => {
  beforeEach(() => emit.mockClear());

  it("skips if files is not an array", async () => {
    const parser = makeParser(null as never);
    await fileRefCheck.run(parser as never, emit, {});
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "skipped" }),
    );
  });

  it("fails if browser API is not supported", async () => {
    delete (globalThis as unknown as { FileSystemHandle: never })
      .FileSystemHandle;
    const parser = makeParser(["a.txt"]);
    // @ts-expect-error deliberately deleting the API
    await fileRefCheck.run(parser as never, emit, { rootDir: {} });
    const failure = emit.mock.calls.find(([arg]) => arg.status === "failed");
    expect(failure?.[0].error.kind).toBe("UnsupportedBrowser");
  });

  it("fails if no rootDir provided", async () => {
    const parser = makeParser(["a.txt"]);
    await fileRefCheck.run(parser as never, emit, {});
    const failure = emit.mock.calls.find(([arg]) => arg.status === "failed");
    expect(failure?.[0].error.kind).toBe("NoRootDir");
  });

  it("errors on empty file", async () => {
    const file = new File([], "empty.txt");
    const rootDir = new MockFileSystemDirectoryHandle("rootdir", {
      "empty.txt": file,
    });
    const ctx: Record<string, unknown> = {};
    const parser = makeParser(["empty.txt"], ctx);

    await fileRefCheck.run(parser as never, emit, { rootDir });
    const err = emit.mock.calls.find(
      ([a]) => a.error instanceof DataError,
    )?.[0];
    expect(err?.error.kind).toBe("EmptyFileError");
  });

  it("tracks quota when file has size", async () => {
    const file = new File(["abc"], "nonempty.txt");
    const rootDir = new MockFileSystemDirectoryHandle("rootdir", {
      "nonempty.txt": file,
    });
    const ctx: Record<string, unknown> = { quotaUsed: 1000 };
    const parser = makeParser(["nonempty.txt"], ctx);

    await fileRefCheck.run(parser as never, emit, { rootDir });

    expect(ctx.quotaUsed).toBe(1003);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success" }),
    );
  });

  it("emits error if file not found", async () => {
    const rootDir = new MockFileSystemDirectoryHandle("rootdir", {});
    const parser = makeParser(["missing.txt"]);
    await fileRefCheck.run(parser as never, emit, { rootDir });
    const err = emit.mock.calls.find(
      ([a]) => a.error instanceof DataError,
    )?.[0];
    expect(err?.error.kind).toBe("FileNotFound");
  });

  it("emits error if filename is not a string", async () => {
    const file = new File(["hi"], "good.txt");
    const rootDir = new MockFileSystemDirectoryHandle("root_dir", {
      "good.txt": file,
    });
    const parser = makeParser([42], {});
    await fileRefCheck.run(parser as never, emit, { rootDir });
    const err = emit.mock.calls.find(
      ([a]) => a.error instanceof DataError,
    )?.[0];
    expect(err?.error.kind).toBe("InvalidFilenameFormat");
  });
});

// lib/checks/check_files.ts
import { DataRowCheck, DataError } from "@/lib/DataRowParser";

// Values with _ are private values updated by the check to enable cross-row tallies
export type FileRefCheckContext = {
  rootDir?: FileSystemDirectoryHandle;
};

export const fileRefCheck: DataRowCheck<FileRefCheckContext> = {
  name: "Check Files",
  async run(parser, emit, context) {
    const files = parser.data?.files;
    const rootDir = context.rootDir as FileSystemDirectoryHandle | undefined;
    const quotaUsed = Number(parser.internalContext.quotaUsed ?? 0);

    if (!Array.isArray(files)) {
      emit({ status: "skipped", details: "No files to check" });
      return;
    }

    // Check actual API use support
    if (
        typeof FileSystemHandle === "undefined" ||
        !("getFile" in FileSystemFileHandle.prototype)
    ) {
      emit({
        status: "failed",
        error: new DataError(
            "This browser does not support the File System Access API",
            "UnsupportedBrowser",
        ),
      });
      return;
    }

    if (emit({ status: "in_progress" })) return;

    let all_ok = true;

    for (const filename of files) {
      try {
        let file: File;

        if (rootDir) {
          if (typeof filename !== "string") {
            emit({
              status: "in_progress",
              error: new DataError(
                  `Invalid filename format: ${filename} is of type ${typeof filename}, not string`,
                  "InvalidFilenameFormat",
              ),
            });
            continue;
          }
          const fileHandle = await rootDir.getFileHandle(filename);
          file = await fileHandle.getFile();
        } else {
          // We can't check absolute paths without a handle in the browser
          emit({ status: "failed", error: new DataError("A root directory must be selected when a Files column is present", "NoRootDir") });
          return;
        }

        if (file.size === 0) {
          if (
              emit({
                status: "in_progress",
                warning: `File is empty: ${filename}`,
              })
          )
            return;
        } else {
          parser.setInternalContextEntry("quotaUsed", quotaUsed + file.size); // Usage checking is done once after all files are checked
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const kind =
            err instanceof DOMException && err.name === "NotFoundError"
                ? "FileNotFound"
                : "FileAccessError";

        if (
            emit({
              status: "in_progress",
              error: new DataError(
                  `Problem accessing "${filename}": ${message}`,
                  kind,
              ),
            })
        )
          return;
        all_ok = false;
      }
    }

    emit(
        all_ok
            ? { status: "success", details: "File check completed" }
            : { status: "failed" },
    );
  },
};

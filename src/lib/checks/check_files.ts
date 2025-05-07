// lib/checks/check_files.ts
import { DataRowCheck, DataError } from "@/lib/DataRowParser";

// Values with _ are private values updated by the check to enable cross-row tallies
export type FileRefCheckContext = {
  rootDir?: FileSystemDirectoryHandle;
  userQuotaRemaining?: number;
};

export const fileRefCheck: DataRowCheck<FileRefCheckContext> = {
  name: "Check Files",
  async run(parser, emit, context) {
    const files = parser.data?.files;
    const rootDir = context.rootDir as FileSystemDirectoryHandle | undefined;
    const remainingQuota = context.userQuotaRemaining ?? 0;
    let quotaUsed = Number(parser.internalContext.quotaUsed) ?? 0;

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

    if (!rootDir) {
      emit({ status: "failed", error: new DataError("No root directory provided", "NoRootDir") });
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
          emit({
            status: "in_progress",
            warning: `Cannot verify "${filename}" without a working directory (treated as absolute)`,
          });
          continue;
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
          quotaUsed += file.size;
          if (quotaUsed > remainingQuota) {
            emit({
              status: "failed",
              error: new DataError(
                `Storage required for referenced files exceeds remaining FigShare quota (${remainingQuota} bytes). You will only see this error once per spreadsheet because it considers all the files in all rows.`,
                "QuotaExceededError",
              ),
            });
            return; // Always stop on quota errors because every subsequent file will be invalid
          }
          parser.setInternalContextEntry("quotaUsed", quotaUsed); // Update the quota used in context for subsequent checks on other rows
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

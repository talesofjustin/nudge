import * as duplicateImportCheck from "./duplicate-import-check";
import * as transferDetectionCheck from "./transfer-detection-check";
import type { ImportCheck } from "./types";

// Registry the review step runs against. Add a new check by adding a module
// (same shape: `CHECK_ID` + `run(ctx)`) and registering it here — the review
// step itself never needs to change.
export const IMPORT_CHECKS: ImportCheck[] = [
  { id: duplicateImportCheck.CHECK_ID, run: duplicateImportCheck.run },
  { id: transferDetectionCheck.CHECK_ID, run: transferDetectionCheck.run },
];

export type { ImportCheck, ImportCheckContext, ImportFlag, FlagAction } from "./types";

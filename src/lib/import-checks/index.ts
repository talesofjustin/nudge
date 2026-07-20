import * as transferDetectionCheck from "./transfer-detection-check";
import * as bookAssignmentCheck from "./book-assignment-check";
import * as categorySuggestionCheck from "./category-suggestion-check";
import type { ImportCheck } from "./types";

// Registry the review step runs against. Add a new check by adding a module
// (same shape: `CHECK_ID` + `run(ctx)`) and registering it here — the review
// step itself never needs to change. (File-level duplicate detection used to
// live here too; row-level dedup in the review step replaced it entirely.)
export const IMPORT_CHECKS: ImportCheck[] = [
  { id: transferDetectionCheck.CHECK_ID, run: transferDetectionCheck.run },
  { id: bookAssignmentCheck.CHECK_ID, run: bookAssignmentCheck.run },
  { id: categorySuggestionCheck.CHECK_ID, run: categorySuggestionCheck.run },
];

export type { ImportCheck, ImportCheckContext, ImportFlag, FlagAction, FlagItem } from "./types";

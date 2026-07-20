// Shared shape for the import review step's checklist system. Each check is
// a self-contained module exporting a `run()` matching this signature; the
// review UI renders whatever flags come back generically (see
// components/import/review-step.tsx) — adding a new check means adding a
// new module + registering it in ./index.ts, not touching the step's UI.

export type ImportCheckRow = {
  date: string;
  amount: number;
  recipient: string | null;
  description: string | null;
};

export type ImportCheckContext = {
  rows: ImportCheckRow[];
  // Null when the user is creating a brand new account as part of this
  // import — checks that need existing history (duplicate, transfer
  // frequency) simply have nothing to compare against yet and should
  // return no flags.
  accountId: string | null;
  userId: string;
};

export type FlagAction = {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

// A single line item within a flag that groups several related decisions
// under one card (e.g. one row per recipient in a "frequent transfers"
// flag) — each item resolves independently via its own actions.
export type FlagItem = {
  id: string;
  label: string;
  // Omit when the review step renders this item with bespoke UI instead of
  // the generic button list (e.g. book-assignment's picker + checkbox).
  actions?: FlagAction[];
  data?: Record<string, string>;
};

export type ImportFlag = {
  id: string;
  checkId: string;
  title: string;
  message: string;
  // Simple flags (e.g. duplicate-import) use a flat `actions` list resolved
  // once for the whole flag. Flags covering several related decisions (e.g.
  // transfer-detection covering multiple recipients) use `items` instead —
  // exactly one of the two should be set.
  actions?: FlagAction[];
  items?: FlagItem[];
  // Optional sample evidence lines shown under the message (e.g. a few
  // matching transactions) so the user can visually confirm the flag before
  // acting on it.
  evidence?: string[];
  data?: Record<string, string>;
  // Whether this flag must be resolved before the user can continue to the
  // final import. Defaults to true — set false for flags that are purely
  // informational/optional (e.g. transfer-detection: ignoring it just means
  // being asked again next import, nothing is lost by skipping it now).
  blocking?: boolean;
};

export type ImportCheck = {
  id: string;
  run: (ctx: ImportCheckContext) => Promise<ImportFlag[]>;
};

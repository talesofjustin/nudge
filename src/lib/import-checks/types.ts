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

export type ImportFlag = {
  id: string;
  checkId: string;
  title: string;
  message: string;
  actions: FlagAction[];
  data?: Record<string, string>;
};

export type ImportCheck = {
  id: string;
  run: (ctx: ImportCheckContext) => Promise<ImportFlag[]>;
};

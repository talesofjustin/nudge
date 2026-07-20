// Hand-written to match supabase/migrations/20260714160602_initial_schema.sql,
// 20260714173442_add_transactions_recipient.sql,
// 20260714215055_user_settings.sql, 20260715110614_imports.sql,
// 20260718161433_known_recipients.sql, 20260718161434_extend_imports.sql,
// 20260718161435_transactions_raw_description.sql,
// 20260718224029_payday_anchor_day.sql,
// 20260719065257_add_salary_category.sql,
// 20260719211329_budget_tip_dismissed.sql,
// 20260719215053_rename_spaces_to_books.sql,
// 20260719215054_book_resolution.sql,
// 20260719215055_recipient_category_rules.sql,
// 20260719215056_budgets_book_scoping.sql,
// 20260719215058_accounts_column_mapping.sql,
// 20260719215235_user_theme_preference.sql,
// 20260720091557_book_suggestion_dismissed.sql,
// 20260720134127_add_transaction_time_precision.sql,
// 20260720134156_add_counterparty_iban.sql,
// 20260720134216_add_category_kind.sql,
// 20260720134233_add_category_source_and_reviewed_at.sql, and
// 20260720134316_add_recurring_groups.sql. Shaped the way
// `supabase gen types typescript` would produce it, so running that command
// later (once the migrations have been applied) is a drop-in replacement for
// this file. `Relationships` is left empty here (no typed nested-select
// embedding) — real codegen will populate it from the FKs.

export type AccountType = "bank" | "paypal" | "credit_card" | "cash" | "other";
export type DecimalSeparator = "period" | "comma";
export type ThemePreference = "light" | "dark" | "system";
export type CategoryKind = "spending" | "saving";
export type CategorySource = "manual" | "auto";

// Saved on accounts.column_mapping — mirrors ColumnMapping in lib/csv.ts
// plus the locale/expense-value choices made alongside it on first import.
export type SavedColumnMapping = {
  date: string | null;
  amount: string | null;
  recipient: string | null;
  description: string | null;
  sign: string | null;
  counterpartyIban: string | null;
  decimalSeparator: DecimalSeparator;
  expenseValue: string | null;
};

export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          kind: CategoryKind;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          kind?: CategoryKind;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          icon?: string;
          kind?: CategoryKind;
          created_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: AccountType;
          default_book_id: string | null;
          column_mapping: SavedColumnMapping | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: AccountType;
          default_book_id?: string | null;
          column_mapping?: SavedColumnMapping | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: AccountType;
          default_book_id?: string | null;
          column_mapping?: SavedColumnMapping | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          category_id: string | null;
          book_id: string | null;
          amount: number;
          recipient: string | null;
          counterparty_iban: string | null;
          description: string | null;
          raw_description: string | null;
          occurred_at: string;
          has_precise_time: boolean;
          category_source: CategorySource | null;
          reviewed_at: string | null;
          is_recurring: boolean;
          recurring_group_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          category_id?: string | null;
          book_id?: string | null;
          amount: number;
          recipient?: string | null;
          counterparty_iban?: string | null;
          description?: string | null;
          raw_description?: string | null;
          occurred_at?: string;
          has_precise_time?: boolean;
          category_source?: CategorySource | null;
          reviewed_at?: string | null;
          is_recurring?: boolean;
          recurring_group_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          category_id?: string | null;
          book_id?: string | null;
          amount?: number;
          recipient?: string | null;
          counterparty_iban?: string | null;
          description?: string | null;
          raw_description?: string | null;
          occurred_at?: string;
          has_precise_time?: boolean;
          category_source?: CategorySource | null;
          reviewed_at?: string | null;
          is_recurring?: boolean;
          recurring_group_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      recurring_groups: {
        Row: {
          id: string;
          user_id: string;
          identity_key: string;
          label: string;
          interval_days: number;
          typical_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          identity_key: string;
          label: string;
          interval_days: number;
          typical_amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          identity_key?: string;
          label?: string;
          interval_days?: number;
          typical_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          book_id: string | null;
          category_id: string;
          month: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id?: string | null;
          category_id: string;
          month: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string | null;
          category_id?: string;
          month?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          decimal_separator: DecimalSeparator | null;
          timezone: string | null;
          payday_anchor_day: number | null;
          budget_tip_dismissed: boolean;
          theme: ThemePreference | null;
          book_suggestion_dismissed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          decimal_separator?: DecimalSeparator | null;
          timezone?: string | null;
          payday_anchor_day?: number | null;
          budget_tip_dismissed?: boolean;
          theme?: ThemePreference | null;
          book_suggestion_dismissed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          decimal_separator?: DecimalSeparator | null;
          timezone?: string | null;
          payday_anchor_day?: number | null;
          budget_tip_dismissed?: boolean;
          theme?: ThemePreference | null;
          book_suggestion_dismissed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      imports: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          book_id: string | null;
          filename: string | null;
          row_count: number;
          skipped_count: number;
          statement_start_date: string | null;
          statement_end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          book_id?: string | null;
          filename?: string | null;
          row_count: number;
          skipped_count?: number;
          statement_start_date?: string | null;
          statement_end_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          book_id?: string | null;
          filename?: string | null;
          row_count?: number;
          skipped_count?: number;
          statement_start_date?: string | null;
          statement_end_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      known_recipients: {
        Row: {
          id: string;
          user_id: string;
          recipient: string;
          counterparty_iban: string | null;
          identity_key: string;
          is_own_account: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient: string;
          counterparty_iban?: string | null;
          is_own_account?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipient?: string;
          counterparty_iban?: string | null;
          is_own_account?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      recipient_book_rules: {
        Row: {
          id: string;
          user_id: string;
          recipient: string;
          counterparty_iban: string | null;
          identity_key: string;
          book_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient: string;
          counterparty_iban?: string | null;
          book_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipient?: string;
          counterparty_iban?: string | null;
          book_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recipient_category_rules: {
        Row: {
          id: string;
          user_id: string;
          recipient: string;
          counterparty_iban: string | null;
          identity_key: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient: string;
          counterparty_iban?: string | null;
          category_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipient?: string;
          counterparty_iban?: string | null;
          category_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

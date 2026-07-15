// Hand-written to match supabase/migrations/20260714160602_initial_schema.sql,
// 20260714173442_add_transactions_recipient.sql,
// 20260714215055_user_settings.sql, and 20260715110614_imports.sql. Shaped
// the way `supabase gen types typescript` would produce it, so running that
// command later (once the migrations have been applied) is a drop-in
// replacement for this file. `Relationships` is left empty here (no typed
// nested-select embedding) — real codegen will populate it from the FKs.

export type AccountType = "bank" | "paypal" | "credit_card" | "cash" | "other";
export type DecimalSeparator = "period" | "comma";

export type Database = {
  public: {
    Tables: {
      spaces: {
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          icon?: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: AccountType;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: AccountType;
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
          space_id: string | null;
          amount: number;
          recipient: string | null;
          description: string;
          occurred_at: string;
          is_recurring: boolean;
          recurring_group_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          category_id?: string | null;
          space_id?: string | null;
          amount: number;
          recipient?: string | null;
          description: string;
          occurred_at?: string;
          is_recurring?: boolean;
          recurring_group_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          category_id?: string | null;
          space_id?: string | null;
          amount?: number;
          recipient?: string | null;
          description?: string;
          occurred_at?: string;
          is_recurring?: boolean;
          recurring_group_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          month: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          month: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          decimal_separator?: DecimalSeparator | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          decimal_separator?: DecimalSeparator | null;
          timezone?: string | null;
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
          filename: string | null;
          row_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          filename?: string | null;
          row_count: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          filename?: string | null;
          row_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

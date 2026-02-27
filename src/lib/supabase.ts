import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Please create a .env file based on .env.example and restart the server.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trading_accounts: {
        Row: {
          id: string;
          user_id: string;
          account_name: string;
          platform: "MT4" | "MT5" | "cTrader";
          account_number: string;
          broker: string;
          balance: number;
          equity: number;
          status: "connected" | "disconnected" | "error";
          is_master: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          ticket_number: string;
          symbol: string;
          trade_type: "BUY" | "SELL";
          lot_size: number;
          open_price: number;
          close_price: number | null;
          profit: number;
          status: "open" | "closed" | "pending";
          opened_at: string;
          closed_at: string | null;
          created_at: string;
        };
      };
    };
  };
}

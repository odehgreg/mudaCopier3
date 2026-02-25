import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CopyTradeRequest {
  master_ticket: string;
  slave_account_id: string;
  symbol: string;
  trade_type: "BUY" | "SELL";
  lot_size: number;
  open_price: number;
  stop_loss?: number;
  take_profit?: number;
  lot_multiplier: number;
  user_id: string;
}

interface TradeResult {
  success: boolean;
  slave_ticket?: string;
  error?: string;
}

async function copyTrade(req: CopyTradeRequest): Promise<TradeResult> {
  const {
    master_ticket,
    slave_account_id,
    symbol,
    trade_type,
    lot_size,
    open_price,
    lot_multiplier,
    user_id,
  } = req;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate slave ticket
    const slaveTicket = `${master_ticket}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Calculate adjusted lot size
    const adjustedLotSize = lot_size * lot_multiplier;

    // Insert trade record into database
    const { data, error } = await supabase.from("trades").insert({
      user_id,
      account_id: slave_account_id,
      ticket_number: slaveTicket,
      symbol,
      trade_type,
      lot_size: adjustedLotSize,
      open_price,
      status: "open",
      opened_at: new Date().toISOString(),
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      slave_ticket: slaveTicket,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: CopyTradeRequest = await req.json();

    const result = await copyTrade(body);

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});

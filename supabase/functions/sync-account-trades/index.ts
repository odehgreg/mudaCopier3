import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  account_id: string;
  user_id: string;
}

/**
 * Background trade synchronization for TradersConnect-style platform
 * This function runs automatically to sync trades from broker accounts
 */
async function syncAccountTrades(accountId: string, userId: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Get account details
    const { data: account, error: accountError } = await supabase
      .from("trading_accounts")
      .select("*, brokers(*)")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (accountError || !account) {
      throw new Error(`Account not found: ${accountError?.message}`);
    }

    // Get encrypted credentials
    const { data: credentials, error: credError } = await supabase
      .from("account_credentials")
      .select("encrypted_data")
      .eq("account_id", accountId)
      .single();

    if (credError || !credentials) {
      throw new Error("Account credentials not found");
    }

    // Decrypt credentials (simplified - in production use proper encryption)
    const creds = JSON.parse(credentials.encrypted_data);

    // Create sync job record
    const { data: syncJob, error: syncError } = await supabase
      .from("sync_jobs")
      .insert({
        account_id: accountId,
        job_type: "incremental_sync",
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (syncError) {
      throw new Error(`Failed to create sync job: ${syncError.message}`);
    }

    // Fetch trades from broker API
    const trades = await fetchTradesFromBroker(
      account.brokers,
      account.platform,
      account.server,
      creds.account_id,
      creds.password,
      account.last_sync,
    );

    // Process and store trades
    let tradesSynced = 0;
    for (const trade of trades) {
      const { error: tradeError } = await supabase.from("trades").upsert(
        {
          user_id: userId,
          account_id: accountId,
          ticket_number: trade.ticket,
          symbol: trade.symbol,
          trade_type: trade.type,
          lot_size: trade.lots,
          open_price: trade.openPrice,
          close_price: trade.closePrice,
          profit: trade.profit,
          status: trade.status,
          opened_at: trade.openTime,
          closed_at: trade.closeTime,
        },
        { onConflict: "account_id,ticket_number" },
      );

      if (!tradeError) {
        tradesSynced++;
      }
    }

    // Update account balance/equity if available
    if (trades.length > 0) {
      const latestTrade = trades[trades.length - 1];
      if (latestTrade.balance !== undefined) {
        await supabase
          .from("trading_accounts")
          .update({
            balance: latestTrade.balance,
            equity: latestTrade.equity || latestTrade.balance,
            last_sync: new Date().toISOString(),
            sync_status: "success",
          })
          .eq("id", accountId);
      }
    }

    // Update sync job as completed
    await supabase
      .from("sync_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        trades_synced: tradesSynced,
      })
      .eq("id", syncJob.id);

    return { success: true, tradesSynced };
  } catch (error) {
    console.error("Sync error:", error);

    // Update sync job as failed
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", accountId);

    throw error;
  }
}

/**
 * Fetch trades from broker API
 */
async function fetchTradesFromBroker(
  broker: any,
  platform: string,
  server: string,
  accountId: string,
  password: string,
  lastSync?: string,
) {
  const apiUrl = broker.api_endpoint;

  try {
    // Call the existing fetch-broker-accounts function to get trades
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-broker-accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          broker_id: broker.id,
          broker_name: broker.name,
          platform,
          server,
          account_id: accountId,
          password,
          last_sync: lastSync,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Broker API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Return trades data (this would need to be extended in the main function)
    return data.trades || [];
  } catch (error) {
    console.error("Error fetching trades from broker:", error);
    // Return empty array for now - in production, implement proper broker-specific trade fetching
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { account_id, user_id } = await req.json();

    if (!account_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "account_id and user_id are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const result = await syncAccountTrades(account_id, user_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Sync function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Sync failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

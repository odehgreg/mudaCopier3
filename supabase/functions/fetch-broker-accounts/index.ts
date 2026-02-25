import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FetchAccountsRequest {
  broker_id: string;
  api_key: string;
  api_secret: string;
  platform: "MT4" | "MT5" | "cTrader";
}

interface Account {
  account_number: string;
  account_name: string;
  balance: number;
  equity: number;
  currency: string;
  platform: string;
}

async function fetchBrokerAccounts(req: FetchAccountsRequest): Promise<Account[]> {
  const { broker_id, api_key, api_secret, platform } = req;

  try {
    // Simulate different brokers with mock data
    // In production, you would call actual broker APIs
    const mockAccounts: Account[] = [];

    // Generate mock accounts based on broker
    const accountCount = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < accountCount; i++) {
      mockAccounts.push({
        account_number: `${api_key.substring(0, 8)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        account_name: `Trading Account ${i + 1}`,
        balance: 10000 + Math.random() * 90000,
        equity: 10000 + Math.random() * 95000,
        currency: "USD",
        platform: platform,
      });
    }

    return mockAccounts;
  } catch (error) {
    console.error("Error fetching broker accounts:", error);
    throw error;
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
    const body: FetchAccountsRequest = await req.json();

    const accounts = await fetchBrokerAccounts(body);

    return new Response(JSON.stringify({ accounts }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
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

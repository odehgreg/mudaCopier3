import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FetchAccountsRequest {
  broker_id: string;
  broker_name: string;
  platform: "MT4" | "MT5" | "cTrader" | "DXTrade";
  server: string;
  account_id: string;
  password: string;
  mode?: "accounts" | "trades";
  allow_demo_fallback?: boolean;
  last_sync?: string;
}

interface Account {
  account_number: string;
  account_name: string;
  balance: number;
  equity: number;
  currency: string;
  platform: string;
  server?: string;
}

interface Trade {
  ticket: string;
  symbol: string;
  type: "BUY" | "SELL";
  lots: number;
  openPrice: number;
  closePrice?: number;
  profit: number;
  status: "open" | "closed";
  openTime: string;
  closeTime?: string;
}

/**
 * Broker API Endpoints Mapping
 */
const brokerApiEndpoints: { [key: string]: { url: string; type: string } } = {
  // Real APIs with public access
  OANDA: { url: "https://api-fxpractice.oanda.com", type: "OANDA" },
  Dukascopy: { url: "https://fapi.dukascopy.com", type: "DUKASCOPY" },
  "Interactive Brokers": {
    url: "https://api.interactivebrokers.com",
    type: "IB",
  },

  // MT4/MT5 Rest Bridge APIs (if available)
  FTMO: { url: "https://mt4-bridge.ftmo.com", type: "MT4_BRIDGE" },
  "Funded Trading Plus": {
    url: "https://mt4-bridge.fundedtradingplus.com",
    type: "MT4_BRIDGE",
  },
  Exness: { url: "https://mt4-api.exness.com", type: "MT4_BRIDGE" },
  "XM.COM": { url: "https://mt4-api.xm.com", type: "MT4_BRIDGE" },
  "IC Markets": { url: "https://mt4-api.icmarkets.com", type: "MT4_BRIDGE" },
  Pepperstone: { url: "https://mt4-api.pepperstone.com", type: "MT4_BRIDGE" },
  FxPro: { url: "https://mt4-api.fxpro.com", type: "MT4_BRIDGE" },

  // cTrader brokers
  Spotware: { url: "https://openapi.ctrader.com", type: "CTRADER" },

  // DXTrade brokers
  DXTrade: { url: "https://api.dxtrade.com", type: "DXTRADE" },
  "TradersConnect DX": {
    url: "https://api.tradersconnect.com",
    type: "DXTRADE",
  },
};

/**
 * Connect to broker API and fetch accounts
 * Supports MT4, MT5, and cTrader platforms
 */
async function connectToBrokerAndFetchAccounts(
  req: FetchAccountsRequest,
): Promise<Account[]> {
  const {
    broker_name,
    platform,
    server,
    account_id,
    password,
    allow_demo_fallback = false,
  } = req;

  try {
    console.log(`Connecting to ${broker_name} (${platform})`);

    // Validate inputs
    if (!account_id || !password) {
      throw new Error("Account ID and password are required");
    }

    let accounts: Account[] = [];
    const brokerConfig = brokerApiEndpoints[broker_name];

    if (platform === "MT4" || platform === "MT5") {
      // MT4/MT5 connection
      if (brokerConfig?.type === "OANDA") {
        accounts = await fetchOANDAAccounts(
          brokerConfig.url,
          account_id,
          password,
          broker_name,
          allow_demo_fallback,
        );
      } else if (brokerConfig?.type === "DUKASCOPY") {
        accounts = await fetchDukascopyAccounts(
          brokerConfig.url,
          account_id,
          password,
          broker_name,
          allow_demo_fallback,
        );
      } else if (brokerConfig?.type === "MT4_BRIDGE" || !brokerConfig) {
        // Generic MT4/MT5 bridge
        const apiUrl = brokerConfig?.url || "https://mt-bridge.example.com/api";
        accounts = await fetchMT4MT5Accounts(
          apiUrl,
          account_id,
          password,
          server,
          platform,
          broker_name,
          allow_demo_fallback,
        );
      }
    } else if (platform === "cTrader") {
      // cTrader connection
      accounts = await fetchCTraderAccounts(
        account_id,
        password,
        broker_name,
        allow_demo_fallback,
      );
    } else if (platform === "DXTrade") {
      // DXTrade connection
      accounts = await fetchDXTradeAccounts(
        brokerConfig?.url || "https://api.dxtrade.com",
        account_id,
        password,
        broker_name,
        allow_demo_fallback,
      );
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log(
      `Successfully fetched ${accounts.length} account(s) from ${broker_name}`,
    );
    return accounts;
  } catch (error) {
    console.error("Error connecting to broker:", error);
    throw error;
  }
}

async function fetchBrokerTrades(req: FetchAccountsRequest): Promise<Trade[]> {
  const {
    broker_name,
    platform,
    server,
    account_id,
    password,
    allow_demo_fallback = false,
  } = req;

  const brokerConfig = brokerApiEndpoints[broker_name];

  if (platform === "MT4" || platform === "MT5") {
    if (brokerConfig?.type === "OANDA" || brokerConfig?.type === "DUKASCOPY") {
      throw new Error(
        `Trade sync is not yet implemented for ${broker_name} accounts`,
      );
    }

    const apiUrl = brokerConfig?.url || "https://mt-bridge.example.com/api";
    return fetchMT4MT5Trades(
      apiUrl,
      account_id,
      password,
      server,
      allow_demo_fallback,
    );
  }

  if (platform === "cTrader") {
    return fetchCTraderTrades(account_id, password, allow_demo_fallback);
  }

  if (platform === "DXTrade") {
    return fetchDXTradeTrades(
      brokerConfig?.url || "https://api.dxtrade.com",
      account_id,
      password,
      allow_demo_fallback,
    );
  }

  throw new Error(`Unsupported platform for trade sync: ${platform}`);
}

/**
 * Fetch accounts from OANDA broker (real REST API)
 * OANDA has a proper public API
 */
async function fetchOANDAAccounts(
  apiUrl: string,
  accountId: string,
  apiToken: string,
  brokerName: string,
  allowDemoFallback: boolean,
): Promise<Account[]> {
  try {
    // OANDA API call to get account details
    const response = await fetch(`${apiUrl}/v3/accounts/${accountId}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "OANDA-Agent": "mudaCopier/1.0",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid OANDA API token or account ID");
      }
      throw new Error(`OANDA API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.account) {
      throw new Error("No account data returned from OANDA");
    }

    return [
      {
        account_number: data.account.id,
        account_name: data.account.alias || `${brokerName} Account`,
        balance: parseFloat(data.account.balance) || 0,
        equity: parseFloat(data.account.balance) || 0, // Balance is equity for OANDA
        currency: data.account.currency || "USD",
        platform: "MT5",
        server: "OANDA",
      },
    ];
  } catch (error) {
    console.error("Error fetching OANDA accounts:", error);
    if (!allowDemoFallback) {
      throw error;
    }
    return [
      {
        account_number: accountId,
        account_name: `${brokerName} Account (Demo)`,
        balance: 50000,
        equity: 50000,
        currency: "USD",
        platform: "MT5",
        server: "OANDA Demo",
      },
    ];
  }
}

/**
 * Fetch accounts from Dukascopy broker
 */
async function fetchDukascopyAccounts(
  apiUrl: string,
  accountId: string,
  password: string,
  brokerName: string,
  allowDemoFallback: boolean,
): Promise<Account[]> {
  try {
    // Dukascopy authentication
    const authResponse = await fetch(`${apiUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: accountId,
        password: password,
      }),
    });

    if (!authResponse.ok) {
      throw new Error("Dukascopy authentication failed");
    }

    const authData = await authResponse.json();
    const sessionId = authData.sessionId;

    // Fetch account info
    const accountResponse = await fetch(`${apiUrl}/accounts`, {
      headers: {
        "X-Session-ID": sessionId,
        "Content-Type": "application/json",
      },
    });

    if (!accountResponse.ok) {
      throw new Error("Failed to fetch Dukascopy accounts");
    }

    const accounts = await accountResponse.json();

    return (accounts || []).map((acc: any) => ({
      account_number: String(acc.accountId),
      account_name: acc.accountName || `${brokerName} Account`,
      balance: acc.balance || 0,
      equity: acc.equity || 0,
      currency: acc.currency || "USD",
      platform: "MT5",
      server: "Dukascopy",
    }));
  } catch (error) {
    console.error("Error fetching Dukascopy accounts:", error);
    if (!allowDemoFallback) {
      throw error;
    }
    return [
      {
        account_number: accountId,
        account_name: `${brokerName} Account (Demo)`,
        balance: 50000,
        equity: 50000,
        currency: "USD",
        platform: "MT5",
        server: "Dukascopy Demo",
      },
    ];
  }
}

/**
 * Fetch accounts from MT4/MT5 broker via REST bridge
 * This works with brokers that have MT4/MT5 bridge APIs
 */
async function fetchMT4MT5Accounts(
  apiUrl: string,
  accountId: string,
  password: string,
  server: string,
  platform: string,
  brokerName: string,
  allowDemoFallback: boolean,
): Promise<Account[]> {
  try {
    console.log(`Attempting MT4/MT5 connection to ${brokerName} at ${apiUrl}`);

    // Create MT4/MT5 REST API connection
    const authResponse = await fetch(`${apiUrl}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        password,
        server: server || "default",
      }),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!authResponse.ok) {
      throw new Error(
        `MT4/MT5 API authentication failed: ${authResponse.status} ${authResponse.statusText}`,
      );
    }

    const authData = await authResponse.json();
    if (!authData.apiKey) {
      throw new Error("No API key returned from broker");
    }

    // Fetch account details
    const accountResponse = await fetch(`${apiUrl}/account`, {
      headers: {
        Authorization: `Bearer ${authData.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!accountResponse.ok) {
      throw new Error(
        `Failed to fetch account details: ${accountResponse.statusText}`,
      );
    }

    const accountData = await accountResponse.json();

    return [
      {
        account_number: String(accountData.accountNumber || accountId),
        account_name: accountData.accountName || `${brokerName} Account`,
        balance: parseFloat(accountData.balance) || 0,
        equity: parseFloat(accountData.equity) || 0,
        currency: accountData.currency || "USD",
        platform,
        server,
      },
    ];
  } catch (error) {
    console.error("Error fetching MT4/MT5 accounts:", error);
    if (!allowDemoFallback) {
      throw error;
    }
    return [
      {
        account_number: accountId,
        account_name: `${brokerName} ${platform} Account (Demo)`,
        balance: 50000,
        equity: 50000,
        currency: "USD",
        platform,
        server,
      },
    ];
  }
}

/**
 * Fetch accounts from cTrader broker
 */
async function fetchCTraderAccounts(
  accountId: string,
  apiSecret: string,
  brokerName: string,
  allowDemoFallback: boolean,
): Promise<Account[]> {
  try {
    // cTrader OAuth2 token request
    const tokenResponse = await fetch(
      "https://openapi.ctrader.com/v1/auth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: accountId,
          client_secret: apiSecret,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error(`cTrader OAuth failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch cTrader account details
    const accountResponse = await fetch(
      `https://openapi.ctrader.com/v1/accounts/${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!accountResponse.ok) {
      throw new Error(
        `Failed to fetch cTrader account: ${accountResponse.statusText}`,
      );
    }

    const accountData = await accountResponse.json();
    const account = accountData.account;

    return [
      {
        account_number: String(account.accountId || accountId),
        account_name: account.accountName || `${brokerName} cTrader Account`,
        balance: account.balance / 100 || 0, // cTrader uses cents
        equity: account.equity / 100 || 0,
        currency: account.currency || "USD",
        platform: "cTrader",
      },
    ];
  } catch (error) {
    console.error("Error fetching cTrader accounts:", error);
    if (!allowDemoFallback) {
      throw error;
    }
    return [
      {
        account_number: accountId,
        account_name: `${brokerName} cTrader Account (Demo)`,
        balance: 50000,
        equity: 50000,
        currency: "USD",
        platform: "cTrader",
      },
    ];
  }
}

/**
 * Fetch accounts from DXTrade broker
 */
async function fetchDXTradeAccounts(
  apiUrl: string,
  accountId: string,
  apiKey: string,
  brokerName: string,
  allowDemoFallback: boolean,
): Promise<Account[]> {
  try {
    // DXTrade API authentication and account fetch
    const response = await fetch(`${apiUrl}/v1/accounts`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Account-ID": accountId,
        "Content-Type": "application/json",
        "User-Agent": "TradersConnect/1.0",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid DXTrade API key or account ID");
      }
      throw new Error(`DXTrade API failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.accounts || !Array.isArray(data.accounts)) {
      throw new Error("Invalid DXTrade API response format");
    }

    return data.accounts.map((account: any) => ({
      account_number: String(account.accountId || account.id),
      account_name: account.name || `${brokerName} DXTrade Account`,
      balance: parseFloat(account.balance) || 0,
      equity: parseFloat(account.equity) || 0,
      currency: account.currency || "USD",
      platform: "DXTrade",
    }));
  } catch (error) {
    console.error("Error fetching DXTrade accounts:", error);
    if (!allowDemoFallback) {
      throw error;
    }
    return [
      {
        account_number: accountId,
        account_name: `${brokerName} DXTrade Account (Demo)`,
        balance: 100000,
        equity: 100000,
        currency: "USD",
        platform: "DXTrade",
      },
    ];
  }
}

async function fetchMT4MT5Trades(
  apiUrl: string,
  accountId: string,
  password: string,
  server: string,
  allowDemoFallback: boolean,
): Promise<Trade[]> {
  try {
    const authResponse = await fetch(`${apiUrl}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        password,
        server: server || "default",
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!authResponse.ok) {
      throw new Error(
        `MT4/MT5 trade authentication failed: ${authResponse.statusText}`,
      );
    }

    const authData = await authResponse.json();
    const headers = {
      Authorization: `Bearer ${authData.apiKey}`,
      "Content-Type": "application/json",
    };

    const [openResponse, closedResponse] = await Promise.all([
      fetch(`${apiUrl}/trades?type=open`, {
        headers,
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${apiUrl}/trades?type=closed`, {
        headers,
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    if (!openResponse.ok) {
      throw new Error(`Failed to fetch open trades: ${openResponse.statusText}`);
    }
    if (!closedResponse.ok) {
      throw new Error(
        `Failed to fetch closed trades: ${closedResponse.statusText}`,
      );
    }

    const [openData, closedData] = await Promise.all([
      openResponse.json(),
      closedResponse.json(),
    ]);

    return [...(openData.trades || []), ...(closedData.trades || [])].map(
      (trade: any) => ({
        ticket: String(trade.ticket),
        symbol: trade.symbol,
        type: trade.type === 0 || trade.type === "BUY" ? "BUY" : "SELL",
        lots: trade.volume ?? trade.lots ?? 0,
        openPrice: trade.openPrice,
        closePrice: trade.closePrice,
        profit: trade.profit ?? 0,
        status: trade.closeTime ? "closed" : "open",
        openTime: trade.openTime,
        closeTime: trade.closeTime,
      }),
    );
  } catch (error) {
    console.error("Error fetching MT4/MT5 trades:", error);
    if (!allowDemoFallback) {
      throw error;
    }
    return [];
  }
}

async function fetchCTraderTrades(
  accountId: string,
  apiSecret: string,
  allowDemoFallback: boolean,
): Promise<Trade[]> {
  try {
    const tokenResponse = await fetch("https://openapi.ctrader.com/v1/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: accountId,
        client_secret: apiSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`cTrader OAuth failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    };

    const [positionsResponse, dealsResponse] = await Promise.all([
      fetch(`https://openapi.ctrader.com/v1/accounts/${accountId}/positions`, {
        headers,
      }),
      fetch(`https://openapi.ctrader.com/v1/accounts/${accountId}/deals`, {
        headers,
      }),
    ]);

    if (!positionsResponse.ok) {
      throw new Error(
        `Failed to fetch cTrader positions: ${positionsResponse.statusText}`,
      );
    }
    if (!dealsResponse.ok) {
      throw new Error(
        `Failed to fetch cTrader deals: ${dealsResponse.statusText}`,
      );
    }

    const [positionsData, dealsData] = await Promise.all([
      positionsResponse.json(),
      dealsResponse.json(),
    ]);

    const openTrades = (positionsData.positions || []).map((position: any) => ({
      ticket: String(position.positionId),
      symbol: position.symbol || position.symbolId,
      type: position.tradeSide === "BUY" ? "BUY" : "SELL",
      lots: (position.volume ?? 0) / 100,
      openPrice: (position.entryPrice ?? 0) / 100000,
      profit: (position.profit ?? 0) / 100,
      status: "open" as const,
      openTime: new Date(position.createTimestamp).toISOString(),
    }));

    const closedTrades = (dealsData.deals || [])
      .filter((deal: any) => deal.dealStatus === "CLOSED")
      .map((deal: any) => ({
        ticket: String(deal.dealId),
        symbol: deal.symbol,
        type: deal.dealSide === "BUY" ? "BUY" : "SELL",
        lots: (deal.volume ?? 0) / 100,
        openPrice: (deal.entryPrice ?? 0) / 100000,
        closePrice: (deal.exitPrice ?? 0) / 100000,
        profit: (deal.profit ?? 0) / 100,
        status: "closed" as const,
        openTime: new Date(deal.openTimestamp).toISOString(),
        closeTime: new Date(deal.closeTimestamp).toISOString(),
      }));

    return [...openTrades, ...closedTrades];
  } catch (error) {
    console.error("Error fetching cTrader trades:", error);
    if (!allowDemoFallback) {
      throw error;
    }
    return [];
  }
}

async function fetchDXTradeTrades(
  apiUrl: string,
  accountId: string,
  apiKey: string,
  allowDemoFallback: boolean,
): Promise<Trade[]> {
  try {
    const response = await fetch(`${apiUrl}/v1/accounts/${accountId}/positions`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Account-ID": accountId,
        "Content-Type": "application/json",
        "User-Agent": "TradersConnect/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`DXTrade positions failed: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.positions || []).map((position: any) => ({
      ticket: String(position.id),
      symbol: position.symbol,
      type: position.side === "buy" ? "BUY" : "SELL",
      lots: (position.quantity ?? 0) / 100000,
      openPrice: position.price,
      profit: position.unrealizedPnL ?? 0,
      status: "open" as const,
      openTime: new Date(position.openedAt).toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching DXTrade trades:", error);
    if (!allowDemoFallback) {
      throw error;
    }
    return [];
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Test endpoint to get available test brokers
  if (
    url.pathname === "/functions/v1/fetch-broker-accounts" &&
    url.searchParams.get("test") === "true"
  ) {
    return new Response(
      JSON.stringify({
        testBrokers: [
          {
            name: "OANDA",
            platform: "MT5",
            description: "Real API available. Need valid OANDA API token",
            apiUrl: "https://api-fxpractice.oanda.com",
          },
          {
            name: "FTMO",
            platform: "MT4",
            description:
              "Requires valid FTMO account. Demo API available for testing",
            apiUrl: "https://mt4-bridge.ftmo.com/api",
          },
          {
            name: "Exness",
            platform: "MT5",
            description: "REST bridge available. Use your Exness account",
            apiUrl: "https://mt4-api.exness.com",
          },
          {
            name: "IC Markets",
            platform: "MT5",
            description: "REST bridge available",
            apiUrl: "https://mt4-api.icmarkets.com",
          },
          {
            name: "Spotware",
            platform: "cTrader",
            description: "Full OpenAPI support",
            apiUrl: "https://openapi.ctrader.com",
          },
        ],
        note: "For testing, use demo accounts or practice environments. Real API credentials required for live accounts.",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: FetchAccountsRequest = await req.json();

    // Validate required fields
    if (
      !body.broker_name ||
      !body.platform ||
      !body.account_id ||
      !body.password
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: broker_name, platform, account_id, password",
          hint: "Add ?test=true to URL to see available test brokers",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (body.mode === "trades") {
      const trades = await fetchBrokerTrades(body);
      return new Response(JSON.stringify({ trades }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      });
    }

    const accounts = await connectToBrokerAndFetchAccounts(body);

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
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while fetching broker accounts",
        hint: "Check broker credentials and API endpoint availability. Add ?test=true to see available brokers.",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      },
    );
  }
});

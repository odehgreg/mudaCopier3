/**
 * cTrader Broker Implementation
 * Uses the official cTrader OpenAPI for account connections
 */

import {
  BrokerAdapter,
  BrokerAccount,
  BrokerTrade,
  BrokerConnection,
} from "./types";

export class CTraderBrokerAdapter extends BrokerAdapter {
  private accessToken: string = "";
  private ctidTraderAccountId: string = "";
  private baseUrl: string = "https://openapi.ctrader.com";

  constructor(brokerName: string, accountId: string) {
    super(brokerName, accountId);
  }

  /**
   * Connect to cTrader using OAuth/API credentials
   */
  async connect(credentials: BrokerConnection): Promise<void> {
    try {
      // In production, this would use proper OAuth2 flow
      // For now, we expect the password field to contain the API key
      const response = await fetch(`${this.baseUrl}/v1/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: this.accountId,
          client_secret: credentials.password,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `cTrader authentication failed: ${response.statusText}`,
        );
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.ctidTraderAccountId = credentials.accountId || "";
      this.connected = true;

      console.log(`Connected to cTrader account ${this.accountId}`);
    } catch (error) {
      console.error("cTrader connection error:", error);
      throw error;
    }
  }

  /**
   * Disconnect from cTrader
   */
  async disconnect(): Promise<void> {
    this.accessToken = "";
    this.connected = false;
  }

  /**
   * Get account details
   */
  async getAccount(): Promise<BrokerAccount> {
    const response = await fetch(
      `${this.baseUrl}/v1/accounts/${this.ctidTraderAccountId}`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch cTrader account: ${response.statusText}`,
      );
    }

    const data = await response.json();
    const account = data.account;

    return {
      accountId: String(account.accountId),
      accountName: account.accountName,
      balance: account.balance / 100, // cTrader uses cents
      equity: account.equity / 100,
      currency: account.currency,
      leverage: account.leverageInCents / 100,
      freeMargin: (account.equity - account.usedMargin) / 100,
      usedMargin: account.usedMargin / 100,
      marginLevel: (account.equity / (account.usedMargin || 1)) * 100,
      status: "connected",
    };
  }

  /**
   * Get all open trades
   */
  async getTrades(): Promise<BrokerTrade[]> {
    const response = await fetch(
      `${this.baseUrl}/v1/accounts/${this.ctidTraderAccountId}/positions`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch cTrader trades: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.positions || []).map(this.parsePosition.bind(this));
  }

  /**
   * Get closed trades
   */
  async getClosedTrades(days: number = 30): Promise<BrokerTrade[]> {
    const sinceTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const response = await fetch(
      `${this.baseUrl}/v1/accounts/${this.ctidTraderAccountId}/deals?fromTimestamp=${sinceTime}`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch cTrader deals: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.deals || [])
      .filter((d: any) => d.dealStatus === "CLOSED")
      .map(this.parseDeal.bind(this));
  }

  /**
   * Close a trade (position)
   */
  async closeTrade(ticket: string, volume: number): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/accounts/${this.ctidTraderAccountId}/positions/${ticket}/close`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            volume,
          }),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Error closing trade:", error);
      return false;
    }
  }

  /**
   * Open a trade
   */
  async openTrade(
    symbol: string,
    tradeType: "BUY" | "SELL",
    volume: number,
    price?: number,
  ): Promise<BrokerTrade> {
    const response = await fetch(
      `${this.baseUrl}/v1/accounts/${this.ctidTraderAccountId}/positions/open`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          symbolId: symbol,
          tradeData: {
            orderType: "MARKET",
            tradeSide: tradeType,
            volume,
            limitPrice: price || 0,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to open cTrader trade: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parsePosition(data.position);
  }

  /**
   * Private helper methods
   */

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  private parsePosition(data: any): BrokerTrade {
    return {
      ticket: String(data.positionId),
      symbol: data.symbol || data.symbolId,
      tradeType: data.tradeSide === "BUY" ? "BUY" : "SELL",
      volume: data.volume / 100, // cTrader volumes in cents
      openPrice: data.entryPrice / 100000, // cTrader prices in micro
      openTime: new Date(data.createTimestamp),
      profit: data.profit / 100,
      commission: data.commission / 100,
      swap: data.swap / 100,
      status: "open",
    };
  }

  private parseDeal(data: any): BrokerTrade {
    return {
      ticket: String(data.dealId),
      symbol: data.symbol,
      tradeType: data.dealSide === "BUY" ? "BUY" : "SELL",
      volume: data.volume / 100,
      openPrice: data.entryPrice / 100000,
      closePrice: data.exitPrice / 100000,
      openTime: new Date(data.openTimestamp),
      closeTime: new Date(data.closeTimestamp),
      profit: data.profit / 100,
      commission: data.commission / 100,
      swap: data.swap / 100,
      status: "closed",
    };
  }
}

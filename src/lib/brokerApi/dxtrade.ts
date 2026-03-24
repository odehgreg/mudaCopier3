import {
  BrokerAdapter,
  BrokerAccount,
  BrokerConnection,
  BrokerTrade,
} from "./types";

export class DXTradeBrokerAdapter extends BrokerAdapter {
  private accessToken = "";
  private readonly baseUrl: string;

  constructor(
    brokerName: string,
    accountId: string,
    baseUrl: string = "https://api.dxtrade.com/v1",
  ) {
    super(brokerName, accountId);
    this.baseUrl = baseUrl;
  }

  async connect(credentials: BrokerConnection): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Account-ID": this.accountId,
      },
      body: JSON.stringify({
        accountId: this.accountId,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      throw new Error(`DXTrade auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.accessToken || data.token || credentials.password;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.accessToken) {
      return;
    }

    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: "POST",
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.warn("DXTrade logout error:", error);
    } finally {
      this.accessToken = "";
      this.connected = false;
    }
  }

  async getAccount(): Promise<BrokerAccount> {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get DXTrade account info: ${response.statusText}`);
    }

    const data = await response.json();
    const balance = data.balance || 0;
    const equity = data.equity || balance;
    const usedMargin = data.margin || 0;

    return {
      accountId: this.accountId,
      accountName: data.name || `${this.brokerName} DXTrade Account`,
      balance,
      equity,
      currency: data.currency || "USD",
      leverage: data.leverage || 1,
      freeMargin: data.freeMargin || equity - usedMargin,
      usedMargin,
      marginLevel: usedMargin > 0 ? (equity / usedMargin) * 100 : 0,
      status: this.connected ? "connected" : "disconnected",
    };
  }

  async getTrades(): Promise<BrokerTrade[]> {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/positions`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get DXTrade positions: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.positions || []).map((position: any) =>
      this.parseOpenTrade(position),
    );
  }

  async getClosedTrades(days: number = 30): Promise<BrokerTrade[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const params = new URLSearchParams({
      from: fromDate.toISOString(),
    });

    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/history?${params.toString()}`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get DXTrade history: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.trades || []).map((trade: any) => this.parseClosedTrade(trade));
  }

  async closeTrade(
    ticket: string,
    _volume: number,
    _price?: number,
  ): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/positions/${ticket}/close`, {
      method: "POST",
      headers: this.getHeaders(),
    });

    return response.ok;
  }

  async openTrade(
    symbol: string,
    tradeType: "BUY" | "SELL",
    volume: number,
    price?: number,
  ): Promise<BrokerTrade> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        symbol,
        side: tradeType.toLowerCase(),
        quantity: volume * 100000,
        type: price ? "limit" : "market",
        price,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to place DXTrade order: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ticket: String(data.orderId || data.id || Date.now()),
      symbol,
      tradeType,
      volume,
      openPrice: price || data.price || 0,
      openTime: new Date(),
      profit: 0,
      commission: 0,
      swap: 0,
      status: "pending",
    };
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  private parseOpenTrade(position: any): BrokerTrade {
    return {
      ticket: String(position.id),
      symbol: position.symbol,
      tradeType: position.side === "buy" ? "BUY" : "SELL",
      volume: (position.quantity || 0) / 100000,
      openPrice: position.price || 0,
      openTime: new Date(position.openedAt || Date.now()),
      profit: position.unrealizedPnL || 0,
      commission: position.commission || 0,
      swap: position.swap || 0,
      status: "open",
    };
  }

  private parseClosedTrade(trade: any): BrokerTrade {
    return {
      ticket: String(trade.id),
      symbol: trade.symbol,
      tradeType: trade.side === "buy" ? "BUY" : "SELL",
      volume: (trade.quantity || 0) / 100000,
      openPrice: trade.openPrice || 0,
      closePrice: trade.closePrice,
      openTime: new Date(trade.openedAt || Date.now()),
      closeTime: trade.closedAt ? new Date(trade.closedAt) : undefined,
      profit: trade.realizedPnL || 0,
      commission: trade.commission || 0,
      swap: trade.swap || 0,
      status: "closed",
    };
  }
}

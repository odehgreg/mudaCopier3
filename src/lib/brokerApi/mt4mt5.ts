/**
 * MT4/MT5 Broker Implementation
 * Uses REST API bridge for connecting to MetaTrader accounts
 */

import {
  BrokerAdapter,
  BrokerAccount,
  BrokerTrade,
  BrokerConnection,
  BrokerSyncResult,
} from './types';

export class MT4MT5BrokerAdapter extends BrokerAdapter {
  private apiKey: string = '';
  private apiSecret: string = '';
  private baseUrl: string = '';
  private connectionRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(
    brokerName: string,
    accountId: string,
    baseUrl: string = 'https://mt4-bridge.example.com/api'
  ) {
    super(brokerName, accountId);
    this.baseUrl = baseUrl;
  }

  /**
   * Connect to MT4/MT5 via REST API bridge
   * Note: This requires a running MT4/MT5 API bridge server
   */
  async connect(credentials: BrokerConnection): Promise<void> {
    for (let attempt = 0; attempt < this.connectionRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: this.accountId,
            password: credentials.password,
            server: credentials.server || 'default',
          }),
        });

        if (!response.ok) {
          throw new Error(`Authentication failed: ${response.statusText}`);
        }

        const data = await response.json();
        this.apiKey = data.apiKey;
        this.apiSecret = data.apiSecret;
        this.connected = true;

        console.log(`Connected to ${this.brokerName} MT4/MT5 account ${this.accountId}`);
        return;
      } catch (error) {
        if (attempt === this.connectionRetries - 1) {
          throw error;
        }
        await this.delay(this.retryDelay * (attempt + 1));
      }
    }
  }

  /**
   * Disconnect from broker
   */
  async disconnect(): Promise<void> {
    if (!this.apiKey) return;

    try {
      await fetch(`${this.baseUrl}/disconnect`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      this.connected = false;
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  /**
   * Get account details
   */
  async getAccount(): Promise<BrokerAccount> {
    const response = await fetch(`${this.baseUrl}/account`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accountId: data.accountNumber,
      accountName: data.accountName,
      balance: data.balance,
      equity: data.equity,
      currency: data.currency,
      leverage: data.leverage,
      freeMargin: data.freeMargin,
      usedMargin: data.usedMargin,
      marginLevel: (data.equity / (data.usedMargin || 1)) * 100,
      status: this.connected ? 'connected' : 'disconnected',
    };
  }

  /**
   * Get all open trades
   */
  async getTrades(): Promise<BrokerTrade[]> {
    const response = await fetch(`${this.baseUrl}/trades?type=open`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trades: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.trades || []).map(this.parseTrade.bind(this));
  }

  /**
   * Get closed trades
   */
  async getClosedTrades(days: number = 30): Promise<BrokerTrade[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const response = await fetch(
      `${this.baseUrl}/trades?type=closed&since=${sinceDate.toISOString()}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch closed trades: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.trades || []).map(this.parseTrade.bind(this));
  }

  /**
   * Close a trade
   */
  async closeTrade(ticket: string, volume: number, price?: number): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/trades/${ticket}/close`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        volume,
        price: price || 0,
      }),
    });

    return response.ok;
  }

  /**
   * Open a trade
   */
  async openTrade(
    symbol: string,
    tradeType: 'BUY' | 'SELL',
    volume: number,
    price?: number
  ): Promise<BrokerTrade> {
    const response = await fetch(`${this.baseUrl}/trades/open`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        symbol,
        type: tradeType === 'BUY' ? 0 : 1,
        volume,
        price: price || 0,
        slippage: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to open trade: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseTrade(data.trade);
  }

  /**
   * Private helper methods
   */

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'X-API-Secret': this.apiSecret,
    };
  }

  private parseTrade(data: any): BrokerTrade {
    return {
      ticket: String(data.ticket),
      symbol: data.symbol,
      tradeType: data.type === 0 ? 'BUY' : 'SELL',
      volume: data.volume,
      openPrice: data.openPrice,
      openTime: new Date(data.openTime),
      closePrice: data.closePrice,
      closeTime: data.closeTime ? new Date(data.closeTime) : undefined,
      profit: data.profit,
      commission: data.commission || 0,
      swap: data.swap || 0,
      comment: data.comment,
      status: data.closeTime ? 'closed' : 'open',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

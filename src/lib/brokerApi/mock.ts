/**
 * Mock Broker Implementation for Testing
 * Simulates broker behavior without actual API connections
 */

import {
  BrokerAdapter,
  BrokerAccount,
  BrokerTrade,
  BrokerConnection,
} from "./types";

const MOCK_SYMBOLS = ["EURUSD", "GBPUSD", "AUDUSD", "USDJPY", "USDCAD"];
const MOCK_PRICES: { [key: string]: number } = {
  EURUSD: 1.085,
  GBPUSD: 1.265,
  AUDUSD: 0.675,
  USDJPY: 150.25,
  USDCAD: 1.365,
};

export class MockBrokerAdapter extends BrokerAdapter {
  private mockAccount: BrokerAccount;
  private mockTrades: BrokerTrade[] = [];
  private tradeCounter: number = 1000;

  constructor(brokerName: string, accountId: string) {
    super(brokerName, accountId);

    this.mockAccount = {
      accountId,
      accountName: `${brokerName} Demo ${accountId}`,
      balance: 10000,
      equity: 10000,
      currency: "USD",
      leverage: 100,
      freeMargin: 10000,
      usedMargin: 0,
      marginLevel: 0,
      status: "disconnected",
    };

    // Create some mock trades
    this.generateMockTrades();
  }

  /**
   * Connect to mock broker
   */
  async connect(credentials: BrokerConnection): Promise<void> {
    // Simulate connection delay
    await this.delay(500);

    if (credentials.password.length < 4) {
      throw new Error("Invalid password");
    }

    this.connected = true;
    this.mockAccount.status = "connected";
    console.log(
      `Connected to ${this.brokerName} (mock) account ${this.accountId}`,
    );
  }

  /**
   * Disconnect from mock broker
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.mockAccount.status = "disconnected";
  }

  /**
   * Get mock account details
   */
  async getAccount(): Promise<BrokerAccount> {
    // Simulate account balance fluctuation
    const trades = this.mockTrades.filter((t) => t.status === "open");
    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);

    return {
      ...this.mockAccount,
      equity: this.mockAccount.balance + totalProfit,
      usedMargin: trades.reduce(
        (sum, t) => sum + t.volume * MOCK_PRICES[t.symbol] * 0.01,
        0,
      ),
      status: this.connected ? "connected" : "disconnected",
    };
  }

  /**
   * Get mock open trades
   */
  async getTrades(): Promise<BrokerTrade[]> {
    return this.mockTrades.filter((t) => t.status === "open");
  }

  /**
   * Get mock closed trades
   */
  async getClosedTrades(days: number = 30): Promise<BrokerTrade[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    return this.mockTrades.filter(
      (t) => t.status === "closed" && t.openTime >= sinceDate,
    );
  }

  /**
   * Close a mock trade
   */
  async closeTrade(ticket: string, _volume: number = 1.0): Promise<boolean> {
    const trade = this.mockTrades.find((t) => t.ticket === ticket);
    if (!trade) return false;

    const currentPrice = MOCK_PRICES[trade.symbol];
    const priceDiff =
      trade.tradeType === "BUY"
        ? currentPrice - trade.openPrice
        : trade.openPrice - currentPrice;

    const profit = priceDiff * trade.volume * 10; // Simplified calculation

    trade.status = "closed";
    trade.closePrice = currentPrice;
    trade.closeTime = new Date();
    trade.profit = profit;

    return true;
  }

  /**
   * Open a mock trade
   */
  async openTrade(
    symbol: string,
    tradeType: "BUY" | "SELL",
    volume: number,
  ): Promise<BrokerTrade> {
    const price = MOCK_PRICES[symbol] || 1.0;

    const trade: BrokerTrade = {
      ticket: String(++this.tradeCounter),
      symbol,
      tradeType,
      volume,
      openPrice: price,
      openTime: new Date(),
      profit: 0,
      commission: 0.5,
      swap: 0,
      status: "open",
    };

    this.mockTrades.push(trade);
    return trade;
  }

  /**
   * Private helper methods
   */

  private generateMockTrades(): void {
    // Generate 3-5 random mock trades
    const tradeCount = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < tradeCount; i++) {
      const symbol =
        MOCK_SYMBOLS[Math.floor(Math.random() * MOCK_SYMBOLS.length)];
      const tradeType = Math.random() > 0.5 ? "BUY" : "SELL";
      const volume = (Math.floor(Math.random() * 5) + 1) * 0.1;
      const openTime = new Date();
      openTime.setHours(openTime.getHours() - Math.random() * 24);

      const price = MOCK_PRICES[symbol] || 1.0;
      const priceDiff = (Math.random() - 0.5) * 0.05;
      const currentPrice = price + priceDiff;
      const profit =
        (tradeType === "BUY" ? currentPrice - price : price - currentPrice) *
        volume *
        10;

      const trade: BrokerTrade = {
        ticket: String(++this.tradeCounter),
        symbol,
        tradeType,
        volume,
        openPrice: price,
        openTime,
        profit,
        commission: 0.5,
        swap: 0,
        status: "open",
      };

      this.mockTrades.push(trade);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

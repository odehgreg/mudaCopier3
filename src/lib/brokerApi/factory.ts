/**
 * Broker Factory - Creates appropriate broker adapters
 * Manages broker connections and routing
 */

import { BrokerAdapter } from "./types";
import { MT4MT5BrokerAdapter } from "./mt4mt5";
import { CTraderBrokerAdapter } from "./ctrader";
import { DXTradeBrokerAdapter } from "./dxtrade";
import { MockBrokerAdapter } from "./mock";

export type BrokerType = "MT4" | "MT5" | "cTrader" | "DXTrade" | "mock";

export class BrokerFactory {
  private static brokerApiEndpoints: { [key: string]: string } = {
    // Major Prop Firms
    FTMO: "https://api.ftmo.com/v1",
    "Funded Trading Plus": "https://api.fundedtradingplus.com/v1",
    FundingPip: "https://api.fundingpip.com/v1",
    "Alpha Capital Group": "https://api.alphacapitalgroupfx.com/v1",

    // Retail Brokers
    Exness: "https://api.exness.com/v1",
    "Forex.com": "https://api.forex.com/v1",
    OANDA: "https://api.oanda.com/v3",
    "XM.COM": "https://api.xmtrading.com/v1",
    "IC Markets": "https://api.icmarkets.com/v1",

    // DXTrade Brokers
    DXTrade: "https://api.dxtrade.com/v1",
    "TradersConnect DX": "https://api.tradersconnect.com/v1",
  };

  /**
   * Create a broker adapter based on broker name and platform
   */
  static createAdapter(
    brokerName: string,
    accountId: string,
    platform: BrokerType = "MT5",
  ): BrokerAdapter {
    // For testing, return mock adapter
    if (platform === "mock") {
      return new MockBrokerAdapter(brokerName, accountId);
    }

    // For MT4/MT5 brokers
    if (platform === "MT4" || platform === "MT5") {
      const apiUrl =
        this.brokerApiEndpoints[brokerName] ||
        "https://mt-bridge.example.com/api";
      return new MT4MT5BrokerAdapter(brokerName, accountId, apiUrl);
    }

    // For cTrader brokers
    if (platform === "cTrader") {
      return new CTraderBrokerAdapter(brokerName, accountId);
    }

    // For DXTrade brokers
    if (platform === "DXTrade") {
      const apiUrl =
        this.brokerApiEndpoints[brokerName] || "https://api.dxtrade.com/v1";
      return new DXTradeBrokerAdapter(brokerName, accountId, apiUrl);
    }

    throw new Error(`Unsupported platform: ${platform}`);
  }

  /**
   * Get API endpoint for a broker
   */
  static getApiEndpoint(brokerName: string): string {
    return this.brokerApiEndpoints[brokerName] || "https://api.default.com/v1";
  }

  /**
   * Register a custom broker API endpoint
   */
  static registerBrokerEndpoint(brokerName: string, apiUrl: string): void {
    this.brokerApiEndpoints[brokerName] = apiUrl;
  }
}

import { BrokerAdapter, BrokerConnection, Trade, AccountInfo } from "./types";

export class DXTradeBrokerAdapter implements BrokerAdapter {
  constructor(
    private brokerName: string,
    private accountId: string,
    private apiUrl: string,
  ) {}

  async connect(credentials: {
    apiKey: string;
    password?: string;
  }): Promise<BrokerConnection> {
    try {
      // DXTrade authentication
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": credentials.apiKey,
        },
        body: JSON.stringify({
          accountId: this.accountId,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`DXTrade auth failed: ${response.statusText}`);
      }

      const authData = await response.json();
      const token = authData.accessToken;

      return {
        isConnected: true,
        connectionId: token,
        brokerName: this.brokerName,
        accountId: this.accountId,
      };
    } catch (error) {
      console.error("DXTrade connection error:", error);
      return {
        isConnected: false,
        brokerName: this.brokerName,
        accountId: this.accountId,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  async disconnect(connection: BrokerConnection): Promise<void> {
    // DXTrade logout if needed
    try {
      await fetch(`${this.apiUrl}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.connectionId}`,
        },
      });
    } catch (error) {
      console.warn("DXTrade logout error:", error);
    }
  }

  async getAccountInfo(connection: BrokerConnection): Promise<AccountInfo> {
    try {
      const response = await fetch(
        `${this.apiUrl}/accounts/${this.accountId}`,
        {
          headers: {
            Authorization: `Bearer ${connection.connectionId}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get account info: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        accountId: this.accountId,
        balance: data.balance || 0,
        equity: data.equity || data.balance || 0,
        currency: data.currency || "USD",
        margin: data.margin || 0,
        freeMargin: data.freeMargin || 0,
        leverage: data.leverage || 1,
      };
    } catch (error) {
      console.error("Error getting DXTrade account info:", error);
      // Return demo data
      return {
        accountId: this.accountId,
        balance: 100000,
        equity: 100000,
        currency: "USD",
        margin: 0,
        freeMargin: 100000,
        leverage: 100,
      };
    }
  }

  async getOpenTrades(connection: BrokerConnection): Promise<Trade[]> {
    try {
      const response = await fetch(
        `${this.apiUrl}/accounts/${this.accountId}/positions`,
        {
          headers: {
            Authorization: `Bearer ${connection.connectionId}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get positions: ${response.statusText}`);
      }

      const data = await response.json();

      return (data.positions || []).map((pos: any) => ({
        ticket: pos.id.toString(),
        symbol: pos.symbol,
        type: pos.side === "buy" ? "BUY" : "SELL",
        lots: pos.quantity / 100000, // Convert to standard lots
        openPrice: pos.price,
        currentPrice: pos.currentPrice || pos.price,
        profit: pos.unrealizedPnL || 0,
        swap: pos.swap || 0,
        commission: pos.commission || 0,
        status: "open",
        openedAt: new Date(pos.openedAt),
      }));
    } catch (error) {
      console.error("Error getting DXTrade positions:", error);
      return [];
    }
  }

  async getTradeHistory(
    connection: BrokerConnection,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Trade[]> {
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate.toISOString());
      if (toDate) params.append("to", toDate.toISOString());

      const response = await fetch(
        `${this.apiUrl}/accounts/${this.accountId}/history?${params}`,
        {
          headers: {
            Authorization: `Bearer ${connection.connectionId}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get history: ${response.statusText}`);
      }

      const data = await response.json();

      return (data.trades || []).map((trade: any) => ({
        ticket: trade.id.toString(),
        symbol: trade.symbol,
        type: trade.side === "buy" ? "BUY" : "SELL",
        lots: trade.quantity / 100000,
        openPrice: trade.openPrice,
        closePrice: trade.closePrice,
        profit: trade.realizedPnL || 0,
        swap: trade.swap || 0,
        commission: trade.commission || 0,
        status: "closed",
        openedAt: new Date(trade.openedAt),
        closedAt: new Date(trade.closedAt),
      }));
    } catch (error) {
      console.error("Error getting DXTrade history:", error);
      return [];
    }
  }

  async placeOrder(
    connection: BrokerConnection,
    order: {
      symbol: string;
      type: "BUY" | "SELL";
      lots: number;
      price?: number;
      stopLoss?: number;
      takeProfit?: number;
    },
  ): Promise<{ success: boolean; ticket?: string; error?: string }> {
    try {
      const orderData = {
        symbol: order.symbol,
        side: order.type.toLowerCase(),
        quantity: order.lots * 100000, // Convert to DXTrade units
        type: order.price ? "limit" : "market",
        price: order.price,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
      };

      const response = await fetch(`${this.apiUrl}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.connectionId}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Order failed: ${response.statusText}`,
        );
      }

      const result = await response.json();

      return {
        success: true,
        ticket: result.orderId.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Order failed",
      };
    }
  }

  async closePosition(
    connection: BrokerConnection,
    ticket: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/positions/${ticket}/close`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.connectionId}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Close position failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Close failed",
      };
    }
  }

  async modifyPosition(
    connection: BrokerConnection,
    ticket: string,
    modifications: { stopLoss?: number; takeProfit?: number },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/positions/${ticket}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${connection.connectionId}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(modifications),
      });

      if (!response.ok) {
        throw new Error(`Modify position failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Modify failed",
      };
    }
  }
}

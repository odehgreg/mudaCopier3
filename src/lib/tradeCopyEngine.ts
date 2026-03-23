import { supabase } from "./supabase";

export interface TradeCopyConfig {
  id: string;
  user_id: string;
  master_account_id: string;
  slave_account_id: string;
  enabled: boolean;
  lot_multiplier: number;
  max_daily_loss: number;
  max_trades: number;
}

export interface TradeSignal {
  ticket_number: string;
  symbol: string;
  trade_type: "BUY" | "SELL";
  lot_size: number;
  open_price: number;
}

export interface TradeCopyResult {
  success: boolean;
  master_trade_id: string;
  copied_trade_id?: string;
  error?: string;
}

class TradeCopyEngine {
  /**
   * Monitor a master account for new trades and copy them to slave accounts
   */
  async monitorAndCopyTrades(
    masterAccountId: string,
    userId: string,
  ): Promise<TradeCopyResult[]> {
    const results: TradeCopyResult[] = [];

    try {
      // Get all copy configurations for this master account
      const configsResponse = await supabase
        .from("copier_configurations")
        .select("*")
        .eq("master_account_id", masterAccountId)
        .eq("enabled", true)
        .eq("user_id", userId);

      if (configsResponse.error) throw configsResponse.error;
      const configs = configsResponse.data || [];

      if (configs.length === 0) {
        return results;
      }

      // Get recent open trades from master account
      const tradesResponse = await supabase
        .from("trades")
        .select("*")
        .eq("account_id", masterAccountId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50);

      if (tradesResponse.error) throw tradesResponse.error;
      const masterTrades = tradesResponse.data || [];

      // For each configuration, copy trades to slave account
      for (const config of configs) {
        for (const masterTrade of masterTrades) {
          // Check if trade was already copied
          const existingCopyResponse = await supabase
            .from("trades")
            .select("id")
            .eq("account_id", config.slave_account_id)
            .eq("ticket_number", `${masterTrade.ticket_number}-copy`)
            .single();

          // Skip if already copied
          if (existingCopyResponse.data) {
            continue;
          }

          // Calculate copied lot size
          const copiedLotSize = masterTrade.lot_size * config.lot_multiplier;

          // Check daily loss limit
          const dailyLossOk = await this.checkDailyLossLimit(
            config.slave_account_id,
            config.max_daily_loss,
          );

          if (!dailyLossOk) {
            results.push({
              success: false,
              master_trade_id: masterTrade.id,
              error: `Daily loss limit reached for ${config.slave_account_id}`,
            });
            continue;
          }

          // Check max concurrent trades
          const concurrentTradesOk = await this.checkConcurrentTradesLimit(
            config.slave_account_id,
            config.max_trades,
          );

          if (!concurrentTradesOk) {
            results.push({
              success: false,
              master_trade_id: masterTrade.id,
              error: `Max concurrent trades limit reached for ${config.slave_account_id}`,
            });
            continue;
          }

          // Copy the trade
          const copiedTrade = await this.copyTrade(
            masterTrade,
            config.slave_account_id,
            userId,
            copiedLotSize,
          );

          results.push({
            success: true,
            master_trade_id: masterTrade.id,
            copied_trade_id: copiedTrade.id,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Error monitoring and copying trades:", error);
      throw error;
    }
  }

  /**
   * Copy a single trade from master to slave account
   */
  private async copyTrade(
    masterTrade: any,
    slaveAccountId: string,
    userId: string,
    copiedLotSize: number,
  ): Promise<any> {
    const { data, error } = await supabase
      .from("trades")
      .insert({
        user_id: userId,
        account_id: slaveAccountId,
        ticket_number: `${masterTrade.ticket_number}-copy`,
        symbol: masterTrade.symbol,
        trade_type: masterTrade.trade_type,
        lot_size: copiedLotSize,
        open_price: masterTrade.open_price,
        status: "open",
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Close copied trade when master trade closes
   */
  async syncClosedTrade(
    masterTrade: any,
    masterAccountId: string,
    userId: string,
  ): Promise<TradeCopyResult[]> {
    const results: TradeCopyResult[] = [];

    try {
      // Get all configurations for this master account
      const configsResponse = await supabase
        .from("copier_configurations")
        .select("*")
        .eq("master_account_id", masterAccountId)
        .eq("user_id", userId);

      if (configsResponse.error) throw configsResponse.error;
      const configs = configsResponse.data || [];

      // Close corresponding trades in slave accounts
      for (const config of configs) {
        const copiedTradeResponse = await supabase
          .from("trades")
          .select("*")
          .eq("account_id", config.slave_account_id)
          .eq("ticket_number", `${masterTrade.ticket_number}-copy`)
          .single();

        if (copiedTradeResponse.data) {
          const copiedTrade = copiedTradeResponse.data;

          // Calculate P&L proportionally (based on lot multiplier)
          const profit =
            masterTrade.profit * (copiedTrade.lot_size / masterTrade.lot_size);

          const { error } = await supabase
            .from("trades")
            .update({
              status: "closed",
              close_price: masterTrade.close_price,
              profit: profit,
              closed_at: new Date().toISOString(),
            })
            .eq("id", copiedTrade.id);

          if (error) throw error;

          results.push({
            success: true,
            master_trade_id: masterTrade.id,
            copied_trade_id: copiedTrade.id,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Error syncing closed trade:", error);
      throw error;
    }
  }

  /**
   * Check if daily loss limit has been exceeded
   */
  private async checkDailyLossLimit(
    accountId: string,
    maxDailyLoss: number,
  ): Promise<boolean> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: stats, error } = await supabase
        .from("performance_stats")
        .select("total_loss")
        .eq("account_id", accountId)
        .eq("date", today)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found, which is fine
        throw error;
      }

      const totalLoss = stats?.total_loss || 0;
      return Math.abs(totalLoss) < maxDailyLoss;
    } catch (error) {
      console.error("Error checking daily loss limit:", error);
      return false;
    }
  }

  /**
   * Check if concurrent trades limit has been reached
   */
  private async checkConcurrentTradesLimit(
    accountId: string,
    maxTrades: number,
  ): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("status", "open");

      if (error) throw error;

      return (count || 0) < maxTrades;
    } catch (error) {
      console.error("Error checking concurrent trades limit:", error);
      return false;
    }
  }

  /**
   * Get copy configuration
   */
  async getCopyConfiguration(
    configId: string,
  ): Promise<TradeCopyConfig | null> {
    try {
      const { data, error } = await supabase
        .from("copier_configurations")
        .select("*")
        .eq("id", configId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching copy configuration:", error);
      return null;
    }
  }

  /**
   * Update copy configuration
   */
  async updateCopyConfiguration(
    configId: string,
    updates: Partial<TradeCopyConfig>,
  ): Promise<TradeCopyConfig | null> {
    try {
      const { data, error } = await supabase
        .from("copier_configurations")
        .update(updates)
        .eq("id", configId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating copy configuration:", error);
      return null;
    }
  }

  /**
   * Get copy statistics for a slave account
   */
  async getCopyStatistics(
    slaveAccountId: string,
    days: number = 30,
  ): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("account_id", slaveAccountId)
        .like("ticket_number", "%-copy%")
        .gte("opened_at", startDate.toISOString());

      if (error) throw error;

      const trades = data || [];
      const closedTrades = trades.filter((t) => t.status === "closed");
      const winningTrades = closedTrades.filter((t) => t.profit > 0);

      return {
        total_trades: trades.length,
        closed_trades: closedTrades.length,
        winning_trades: winningTrades.length,
        losing_trades: closedTrades.length - winningTrades.length,
        total_profit: closedTrades.reduce((sum, t) => sum + t.profit, 0),
        win_rate:
          closedTrades.length > 0
            ? (winningTrades.length / closedTrades.length) * 100
            : 0,
      };
    } catch (error) {
      console.error("Error fetching copy statistics:", error);
      return null;
    }
  }
}

export const tradeCopyEngine = new TradeCopyEngine();

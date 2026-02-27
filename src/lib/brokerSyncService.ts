/**
 * Broker Sync Service - Manages real-time synchronization of broker data
 * Syncs trades and account info from brokers to Supabase
 */

import { supabase } from './supabase';
import { BrokerFactory, BrokerType } from './brokerApi/factory';
import { BrokerConnection, BrokerSyncResult } from './brokerApi/types';

export interface BrokerConnectionConfig {
  id: string;
  user_id: string;
  broker_id: string;
  broker_name: string;
  platform: BrokerType;
  account_id: string;
  password: string;
  server?: string;
  last_sync?: Date;
  sync_enabled: boolean;
}

export class BrokerSyncService {
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isSyncing: Map<string, boolean> = new Map();

  /**
   * Sync a single account's data
   */
  async syncAccount(config: BrokerConnectionConfig): Promise<BrokerSyncResult> {
    const syncKey = `${config.user_id}:${config.id}`;

    // Prevent concurrent syncs
    if (this.isSyncing.get(syncKey)) {
      throw new Error('Sync already in progress for this account');
    }

    this.isSyncing.set(syncKey, true);

    try {
      // Create broker adapter
      const adapter = BrokerFactory.createAdapter(
        config.broker_name,
        config.account_id,
        config.platform
      );

      // Connect to broker
      const credentials: BrokerConnection = {
        accountId: config.account_id,
        password: config.password,
        server: config.server,
      };

      await adapter.connect(credentials);

      // Fetch account details
      const account = await adapter.getAccount();

      // Fetch trades
      const trades = await adapter.getTrades();

      // Disconnect
      await adapter.disconnect();

      // Save account details to database
      await this.saveAccountData(config.user_id, config.id, account);

      // Save trades to database
      await this.saveTrades(config.user_id, config.id, trades);

      // Update sync timestamp
      await supabase
        .from('trading_accounts')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', config.id);

      return {
        accountId: config.account_id,
        timestamp: new Date(),
        account,
        trades,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error syncing account ${config.account_id}:`, error);

      return {
        accountId: config.account_id,
        timestamp: new Date(),
        trades: [],
        error: errorMessage,
      };
    } finally {
      this.isSyncing.set(syncKey, false);
    }
  }

  /**
   * Sync all accounts for a user
   */
  async syncAllAccounts(userId: string): Promise<BrokerSyncResult[]> {
    try {
      // Fetch all trading accounts for user
      const { data: accounts, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'connected');

      if (error) throw error;

      const results: BrokerSyncResult[] = [];

      // Sync each account
      for (const account of accounts || []) {
        const result = await this.syncAccount({
          id: account.id,
          user_id: userId,
          broker_id: account.broker_id,
          broker_name: account.broker,
          platform: account.platform,
          account_id: account.account_number,
          password: account.api_key || '',
          sync_enabled: true,
        });

        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error syncing all accounts:', error);
      return [];
    }
  }

  /**
   * Start auto-syncing an account
   */
  async startAutoSync(
    config: BrokerConnectionConfig,
    intervalMs: number = 60000
  ): Promise<void> {
    const syncKey = `${config.user_id}:${config.id}`;

    // Clear existing interval if any
    if (this.syncIntervals.has(syncKey)) {
      clearInterval(this.syncIntervals.get(syncKey)!);
    }

    // Initial sync
    await this.syncAccount(config);

    // Set up periodic syncing
    const interval = setInterval(async () => {
      try {
        await this.syncAccount(config);
      } catch (error) {
        console.error(`Auto-sync failed for ${syncKey}:`, error);
      }
    }, intervalMs);

    this.syncIntervals.set(syncKey, interval);
  }

  /**
   * Stop auto-syncing an account
   */
  stopAutoSync(userId: string, accountId: string): void {
    const syncKey = `${userId}:${accountId}`;
    const interval = this.syncIntervals.get(syncKey);

    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(syncKey);
    }
  }

  /**
   * Stop all auto-syncs
   */
  stopAllAutoSync(): void {
    this.syncIntervals.forEach((interval) => clearInterval(interval));
    this.syncIntervals.clear();
  }

  /**
   * Private helper methods
   */

  private async saveAccountData(
    userId: string,
    accountId: string,
    accountData: any
  ): Promise<void> {
    const { error } = await supabase
      .from('trading_accounts')
      .update({
        balance: accountData.balance,
        equity: accountData.equity,
        status: accountData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to save account data: ${error.message}`);
    }
  }

  private async saveTrades(
    userId: string,
    accountId: string,
    trades: any[]
  ): Promise<void> {
    // First, get all existing trades for this account
    const { data: existingTrades, error: fetchError } = await supabase
      .from('trades')
      .select('ticket_number')
      .eq('account_id', accountId);

    if (fetchError) throw fetchError;

    const existingTickets = new Set(
      (existingTrades || []).map((t) => t.ticket_number)
    );

    // Prepare new trades to insert
    const tradesToInsert = trades
      .filter((t) => !existingTickets.has(t.ticket))
      .map((trade) => ({
        user_id: userId,
        account_id: accountId,
        ticket_number: trade.ticket,
        symbol: trade.symbol,
        trade_type: trade.tradeType,
        lot_size: trade.volume,
        open_price: trade.openPrice,
        close_price: trade.closePrice,
        profit: trade.profit,
        status: trade.status,
        opened_at: trade.openTime?.toISOString() || new Date().toISOString(),
        closed_at: trade.closeTime?.toISOString(),
      }));

    // Insert new trades
    if (tradesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('trades')
        .insert(tradesToInsert);

      if (insertError) {
        throw new Error(`Failed to save trades: ${insertError.message}`);
      }
    }

    // Update closed trades
    const closedTrades = trades.filter((t) => t.status === 'closed');
    for (const trade of closedTrades) {
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          status: 'closed',
          close_price: trade.closePrice,
          profit: trade.profit,
          closed_at: trade.closeTime?.toISOString(),
        })
        .eq('ticket_number', trade.ticket)
        .eq('account_id', accountId);

      if (updateError) {
        console.warn(`Failed to update trade ${trade.ticket}:`, updateError);
      }
    }
  }
}

export const brokerSyncService = new BrokerSyncService();

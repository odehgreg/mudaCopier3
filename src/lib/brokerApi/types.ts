/**
 * Broker API Layer - Abstract interfaces and base classes
 * Defines the contract for all broker implementations
 */

export interface BrokerAccount {
  accountId: string;
  accountName: string;
  balance: number;
  equity: number;
  currency: string;
  leverage: number;
  freeMargin: number;
  usedMargin: number;
  marginLevel: number;
  status: 'connected' | 'disconnected' | 'error';
}

export interface BrokerTrade {
  ticket: string;
  symbol: string;
  tradeType: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  openTime: Date;
  closePrice?: number;
  closeTime?: Date;
  profit: number;
  commission: number;
  swap: number;
  comment?: string;
  status: 'open' | 'closed' | 'pending';
}

export interface BrokerConnection {
  accountId: string;
  password: string;
  server?: string;
}

export interface BrokerSyncResult {
  accountId: string;
  timestamp: Date;
  account?: BrokerAccount;
  trades: BrokerTrade[];
  error?: string;
}

export abstract class BrokerAdapter {
  protected brokerName: string;
  protected accountId: string;
  protected connected: boolean = false;

  constructor(brokerName: string, accountId: string) {
    this.brokerName = brokerName;
    this.accountId = accountId;
  }

  /**
   * Connect to broker API
   */
  abstract connect(credentials: BrokerConnection): Promise<void>;

  /**
   * Disconnect from broker
   */
  abstract disconnect(): Promise<void>;

  /**
   * Get account details
   */
  abstract getAccount(): Promise<BrokerAccount>;

  /**
   * Get all open trades
   */
  abstract getTrades(): Promise<BrokerTrade[]>;

  /**
   * Get closed trades
   */
  abstract getClosedTrades(days?: number): Promise<BrokerTrade[]>;

  /**
   * Close a trade
   */
  abstract closeTrade(ticket: string, volume: number, price?: number): Promise<boolean>;

  /**
   * Open a trade
   */
  abstract openTrade(
    symbol: string,
    tradeType: 'BUY' | 'SELL',
    volume: number,
    price?: number
  ): Promise<BrokerTrade>;

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get broker name
   */
  getBrokerName(): string {
    return this.brokerName;
  }

  /**
   * Get account ID
   */
  getAccountId(): string {
    return this.accountId;
  }
}

export interface IBrokerSyncService {
  syncAccount(brokerId: string, connection: BrokerConnection): Promise<BrokerSyncResult>;
  syncAllAccounts(): Promise<BrokerSyncResult[]>;
  startAutoSync(intervalMs: number): void;
  stopAutoSync(): void;
}

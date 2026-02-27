import { supabase } from './supabase';

export interface Broker {
  id: string;
  name: string;
  logo_url: string | null;
  supported_platforms: string[];
  api_endpoint: string | null;
}

export interface BrokerServer {
  name: string;
  description: string;
  environment: 'live' | 'demo';
}

export interface BrokerAccount {
  account_number: string;
  account_name: string;
  balance: number;
  equity: number;
  currency: string;
  platform: string;
  server?: string;
}

class BrokerService {
  /**
   * Fetch all available brokers
   */
  async getAllBrokers(): Promise<Broker[]> {
    try {
      const { data, error } = await supabase
        .from('brokers')
        .select('id, name, logo_url, supported_platforms, api_endpoint')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching brokers:', error);
      return [];
    }
  }

  /**
   * Get servers for a specific broker
   */
  async getBrokerServers(brokerId: string, broker: Broker): Promise<BrokerServer[]> {
    // Return standard live/demo servers for all MT4/MT5 brokers
    const servers: BrokerServer[] = [];

    if (broker.supported_platforms.includes('MT4') || broker.supported_platforms.includes('MT5')) {
      servers.push(
        { name: `${broker.name} Live`, description: 'Live Trading Server', environment: 'live' },
        { name: `${broker.name} Demo`, description: 'Demo Trading Server', environment: 'demo' }
      );
    }

    if (broker.supported_platforms.includes('cTrader')) {
      servers.push(
        { name: `${broker.name} cTrader Live`, description: 'cTrader Live Server', environment: 'live' },
        { name: `${broker.name} cTrader Demo`, description: 'cTrader Demo Server', environment: 'demo' }
      );
    }

    return servers;
  }

  /**
   * Fetch accounts from broker (requires broker-specific implementation)
   * This is a placeholder - actual implementation depends on broker API
   */
  async fetchBrokerAccounts(
    brokerId: string,
    broker: Broker,
    server: string,
    platform: string,
    credentials: { accountId: string; password: string }
  ): Promise<BrokerAccount[]> {
    try {
      // Call Supabase Edge function that handles broker-specific API calls
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-broker-accounts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          body: JSON.stringify({
            broker_id: brokerId,
            broker_name: broker.name,
            server,
            platform,
            account_id: credentials.accountId,
            password: credentials.password,
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      return data.accounts || [];
    } catch (error) {
      console.error('Error fetching broker accounts:', error);
      throw error;
    }
  }

  /**
   * Get broker by ID
   */
  async getBrokerById(brokerId: string): Promise<Broker | null> {
    try {
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .eq('id', brokerId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching broker:', error);
      return null;
    }
  }
}

export const brokerService = new BrokerService();

import { useEffect, useState, useCallback } from 'react';
import { brokerSyncService } from '../lib/brokerSyncService';
import type { BrokerSyncResult } from '../lib/brokerApi/types';

interface UseBrokerSyncOptions {
  accountId?: string;
  enabled?: boolean;
  autoSync?: boolean;
  syncInterval?: number; // milliseconds
}

export function useBrokerSync(options: UseBrokerSyncOptions = {}) {
  const {
    accountId,
    enabled = true,
    autoSync = false,
    syncInterval = 60000, // 1 minute default
  } = options;

  const [syncResult, setSyncResult] = useState<BrokerSyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Manual sync function
  const manualSync = useCallback(
    async (config: any) => {
      if (!config || !enabled) return;

      setIsSyncing(true);
      setError(null);

      try {
        const result = await brokerSyncService.syncAccount(config);
        setSyncResult(result);
        setLastSyncTime(new Date());

        if (result.error) {
          setError(result.error);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Sync failed';
        setError(errorMessage);
        console.error('Broker sync error:', err);
      } finally {
        setIsSyncing(false);
      }
    },
    [enabled]
  );

  // Auto-sync setup
  useEffect(() => {
    if (!autoSync || !accountId || !enabled) return;

    // This would need the full config object to work properly
    // For now, we'll just log a warning
    console.warn('Auto-sync requires full account configuration');
  }, [autoSync, accountId, enabled, syncInterval]);

  return {
    syncResult,
    isSyncing,
    error,
    lastSyncTime,
    manualSync,
  };
}

/**
 * Hook to sync all accounts for a user
 */
export function useBrokerSyncAll(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const [results, setResults] = useState<BrokerSyncResult[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncAll = useCallback(
    async (userId: string) => {
      if (!userId || !enabled) return;

      setIsSyncing(true);
      setError(null);

      try {
        const syncResults = await brokerSyncService.syncAllAccounts(userId);
        setResults(syncResults);

        const errors = syncResults.filter((r) => r.error);
        if (errors.length > 0) {
          setError(`${errors.length} account(s) failed to sync`);
        }

        return syncResults;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Sync failed';
        setError(errorMessage);
        console.error('Multi-sync error:', err);
      } finally {
        setIsSyncing(false);
      }
    },
    [enabled]
  );

  return {
    results,
    isSyncing,
    error,
    syncAll,
  };
}

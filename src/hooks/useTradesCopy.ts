import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { tradeCopyEngine } from '../lib/tradeCopyEngine';

interface UseTradeCopyOptions {
  masterAccountId?: string;
  userId?: string;
  enabled?: boolean;
  pollInterval?: number; // milliseconds
}

export function useTradeCopy(options: UseTradeCopyOptions = {}) {
  const {
    masterAccountId,
    userId,
    enabled = true,
    pollInterval = 30000, // 30 seconds default
  } = options;

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Perform a manual sync
  const syncTrades = useCallback(async () => {
    if (!masterAccountId || !userId) return;

    setIsMonitoring(true);
    setSyncError(null);

    try {
      const results = await tradeCopyEngine.monitorAndCopyTrades(
        masterAccountId,
        userId
      );

      setLastSyncTime(new Date());

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      if (failureCount > 0) {
        console.warn(`Trade copy completed: ${successCount} success, ${failureCount} failed`);
      }

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during trade sync';
      setSyncError(errorMessage);
      console.error('Trade sync error:', error);
    } finally {
      setIsMonitoring(false);
    }
  }, [masterAccountId, userId]);

  // Set up polling for continuous monitoring
  useEffect(() => {
    if (!enabled || !masterAccountId || !userId) return;

    // Initial sync
    syncTrades();

    // Set up interval for continuous monitoring
    const interval = setInterval(() => {
      syncTrades();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, masterAccountId, userId, pollInterval, syncTrades]);

  return {
    isMonitoring,
    lastSyncTime,
    syncError,
    syncTrades,
  };
}

/**
 * Hook to manage a single trade copy configuration
 */
export function useTradeCopyConfig(configId: string) {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const result = await tradeCopyEngine.getCopyConfiguration(configId);
        setConfig(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch config');
      } finally {
        setLoading(false);
      }
    };

    if (configId) {
      fetchConfig();
    }
  }, [configId]);

  // Update configuration
  const updateConfig = useCallback(
    async (updates: any) => {
      try {
        const updated = await tradeCopyEngine.updateCopyConfiguration(
          configId,
          updates
        );
        setConfig(updated);
        return updated;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Update failed';
        setError(errorMessage);
        throw err;
      }
    },
    [configId]
  );

  return {
    config,
    loading,
    error,
    updateConfig,
  };
}

/**
 * Hook to get copy statistics
 */
export function useCopyStatistics(slaveAccountId: string, days: number = 30) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await tradeCopyEngine.getCopyStatistics(
          slaveAccountId,
          days
        );
        setStats(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    if (slaveAccountId) {
      fetchStats();

      // Re-fetch periodically
      const interval = setInterval(fetchStats, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [slaveAccountId, days]);

  return {
    stats,
    loading,
    error,
  };
}

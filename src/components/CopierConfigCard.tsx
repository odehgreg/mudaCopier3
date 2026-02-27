import { useState } from 'react';
import { Pause, Play, Trash2, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTradeCopy, useCopyStatistics } from '../hooks/useTradesCopy';

interface CopierConfigCardProps {
  config: any;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function CopierConfigCard({
  config,
  onDelete,
  onToggle,
}: CopierConfigCardProps) {
  const [syncing, setSyncing] = useState(false);

  // Auto-sync trades
  const { isMonitoring, lastSyncTime, syncError, syncTrades } = useTradeCopy({
    masterAccountId: config.master_account_id,
    userId: config.user_id,
    enabled: config.enabled,
    pollInterval: 30000,
  });

  // Get copy statistics
  const { stats, loading: statsLoading } = useCopyStatistics(
    config.slave_account_id,
    30
  );

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncTrades();
    } finally {
      setSyncing(false);
    }
  };

  const handleToggle = async () => {
    try {
      await supabase
        .from('copier_configurations')
        .update({ enabled: !config.enabled })
        .eq('id', config.id);

      onToggle(config.id, !config.enabled);
    } catch (error) {
      console.error('Error toggling config:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {config.master_account?.account_name} → {config.slave_account?.account_name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {config.master_account?.broker} ({config.master_account?.platform})
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleToggle}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              config.enabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {config.enabled ? (
              <>
                <Play className="w-4 h-4" />
                Active
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                Inactive
              </>
            )}
          </button>

          <button
            onClick={() => onDelete(config.id)}
            className="px-3 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase">Lot Multiplier</p>
          <p className="text-lg font-semibold text-gray-900">{config.lot_multiplier}x</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase">Max Daily Loss</p>
          <p className="text-lg font-semibold text-gray-900">${config.max_daily_loss}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase">Max Trades</p>
          <p className="text-lg font-semibold text-gray-900">{config.max_trades}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase">Status</p>
          <p className={`text-lg font-semibold ${config.enabled ? 'text-green-600' : 'text-gray-400'}`}>
            {config.enabled ? 'Running' : 'Stopped'}
          </p>
        </div>
      </div>

      {/* Monitoring Section */}
      <div className="pt-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700">
              Last Sync:{' '}
              <span className="font-medium">
                {lastSyncTime
                  ? lastSyncTime.toLocaleTimeString()
                  : 'Never'}
              </span>
            </span>
          </div>

          <button
            onClick={handleManualSync}
            disabled={syncing || !config.enabled}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {syncError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{syncError}</p>
          </div>
        )}

        {isMonitoring && (
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            Monitoring active
          </p>
        )}
      </div>

      {/* Statistics Section */}
      {stats && !statsLoading && (
        <div className="pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase">Total Copied</p>
            <p className="text-lg font-semibold text-gray-900">{stats.total_trades}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase">Closed</p>
            <p className="text-lg font-semibold text-gray-900">{stats.closed_trades}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase">Win Rate</p>
            <p className={`text-lg font-semibold ${
              stats.win_rate >= 50 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.win_rate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase">Total P&L</p>
            <p className={`text-lg font-semibold flex items-center gap-1 ${
              stats.total_profit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.total_profit >= 0 && <TrendingUp className="w-4 h-4" />}
              ${stats.total_profit.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

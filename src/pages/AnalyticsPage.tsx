import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AccountStats {
  account: any;
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
}

export function AnalyticsPage() {
  const { user } = useAuth();
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      const [accountsRes, tradesRes] = await Promise.all([
        supabase.from('trading_accounts').select('*').eq('user_id', user.id),
        supabase.from('trades').select('*').eq('user_id', user.id),
      ]);

      const accounts = accountsRes.data || [];
      const trades = tradesRes.data || [];

      const stats = accounts.map(account => {
        const accountTrades = trades.filter(t => t.account_id === account.id && t.status === 'closed');
        const winningTrades = accountTrades.filter(t => (t.profit || 0) > 0);
        const losingTrades = accountTrades.filter(t => (t.profit || 0) < 0);

        const totalProfit = accountTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
        const totalWins = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));

        const avgProfit = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

        return {
          account,
          totalTrades: accountTrades.length,
          winRate: accountTrades.length > 0 ? (winningTrades.length / accountTrades.length) * 100 : 0,
          totalProfit,
          avgProfit,
          avgLoss,
          profitFactor,
        };
      });

      setAccountStats(stats);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
        <p className="text-gray-600 mt-1">Performance metrics for your trading accounts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {accountStats.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500">No analytics data available yet</p>
          </div>
        ) : (
          accountStats.map((stats) => (
            <div key={stats.account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">{stats.account.account_name}</h3>
                <p className="text-sm text-gray-600">
                  {stats.account.platform} • {stats.account.account_number}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-light rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-brand" />
                    <span className="text-sm font-medium text-brand-dark">Total Trades</span>
                  </div>
                  <p className="text-2xl font-bold text-brand-dark">{stats.totalTrades}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Win Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.winRate.toFixed(1)}%</p>
                </div>

                <div className={`rounded-lg p-4 ${stats.totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className={`w-5 h-5 ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`text-sm font-medium ${stats.totalProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      Total Profit
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    ${stats.totalProfit.toFixed(2)}
                  </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Profit Factor</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{stats.profitFactor.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Win</p>
                  <p className="text-lg font-bold text-green-600">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    ${stats.avgProfit.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Loss</p>
                  <p className="text-lg font-bold text-red-600">
                    <TrendingDown className="w-4 h-4 inline mr-1" />
                    ${stats.avgLoss.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

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
  const [chartData, setChartData] = useState<Array<{date: string; profit: number}>>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [timelineByAccount, setTimelineByAccount] = useState<Record<string, Array<{date:string;profit:number}>>>({});

  // update chart data whenever selection or timeline changes
  useEffect(() => {
    if (selectedAccount) {
      setChartData(timelineByAccount[selectedAccount] || []);
    }
  }, [selectedAccount, timelineByAccount]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      const [accountsRes, tradesRes] = await Promise.all([
        supabase.from("trading_accounts").select("*").eq("user_id", user.id),
        supabase.from("trades").select("*").eq("user_id", user.id),
      ]);

      const accounts = accountsRes.data || [];
      const trades = tradesRes.data || [];

      const stats = accounts.map((account) => {
        const accountTrades = trades.filter(
          (t) => t.account_id === account.id && t.status === "closed",
        );
        const winningTrades = accountTrades.filter((t) => (t.profit || 0) > 0);
        const losingTrades = accountTrades.filter((t) => (t.profit || 0) < 0);

        const totalProfit = accountTrades.reduce(
          (sum, t) => sum + (t.profit || 0),
          0,
        );
        const totalWins = winningTrades.reduce(
          (sum, t) => sum + (t.profit || 0),
          0,
        );
        const totalLosses = Math.abs(
          losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0),
        );

        const avgProfit =
          winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
        const avgLoss =
          losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

        return {
          account,
          totalTrades: accountTrades.length,
          winRate:
            accountTrades.length > 0
              ? (winningTrades.length / accountTrades.length) * 100
              : 0,
          totalProfit,
          avgProfit,
          avgLoss,
          profitFactor,
        };
      });

      setAccountStats(stats);

      // build chart data for selectedAccount or first account
      const timeline: Record<string, Array<{date:string;profit:number}>> = {};
      accounts.forEach(acc => {
        timeline[acc.id] = [];
      });
      const closedTrades = trades
        .filter(t => t.status === 'closed' && t.closed_at)
        .sort((a,b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());
      closedTrades.forEach((t) => {
        const accId = t.account_id;
        const arr = timeline[accId];
        if (arr) {
          const last = arr.length ? arr[arr.length-1].profit : 0;
          arr.push({ date: t.closed_at!, profit: last + (t.profit || 0) });
        }
      });
      const initial = accounts[0]?.id || '';
      setTimelineByAccount(timeline);
      setSelectedAccount(initial);
      setChartData(timeline[initial] || []);
    } catch (error) {
      console.error("Error loading analytics:", error);
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
        <p className="text-gray-600 mt-1">
          Performance metrics for your trading accounts
        </p>
      </div>

      {/* account selector + timeline chart */}
      {accountStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-700">Account:</label>
            <select
              value={selectedAccount}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedAccount(id);
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
            >
              {accountStats.map((s) => (
                <option key={s.account.id} value={s.account.id}>{s.account.account_name}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="profit" stroke="#3B82F6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {accountStats.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500">No analytics data available yet</p>
          </div>
        ) : (
          accountStats.map((stats) => (
            <div
              key={stats.account.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  {stats.account.account_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {stats.account.platform} • {stats.account.account_number}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-light rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-brand" />
                    <span className="text-sm font-medium text-brand-dark">
                      Total Trades
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-brand-dark">
                    {stats.totalTrades}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Win Rate
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {stats.winRate.toFixed(1)}%
                  </p>
                </div>

                <div
                  className={`rounded-lg p-4 ${stats.totalProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign
                      className={`w-5 h-5 ${stats.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    />
                    <span
                      className={`text-sm font-medium ${stats.totalProfit >= 0 ? "text-green-900" : "text-red-900"}`}
                    >
                      Total Profit
                    </span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${stats.totalProfit >= 0 ? "text-green-900" : "text-red-900"}`}
                  >
                    ${stats.totalProfit.toFixed(2)}
                  </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">
                      Profit Factor
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    {stats.profitFactor.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Win</p>
                  <p className="text-lg font-bold text-green-600">
                    <TrendingUp className="w-4 h-4 inline mr-1" />$
                    {stats.avgProfit.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Loss</p>
                  <p className="text-lg font-bold text-red-600">
                    <TrendingDown className="w-4 h-4 inline mr-1" />$
                    {stats.avgLoss.toFixed(2)}
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

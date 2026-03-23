import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Target,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface Stats {
  totalAccounts: number;
  activeConfigurations: number;
  totalTrades: number;
  totalProfit: number;
  winRate: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalAccounts: 0,
    activeConfigurations: 0,
    totalTrades: 0,
    totalProfit: 0,
    winRate: 0,
  });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [accountsRes, configsRes, tradesRes, statsRes] = await Promise.all([
        supabase.from("trading_accounts").select("*").eq("user_id", user.id),
        supabase
          .from("copier_configurations")
          .select("*")
          .eq("user_id", user.id)
          .eq("enabled", true),
        supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("trades").select("profit, status").eq("user_id", user.id),
      ]);

      const accounts = accountsRes.data || [];
      const configs = configsRes.data || [];
      const trades = tradesRes.data || [];
      const allTrades = statsRes.data || [];

      const totalProfit = allTrades.reduce(
        (sum, t) => sum + (t.profit || 0),
        0,
      );
      const closedTrades = allTrades.filter((t) => t.status === "closed");
      const winningTrades = closedTrades.filter(
        (t) => (t.profit || 0) > 0,
      ).length;
      const winRate =
        closedTrades.length > 0
          ? (winningTrades / closedTrades.length) * 100
          : 0;

      setStats({
        totalAccounts: accounts.length,
        activeConfigurations: configs.length,
        totalTrades: allTrades.length,
        totalProfit,
        winRate,
      });

      setRecentTrades(trades);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Accounts",
      value: stats.totalAccounts,
      icon: Activity,
      color: "brand",
    },
    {
      title: "Active Copiers",
      value: stats.activeConfigurations,
      icon: Target,
      color: "green",
    },
    {
      title: "Total Trades",
      value: stats.totalTrades,
      icon: TrendingUp,
      color: "orange",
    },
    {
      title: "Total Profit",
      value: `$${stats.totalProfit.toFixed(2)}`,
      icon: DollarSign,
      color: stats.totalProfit >= 0 ? "green" : "red",
    },
    {
      title: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "brand",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 bg-${card.color}-50 rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`w-6 h-6 text-${card.color}-600`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {card.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Recent Trades</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Symbol
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Lots
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Profit
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {recentTrades.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No trades yet
                  </td>
                </tr>
              ) : (
                recentTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {trade.trade_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {trade.lot_size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`
                        px-2 py-1 text-xs font-medium rounded-full
                        ${trade.status === "open" ? "bg-brand-light text-brand" : ""}
                        ${trade.status === "closed" ? "bg-gray-50 text-gray-600" : ""}
                        ${trade.status === "pending" ? "bg-yellow-50 text-yellow-600" : ""}
                      `}
                      >
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={
                          trade.profit >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {trade.profit >= 0 ? (
                          <TrendingUp className="w-4 h-4 inline mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 inline mr-1" />
                        )}
                        ${Math.abs(trade.profit).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  X,
  Play,
  Pause,
  Clock,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTradeCopy, useCopyStatistics } from "../hooks/useTradesCopy";
import { CopierConfigCard } from "../components/CopierConfigCard";
import { Modal } from "../components/Modal";

interface TradingAccount {
  id: string;
  account_name: string;
  platform: string;
  account_number: string;
  broker: string;
  balance: number;
  equity: number;
  is_master: boolean;
}

interface CopierConfig {
  id: string;
  master_account_id: string;
  slave_account_id: string;
  enabled: boolean;
  lot_multiplier: number;
  max_daily_loss: number;
  max_trades: number;
  master_account?: TradingAccount;
  slave_account?: TradingAccount;
}

export function CopierPage() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<CopierConfig[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    master_account_id: "",
    slave_account_id: "",
    lot_multiplier: 1.0,
    max_daily_loss: 1000,
    max_trades: 10,
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [configsData, accountsData] = await Promise.all([
        supabase
          .from("copier_configurations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("trading_accounts").select("*").eq("user_id", user.id),
      ]);

      if (configsData.error) throw configsData.error;
      if (accountsData.error) throw accountsData.error;

      const enrichedConfigs: CopierConfig[] = (configsData.data || []).map(
        (config) => ({
          ...config,
          master_account: (accountsData.data || []).find(
            (a) => a.id === config.master_account_id,
          ),
          slave_account: (accountsData.data || []).find(
            (a) => a.id === config.slave_account_id,
          ),
        }),
      );

      setConfigs(enrichedConfigs);
      setAccounts(accountsData.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.master_account_id || !formData.slave_account_id) {
      alert("Please select both master and slave accounts");
      return;
    }

    if (formData.master_account_id === formData.slave_account_id) {
      alert("Master and slave accounts must be different");
      return;
    }

    try {
      const { error } = await supabase.from("copier_configurations").insert({
        user_id: user.id,
        ...formData,
        enabled: true,
      });

      if (error) throw error;

      setFormData({
        master_account_id: "",
        slave_account_id: "",
        lot_multiplier: 1.0,
        max_daily_loss: 1000,
        max_trades: 10,
      });
      setShowAddForm(false);
      loadData();
    } catch (error) {
      console.error("Error adding config:", error);
      alert("Failed to create copier configuration");
    }
  };

  const handleToggleConfig = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("copier_configurations")
        .update({ enabled: !enabled })
        .eq("id", id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error toggling config:", error);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Delete this copier configuration?")) return;

    try {
      const { error } = await supabase
        .from("copier_configurations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error deleting config:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  const masterAccounts = accounts.filter((a) => a.is_master);
  const slaveAccounts = accounts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trade Copier</h2>
          <p className="text-gray-600 mt-1">
            Copy trades from master to slave accounts automatically
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Copy Link
        </button>
      </div>

      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Create Copy Configuration"
      >
        <form onSubmit={handleAddConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Master Account (Source)
              </label>
              <select
                value={formData.master_account_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    master_account_id: e.target.value,
                  })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
              >
                <option value="">Select master account</option>
                {masterAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} ({account.broker})
                  </option>
                ))}
              </select>
              {masterAccounts.length === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Create and mark accounts as Master first
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slave Account (Destination)
              </label>
              <select
                value={formData.slave_account_id}
                onChange={(e) =>
                  setFormData({ ...formData, slave_account_id: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
              >
                <option value="">Select slave account</option>
                {slaveAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} ({account.broker})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lot Multiplier
              </label>
              <input
                type="number"
                value={formData.lot_multiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lot_multiplier: parseFloat(e.target.value),
                  })
                }
                step="0.1"
                min="0.1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="1.0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Multiply master lot size by this amount
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Daily Loss
              </label>
              <input
                type="number"
                value={formData.max_daily_loss}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_daily_loss: parseFloat(e.target.value),
                  })
                }
                step="10"
                min="0"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Concurrent Trades
              </label>
              <input
                type="number"
                value={formData.max_trades}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_trades: parseInt(e.target.value),
                  })
                }
                step="1"
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
            >
              <Check className="w-5 h-5" />
              Create Configuration
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 gap-4">
        {configs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500">
              No copy configurations yet. Create one to get started.
            </p>
          </div>
        ) : (
          configs.map((config) => (
            <CopierConfigCard
              key={config.id}
              config={config}
              onDelete={handleDeleteConfig}
              onToggle={handleToggleConfig}
            />
          ))
        )}
      </div>
    </div>
  );
}

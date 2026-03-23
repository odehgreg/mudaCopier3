import { useEffect, useState } from "react";
import { Plus, Trash2, Check, X, Loader } from "lucide-react";
import Select from "react-select";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  brokerService,
  Broker,
  BrokerAccount,
  BrokerServer,
} from "../lib/brokerService";
import { Modal } from "../components/Modal";
import {
  BrokerTestingInfo,
  BrokerTestingGuide,
} from "../components/BrokerTestingInfo";

interface TradingAccount {
  id: string;
  account_name: string;
  platform: "MT4" | "MT5" | "cTrader";
  account_number: string;
  broker: string;
  balance: number;
  equity: number;
  status: "connected" | "disconnected" | "error";
  is_master: boolean;
}

export function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [brokerServers, setBrokerServers] = useState<BrokerServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [selectedBrokerAccounts, setSelectedBrokerAccounts] = useState<
    BrokerAccount[]
  >([]);
  const [brokerSearchQuery, setBrokerSearchQuery] = useState("");
  // Remove old dropdown state
  const [formData, setFormData] = useState({
    account_name: "",
    platform: "MT5" as "MT4" | "MT5" | "cTrader" | "DXTrade",
    broker_id: "",
    broker_name: "",
    server: "",
    account_id: "",
    account_password: "",
    is_master: false,
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [accountsData, allBrokers] = await Promise.all([
        supabase
          .from("trading_accounts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        brokerService.getAllBrokers(),
      ]);

      if (accountsData.error) throw accountsData.error;

      setAccounts(accountsData.data || []);
      setBrokers(allBrokers);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare react-select options for brokers
  const brokerOptions = brokers.map((broker) => ({
    value: broker.id,
    label: broker.name,
    supported_platforms: broker.supported_platforms,
    brokerObj: broker,
  }));

  const handleBrokerSelect = async (option: any) => {
    const broker = option?.brokerObj;
    if (!broker) return;
    setFormData((prev) => ({
      ...prev,
      broker_id: broker.id,
      broker_name: broker.name,
      server: "",
      account_id: "",
      account_password: "",
    }));
    if (!broker.id) {
      setBrokerServers([]);
      setSelectedBrokerAccounts([]);
      return;
    }
    setLoadingServers(true);
    try {
      const servers = await brokerService.getBrokerServers(broker.id, broker);
      setBrokerServers(servers);
      setSelectedBrokerAccounts([]);
    } catch (error) {
      console.error("Error loading broker servers:", error);
    } finally {
      setLoadingServers(false);
    }
  };

  const handleServerSelect = async (server: string) => {
    setFormData((prev) => ({
      ...prev,
      server,
      account_id: "",
      account_password: "",
    }));

    setFetchingAccounts(true);
    try {
      const selectedBroker = brokers.find((b) => b.id === formData.broker_id);
      if (!selectedBroker || !server) return;

      const accounts = await brokerService.fetchBrokerAccounts(
        formData.broker_id,
        selectedBroker,
        server,
        formData.platform,
        {
          accountId: formData.account_id || "demo",
          password: formData.account_password || "demo",
        },
      );
      setSelectedBrokerAccounts(accounts);
    } catch (error) {
      console.error("Error fetching accounts from server:", error);
      setSelectedBrokerAccounts([]);
      alert(
        `Failed to fetch accounts: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setFetchingAccounts(false);
    }
  };

  const handleSelectBrokerAccount = (account: BrokerAccount) => {
    setFormData((prev) => ({
      ...prev,
      account_name: account.account_name,
      account_id: account.account_number,
    }));
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !user ||
      !formData.broker_id ||
      !formData.server ||
      !formData.account_id ||
      !formData.account_password
    ) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      // Test connection to broker before saving
      const selectedBroker = brokers.find((b) => b.id === formData.broker_id);
      if (!selectedBroker) {
        throw new Error("Broker not found");
      }

      console.log("Testing broker connection...");
      // Test connection
      const result = await brokerService.validateConnection(
        selectedBroker,
        formData.platform,
        formData.server,
        formData.account_id,
        formData.account_password,
      );

      if (!result.success) {
        alert(`Connection test failed: ${result.message}`);
        return;
      }

      // Save account
      const { data: accountData, error: accountError } = await supabase
        .from("trading_accounts")
        .insert({
          user_id: user.id,
          account_name: formData.account_name || formData.account_id,
          platform: formData.platform,
          account_number: formData.account_id,
          broker: formData.broker_name,
          broker_id: formData.broker_id,
          balance: 0,
          equity: 0,
          status: "connected",
          is_master: formData.is_master,
          server: formData.server,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Store credentials securely
      const credentialsJson = JSON.stringify({
        account_id: formData.account_id,
        password: formData.account_password,
      });

      const { error: credError } = await supabase
        .from("account_credentials")
        .insert({
          account_id: accountData.id,
          encrypted_data: credentialsJson, // In production, encrypt this
        });

      if (credError) {
        console.error("Failed to store credentials:", credError);
        // Don't fail the whole operation, but log the error
      }

      // Reset form
      setFormData({
        account_name: "",
        platform: "MT5",
        broker_id: "",
        broker_name: "",
        server: "",
        account_id: "",
        account_password: "",
        is_master: false,
      });
      setShowAddForm(false);
      setSelectedBrokerAccounts([]);

      // Refresh accounts list
      loadData();

      alert("Account added successfully! Trades will be synchronized automatically.");
    } catch (error) {
      console.error("Error adding account:", error);
      alert(
        `Failed to add account: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  

      alert("Account added successfully!");
      setFormData({
        account_name: "",
        platform: "MT5",
        broker_id: "",
        broker_name: "",
        server: "",
        account_id: "",
        account_password: "",
        is_master: false,
      });
      setBrokerServers([]);
      setSelectedBrokerAccounts([]);
      setShowAddForm(false);
      loadData();
    } 
    // catch (error) {
    //   console.error("Error adding account:", error);
    //   alert(
    //     `Failed to add account: ${error instanceof Error ? error.message : "Unknown error"}`,
    //   );
    // }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      const { error } = await supabase
        .from("trading_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error deleting account:", error);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trading Accounts</h2>
          <p className="text-gray-600 mt-1">
            Manage your MT4, MT5, and cTrader accounts
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Account
        </button>
      </div>

      <BrokerTestingGuide />

      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Add Trading Account"
      >
        <form onSubmit={handleAddAccount} className="space-y-6">
          {/* re-use previous form markup, omit duplicate container */}
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Account Credentials
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Enter your account details
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) =>
                setFormData({ ...formData, account_name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="alphacapital2489500"
            />
          </div>

          {/* Card-based platform selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "MT4", label: "MetaTrader 4" },
                { value: "MT5", label: "MetaTrader 5" },
                { value: "cTrader", label: "cTrader" },
                { value: "DXTrade", label: "DXTrade" },
              ].map((platform) => (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, platform: platform.value as any })}
                  className={`flex flex-col items-center justify-center border rounded-lg px-4 py-3 transition-colors font-medium text-sm
                    ${formData.platform === platform.value ? "border-brand bg-brand-light text-brand" : "border-gray-300 hover:border-brand"}`}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Broker <span className="text-red-500">*</span>
            </label>
            <Select
              options={brokerOptions}
              value={brokerOptions.find((opt) => opt.value === formData.broker_id) || null}
              onChange={handleBrokerSelect}
              placeholder="Search and select a broker..."
              isClearable
              formatOptionLabel={(option: any) => (
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.supported_platforms?.join(", ")}</span>
                </div>
              )}
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({ ...base, minHeight: 48, borderRadius: 8, borderColor: '#d1d5db' }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#e6f7f6' : state.isFocused ? '#f3f4f6' : undefined,
                  color: state.isSelected ? '#14b8a6' : '#111827',
                  fontWeight: state.isSelected ? 600 : 400,
                }),
              }}
            />
          </div>

          {loadingServers && (
            <div className="flex items-center justify-center py-4">
              <Loader className="w-5 h-5 animate-spin text-brand mr-2" />
              <span className="text-sm text-gray-600">Loading servers...</span>
            </div>
          )}

          {formData.broker_name && !loadingServers && (
            <BrokerTestingInfo broker={formData.broker_name} />
          )}

          {brokerServers.length > 0 && !loadingServers && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Server <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.server}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      server: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                >
                  <option value="">Select a server</option>
                  {brokerServers.map((server) => (
                    <option key={server.name} value={server.name}>
                      {server.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.account_password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      account_password: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="button"
                onClick={() => handleServerSelect(formData.server)}
                disabled={
                  !formData.server ||
                  !formData.account_password ||
                  fetchingAccounts
                }
                className="w-full bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {fetchingAccounts ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Fetching Accounts...
                  </>
                ) : (
                  "Fetch Accounts from Broker"
                )}
              </button>
            </>
          )}

          {selectedBrokerAccounts.length > 0 && !fetchingAccounts && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Account <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {selectedBrokerAccounts.map((account, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectBrokerAccount(account)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      formData.account_id === account.account_number
                        ? "border-brand bg-brand-light"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <p className="font-medium text-gray-900">
                      {account.account_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      #{account.account_number} • Balance: $
                      {account.balance.toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedBrokerAccounts.length > 0 && formData.account_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name (Optional)
              </label>
              <input
                type="text"
                value={formData.account_name}
                onChange={(e) =>
                  setFormData({ ...formData, account_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="e.g., Main Trading Account"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use account number
              </p>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_master}
                onChange={(e) =>
                  setFormData({ ...formData, is_master: e.target.checked })
                }
                className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
              />
              <span className="text-sm font-medium text-gray-700">
                Master Account
              </span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Add Account
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setBrokerServers([]);
                setSelectedBrokerAccounts([]);
                setFormData({
                  account_name: "",
                  platform: "MT5",
                  broker_id: "",
                  server: "",
                  account_id: "",
                  account_password: "",
                  is_master: false,
                });
              }}
              className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500">No accounts added yet</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">
                    {account.account_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {account.platform} • {account.broker}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account #:</span>
                  <span className="font-medium text-gray-900">
                    {account.account_number}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-medium text-gray-900">
                    ${account.balance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Equity:</span>
                  <span className="font-medium text-gray-900">
                    ${account.equity.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <span
                  className={`
                  flex-1 text-center px-3 py-1 text-xs font-medium rounded-full
                  ${account.status === "connected" ? "bg-green-50 text-green-600" : ""}
                  ${account.status === "disconnected" ? "bg-gray-50 text-gray-600" : ""}
                  ${account.status === "error" ? "bg-red-50 text-red-600" : ""}
                `}
                >
                  {account.status}
                </span>
                {account.is_master && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-brand-light text-brand">
                    Master
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

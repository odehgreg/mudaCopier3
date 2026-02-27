import { useEffect, useState } from 'react';
import { Plus, Trash2, Check, X, Loader, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { brokerService, Broker, BrokerAccount, BrokerServer } from '../lib/brokerService';
import { Modal } from '../components/Modal';

interface TradingAccount {
  id: string;
  account_name: string;
  platform: 'MT4' | 'MT5' | 'cTrader';
  account_number: string;
  broker: string;
  balance: number;
  equity: number;
  status: 'connected' | 'disconnected' | 'error';
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
  const [selectedBrokerAccounts, setSelectedBrokerAccounts] = useState<BrokerAccount[]>([]);
  const [brokerSearchQuery, setBrokerSearchQuery] = useState('');
  const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    platform: 'MT5' as 'MT4' | 'MT5' | 'cTrader',
    broker_id: '',
    broker_name: '',
    server: '',
    account_id: '',
    account_password: '',
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
          .from('trading_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        brokerService.getAllBrokers(),
      ]);

      if (accountsData.error) throw accountsData.error;

      setAccounts(accountsData.data || []);
      setBrokers(allBrokers);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter brokers based on search
  const filteredBrokers = brokers.filter((broker) =>
    broker.name.toLowerCase().includes(brokerSearchQuery.toLowerCase())
  );

  const handleBrokerSelect = async (broker: Broker) => {
    setFormData((prev) => ({
      ...prev,
      broker_id: broker.id,
      broker_name: broker.name,
      server: '',
      account_id: '',
      account_password: '',
    }));

    setShowBrokerDropdown(false);
    setBrokerSearchQuery('');

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
      console.error('Error loading broker servers:', error);
    } finally {
      setLoadingServers(false);
    }
  };

  const handleServerSelect = async (server: string) => {
    setFormData((prev) => ({
      ...prev,
      server,
      account_id: '',
      account_password: '',
    }));

    setFetchingAccounts(true);
    try {
      const selectedBroker = brokers.find((b) => b.id === formData.broker_id);
      if (!selectedBroker || !server) return;

      await brokerService.fetchBrokerAccounts(
        formData.broker_id,
        selectedBroker,
        server,
        formData.platform,
        {
          accountId: formData.account_id,
          password: formData.account_password,
        }
      );
      // Note: Mock implementation - actual accounts will be fetched from broker API
      setSelectedBrokerAccounts([]);
    } catch (error) {
      console.error('Error fetching accounts from server:', error);
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
    if (!user || !formData.broker_id || !formData.server || !formData.account_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('trading_accounts').insert({
        user_id: user.id,
        account_name: formData.account_name || formData.account_id,
        platform: formData.platform,
        account_number: formData.account_id,
        broker: formData.broker_name,
        broker_id: formData.broker_id,
        balance: 0,
        equity: 0,
        status: 'connected',
        is_master: formData.is_master,
        api_key: formData.account_password,
      });

      if (error) throw error;

      setFormData({
        account_name: '',
        platform: 'MT5',
        broker_id: '',
        broker_name: '',
        server: '',
        account_id: '',
        account_password: '',
        is_master: false,
      });
      setBrokerServers([]);
      setSelectedBrokerAccounts([]);
      setShowAddForm(false);
      loadData();
    } catch (error) {
      console.error('Error adding account:', error);
      alert('Failed to add account');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const { error } = await supabase
        .from('trading_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting account:', error);
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
          <p className="text-gray-600 mt-1">Manage your MT4, MT5, and cTrader accounts</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Account
        </button>
      </div>

      <Modal isOpen={showAddForm} onClose={() => setShowAddForm(false)} title="Add Trading Account">
        <form onSubmit={handleAddAccount} className="space-y-6">
          {/* re-use previous form markup, omit duplicate container */}
          <div>
            <h3 className="text-lg font-bold text-gray-900">Account Credentials</h3>
            <p className="text-sm text-gray-600 mt-1">Enter your account details</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="alphacapital2489500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Server Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
            >
              <option value="MT4">MetaTrader 4</option>
              <option value="MT5">MetaTrader 5</option>
              <option value="cTrader">cTrader</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Broker <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBrokerDropdown(!showBrokerDropdown)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className={formData.broker_name ? 'text-gray-900' : 'text-gray-500'}>
                  {formData.broker_name || 'Select a broker...'}
                </span>
                <Search className="w-4 h-4 text-gray-400" />
              </button>

              {showBrokerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  <input
                    type="text"
                    placeholder="Search brokers..."
                    value={brokerSearchQuery}
                    onChange={(e) => setBrokerSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border-b border-gray-300 focus:outline-none"
                  />
                  <div className="max-h-64 overflow-y-auto">
                    {filteredBrokers.length > 0 ? (
                      filteredBrokers.map((broker) => (
                        <button
                          key={broker.id}
                          type="button"
                          onClick={() => handleBrokerSelect(broker)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{broker.name}</p>
                            <p className="text-xs text-gray-600">
                              {broker.supported_platforms.join(', ')}
                            </p>
                          </div>
                          {formData.broker_id === broker.id && <Check className="w-4 h-4 text-brand" />}
                        </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-gray-500 text-sm">
                          No brokers found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {loadingServers && (
              <div className="flex items-center justify-center py-4">
                <Loader className="w-5 h-5 animate-spin text-brand mr-2" />
                <span className="text-sm text-gray-600">Loading servers...</span>
              </div>
            )}

            {brokerServers.length > 0 && !loadingServers && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Server <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.server}
                  onChange={(e) => handleServerSelect(e.target.value)}
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
            )}

            {fetchingAccounts && (
              <div className="flex items-center justify-center py-4 bg-brand-light rounded-lg">
                <Loader className="w-5 h-5 animate-spin text-brand mr-2" />
                <span className="text-sm text-brand">Fetching accounts from server...</span>
              </div>
            )}

            {selectedBrokerAccounts.length > 0 && !fetchingAccounts && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                  placeholder="2489500"
                />
                {selectedBrokerAccounts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-600">Select from broker accounts:</p>
                    {selectedBrokerAccounts.map((account, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectBrokerAccount(account)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          formData.account_id === account.account_number
                            ? 'border-brand bg-brand-light'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{account.account_name}</p>
                        <p className="text-sm text-gray-600">
                          #{account.account_number} • Balance: ${account.balance.toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.account_password}
                  onChange={(e) => setFormData({ ...formData, account_password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_master}
                  onChange={(e) => setFormData({ ...formData, is_master: e.target.checked })}
                  className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
                />
                <span className="text-sm font-medium text-gray-700">Master Account</span>
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
                    account_name: '',
                    platform: 'MT5',
                    broker_id: '',
                    server: '',
                    account_id: '',
                    account_password: '',
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
            <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{account.account_name}</h3>
                  <p className="text-sm text-gray-600">{account.platform} • {account.broker}</p>
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
                  <span className="font-medium text-gray-900">{account.account_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-medium text-gray-900">${account.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Equity:</span>
                  <span className="font-medium text-gray-900">${account.equity.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <span className={`
                  flex-1 text-center px-3 py-1 text-xs font-medium rounded-full
                  ${account.status === 'connected' ? 'bg-green-50 text-green-600' : ''}
                  ${account.status === 'disconnected' ? 'bg-gray-50 text-gray-600' : ''}
                  ${account.status === 'error' ? 'bg-red-50 text-red-600' : ''}
                `}>
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

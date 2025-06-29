import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Send, 
  Download, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Phone,
  DollarSign,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MobileMoneyInterface = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('send');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Wallet state
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [providers, setProviders] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    phoneNumber: '',
    amount: '',
    currency: 'WST',
    reference: '',
    sender: ''
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    if (user) {
      loadWalletData();
      loadTransactions();
      loadProviders();
    }
  }, [user]);

  const loadWalletData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mobile-money/wallet/${user.id}?currency=${formData.currency}`);
      const result = await response.json();
      
      if (result.success) {
        setWallet(result.wallet);
      }
    } catch (err) {
      console.error('Error loading wallet:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mobile-money/transactions/${user.id}?limit=10`);
      const result = await response.json();
      
      if (result.success) {
        setTransactions(result.transactions);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mobile-money/providers?country=Samoa&currency=${formData.currency}`);
      const result = await response.json();
      
      if (result.success) {
        setProviders(result.providers);
      }
    } catch (err) {
      console.error('Error loading providers:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/mobile-money/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.id,
          amount: parseFloat(formData.amount)
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Money sent successfully! Reference: ${result.reference}`);
        setFormData(prev => ({ ...prev, phoneNumber: '', amount: '', reference: '' }));
        loadWalletData();
        loadTransactions();
      } else {
        setError(result.error || 'Failed to send money');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveMoney = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/mobile-money/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.id,
          amount: parseFloat(formData.amount)
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Money received successfully! New balance: ${result.newBalance} ${formData.currency}`);
        setFormData(prev => ({ ...prev, phoneNumber: '', amount: '', sender: '' }));
        loadWalletData();
        loadTransactions();
      } else {
        setError(result.error || 'Failed to receive money');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-WS', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderWalletCard = () => (
    <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl p-6 text-white mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Mobile Wallet</h3>
        <button 
          onClick={loadWalletData}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="text-3xl font-bold">
          {wallet ? formatCurrency(wallet.balance, wallet.currency) : '---'}
        </div>
        <div className="text-blue-100 text-sm">
          Available Balance
        </div>
      </div>
      
      {wallet && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-blue-100">Daily Limit</div>
              <div className="font-medium">{formatCurrency(wallet.daily_limit, wallet.currency)}</div>
            </div>
            <div>
              <div className="text-blue-100">Daily Spent</div>
              <div className="font-medium">{formatCurrency(wallet.daily_spent, wallet.currency)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSendForm = () => (
    <form onSubmit={handleSendMoney} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recipient Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="+685 123 4567"
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Currency
        </label>
        <select
          name="currency"
          value={formData.currency}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="WST">WST (Samoan Tala)</option>
          <option value="USD">USD (US Dollar)</option>
          <option value="NZD">NZD (New Zealand Dollar)</option>
          <option value="AUD">AUD (Australian Dollar)</option>
          <option value="FJD">FJD (Fijian Dollar)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reference (Optional)
        </label>
        <input
          type="text"
          name="reference"
          value={formData.reference}
          onChange={handleInputChange}
          placeholder="Payment for..."
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !formData.phoneNumber || !formData.amount}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Money
          </>
        )}
      </button>
    </form>
  );

  const renderReceiveForm = () => (
    <form onSubmit={handleReceiveMoney} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="+685 123 4567"
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Currency
        </label>
        <select
          name="currency"
          value={formData.currency}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="WST">WST (Samoan Tala)</option>
          <option value="USD">USD (US Dollar)</option>
          <option value="NZD">NZD (New Zealand Dollar)</option>
          <option value="AUD">AUD (Australian Dollar)</option>
          <option value="FJD">FJD (Fijian Dollar)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sender Information
        </label>
        <input
          type="text"
          name="sender"
          value={formData.sender}
          onChange={handleInputChange}
          placeholder="Sender name or phone"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading || !formData.phoneNumber || !formData.amount || !formData.sender}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Receive Money
          </>
        )}
      </button>
    </form>
  );

  const renderTransactionHistory = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <button 
          onClick={loadTransactions}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      {transactions.length > 0 ? (
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {transaction.type === 'SEND' ? (
                    <Send className="h-5 w-5 text-red-500 mr-3" />
                  ) : (
                    <Download className="h-5 w-5 text-green-500 mr-3" />
                  )}
                  <div>
                    <div className="font-medium">
                      {transaction.type === 'SEND' ? 'Sent to' : 'Received from'} {transaction.phone_number}
                    </div>
                    <div className="text-sm text-gray-600">
                      {transaction.reference && `Ref: ${transaction.reference}`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {transaction.type === 'SEND' ? '-' : '+'}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 flex items-center">
                <Clock size={12} className="mr-1" />
                {new Date(transaction.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No transactions yet</p>
        </div>
      )}
    </div>
  );

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Please log in to access mobile money features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mobile Money</h1>
        <p className="text-gray-600">Send and receive money using Digicel, Vodafone, and other mobile wallets</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Wallet and Forms */}
        <div className="lg:col-span-2 space-y-6">
          {renderWalletCard()}
          
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('send')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'send'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Send className="h-4 w-4 inline mr-2" />
                  Send Money
                </button>
                <button
                  onClick={() => setActiveTab('receive')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'receive'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Download className="h-4 w-4 inline mr-2" />
                  Receive Money
                </button>
              </nav>
            </div>
            
            <div className="p-6">
              {activeTab === 'send' && renderSendForm()}
              {activeTab === 'receive' && renderReceiveForm()}
            </div>
          </div>
        </div>

        {/* Right Column - Transaction History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {renderTransactionHistory()}
        </div>
      </div>

      {/* Providers Section */}
      {providers.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Supported Providers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {providers.map((provider) => (
              <div key={provider.id} className="text-center p-4 border rounded-lg">
                <div className="font-medium">{provider.name}</div>
                <div className="text-sm text-gray-600">{provider.country}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {provider.currency}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMoneyInterface;
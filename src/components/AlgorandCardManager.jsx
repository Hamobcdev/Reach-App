import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  CreditCard, 
  Plus, 
  Send, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  ExternalLink,
  Copy
} from 'lucide-react';
import { VirtualCardContract, algorandUtils } from '../lib/algorandContract';

const AlgorandCardManager = ({ userAccount, onCardCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cardInfo, setCardInfo] = useState(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [balance, setBalance] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    kycTier: 1,
    region: 'samoa',
    currency: 'ALGO',
    fundAmount: ''
  });

  const contract = userAccount ? new VirtualCardContract(userAccount) : null;

  useEffect(() => {
    if (userAccount) {
      loadAccountData();
    }
  }, [userAccount]);

  const loadAccountData = async () => {
    if (!userAccount) return;

    try {
      // Load account balance
      const accountBalance = await algorandUtils.getBalance(userAccount.addr);
      setBalance(accountBalance);

      // Load card information
      const cardResult = await contract.getCardInfo();
      if (cardResult.success) {
        setCardInfo(cardResult.cardInfo);
      }
    } catch (err) {
      console.error('Error loading account data:', err);
    }
  };

  const handleCreateCard = async () => {
    if (!contract) {
      setError('No account connected');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await contract.createCard(
        formData.kycTier,
        formData.region,
        formData.currency
      );

      if (result.success) {
        setSuccess(`Card created successfully! Transaction: ${result.transactionId}`);
        
        // Sync with Supabase
        await contract.syncWithSupabase({
          ...result.cardInfo,
          transactionId: result.transactionId,
          confirmedRound: result.confirmedRound
        });

        // Reload card info
        await loadAccountData();

        if (onCardCreated) {
          onCardCreated(result);
        }
      } else {
        setError(result.error || 'Failed to create card');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Create card error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFundCard = async () => {
    if (!contract || !formData.fundAmount) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const amount = parseFloat(formData.fundAmount);
      const result = await contract.fundCard(amount);

      if (result.success) {
        setSuccess(`Card funded with ${amount} ALGO! Transaction: ${result.transactionId}`);
        setFormData(prev => ({ ...prev, fundAmount: '' }));
        
        // Reload card info
        await loadAccountData();
      } else {
        setError(result.error || 'Failed to fund card');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Fund card error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCard = async (amount) => {
    if (!contract) return;

    setLoading(true);
    setError('');

    try {
      const result = await contract.useCard(amount);

      if (result.success) {
        setSuccess(`Used ${amount} ALGO from card! Transaction: ${result.transactionId}`);
        
        // Reload card info
        await loadAccountData();
      } else {
        setError(result.error || 'Failed to use card');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Use card error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCardStatus = async () => {
    if (!contract || !cardInfo) return;

    setLoading(true);
    setError('');

    try {
      const result = cardInfo.isActive 
        ? await contract.deactivateCard()
        : await contract.activateCard();

      if (result.success) {
        setSuccess(`Card ${cardInfo.isActive ? 'deactivated' : 'activated'} successfully!`);
        
        // Reload card info
        await loadAccountData();
      } else {
        setError(result.error || 'Failed to toggle card status');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Toggle card status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess(`${label} copied to clipboard!`);
      setTimeout(() => setSuccess(''), 2000);
    });
  };

  const renderAccountInfo = () => (
    <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl p-6 text-white mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Wallet className="h-5 w-5 mr-2" />
          Algorand Account
        </h3>
        <button 
          onClick={loadAccountData}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="text-blue-100 text-sm">Address</div>
          <div className="flex items-center justify-between">
            <div className="font-mono text-sm">
              {userAccount?.addr ? 
                `${userAccount.addr.substring(0, 8)}...${userAccount.addr.substring(-8)}` : 
                'Not connected'
              }
            </div>
            {userAccount?.addr && (
              <button
                onClick={() => copyToClipboard(userAccount.addr, 'Address')}
                className="p-1 rounded hover:bg-white/20 transition-colors"
              >
                <Copy size={14} />
              </button>
            )}
          </div>
        </div>
        
        <div>
          <div className="text-blue-100 text-sm">Balance</div>
          <div className="text-2xl font-bold">
            {balance.toFixed(6)} ALGO
          </div>
        </div>

        {userAccount?.mnemonic && (
          <div>
            <div className="text-blue-100 text-sm">Mnemonic</div>
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs">
                {showPrivateKey ? userAccount.mnemonic : '••••••••••••••••••••••••••'}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="p-1 rounded hover:bg-white/20 transition-colors"
                >
                  {showPrivateKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                {showPrivateKey && (
                  <button
                    onClick={() => copyToClipboard(userAccount.mnemonic, 'Mnemonic')}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCardInfo = () => {
    if (!cardInfo) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Virtual Card
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm ${
            cardInfo.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {cardInfo.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-600">Balance</div>
            <div className="font-semibold">{cardInfo.balance.toFixed(6)} {cardInfo.currency}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">KYC Tier</div>
            <div className="font-semibold">{cardInfo.kycTier === 1 ? 'Basic' : cardInfo.kycTier === 2 ? 'Standard' : 'Enhanced'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Daily Limit</div>
            <div className="font-semibold">{cardInfo.dailyLimit.toFixed(2)} {cardInfo.currency}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Daily Spent</div>
            <div className="font-semibold">{cardInfo.dailySpent.toFixed(2)} {cardInfo.currency}</div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleToggleCardStatus}
            disabled={loading}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              cardInfo.isActive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {cardInfo.isActive ? 'Deactivate' : 'Activate'}
          </button>
          
          <button
            onClick={() => handleUseCard(1)}
            disabled={loading || !cardInfo.isActive || cardInfo.balance < 1}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Test Use (1 ALGO)
          </button>
        </div>
      </div>
    );
  };

  const renderCreateCardForm = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Plus className="h-5 w-5 mr-2" />
        Create Virtual Card
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            KYC Tier
          </label>
          <select
            value={formData.kycTier}
            onChange={(e) => setFormData(prev => ({ ...prev, kycTier: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Basic (100 ALGO daily)</option>
            <option value={2}>Standard (500 ALGO daily)</option>
            <option value={3}>Enhanced (2500 ALGO daily)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Region
          </label>
          <select
            value={formData.region}
            onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="samoa">Samoa</option>
            <option value="pacific">Pacific</option>
            <option value="global">Global</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALGO">ALGO</option>
            <option value="USDC">USDC</option>
            <option value="WST">WST</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleCreateCard}
        disabled={loading || cardInfo}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Creating Card...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Create Virtual Card
          </>
        )}
      </button>
    </div>
  );

  const renderFundCardForm = () => {
    if (!cardInfo) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Send className="h-5 w-5 mr-2" />
          Fund Card
        </h3>

        <div className="flex items-center space-x-4">
          <input
            type="number"
            value={formData.fundAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, fundAmount: e.target.value }))}
            placeholder="Amount in ALGO"
            min="0"
            step="0.000001"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleFundCard}
            disabled={loading || !formData.fundAmount || parseFloat(formData.fundAmount) <= 0}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Funding...' : 'Fund Card'}
          </button>
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Available balance: {balance.toFixed(6)} ALGO
        </div>
      </div>
    );
  };

  if (!userAccount) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Please connect your Algorand account to manage virtual cards</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Algorand Virtual Cards</h1>
        <p className="text-gray-600">Manage your blockchain-powered virtual cards</p>
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

      {renderAccountInfo()}
      
      {!cardInfo && renderCreateCardForm()}
      
      {renderCardInfo()}
      
      {renderFundCardForm()}

      {/* Links */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Useful Links</h3>
        <div className="space-y-2 text-sm">
          <a
            href="https://testnet.algoexplorer.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ExternalLink size={14} className="mr-1" />
            AlgoExplorer (TestNet)
          </a>
          <a
            href="https://testnet.algoexplorer.io/dispenser"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ExternalLink size={14} className="mr-1" />
            TestNet Faucet
          </a>
        </div>
      </div>
    </div>
  );
};

export default AlgorandCardManager;
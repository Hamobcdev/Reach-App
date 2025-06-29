import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Activity, 
  CreditCard,
  ExternalLink,
  RefreshCw,
  Clock,
  DollarSign
} from 'lucide-react';
import { algorandSyncAPI, algorandUtils } from '../lib/algorandSync';

const AlgorandCardSync = ({ userAddress, onCardSynced }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardActivity, setCardActivity] = useState([]);
  const [syncData, setSyncData] = useState({
    cardId: '',
    userAddress: userAddress || '',
    balance: '',
    currency: 'ALGO',
    kycTier: 'BASIC',
    region: 'samoa',
    isActive: true,
    transactionHash: '',
    blockNumber: '',
    metadata: {}
  });

  useEffect(() => {
    if (userAddress && algorandUtils.isValidAddress(userAddress)) {
      loadUserCards();
    }
  }, [userAddress]);

  const loadUserCards = async () => {
    try {
      const result = await algorandSyncAPI.getUserCards(userAddress, false);
      if (result.success) {
        setCards(result.data);
      }
    } catch (err) {
      console.error('Error loading cards:', err);
    }
  };

  const loadCardActivity = async (cardId) => {
    try {
      const result = await algorandSyncAPI.getCardActivity(cardId, 10, 0);
      if (result.success) {
        setCardActivity(result.data);
      }
    } catch (err) {
      console.error('Error loading activity:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSyncData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSyncCard = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!syncData.cardId || !syncData.userAddress || !syncData.balance) {
        setError('Card ID, user address, and balance are required');
        return;
      }

      if (!algorandUtils.isValidAddress(syncData.userAddress)) {
        setError('Invalid Algorand address format');
        return;
      }

      // Prepare sync data
      const syncPayload = {
        cardId: syncData.cardId,
        userAddress: syncData.userAddress,
        balance: parseFloat(syncData.balance),
        currency: syncData.currency,
        kycTier: syncData.kycTier,
        region: syncData.region,
        isActive: syncData.isActive,
        transactionHash: syncData.transactionHash || undefined,
        blockNumber: syncData.blockNumber ? parseInt(syncData.blockNumber) : undefined,
        metadata: {
          sync_source: 'manual',
          sync_timestamp: new Date().toISOString(),
          ...syncData.metadata
        }
      };

      const result = await algorandSyncAPI.syncCard(syncPayload);

      if (result.success) {
        setSuccess(
          result.data.cardCreated 
            ? `Card created successfully! ID: ${result.data.cardId}` 
            : `Card updated successfully! Balance: ${result.data.newBalance} ${result.data.currency}`
        );
        
        // Reset form
        setSyncData(prev => ({
          ...prev,
          cardId: '',
          balance: '',
          transactionHash: '',
          blockNumber: '',
          metadata: {}
        }));

        // Reload cards
        loadUserCards();

        // Notify parent component
        if (onCardSynced) {
          onCardSynced(result.data);
        }
      } else {
        setError(result.error || 'Failed to sync card');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = async (card) => {
    setSelectedCard(card);
    await loadCardActivity(card.id);
  };

  const formatBalance = (balance, currency) => {
    return algorandUtils.formatBalance(balance, currency);
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getActivityIcon = (action) => {
    switch (action) {
      case 'created': return <CreditCard size={16} className="text-blue-500" />;
      case 'funded': return <DollarSign size={16} className="text-green-500" />;
      case 'spent': return <DollarSign size={16} className="text-red-500" />;
      case 'synced': return <RefreshCw size={16} className="text-gray-500" />;
      default: return <Activity size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <Zap className="h-6 w-6 mr-2 text-blue-600" />
          Algorand Card Sync
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Sync Form */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Sync Card Data</h2>
            <form onSubmit={handleSyncCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card ID *
                </label>
                <input
                  type="text"
                  name="cardId"
                  value={syncData.cardId}
                  onChange={handleInputChange}
                  placeholder="algo_card_001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Address *
                </label>
                <input
                  type="text"
                  name="userAddress"
                  value={syncData.userAddress}
                  onChange={handleInputChange}
                  placeholder="ALGORAND_ADDRESS_HERE"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Balance *
                  </label>
                  <input
                    type="number"
                    name="balance"
                    value={syncData.balance}
                    onChange={handleInputChange}
                    placeholder="100.50"
                    min="0"
                    step="0.000001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={syncData.currency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALGO">ALGO</option>
                    <option value="USDC">USDC</option>
                    <option value="WST">WST</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    KYC Tier
                  </label>
                  <select
                    name="kycTier"
                    value={syncData.kycTier}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BASIC">Basic</option>
                    <option value="STANDARD">Standard</option>
                    <option value="ENHANCED">Enhanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <select
                    name="region"
                    value={syncData.region}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="samoa">Samoa</option>
                    <option value="pacific">Pacific</option>
                    <option value="global">Global</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Hash (Optional)
                </label>
                <input
                  type="text"
                  name="transactionHash"
                  value={syncData.transactionHash}
                  onChange={handleInputChange}
                  placeholder="ALGO_TX_HASH"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Block Number (Optional)
                </label>
                <input
                  type="number"
                  name="blockNumber"
                  value={syncData.blockNumber}
                  onChange={handleInputChange}
                  placeholder="12345678"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={syncData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Card is active
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Sync Card
                  </>
                )}
              </button>
            </form>
          </div>

          {/* User Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">User Cards</h2>
              <button
                onClick={loadUserCards}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {cards.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => handleCardSelect(card)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCard?.id === card.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{card.id}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(card.isActive)}`}>
                        {card.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Balance: {formatBalance(card.balance, card.currency)} {card.currency}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      KYC: {card.kycTier} • Region: {card.region}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No cards found for this address</p>
              </div>
            )}
          </div>
        </div>

        {/* Card Activity */}
        {selectedCard && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold mb-4">
              Activity for {selectedCard.id}
            </h2>
            
            {cardActivity.length > 0 ? (
              <div className="space-y-3">
                {cardActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {getActivityIcon(activity.action)}
                      <div className="ml-3">
                        <div className="font-medium text-sm capitalize">{activity.action}</div>
                        <div className="text-xs text-gray-600 flex items-center">
                          <Clock size={12} className="mr-1" />
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {activity.amount > 0 && (
                        <div className="font-medium text-sm">
                          {activity.amount} {selectedCard.currency}
                        </div>
                      )}
                      <div className="text-xs text-gray-600">
                        Balance: {activity.new_balance}
                      </div>
                      {activity.transaction_hash && (
                        <div className="text-xs text-blue-600 flex items-center">
                          <ExternalLink size={10} className="mr-1" />
                          TX
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity found for this card</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlgorandCardSync;
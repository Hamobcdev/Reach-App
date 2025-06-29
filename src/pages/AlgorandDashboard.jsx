import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlgorandWallet } from '../hooks/useAlgorandWallet';
import AlgorandWalletConnect from '../components/AlgorandWalletConnect';
import FiatActivity from '../components/FiatActivity';
import { 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  DollarSign, 
  Send, 
  Download, 
  Shield,
  Award,
  Users,
  ExternalLink
} from 'lucide-react';

const AlgorandDashboard = () => {
  const { user, userProfile } = useAuth();
  const { 
    account, 
    isConnected, 
    callContractMethod, 
    loading: walletLoading, 
    error: walletError,
    appId,
    appAddress
  } = useAlgorandWallet();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('wallet');
  
  // Form states
  const [transferForm, setTransferForm] = useState({
    recipient: '',
    amount: '',
    reference: ''
  });
  
  const [cardForm, setCardForm] = useState({
    cardLimit: '',
    cardType: 'virtual'
  });
  
  const [badgeForm, setBadgeForm] = useState({
    recipient: '',
    caseId: '',
    crisisType: 'natural_disaster',
    severity: 3
  });
  
  const handleWalletConnect = (address) => {
    console.log('Wallet connected:', address);
  };
  
  const handleWalletDisconnect = () => {
    console.log('Wallet disconnected');
  };
  
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!isConnected) {
        throw new Error('Wallet not connected');
      }
      
      if (!transferForm.recipient || !transferForm.amount) {
        throw new Error('Recipient address and amount are required');
      }
      
      const amount = parseFloat(transferForm.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }
      
      const result = await callContractMethod('transfer_tokens', [
        transferForm.recipient,
        Math.floor(amount * 1000000), // Convert to microAlgos
        transferForm.reference || 'Transfer'
      ]);
      
      if (result.success) {
        setSuccess(`Successfully transferred ${amount} ALGO to ${transferForm.recipient}`);
        setTransferForm({
          recipient: '',
          amount: '',
          reference: ''
        });
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCardSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!isConnected) {
        throw new Error('Wallet not connected');
      }
      
      if (!cardForm.cardLimit) {
        throw new Error('Card limit is required');
      }
      
      const cardLimit = parseFloat(cardForm.cardLimit);
      if (isNaN(cardLimit) || cardLimit <= 0) {
        throw new Error('Card limit must be a positive number');
      }
      
      const result = await callContractMethod('create_virtual_card', [
        Math.floor(cardLimit * 1000000), // Convert to microAlgos
        cardForm.cardType
      ]);
      
      if (result.success) {
        setSuccess(`Successfully created a ${cardForm.cardType} card with ${cardLimit} ALGO limit`);
        setCardForm({
          cardLimit: '',
          cardType: 'virtual'
        });
      } else {
        throw new Error(result.error || 'Card creation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBadgeSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!isConnected) {
        throw new Error('Wallet not connected');
      }
      
      if (!badgeForm.recipient || !badgeForm.caseId) {
        throw new Error('Recipient address and case ID are required');
      }
      
      const result = await callContractMethod('issue_crisis_badge', [
        badgeForm.recipient,
        badgeForm.caseId,
        badgeForm.crisisType,
        parseInt(badgeForm.severity)
      ]);
      
      if (result.success) {
        setSuccess(`Successfully issued a crisis badge to ${badgeForm.recipient}`);
        setBadgeForm({
          recipient: '',
          caseId: '',
          crisisType: 'natural_disaster',
          severity: 3
        });
      } else {
        throw new Error(result.error || 'Badge issuance failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if user is an NGO
  const isNgo = userProfile?.role === 'ngo';
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Algorand Dashboard</h1>
      
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
      
      {walletError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {walletError}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Wallet Connect */}
        <div>
          <AlgorandWalletConnect 
            onConnect={handleWalletConnect} 
            onDisconnect={handleWalletDisconnect} 
          />
          
          {appId && appAddress && (
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Contract Details</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>App ID: {appId}</p>
                <p>App Address: {appAddress}</p>
                <p>
                  <a 
                    href={`https://testnet.algoexplorer.io/application/${appId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    View on Explorer
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Middle Column - Actions */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'wallet'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Wallet
                </button>
                
                <button
                  onClick={() => setActiveTab('transfer')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'transfer'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Send className="h-4 w-4 inline mr-1" />
                  Transfer
                </button>
                
                <button
                  onClick={() => setActiveTab('card')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'card'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CreditCard className="h-4 w-4 inline mr-1" />
                  Virtual Card
                </button>
                
                {isNgo && (
                  <button
                    onClick={() => setActiveTab('badge')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'badge'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Award className="h-4 w-4 inline mr-1" />
                    Crisis Badge
                  </button>
                )}
              </nav>
            </div>
            
            <div className="p-6">
              {activeTab === 'wallet' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Wallet Overview</h3>
                  <FiatActivity />
                </div>
              )}
              
              {activeTab === 'transfer' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Transfer Tokens</h3>
                  <form onSubmit={handleTransferSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={transferForm.recipient}
                        onChange={(e) => setTransferForm({...transferForm, recipient: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Recipient's Algorand address"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (ALGO)
                      </label>
                      <input
                        type="number"
                        value={transferForm.amount}
                        onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        step="0.000001"
                        min="0.000001"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={transferForm.reference}
                        onChange={(e) => setTransferForm({...transferForm, reference: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Payment for..."
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading || !isConnected}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Tokens
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
              
              {activeTab === 'card' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Create Virtual Card</h3>
                  <form onSubmit={handleCardSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Card Limit (ALGO)
                      </label>
                      <input
                        type="number"
                        value={cardForm.cardLimit}
                        onChange={(e) => setCardForm({...cardForm, cardLimit: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Card Type
                      </label>
                      <select
                        value={cardForm.cardType}
                        onChange={(e) => setCardForm({...cardForm, cardType: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="virtual">Virtual Card</option>
                        <option value="physical">Physical Card</option>
                        <option value="gift">Gift Card</option>
                        <option value="emergency">Emergency Card</option>
                      </select>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading || !isConnected}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Creating Card...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Create Virtual Card
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
              
              {activeTab === 'badge' && isNgo && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Issue Crisis Badge</h3>
                  <form onSubmit={handleBadgeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={badgeForm.recipient}
                        onChange={(e) => setBadgeForm({...badgeForm, recipient: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Recipient's Algorand address"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Case ID
                      </label>
                      <input
                        type="text"
                        value={badgeForm.caseId}
                        onChange={(e) => setBadgeForm({...badgeForm, caseId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Emergency case ID"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Crisis Type
                      </label>
                      <select
                        value={badgeForm.crisisType}
                        onChange={(e) => setBadgeForm({...badgeForm, crisisType: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="natural_disaster">Natural Disaster</option>
                        <option value="medical_emergency">Medical Emergency</option>
                        <option value="conflict">Conflict</option>
                        <option value="economic_hardship">Economic Hardship</option>
                        <option value="refugee">Refugee</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Severity (1-5)
                      </label>
                      <input
                        type="number"
                        value={badgeForm.severity}
                        onChange={(e) => setBadgeForm({...badgeForm, severity: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="5"
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading || !isConnected}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Issuing Badge...
                        </>
                      ) : (
                        <>
                          <Award className="h-4 w-4 mr-2" />
                          Issue Crisis Badge
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlgorandDashboard;
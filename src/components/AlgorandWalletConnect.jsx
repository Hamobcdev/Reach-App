import React, { useState, useEffect } from 'react';
import { Wallet, ExternalLink, Check, AlertCircle, Loader2, RefreshCw, Copy } from 'lucide-react';
import { useAlgorandWallet } from '../hooks/useAlgorandWallet';

const AlgorandWalletConnect = ({ onConnect, onDisconnect }) => {
  const { 
    account, 
    balance, 
    loading, 
    error, 
    isConnected, 
    connect, 
    disconnect, 
    getBalance, 
    formatAddress 
  } = useAlgorandWallet();
  
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // If account is already connected, notify parent component
    if (account && isConnected && onConnect) {
      onConnect(account.addr);
    }
  }, [account, isConnected, onConnect]);

  const handleConnect = async () => {
    const result = await connect();
    if (result && onConnect) {
      onConnect(result.addr);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  const handleRefreshBalance = async () => {
    if (account) {
      await getBalance(account.addr);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Wallet className="h-5 w-5 mr-2 text-blue-600" />
        Algorand Wallet
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Connect Algorand Wallet
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Address</div>
            <div className="flex items-center">
              <button
                onClick={() => copyToClipboard(account.addr)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg font-mono text-sm break-all">
            {account.addr}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Balance</div>
            <button
              onClick={handleRefreshBalance}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Refresh balance"
            >
              <RefreshCw className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xl font-semibold">{balance.toFixed(6)}</span> ALGO
          </div>
          
          <div className="flex items-center justify-between">
            <a
              href={`https://testnet.algoexplorer.io/address/${account.addr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm flex items-center"
            >
              View on Explorer
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
            
            <button
              onClick={handleDisconnect}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlgorandWalletConnect;
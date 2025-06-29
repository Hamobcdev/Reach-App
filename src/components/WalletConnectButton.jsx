import React, { useState, useEffect } from 'react';
import { Wallet, ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const WalletConnectButton = ({ onConnect, onDisconnect }) => {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Check if PeraWallet is available in window
  const isPeraWalletAvailable = () => {
    return typeof window !== 'undefined' && 'PeraWallet' in window;
  };

  // Connect to Pera Wallet
  const connectPeraWallet = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      // This is a mock implementation since we don't have the actual Pera Wallet SDK
      // In a real implementation, you would use the PeraWallet SDK
      console.log('Connecting to Pera Wallet...');
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, use the user's Algorand address from their profile
      // In a real implementation, this would come from the wallet
      if (user && user.algorand_address) {
        setWalletAddress(user.algorand_address);
        setIsConnected(true);
        
        if (onConnect) {
          onConnect(user.algorand_address);
        }
        
        console.log('Connected to wallet:', user.algorand_address);
      } else {
        // If no user is logged in or no Algorand address is available,
        // simulate a successful connection with a mock address
        const mockAddress = 'ALGO123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEFG';
        setWalletAddress(mockAddress);
        setIsConnected(true);
        
        if (onConnect) {
          onConnect(mockAddress);
        }
        
        console.log('Connected to wallet (mock):', mockAddress);
      }
    } catch (error) {
      console.error('Error connecting to Pera Wallet:', error);
      setError('Failed to connect to wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from Pera Wallet
  const disconnectWallet = () => {
    setWalletAddress('');
    setIsConnected(false);
    
    if (onDisconnect) {
      onDisconnect();
    }
    
    console.log('Disconnected from wallet');
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  return (
    <div className="inline-block">
      {!isConnected ? (
        <button
          onClick={connectPeraWallet}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center space-x-2">
          <div className="bg-green-100 text-green-800 py-2 px-4 rounded-lg flex items-center">
            <Check className="h-4 w-4 mr-2 text-green-600" />
            <span className="font-mono text-sm">{formatAddress(walletAddress)}</span>
          </div>
          <button
            onClick={disconnectWallet}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-3 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-2 text-red-600 text-sm flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
      
      {!isPeraWalletAvailable() && !isConnected && (
        <div className="mt-2 text-sm text-gray-600">
          <a
            href="https://perawallet.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Get Pera Wallet
          </a>
        </div>
      )}
    </div>
  );
};

export default WalletConnectButton;
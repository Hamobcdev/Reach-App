import { useState, useEffect, useCallback } from 'react';
import algosdk from 'algosdk';

// Initialize Algod client
const ALGORAND_NODE_URL = import.meta.env.VITE_ALGORAND_NODE_URL || 'https://testnet-api.algonode.cloud';
const ALGORAND_NODE_TOKEN = import.meta.env.VITE_ALGORAND_NODE_TOKEN || '';
const APP_ID = parseInt(import.meta.env.VITE_ALGORAND_APP_ID || '0');
const APP_ADDRESS = import.meta.env.VITE_ALGORAND_APP_ADDRESS;

const algodClient = new algosdk.Algodv2(ALGORAND_NODE_TOKEN, ALGORAND_NODE_URL, '');

export const useAlgorandWallet = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Connect to wallet
  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would use a wallet connector like PeraWallet
      // For now, we'll simulate a connection with a mock account
      
      // Check if we're in a development environment with test accounts
      const testMnemonic = localStorage.getItem('algorand_test_mnemonic');
      
      if (testMnemonic) {
        // Use test account from localStorage
        const testAccount = algosdk.mnemonicToSecretKey(testMnemonic);
        setAccount(testAccount);
        setIsConnected(true);
        
        // Fetch account balance
        const accountInfo = await algodClient.accountInformation(testAccount.addr).do();
        setBalance(accountInfo.amount / 1000000); // Convert microAlgos to Algos
        
        return testAccount;
      } else {
        // In a real app, this would trigger a wallet connection
        // For demo purposes, we'll create a random account
        console.warn('No test mnemonic found. Creating a random account for demo purposes.');
        const randomAccount = algosdk.generateAccount();
        setAccount(randomAccount);
        setIsConnected(true);
        setBalance(0); // New account has 0 balance
        
        // Save mnemonic to localStorage for persistence during development
        const mnemonic = algosdk.secretKeyToMnemonic(randomAccount.sk);
        localStorage.setItem('algorand_test_mnemonic', mnemonic);
        
        return randomAccount;
      }
    } catch (err) {
      console.error('Error connecting to wallet:', err);
      setError('Failed to connect to wallet');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Disconnect from wallet
  const disconnect = useCallback(() => {
    setAccount(null);
    setBalance(0);
    setIsConnected(false);
    // In a real implementation, this would disconnect from the wallet
  }, []);

  // Get account balance
  const getBalance = useCallback(async (address) => {
    try {
      const accountInfo = await algodClient.accountInformation(address).do();
      const balanceInAlgos = accountInfo.amount / 1000000; // Convert microAlgos to Algos
      setBalance(balanceInAlgos);
      return balanceInAlgos;
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance');
      return 0;
    }
  }, []);

  // Call a contract method
  const callContractMethod = useCallback(async (method, args = []) => {
    if (!account || !isConnected) {
      setError('Wallet not connected');
      return null;
    }
    
    if (!APP_ID) {
      setError('App ID not set');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get suggested parameters
      const params = await algodClient.getTransactionParams().do();
      
      // Prepare application arguments
      const appArgs = [
        new Uint8Array(Buffer.from(method)),
        ...args.map(arg => {
          if (typeof arg === 'number') {
            return algosdk.encodeUint64(arg);
          } else if (typeof arg === 'string') {
            return new Uint8Array(Buffer.from(arg));
          } else if (arg instanceof Uint8Array) {
            return arg;
          } else {
            throw new Error(`Unsupported argument type: ${typeof arg}`);
          }
        })
      ];
      
      // Create application call transaction
      const txn = algosdk.makeApplicationCallTxnFromObject({
        from: account.addr,
        appIndex: APP_ID,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs,
        suggestedParams: params
      });
      
      // Sign transaction
      const signedTxn = txn.signTxn(account.sk);
      
      // Submit transaction
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      return {
        success: true,
        txId,
        confirmedRound: confirmedTxn['confirmed-round']
      };
    } catch (err) {
      console.error(`Error calling contract method ${method}:`, err);
      setError(`Failed to call contract method: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  }, [account, isConnected]);

  // Utility function to format Algorand address
  const formatAddress = useCallback((address) => {
    if (!address) return '';
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  }, []);

  // Effect to check if wallet is already connected (e.g., from localStorage)
  useEffect(() => {
    const checkExistingConnection = async () => {
      const testMnemonic = localStorage.getItem('algorand_test_mnemonic');
      if (testMnemonic) {
        try {
          const testAccount = algosdk.mnemonicToSecretKey(testMnemonic);
          setAccount(testAccount);
          setIsConnected(true);
          
          // Fetch account balance
          const accountInfo = await algodClient.accountInformation(testAccount.addr).do();
          setBalance(accountInfo.amount / 1000000);
        } catch (err) {
          console.error('Error restoring wallet connection:', err);
          localStorage.removeItem('algorand_test_mnemonic');
        }
      }
    };
    
    checkExistingConnection();
  }, []);

  return {
    account,
    balance,
    loading,
    error,
    isConnected,
    connect,
    disconnect,
    getBalance,
    callContractMethod,
    formatAddress,
    algodClient,
    appId: APP_ID,
    appAddress: APP_ADDRESS
  };
};

export default useAlgorandWallet;
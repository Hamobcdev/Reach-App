import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const FiatActivity = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);
  
  const loadTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Fetch virtual token transactions
      const { data: tokenTxs, error: tokenError } = await supabase
        .from('virtual_token_transactions')
        .select('*')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (tokenError) throw tokenError;
      
      // Fetch payment records
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (paymentsError) throw paymentsError;
      
      // Combine and format transactions
      const formattedTokenTxs = tokenTxs.map(tx => ({
        id: tx.id,
        type: tx.transaction_type,
        amount: tx.amount,
        currency: tx.token_type,
        status: tx.status,
        timestamp: tx.created_at,
        isIncoming: tx.to_user_id === user.id,
        reference: tx.reference,
        counterparty: tx.to_user_id === user.id ? tx.from_user_id : tx.to_user_id,
        source: 'virtual_token',
        txHash: tx.algorand_tx_id
      }));
      
      const formattedPayments = payments.map(payment => ({
        id: payment.id,
        type: payment.method === 'stripe' ? 'deposit' : payment.method,
        amount: payment.amount,
        currency: 'USD',
        status: payment.status,
        timestamp: payment.created_at,
        isIncoming: true, // Payments are always incoming
        reference: payment.stripe_payment_intent || payment.crypto_tx_hash,
        counterparty: 'Payment Processor',
        source: payment.method,
        txHash: payment.crypto_tx_hash
      }));
      
      // Combine and sort by timestamp
      const allTransactions = [...formattedTokenTxs, ...formattedPayments]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setTransactions(allTransactions);
    } catch (err) {
      console.error('Error loading fiat activity:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };
  
  const formatCurrency = (amount, currency) => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    } else if (currency === 'WST' || currency === 'WST.v') {
      return new Intl.NumberFormat('en-WS', {
        style: 'currency',
        currency: 'WST'
      }).format(amount);
    }
    return `${amount} ${currency}`;
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
  
  const getTransactionIcon = (type, isIncoming) => {
    if (type === 'deposit' || type === 'stripe') {
      return <DollarSign className="h-5 w-5 text-green-500" />;
    } else if (type === 'withdrawal') {
      return <DollarSign className="h-5 w-5 text-red-500" />;
    } else if (type === 'transfer') {
      return isIncoming ? 
        <ArrowDownLeft className="h-5 w-5 text-green-500" /> : 
        <ArrowUpRight className="h-5 w-5 text-red-500" />;
    } else if (type === 'disbursal') {
      return <DollarSign className="h-5 w-5 text-purple-500" />;
    } else if (type === 'remittance') {
      return <ArrowDownLeft className="h-5 w-5 text-blue-500" />;
    }
    return <DollarSign className="h-5 w-5 text-gray-500" />;
  };
  
  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">Please log in to view your transaction history</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Fiat Activity</h3>
        <button 
          onClick={loadTransactions}
          disabled={loading}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <RefreshCw className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {loading && transactions.length === 0 ? (
        <div className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading transaction history...</p>
        </div>
      ) : transactions.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx) => (
            <div key={`${tx.source}-${tx.id}`} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getTransactionIcon(tx.type, tx.isIncoming)}
                  <div className="ml-3">
                    <div className="font-medium">
                      {tx.isIncoming ? 'Received' : 'Sent'} via {tx.source === 'virtual_token' ? 'Virtual Token' : tx.source}
                    </div>
                    <div className="text-xs text-gray-600">
                      {tx.reference && `Ref: ${tx.reference.substring(0, 16)}...`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${tx.isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.isIncoming ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(tx.timestamp).toLocaleString()}
                </div>
                {tx.txHash && (
                  <a
                    href={`https://testnet.algoexplorer.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    View on Explorer
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No transactions found</p>
        </div>
      )}
    </div>
  );
};

export default FiatActivity;
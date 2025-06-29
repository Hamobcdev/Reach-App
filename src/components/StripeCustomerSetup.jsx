import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Loader2, User, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { stripeCustomerAPI } from '../lib/stripeCustomer';

const StripeCustomerSetup = ({ onSetupComplete, currency = 'USD' }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);

  useEffect(() => {
    if (user) {
      checkExistingSetup();
    }
  }, [user]);

  const checkExistingSetup = async () => {
    try {
      const result = await stripeCustomerAPI.getCustomer(user.id);
      if (result.success) {
        setCustomerInfo(result.data.stripe_customer);
        setSuccess('Stripe customer already set up');
        if (onSetupComplete) {
          onSetupComplete(result.data);
        }
      }
    } catch (err) {
      // Customer doesn't exist yet, which is fine
      console.log('No existing Stripe customer found');
    }
  };

  const handleSetupCustomer = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await stripeCustomerAPI.createCustomer(user.id, user.email, currency);

      if (result.success) {
        setCustomerInfo({
          id: result.data.stripe_customer_id,
          email: user.email
        });
        setWalletInfo(result.data.wallet);
        
        if (result.data.customer_created) {
          setSuccess('Stripe customer created successfully!');
        } else {
          setSuccess('Stripe customer linked successfully!');
        }

        if (onSetupComplete) {
          onSetupComplete(result.data);
        }
      } else {
        setError(result.error || 'Failed to set up Stripe customer');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (customerInfo) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-green-800">
            Stripe Customer Ready
          </h3>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-green-700">Customer ID:</span>
            <span className="font-mono text-green-800">{customerInfo.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-green-700">Email:</span>
            <span className="text-green-800">{customerInfo.email}</span>
          </div>
          {walletInfo && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-green-700">Wallet Balance:</span>
                <span className="text-green-800">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: walletInfo.currency
                  }).format(walletInfo.balance)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-700">Daily Limit:</span>
                <span className="text-green-800">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: walletInfo.currency
                  }).format(walletInfo.daily_limit)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <CreditCard className="h-12 w-12 mx-auto mb-4 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Set Up Payment Processing
        </h3>
        <p className="text-gray-600 text-sm">
          Create your Stripe customer account and wallet to enable secure payments
        </p>
      </div>

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

      <div className="space-y-4 mb-6">
        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <User className="h-5 w-5 text-gray-400 mr-3" />
          <div>
            <div className="font-medium text-gray-900">Account Email</div>
            <div className="text-sm text-gray-600">{user?.email || 'Not available'}</div>
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
          <div>
            <div className="font-medium text-gray-900">Wallet Currency</div>
            <div className="text-sm text-gray-600">{currency}</div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-2">What happens next:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Create secure Stripe customer account</li>
          <li>• Set up your digital wallet</li>
          <li>• Enable payment processing</li>
          <li>• Ready for virtual card generation</li>
        </ul>
      </div>

      <button
        onClick={handleSetupCustomer}
        disabled={loading || !user}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Setting up...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Set Up Stripe Customer
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Your payment information is secured by Stripe's industry-leading encryption
      </p>
    </div>
  );
};

export default StripeCustomerSetup;
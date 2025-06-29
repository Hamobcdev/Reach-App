import express from 'express';
import { supabase } from '../config/supabase.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Middleware to validate request body
const validateMobileMoneyRequest = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .optional()
    .isIn(['WST', 'USD', 'NZD', 'AUD', 'FJD'])
    .withMessage('Invalid currency'),
  body('user_id')
    .isUUID()
    .withMessage('Valid user ID is required')
];

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if missing (assuming +685 for Samoa)
  if (cleaned.length === 7 && !cleaned.startsWith('685')) {
    return `+685${cleaned}`;
  } else if (cleaned.length === 10 && cleaned.startsWith('685')) {
    return `+${cleaned}`;
  } else if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  return phone; // Return original if can't format
};

// Helper function to determine provider from phone number
const getProviderFromPhone = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Samoa phone number patterns
  if (cleaned.startsWith('685')) {
    // Digicel Samoa: typically starts with 7
    if (cleaned.substring(3, 4) === '7') {
      return 'Digicel';
    }
    // Vodafone Samoa: typically starts with 2, 6, 8
    if (['2', '6', '8'].includes(cleaned.substring(3, 4))) {
      return 'Vodafone';
    }
  }
  
  // Default to Digicel if can't determine
  return 'Digicel';
};

// Helper function to simulate external API call
const simulateExternalAPICall = async (type, phoneNumber, amount, provider) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Simulate success/failure (90% success rate)
  const success = Math.random() > 0.1;
  
  if (success) {
    return {
      success: true,
      external_transaction_id: `${provider.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: type === 'RECEIVE' ? 'completed' : 'processing'
    };
  } else {
    return {
      success: false,
      error: 'External API error: Transaction failed',
      status: 'failed'
    };
  }
};

/**
 * POST /api/mobile-money/send
 * Send money via mobile wallet
 */
router.post('/send', validateMobileMoneyRequest, [
  body('reference').optional().isLength({ max: 100 }).withMessage('Reference too long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { phoneNumber, amount, currency = 'WST', reference, user_id } = req.body;
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const provider = getProviderFromPhone(formattedPhone);

    // Check if user exists and has sufficient balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .eq('currency', currency)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Check daily/monthly limits
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);
    
    if (wallet.last_reset_day !== today) {
      // Reset daily limit
      await supabase
        .from('wallets')
        .update({ 
          daily_spent: 0, 
          last_reset_day: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id);
      wallet.daily_spent = 0;
    }

    if (wallet.daily_spent + amount > wallet.daily_limit) {
      return res.status(400).json({
        success: false,
        error: `Daily limit exceeded. Limit: ${wallet.daily_limit}, Spent: ${wallet.daily_spent}`
      });
    }

    // Simulate external mobile money API call
    const externalResult = await simulateExternalAPICall('SEND', formattedPhone, amount, provider);
    
    if (!externalResult.success) {
      return res.status(500).json({
        success: false,
        error: externalResult.error
      });
    }

    // Process transaction using database function
    const { data: transactionResult, error: transactionError } = await supabase
      .rpc('process_mobile_transaction', {
        p_user_id: user_id,
        p_type: 'SEND',
        p_phone_number: formattedPhone,
        p_amount: amount,
        p_currency: currency,
        p_reference: reference,
        p_recipient: formattedPhone,
        p_provider: provider
      });

    if (transactionError) {
      console.error('Transaction processing error:', transactionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to process transaction'
      });
    }

    // Update wallet balance (subtract for send)
    const { error: balanceError } = await supabase
      .rpc('update_wallet_balance', {
        p_user_id: user_id,
        p_amount: amount,
        p_operation: 'subtract',
        p_currency: currency
      });

    if (balanceError) {
      console.error('Balance update error:', balanceError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update wallet balance'
      });
    }

    // Update transaction with external ID
    await supabase
      .from('mobile_transactions')
      .update({
        external_transaction_id: externalResult.external_transaction_id,
        status: 'processing'
      })
      .eq('id', transactionResult.transaction_id);

    // Update daily spending
    await supabase
      .from('wallets')
      .update({
        daily_spent: wallet.daily_spent + amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    // Log event
    await supabase
      .from('events')
      .insert({
        user_id,
        type: 'mobile_money_send',
        data: {
          transaction_id: transactionResult.transaction_id,
          phone_number: formattedPhone,
          amount,
          currency,
          provider,
          reference: transactionResult.reference
        }
      });

    res.json({
      success: true,
      transactionId: transactionResult.transaction_id,
      reference: transactionResult.reference,
      status: 'processing',
      provider,
      external_transaction_id: externalResult.external_transaction_id,
      estimated_completion: '5-10 minutes'
    });

  } catch (error) {
    console.error('Mobile money send error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/mobile-money/receive
 * Receive money via mobile wallet
 */
router.post('/receive', validateMobileMoneyRequest, [
  body('sender').notEmpty().withMessage('Sender information is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { phoneNumber, amount, currency = 'WST', sender, user_id } = req.body;
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const provider = getProviderFromPhone(formattedPhone);

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Simulate external mobile money API call
    const externalResult = await simulateExternalAPICall('RECEIVE', formattedPhone, amount, provider);
    
    if (!externalResult.success) {
      return res.status(500).json({
        success: false,
        error: externalResult.error
      });
    }

    // Process transaction using database function
    const { data: transactionResult, error: transactionError } = await supabase
      .rpc('process_mobile_transaction', {
        p_user_id: user_id,
        p_type: 'RECEIVE',
        p_phone_number: formattedPhone,
        p_amount: amount,
        p_currency: currency,
        p_sender: sender,
        p_recipient: formattedPhone,
        p_provider: provider
      });

    if (transactionError) {
      console.error('Transaction processing error:', transactionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to process transaction'
      });
    }

    // Update transaction with external ID
    await supabase
      .from('mobile_transactions')
      .update({
        external_transaction_id: externalResult.external_transaction_id,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', transactionResult.transaction_id);

    // Get updated wallet balance
    const { data: updatedWallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user_id)
      .eq('currency', currency)
      .single();

    if (walletError) {
      console.error('Wallet fetch error:', walletError);
    }

    // Log event
    await supabase
      .from('events')
      .insert({
        user_id,
        type: 'mobile_money_receive',
        data: {
          transaction_id: transactionResult.transaction_id,
          phone_number: formattedPhone,
          amount,
          currency,
          provider,
          sender,
          reference: transactionResult.reference
        }
      });

    res.json({
      success: true,
      transactionId: transactionResult.transaction_id,
      reference: transactionResult.reference,
      newBalance: updatedWallet?.balance || 0,
      provider,
      external_transaction_id: externalResult.external_transaction_id,
      status: 'completed'
    });

  } catch (error) {
    console.error('Mobile money receive error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/mobile-money/transactions/:userId
 * Get user's mobile money transaction history
 */
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0, type, status } = req.query;

    let query = supabase
      .from('mobile_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: transactions, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions'
      });
    }

    res.json({
      success: true,
      transactions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: transactions.length
      }
    });

  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/mobile-money/wallet/:userId
 * Get user's wallet information
 */
router.get('/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currency = 'WST' } = req.query;

    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    res.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
        daily_limit: wallet.daily_limit,
        monthly_limit: wallet.monthly_limit,
        daily_spent: wallet.daily_spent,
        monthly_spent: wallet.monthly_spent,
        is_active: wallet.is_active
      }
    });

  } catch (error) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/mobile-money/providers
 * Get available mobile money providers
 */
router.get('/providers', async (req, res) => {
  try {
    const { country, currency } = req.query;

    let query = supabase
      .from('mobile_money_providers')
      .select('*')
      .eq('is_active', true);

    if (country) {
      query = query.eq('country', country);
    }

    if (currency) {
      query = query.eq('currency', currency);
    }

    const { data: providers, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch providers'
      });
    }

    res.json({
      success: true,
      providers
    });

  } catch (error) {
    console.error('Providers fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper functions for mobile money operations
export const mobileMoneyHelpers = {
  // Get user wallet
  async getUserWallet(userId, currency = 'WST') {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    return { data, error };
  },

  // Create transaction
  async createTransaction(transactionData) {
    const { data, error } = await supabase
      .from('mobile_transactions')
      .insert([transactionData])
      .select()
      .single();

    return { data, error };
  },

  // Update transaction status
  async updateTransactionStatus(transactionId, status, completedAt = null) {
    const updateData = { status };
    if (completedAt) {
      updateData.completed_at = completedAt;
    }

    const { data, error } = await supabase
      .from('mobile_transactions')
      .update(updateData)
      .eq('id', transactionId)
      .select()
      .single();

    return { data, error };
  },

  // Get transaction by reference
  async getTransactionByReference(reference) {
    const { data, error } = await supabase
      .from('mobile_transactions')
      .select('*')
      .eq('reference', reference)
      .single();

    return { data, error };
  },

  // Get user transactions
  async getUserTransactions(userId, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('mobile_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error };
  },

  // Update wallet balance
  async updateWalletBalance(userId, amount, operation, currency = 'WST') {
    const { data, error } = await supabase.rpc('update_wallet_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_operation: operation,
      p_currency: currency,
    });

    return { data, error };
  },

  // Process mobile transaction
  async processMobileTransaction(params) {
    const { data, error } = await supabase.rpc('process_mobile_transaction', params);

    return { data, error };
  },

  // Get mobile money providers
  async getProviders(country = null, currency = null) {
    let query = supabase
      .from('mobile_money_providers')
      .select('*')
      .eq('is_active', true);
    if (country) query = query.eq('country', country);
    if (currency) query = query.eq('currency', currency);

    const { data, error } = await query;
    return { data, error };
  },

  // Log mobile money event
  async logEvent(userId, eventType, eventData) {
    const { data, error } = await supabase.from('events').insert([
      {
        user_id: userId,
        type: eventType,
        data: eventData,
        created_at: new Date().toISOString(),
      },
    ]);

    return { data, error };
  },
};

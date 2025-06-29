/*
  # Add Stripe customer support to profiles and wallets

  1. Schema Updates
    - Add `stripe_customer_id` to users table if not exists
    - Ensure wallets table has proper Stripe integration
    - Add indexes for better performance

  2. Functions
    - Function to create or get Stripe customer ID
    - Function to ensure user has a wallet

  3. Security
    - Maintain existing RLS policies
    - Add proper constraints
*/

-- Add stripe_customer_id to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'stripe_customer_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_customer_id text;
  END IF;
END $$;

-- Ensure wallets table has stripe_customer_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'stripe_customer_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE wallets ADD COLUMN stripe_customer_id text;
  END IF;
END $$;

-- Function to ensure user has a wallet
CREATE OR REPLACE FUNCTION ensure_user_wallet(
  p_user_id uuid,
  p_currency text DEFAULT 'USD',
  p_stripe_customer_id text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  wallet_record RECORD;
  wallet_created boolean := false;
BEGIN
  -- Check if wallet exists
  SELECT * INTO wallet_record
  FROM wallets
  WHERE user_id = p_user_id AND currency = p_currency;
  
  -- Create wallet if it doesn't exist
  IF wallet_record IS NULL THEN
    INSERT INTO wallets (
      user_id,
      balance,
      currency,
      stripe_customer_id,
      is_active,
      daily_limit,
      monthly_limit,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      0,
      p_currency,
      p_stripe_customer_id,
      true,
      1000,
      10000,
      now(),
      now()
    ) RETURNING * INTO wallet_record;
    
    wallet_created := true;
  ELSE
    -- Update stripe_customer_id if provided and not set
    IF p_stripe_customer_id IS NOT NULL AND wallet_record.stripe_customer_id IS NULL THEN
      UPDATE wallets
      SET 
        stripe_customer_id = p_stripe_customer_id,
        updated_at = now()
      WHERE user_id = p_user_id AND currency = p_currency
      RETURNING * INTO wallet_record;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'wallet_id', wallet_record.id,
    'user_id', wallet_record.user_id,
    'balance', wallet_record.balance,
    'currency', wallet_record.currency,
    'stripe_customer_id', wallet_record.stripe_customer_id,
    'daily_limit', wallet_record.daily_limit,
    'monthly_limit', wallet_record.monthly_limit,
    'is_active', wallet_record.is_active,
    'wallet_created', wallet_created
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user's Stripe customer ID
CREATE OR REPLACE FUNCTION update_user_stripe_customer(
  p_user_id uuid,
  p_stripe_customer_id text
)
RETURNS jsonb AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Update user's stripe_customer_id
  UPDATE users
  SET 
    stripe_customer_id = p_stripe_customer_id,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO user_record;
  
  IF user_record IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Also update any existing wallets
  UPDATE wallets
  SET 
    stripe_customer_id = p_stripe_customer_id,
    updated_at = now()
  WHERE user_id = p_user_id AND stripe_customer_id IS NULL;
  
  RETURN jsonb_build_object(
    'user_id', user_record.id,
    'email', user_record.email,
    'stripe_customer_id', user_record.stripe_customer_id,
    'updated_at', user_record.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_wallets_stripe_customer_id ON wallets(stripe_customer_id);

-- Add constraint to ensure stripe_customer_id is unique if not null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_stripe_customer_id_unique' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_stripe_customer_id_unique UNIQUE (stripe_customer_id);
  END IF;
END $$;
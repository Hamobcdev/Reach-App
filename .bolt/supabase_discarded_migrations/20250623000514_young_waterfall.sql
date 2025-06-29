/*
  # Mobile Money System for Samoa Virtual Bankcard

  1. New Tables
    - `mobile_transactions`
      - `id` (uuid, primary key)
      - `type` (enum: SEND, RECEIVE)
      - `user_id` (uuid, references users)
      - `phone_number` (text)
      - `amount` (numeric)
      - `currency` (text, default 'WST')
      - `reference` (text)
      - `sender` (text)
      - `status` (text, default 'pending')
      - `provider` (text - Digicel, Vodafone, etc.)
      - `external_transaction_id` (text)
      - `created_at` (timestamp)
      - `completed_at` (timestamp)

    - `wallets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `balance` (numeric, default 0)
      - `currency` (text, default 'WST')
      - `stripe_customer_id` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to access their own data only
    - Add admin policies for oversight

  3. Functions
    - Function to process mobile money transactions
    - Function to update wallet balances
    - Function to generate transaction references
*/

-- Create mobile_transactions table
CREATE TABLE IF NOT EXISTS mobile_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('SEND', 'RECEIVE')),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'WST' CHECK (currency IN ('WST', 'USD', 'NZD', 'AUD', 'FJD')),
  reference text,
  sender text,
  recipient text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  provider text CHECK (provider IN ('Digicel', 'Vodafone', 'Bluesky', 'Other')),
  external_transaction_id text,
  failure_reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance numeric DEFAULT 0 CHECK (balance >= 0),
  currency text DEFAULT 'WST' CHECK (currency IN ('WST', 'USD', 'NZD', 'AUD', 'FJD')),
  stripe_customer_id text,
  is_active boolean DEFAULT true,
  daily_limit numeric DEFAULT 1000,
  monthly_limit numeric DEFAULT 10000,
  daily_spent numeric DEFAULT 0,
  monthly_spent numeric DEFAULT 0,
  last_reset_day date DEFAULT CURRENT_DATE,
  last_reset_month date DEFAULT date_trunc('month', CURRENT_DATE),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mobile_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policies for mobile_transactions
CREATE POLICY "Users can access their own mobile transactions"
  ON mobile_transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can access all mobile transactions"
  ON mobile_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for wallets
CREATE POLICY "Users can access their own wallet"
  ON wallets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can access all wallets"
  ON wallets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to generate unique transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS text AS $$
DECLARE
  ref_prefix text := 'MM';
  timestamp_part text;
  random_part text;
  full_reference text;
BEGIN
  -- Get timestamp part (YYYYMMDDHHMM)
  timestamp_part := to_char(now(), 'YYYYMMDDHH24MI');
  
  -- Generate random 4-digit number
  random_part := lpad(floor(random() * 10000)::text, 4, '0');
  
  -- Combine parts
  full_reference := ref_prefix || timestamp_part || random_part;
  
  RETURN full_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS trigger AS $$
BEGIN
  INSERT INTO wallets (user_id, currency, created_at, updated_at)
  VALUES (NEW.id, 'WST', now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet for new users
DROP TRIGGER IF EXISTS on_user_created_wallet ON users;
CREATE TRIGGER on_user_created_wallet
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_wallet();

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_user_id uuid,
  p_amount numeric,
  p_operation text, -- 'add' or 'subtract'
  p_currency text DEFAULT 'WST'
)
RETURNS jsonb AS $$
DECLARE
  current_balance numeric;
  new_balance numeric;
  wallet_record RECORD;
BEGIN
  -- Get current wallet info
  SELECT * INTO wallet_record
  FROM wallets
  WHERE user_id = p_user_id AND currency = p_currency;
  
  IF wallet_record IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;
  
  current_balance := wallet_record.balance;
  
  -- Calculate new balance
  IF p_operation = 'add' THEN
    new_balance := current_balance + p_amount;
  ELSIF p_operation = 'subtract' THEN
    IF current_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    new_balance := current_balance - p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid operation. Use "add" or "subtract"';
  END IF;
  
  -- Update wallet
  UPDATE wallets
  SET 
    balance = new_balance,
    updated_at = now()
  WHERE user_id = p_user_id AND currency = p_currency;
  
  RETURN jsonb_build_object(
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'amount_changed', p_amount,
    'operation', p_operation
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process mobile money transaction
CREATE OR REPLACE FUNCTION process_mobile_transaction(
  p_user_id uuid,
  p_type text,
  p_phone_number text,
  p_amount numeric,
  p_currency text DEFAULT 'WST',
  p_reference text DEFAULT NULL,
  p_sender text DEFAULT NULL,
  p_recipient text DEFAULT NULL,
  p_provider text DEFAULT 'Digicel'
)
RETURNS jsonb AS $$
DECLARE
  transaction_id uuid;
  wallet_result jsonb;
  final_reference text;
BEGIN
  -- Generate reference if not provided
  IF p_reference IS NULL THEN
    final_reference := generate_transaction_reference();
  ELSE
    final_reference := p_reference;
  END IF;
  
  -- Create transaction record
  INSERT INTO mobile_transactions (
    type,
    user_id,
    phone_number,
    amount,
    currency,
    reference,
    sender,
    recipient,
    status,
    provider,
    external_transaction_id,
    created_at
  ) VALUES (
    p_type,
    p_user_id,
    p_phone_number,
    p_amount,
    p_currency,
    final_reference,
    p_sender,
    p_recipient,
    CASE 
      WHEN p_type = 'RECEIVE' THEN 'completed'
      ELSE 'pending'
    END,
    p_provider,
    'ext_' || generate_transaction_reference(),
    now()
  ) RETURNING id INTO transaction_id;
  
  -- Update wallet balance for RECEIVE transactions
  IF p_type = 'RECEIVE' THEN
    wallet_result := update_wallet_balance(p_user_id, p_amount, 'add', p_currency);
    
    -- Mark transaction as completed
    UPDATE mobile_transactions
    SET 
      status = 'completed',
      completed_at = now()
    WHERE id = transaction_id;
  END IF;
  
  -- For SEND transactions, we'll mark as pending and process later
  -- In a real implementation, this would integrate with actual mobile money APIs
  
  RETURN jsonb_build_object(
    'transaction_id', transaction_id,
    'reference', final_reference,
    'status', CASE WHEN p_type = 'RECEIVE' THEN 'completed' ELSE 'pending' END,
    'wallet_update', wallet_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily/monthly limits
CREATE OR REPLACE FUNCTION reset_wallet_limits()
RETURNS void AS $$
BEGIN
  -- Reset daily limits
  UPDATE wallets
  SET 
    daily_spent = 0,
    last_reset_day = CURRENT_DATE,
    updated_at = now()
  WHERE last_reset_day < CURRENT_DATE;
  
  -- Reset monthly limits
  UPDATE wallets
  SET 
    monthly_spent = 0,
    last_reset_month = date_trunc('month', CURRENT_DATE),
    updated_at = now()
  WHERE last_reset_month < date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mobile_transactions_user_id ON mobile_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_transactions_type ON mobile_transactions(type);
CREATE INDEX IF NOT EXISTS idx_mobile_transactions_status ON mobile_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mobile_transactions_phone ON mobile_transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_mobile_transactions_reference ON mobile_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_mobile_transactions_created_at ON mobile_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);

-- Create trigger for wallet updated_at
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample mobile money providers data
CREATE TABLE IF NOT EXISTS mobile_money_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  country text NOT NULL,
  currency text NOT NULL,
  is_active boolean DEFAULT true,
  api_endpoint text,
  supported_operations text[] DEFAULT ARRAY['send', 'receive'],
  fees jsonb,
  limits jsonb,
  created_at timestamptz DEFAULT now()
);

-- Insert Pacific Island mobile money providers
INSERT INTO mobile_money_providers (name, code, country, currency, supported_operations, fees, limits) VALUES
('Digicel Mobile Money', 'DIGICEL_WS', 'Samoa', 'WST', ARRAY['send', 'receive'], 
 '{"send_fee": 0.50, "receive_fee": 0.00, "currency": "WST"}',
 '{"daily_limit": 1000, "monthly_limit": 10000, "min_amount": 1, "max_amount": 500}'),
('Vodafone M-PAiSA', 'VODAFONE_WS', 'Samoa', 'WST', ARRAY['send', 'receive'],
 '{"send_fee": 0.75, "receive_fee": 0.00, "currency": "WST"}',
 '{"daily_limit": 1500, "monthly_limit": 15000, "min_amount": 1, "max_amount": 750}'),
('Digicel Mobile Money Fiji', 'DIGICEL_FJ', 'Fiji', 'FJD', ARRAY['send', 'receive'],
 '{"send_fee": 0.50, "receive_fee": 0.00, "currency": "FJD"}',
 '{"daily_limit": 1000, "monthly_limit": 10000, "min_amount": 1, "max_amount": 500}'),
('Vodafone M-PAiSA Fiji', 'VODAFONE_FJ', 'Fiji', 'FJD', ARRAY['send', 'receive'],
 '{"send_fee": 0.75, "receive_fee": 0.00, "currency": "FJD"}',
 '{"daily_limit": 1500, "monthly_limit": 15000, "min_amount": 1, "max_amount": 750}')
ON CONFLICT (code) DO NOTHING;
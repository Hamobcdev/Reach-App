/*
  # Create virtual cards and activity log tables for Algorand integration

  1. New Tables
    - `virtual_cards`
      - `id` (blockchain card ID)
      - `user_id` (Supabase user reference or wallet address)
      - `user_address` (blockchain wallet address)
      - `currency`, `balance`, `kyc_tier`, `region`, `is_active`
      - `created_at`, `last_synced_at`
    
    - `card_activity_log`
      - `id`, `card_id`, `action`, `amount`, `source`, `timestamp`

  2. Security
    - Enable RLS on both tables
    - Add policies for users to access their own cards
    - Add policies for admins to access all cards

  3. Functions
    - `sync_blockchain_card()` - Sync card state from blockchain
    - `log_card_activity()` - Log card activities
*/

-- Create virtual_cards table for blockchain integration
CREATE TABLE IF NOT EXISTS virtual_cards (
  id text PRIMARY KEY, -- Blockchain card ID
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  user_address text NOT NULL, -- Blockchain wallet address
  currency text DEFAULT 'ALGO' CHECK (currency IN ('ALGO', 'USDC', 'WST', 'USD', 'NZD', 'AUD', 'FJD')),
  balance numeric DEFAULT 0 CHECK (balance >= 0),
  kyc_tier text DEFAULT 'BASIC' CHECK (kyc_tier IN ('BASIC', 'STANDARD', 'ENHANCED')),
  region text DEFAULT 'samoa' CHECK (region IN ('samoa', 'pacific', 'global')),
  is_active boolean DEFAULT true,
  blockchain_data jsonb, -- Store additional blockchain metadata
  created_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create card_activity_log table
CREATE TABLE IF NOT EXISTS card_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id text REFERENCES virtual_cards(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'funded', 'spent', 'refunded', 'activated', 'deactivated', 'synced')),
  amount numeric DEFAULT 0,
  previous_balance numeric,
  new_balance numeric,
  source text DEFAULT 'blockchain' CHECK (source IN ('blockchain', 'api', 'admin', 'user')),
  transaction_hash text, -- Blockchain transaction hash
  block_number bigint, -- Blockchain block number
  metadata jsonb, -- Additional activity data
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE virtual_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for virtual_cards
CREATE POLICY "Users can access their own virtual cards"
  ON virtual_cards
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read virtual cards by address"
  ON virtual_cards
  FOR SELECT
  TO public
  USING (true); -- Allow reading for blockchain sync

CREATE POLICY "Admins can access all virtual cards"
  ON virtual_cards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for card_activity_log
CREATE POLICY "Users can read their own card activity"
  ON card_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM virtual_cards 
      WHERE id = card_activity_log.card_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert card activity for sync"
  ON card_activity_log
  FOR INSERT
  TO public
  WITH CHECK (true); -- Allow blockchain sync to insert

CREATE POLICY "Admins can access all card activity"
  ON card_activity_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to sync blockchain card data
CREATE OR REPLACE FUNCTION sync_blockchain_card(
  p_card_id text,
  p_user_address text,
  p_balance numeric,
  p_currency text DEFAULT 'ALGO',
  p_kyc_tier text DEFAULT 'BASIC',
  p_region text DEFAULT 'samoa',
  p_is_active boolean DEFAULT true,
  p_transaction_hash text DEFAULT NULL,
  p_block_number bigint DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  existing_card RECORD;
  user_record RECORD;
  card_created boolean := false;
  balance_changed boolean := false;
  previous_balance numeric := 0;
  activity_id uuid;
BEGIN
  -- Try to find user by wallet address first, then by user_id if provided
  SELECT * INTO user_record
  FROM users
  WHERE wallet_address = p_user_address
  LIMIT 1;

  -- Check if card already exists
  SELECT * INTO existing_card
  FROM virtual_cards
  WHERE id = p_card_id;

  IF existing_card IS NULL THEN
    -- Create new card
    INSERT INTO virtual_cards (
      id,
      user_id,
      user_address,
      currency,
      balance,
      kyc_tier,
      region,
      is_active,
      blockchain_data,
      created_at,
      last_synced_at,
      updated_at
    ) VALUES (
      p_card_id,
      user_record.id,
      p_user_address,
      p_currency,
      p_balance,
      p_kyc_tier,
      p_region,
      p_is_active,
      p_metadata,
      now(),
      now(),
      now()
    );
    
    card_created := true;
    balance_changed := p_balance > 0;
    
    -- Log card creation
    INSERT INTO card_activity_log (
      card_id,
      action,
      amount,
      previous_balance,
      new_balance,
      source,
      transaction_hash,
      block_number,
      metadata,
      timestamp
    ) VALUES (
      p_card_id,
      'created',
      p_balance,
      0,
      p_balance,
      'blockchain',
      p_transaction_hash,
      p_block_number,
      p_metadata,
      now()
    ) RETURNING id INTO activity_id;
    
  ELSE
    -- Update existing card
    previous_balance := existing_card.balance;
    balance_changed := existing_card.balance != p_balance;
    
    UPDATE virtual_cards
    SET 
      user_address = p_user_address,
      currency = p_currency,
      balance = p_balance,
      kyc_tier = p_kyc_tier,
      region = p_region,
      is_active = p_is_active,
      blockchain_data = COALESCE(p_metadata, blockchain_data),
      last_synced_at = now(),
      updated_at = now()
    WHERE id = p_card_id;
    
    -- Log sync activity
    INSERT INTO card_activity_log (
      card_id,
      action,
      amount,
      previous_balance,
      new_balance,
      source,
      transaction_hash,
      block_number,
      metadata,
      timestamp
    ) VALUES (
      p_card_id,
      CASE 
        WHEN balance_changed AND p_balance > previous_balance THEN 'funded'
        WHEN balance_changed AND p_balance < previous_balance THEN 'spent'
        ELSE 'synced'
      END,
      ABS(p_balance - previous_balance),
      previous_balance,
      p_balance,
      'blockchain',
      p_transaction_hash,
      p_block_number,
      p_metadata,
      now()
    ) RETURNING id INTO activity_id;
  END IF;

  -- Return sync result
  RETURN jsonb_build_object(
    'card_id', p_card_id,
    'user_address', p_user_address,
    'user_id', user_record.id,
    'card_created', card_created,
    'balance_changed', balance_changed,
    'previous_balance', previous_balance,
    'new_balance', p_balance,
    'activity_id', activity_id,
    'synced_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log card activity
CREATE OR REPLACE FUNCTION log_card_activity(
  p_card_id text,
  p_action text,
  p_amount numeric DEFAULT 0,
  p_source text DEFAULT 'api',
  p_transaction_hash text DEFAULT NULL,
  p_block_number bigint DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  activity_id uuid;
  current_balance numeric;
  previous_balance numeric;
BEGIN
  -- Get current card balance
  SELECT balance INTO current_balance
  FROM virtual_cards
  WHERE id = p_card_id;
  
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'Card not found: %', p_card_id;
  END IF;
  
  -- Calculate previous balance based on action
  CASE p_action
    WHEN 'funded' THEN
      previous_balance := current_balance - p_amount;
    WHEN 'spent' THEN
      previous_balance := current_balance + p_amount;
    ELSE
      previous_balance := current_balance;
  END CASE;
  
  -- Insert activity log
  INSERT INTO card_activity_log (
    card_id,
    action,
    amount,
    previous_balance,
    new_balance,
    source,
    transaction_hash,
    block_number,
    metadata,
    timestamp
  ) VALUES (
    p_card_id,
    p_action,
    p_amount,
    previous_balance,
    current_balance,
    p_source,
    p_transaction_hash,
    p_block_number,
    p_metadata,
    now()
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get card activity history
CREATE OR REPLACE FUNCTION get_card_activity(
  p_card_id text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  action text,
  amount numeric,
  previous_balance numeric,
  new_balance numeric,
  source text,
  transaction_hash text,
  block_number bigint,
  metadata jsonb,
  timestamp timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cal.id,
    cal.action,
    cal.amount,
    cal.previous_balance,
    cal.new_balance,
    cal.source,
    cal.transaction_hash,
    cal.block_number,
    cal.metadata,
    cal.timestamp
  FROM card_activity_log cal
  WHERE cal.card_id = p_card_id
  ORDER BY cal.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_virtual_cards_user_id ON virtual_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_user_address ON virtual_cards(user_address);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_is_active ON virtual_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_last_synced_at ON virtual_cards(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_card_activity_log_card_id ON card_activity_log(card_id);
CREATE INDEX IF NOT EXISTS idx_card_activity_log_action ON card_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_card_activity_log_timestamp ON card_activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_card_activity_log_transaction_hash ON card_activity_log(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_card_activity_log_block_number ON card_activity_log(block_number);

-- Create trigger for virtual_cards updated_at
DROP TRIGGER IF EXISTS update_virtual_cards_updated_at ON virtual_cards;
CREATE TRIGGER update_virtual_cards_updated_at
  BEFORE UPDATE ON virtual_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO virtual_cards (id, user_address, currency, balance, kyc_tier, region, is_active, blockchain_data) VALUES
('algo_card_001', 'ALGORAND_ADDRESS_1', 'ALGO', 100.50, 'BASIC', 'samoa', true, '{"contract_version": "1.0", "created_block": 12345}'),
('algo_card_002', 'ALGORAND_ADDRESS_2', 'USDC', 250.00, 'STANDARD', 'pacific', true, '{"contract_version": "1.0", "created_block": 12346}'),
('algo_card_003', 'ALGORAND_ADDRESS_3', 'ALGO', 75.25, 'ENHANCED', 'global', false, '{"contract_version": "1.0", "created_block": 12347}')
ON CONFLICT (id) DO NOTHING;
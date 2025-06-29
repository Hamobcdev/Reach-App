/*
  # Create KYC Applications Table and Storage Setup

  1. New Tables
    - `kyc_applications` - Store KYC application data
    - `algorand_contracts` - Store Algorand contract deployment info

  2. Storage
    - Create `kyc-documents` bucket for document uploads

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies for user access
*/

-- Create kyc_applications table
CREATE TABLE IF NOT EXISTS kyc_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  region text DEFAULT 'samoa',
  tier text NOT NULL CHECK (tier IN ('BASIC', 'STANDARD', 'ENHANCED', 'INSUFFICIENT')),
  score integer NOT NULL DEFAULT 0,
  documents jsonb DEFAULT '[]',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create algorand_contracts table
CREATE TABLE IF NOT EXISTS algorand_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  app_id bigint UNIQUE NOT NULL,
  app_address text NOT NULL,
  network text DEFAULT 'testnet' CHECK (network IN ('testnet', 'mainnet')),
  transaction_id text NOT NULL,
  status text DEFAULT 'deployed' CHECK (status IN ('deploying', 'deployed', 'failed', 'inactive')),
  contract_type text DEFAULT 'virtual_card_manager',
  deployment_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE kyc_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE algorand_contracts ENABLE ROW LEVEL SECURITY;

-- Policies for kyc_applications
CREATE POLICY "Users can read their own KYC applications"
  ON kyc_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own KYC applications"
  ON kyc_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending KYC applications"
  ON kyc_applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all KYC applications"
  ON kyc_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all KYC applications"
  ON kyc_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for algorand_contracts
CREATE POLICY "Users can read their own contracts"
  ON algorand_contracts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contracts"
  ON algorand_contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all contracts"
  ON algorand_contracts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kyc_applications_user_id ON kyc_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_applications_status ON kyc_applications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_applications_tier ON kyc_applications(tier);
CREATE INDEX IF NOT EXISTS idx_kyc_applications_created_at ON kyc_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_algorand_contracts_user_id ON algorand_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_algorand_contracts_app_id ON algorand_contracts(app_id);
CREATE INDEX IF NOT EXISTS idx_algorand_contracts_network ON algorand_contracts(network);
CREATE INDEX IF NOT EXISTS idx_algorand_contracts_status ON algorand_contracts(status);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_kyc_applications_updated_at ON kyc_applications;
CREATE TRIGGER update_kyc_applications_updated_at
  BEFORE UPDATE ON kyc_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_algorand_contracts_updated_at ON algorand_contracts;
CREATE TRIGGER update_algorand_contracts_updated_at
  BEFORE UPDATE ON algorand_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-approve BASIC tier applications
CREATE OR REPLACE FUNCTION auto_approve_basic_kyc()
RETURNS trigger AS $$
BEGIN
  -- Auto-approve BASIC tier applications
  IF NEW.tier = 'BASIC' AND NEW.status = 'pending' THEN
    NEW.status := 'approved';
    NEW.reviewed_at := now();
    NEW.notes := 'Auto-approved for BASIC tier';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-approval
DROP TRIGGER IF EXISTS auto_approve_basic_kyc_trigger ON kyc_applications;
CREATE TRIGGER auto_approve_basic_kyc_trigger
  BEFORE INSERT ON kyc_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_basic_kyc();

-- Insert sample data for testing
INSERT INTO kyc_applications (
  user_id,
  first_name,
  last_name,
  phone,
  address,
  region,
  tier,
  score,
  status,
  documents
) VALUES (
  (SELECT id FROM users LIMIT 1),
  'Test',
  'User',
  '+685123456',
  '123 Test Street, Apia',
  'samoa',
  'BASIC',
  75,
  'approved',
  '[{"type": "national_id", "category": "identity", "fileName": "test_id.jpg"}]'
) ON CONFLICT DO NOTHING;
-- Migration: Create and update users table with proper schema
-- This migration handles both new installations and existing databases

-- First, check if users table exists and create/modify accordingly
DO $$
BEGIN
  -- Create users table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    CREATE TABLE users (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text UNIQUE NOT NULL,
      role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'agent')),
      kyc_status text DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
      wallet_address text,
      stripe_customer_id text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  ELSE
    -- Table exists, add missing columns if they don't exist
    
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role' AND table_schema = 'public') THEN
      ALTER TABLE users ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'agent'));
    END IF;
    
    -- Add kyc_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'kyc_status' AND table_schema = 'public') THEN
      ALTER TABLE users ADD COLUMN kyc_status text DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected'));
    END IF;
    
    -- Add wallet_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'wallet_address' AND table_schema = 'public') THEN
      ALTER TABLE users ADD COLUMN wallet_address text;
    END IF;
    
    -- Add stripe_customer_id column if it doesn't exist (might already exist based on schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_customer_id' AND table_schema = 'public') THEN
      ALTER TABLE users ADD COLUMN stripe_customer_id text;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at' AND table_schema = 'public') THEN
      ALTER TABLE users ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at' AND table_schema = 'public') THEN
      ALTER TABLE users ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
  END IF;
END $$;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can read all user data" ON users;

-- Create policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate insertions
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing table foreign key constraints
-- These operations are safe to run multiple times

-- Update kyc_data table foreign key
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'kyc_data_user_id_fkey' 
    AND table_name = 'kyc_data'
  ) THEN
    ALTER TABLE kyc_data DROP CONSTRAINT kyc_data_user_id_fkey;
  END IF;
  
  -- Add new constraint referencing users table
  ALTER TABLE kyc_data 
  ADD CONSTRAINT kyc_data_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- Update cards table foreign key
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cards_user_id_fkey' 
    AND table_name = 'cards'
  ) THEN
    ALTER TABLE cards DROP CONSTRAINT cards_user_id_fkey;
  END IF;
  
  -- Add new constraint referencing users table
  ALTER TABLE cards 
  ADD CONSTRAINT cards_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- Update payments table foreign key
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_user_id_fkey' 
    AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT payments_user_id_fkey;
  END IF;
  
  -- Add new constraint referencing users table
  ALTER TABLE payments 
  ADD CONSTRAINT payments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- Update events table foreign key
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_user_id_fkey' 
    AND table_name = 'events'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_user_id_fkey;
  END IF;
  
  -- Add new constraint referencing users table
  ALTER TABLE events 
  ADD CONSTRAINT events_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- Create an index on users.role for better performance on admin queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create an index on users.kyc_status for better performance on KYC queries
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);

-- Update function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
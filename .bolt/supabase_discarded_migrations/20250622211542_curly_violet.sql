/*
  # Enhanced Authentication and Security Features

  1. New Tables
    - `user_security_settings` - Store user security preferences and MFA settings
    - `security_events` - Log security-related events for audit trail

  2. Updates to existing tables
    - Add security-related columns to users table
    - Add phone verification status
    - Add MFA enrollment status

  3. Security
    - Enable RLS on all new tables
    - Add policies for user access control
    - Add audit logging triggers

  4. Functions
    - Password validation function
    - Security event logging function
*/

-- Add security columns to users table if they don't exist
DO $$
BEGIN
  -- Add phone_verified column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone_verified' AND table_schema = 'public'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  -- Add phone_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone_number' AND table_schema = 'public'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_number text;
  END IF;

  -- Add mfa_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'mfa_enabled' AND table_schema = 'public'
  ) THEN
    ALTER TABLE users ADD COLUMN mfa_enabled boolean DEFAULT false;
  END IF;

  -- Add last_login column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login' AND table_schema = 'public'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login timestamptz;
  END IF;

  -- Add failed_login_attempts column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'failed_login_attempts' AND table_schema = 'public'
  ) THEN
    ALTER TABLE users ADD COLUMN failed_login_attempts integer DEFAULT 0;
  END IF;

  -- Add account_locked_until column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'account_locked_until' AND table_schema = 'public'
  ) THEN
    ALTER TABLE users ADD COLUMN account_locked_until timestamptz;
  END IF;
END $$;

-- Create user_security_settings table
CREATE TABLE IF NOT EXISTS user_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  two_factor_enabled boolean DEFAULT false,
  backup_codes text[],
  security_questions jsonb,
  login_notifications boolean DEFAULT true,
  session_timeout_minutes integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_security_settings
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_security_settings
CREATE POLICY "Users can read own security settings"
  ON user_security_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own security settings"
  ON user_security_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create security_events table for audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb,
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on security_events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Create policies for security_events
CREATE POLICY "Users can read own security events"
  ON security_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all security events"
  ON security_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to validate password strength
CREATE OR REPLACE FUNCTION validate_password_strength(password text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  score integer := 0;
BEGIN
  result := jsonb_build_object(
    'length', length(password) >= 8,
    'uppercase', password ~ '[A-Z]',
    'lowercase', password ~ '[a-z]',
    'number', password ~ '[0-9]',
    'special', password ~ '[!@#$%^&*(),.?":{}|<>]'
  );
  
  -- Calculate score
  IF (result->>'length')::boolean THEN score := score + 1; END IF;
  IF (result->>'uppercase')::boolean THEN score := score + 1; END IF;
  IF (result->>'lowercase')::boolean THEN score := score + 1; END IF;
  IF (result->>'number')::boolean THEN score := score + 1; END IF;
  IF (result->>'special')::boolean THEN score := score + 1; END IF;
  
  result := result || jsonb_build_object(
    'score', score,
    'is_valid', score = 5,
    'strength', CASE 
      WHEN score < 3 THEN 'weak'
      WHEN score < 5 THEN 'medium'
      ELSE 'strong'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_success boolean DEFAULT true
)
RETURNS uuid AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO security_events (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent,
    success,
    created_at
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_data,
    p_ip_address,
    p_user_agent,
    p_success,
    now()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login(p_user_id uuid)
RETURNS void AS $$
DECLARE
  current_attempts integer;
BEGIN
  -- Increment failed login attempts
  UPDATE users 
  SET 
    failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING failed_login_attempts INTO current_attempts;
  
  -- Lock account if too many failed attempts (5 attempts = 15 minute lock)
  IF current_attempts >= 5 THEN
    UPDATE users 
    SET 
      account_locked_until = now() + interval '15 minutes',
      updated_at = now()
    WHERE id = p_user_id;
    
    -- Log security event
    PERFORM log_security_event(
      p_user_id,
      'account_locked',
      jsonb_build_object('failed_attempts', current_attempts),
      NULL,
      NULL,
      false
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle successful login
CREATE OR REPLACE FUNCTION handle_successful_login(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Reset failed login attempts and update last login
  UPDATE users 
  SET 
    failed_login_attempts = 0,
    account_locked_until = NULL,
    last_login = now(),
    updated_at = now()
  WHERE id = p_user_id;
  
  -- Log security event
  PERFORM log_security_event(
    p_user_id,
    'successful_login',
    NULL,
    NULL,
    NULL,
    true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create security settings for new users
CREATE OR REPLACE FUNCTION create_user_security_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_security_settings (user_id, created_at, updated_at)
  VALUES (NEW.id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_user_created_security_settings ON users;
CREATE TRIGGER on_user_created_security_settings
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_security_settings();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Add additional policies for users table to handle phone verification
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
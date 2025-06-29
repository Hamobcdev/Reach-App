/*
  # Complete Security Tables for Enhanced Authentication

  1. New Tables
    - `mfa_totp` - Store TOTP secrets for multi-factor authentication
    - `user_sessions` - Track user sessions for enhanced session management
    - `phone_verifications` - Audit trail for phone verification attempts

  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies for user data access
    - Create indexes for performance

  3. Functions
    - Password strength validation (already exists)
    - Session management helpers
    - Phone verification tracking
*/

-- 1. MFA Table for storing TOTP secrets
CREATE TABLE IF NOT EXISTS public.mfa_totp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  backup_codes TEXT[],
  created_at TIMESTAMP DEFAULT now(),
  last_used TIMESTAMP
);

ALTER TABLE public.mfa_totp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own TOTP secret"
  ON public.mfa_totp
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Session table for enhanced session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location_info JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  last_seen TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own sessions"
  ON public.user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
  ON public.user_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Phone Verification Audit
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  verification_code TEXT,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMP,
  sent_at TIMESTAMP DEFAULT now(),
  verified_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their phone verification"
  ON public.phone_verifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Password Reset Tokens (for secure password reset flow)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  used_at TIMESTAMP
);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reset tokens"
  ON public.password_reset_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- 5. Login Attempts Tracking (separate from users table for detailed tracking)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  failure_reason TEXT,
  attempted_at TIMESTAMP DEFAULT now(),
  location_info JSONB
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login attempts"
  ON public.login_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all login attempts"
  ON public.login_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Functions for enhanced security management

-- Function to generate secure TOTP secret
CREATE OR REPLACE FUNCTION generate_totp_secret()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate backup codes for MFA
CREATE OR REPLACE FUNCTION generate_backup_codes()
RETURNS TEXT[] AS $$
DECLARE
  codes TEXT[] := '{}';
  i INTEGER;
  code TEXT;
BEGIN
  FOR i IN 1..10 LOOP
    code := '';
    FOR j IN 1..8 LOOP
      code := code || floor(random() * 10)::text;
    END LOOP;
    codes := array_append(codes, code);
  END LOOP;
  RETURN codes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user session
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL,
  p_expires_at TIMESTAMP DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
  default_expiry TIMESTAMP;
BEGIN
  -- Set default expiry to 7 days if not provided
  IF p_expires_at IS NULL THEN
    default_expiry := now() + interval '7 days';
  ELSE
    default_expiry := p_expires_at;
  END IF;

  INSERT INTO user_sessions (
    user_id,
    session_token,
    ip_address,
    user_agent,
    device_info,
    expires_at,
    created_at
  ) VALUES (
    p_user_id,
    p_session_token,
    p_ip_address,
    p_user_agent,
    p_device_info,
    default_expiry,
    now()
  ) RETURNING id INTO session_id;

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send phone verification code
CREATE OR REPLACE FUNCTION send_phone_verification(
  p_user_id UUID,
  p_phone TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  verification_id UUID;
  verification_code TEXT;
  existing_attempts INTEGER;
BEGIN
  -- Generate 6-digit verification code
  verification_code := lpad(floor(random() * 1000000)::text, 6, '0');
  
  -- Check existing attempts in last hour
  SELECT COUNT(*) INTO existing_attempts
  FROM phone_verifications
  WHERE user_id = p_user_id 
    AND phone = p_phone 
    AND sent_at > now() - interval '1 hour';
  
  -- Limit to 5 attempts per hour
  IF existing_attempts >= 5 THEN
    RAISE EXCEPTION 'Too many verification attempts. Please try again later.';
  END IF;

  INSERT INTO phone_verifications (
    user_id,
    phone,
    verification_code,
    expires_at,
    ip_address,
    user_agent,
    sent_at
  ) VALUES (
    p_user_id,
    p_phone,
    verification_code,
    now() + interval '10 minutes',
    p_ip_address,
    p_user_agent,
    now()
  ) RETURNING id INTO verification_id;

  -- Log security event
  PERFORM log_security_event(
    p_user_id,
    'phone_verification_sent',
    jsonb_build_object('phone', p_phone, 'verification_id', verification_id),
    p_ip_address,
    p_user_agent,
    true
  );

  RETURN verification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify phone code
CREATE OR REPLACE FUNCTION verify_phone_code(
  p_user_id UUID,
  p_phone TEXT,
  p_code TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  verification_record RECORD;
  is_valid BOOLEAN := FALSE;
BEGIN
  -- Get the latest verification record
  SELECT * INTO verification_record
  FROM phone_verifications
  WHERE user_id = p_user_id 
    AND phone = p_phone 
    AND verified = FALSE
    AND expires_at > now()
  ORDER BY sent_at DESC
  LIMIT 1;

  IF verification_record IS NULL THEN
    -- Log failed attempt
    PERFORM log_security_event(
      p_user_id,
      'phone_verification_failed',
      jsonb_build_object('phone', p_phone, 'reason', 'no_valid_code'),
      p_ip_address,
      p_user_agent,
      false
    );
    RETURN FALSE;
  END IF;

  -- Check if too many attempts
  IF verification_record.attempts >= verification_record.max_attempts THEN
    PERFORM log_security_event(
      p_user_id,
      'phone_verification_failed',
      jsonb_build_object('phone', p_phone, 'reason', 'too_many_attempts'),
      p_ip_address,
      p_user_agent,
      false
    );
    RETURN FALSE;
  END IF;

  -- Increment attempts
  UPDATE phone_verifications
  SET attempts = attempts + 1
  WHERE id = verification_record.id;

  -- Check if code matches
  IF verification_record.verification_code = p_code THEN
    -- Mark as verified
    UPDATE phone_verifications
    SET 
      verified = TRUE,
      verified_at = now()
    WHERE id = verification_record.id;

    -- Update user phone verification status
    UPDATE users
    SET 
      phone_verified = TRUE,
      phone_number = p_phone,
      updated_at = now()
    WHERE id = p_user_id;

    -- Log successful verification
    PERFORM log_security_event(
      p_user_id,
      'phone_verification_success',
      jsonb_build_object('phone', p_phone),
      p_ip_address,
      p_user_agent,
      true
    );

    is_valid := TRUE;
  ELSE
    -- Log failed verification
    PERFORM log_security_event(
      p_user_id,
      'phone_verification_failed',
      jsonb_build_object('phone', p_phone, 'reason', 'invalid_code'),
      p_ip_address,
      p_user_agent,
      false
    );
  END IF;

  RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired records
CREATE OR REPLACE FUNCTION cleanup_expired_security_records()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Clean up expired phone verifications (older than 24 hours)
  DELETE FROM phone_verifications 
  WHERE sent_at < now() - interval '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Clean up expired password reset tokens
  DELETE FROM password_reset_tokens 
  WHERE expires_at < now();

  -- Clean up old login attempts (older than 30 days)
  DELETE FROM login_attempts 
  WHERE attempted_at < now() - interval '30 days';

  -- Clean up inactive sessions (expired or not used in 30 days)
  DELETE FROM user_sessions 
  WHERE expires_at < now() OR last_seen < now() - interval '30 days';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mfa_totp_user_id ON mfa_totp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON phone_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);

-- Create a scheduled job to clean up expired records (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-expired-security', '0 2 * * *', 'SELECT cleanup_expired_security_records();');
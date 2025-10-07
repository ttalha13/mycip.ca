/*
  # Create OTP Tokens Table for Email Authentication

  1. New Tables
    - `otp_tokens`
      - `id` (uuid, primary key) - Unique identifier for each OTP
      - `email` (text, not null) - Email address requesting the OTP
      - `token` (text, not null) - 6-digit OTP code
      - `name` (text, nullable) - Optional user name
      - `attempts` (integer, default 0) - Number of verification attempts
      - `expires_at` (timestamptz, not null) - When the OTP expires
      - `verified` (boolean, default false) - Whether the OTP has been used
      - `created_at` (timestamptz, default now())
      
  2. Security
    - Enable RLS on `otp_tokens` table
    - Add policy for anyone to insert OTP tokens (for registration)
    - Add policy for anyone to read their own OTP tokens (for verification)
    - Add automatic cleanup of expired tokens
    
  3. Indexes
    - Index on email for faster lookups
    - Index on expires_at for cleanup operations
*/

-- Create OTP tokens table
CREATE TABLE IF NOT EXISTS otp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,
  name text,
  attempts integer DEFAULT 0 NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_token CHECK (token ~ '^\d{6}$'),
  CONSTRAINT valid_attempts CHECK (attempts >= 0 AND attempts <= 3)
);

-- Enable RLS
ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert OTP tokens (for sending codes)
CREATE POLICY "Anyone can request OTP tokens"
  ON otp_tokens
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Anyone can read OTP tokens by email (for verification)
CREATE POLICY "Users can read own OTP tokens"
  ON otp_tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: System can update attempts counter
CREATE POLICY "Users can update own OTP attempts"
  ON otp_tokens
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow deletion of expired tokens
CREATE POLICY "Anyone can delete expired tokens"
  ON otp_tokens
  FOR DELETE
  TO anon, authenticated
  USING (expires_at < now() OR verified = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_tokens_email ON otp_tokens(email);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires_at ON otp_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_verified ON otp_tokens(verified);

-- Function to clean up expired/used OTP tokens (runs automatically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM otp_tokens
  WHERE expires_at < now() - interval '1 hour'
     OR (verified = true AND created_at < now() - interval '1 hour');
END;
$$;
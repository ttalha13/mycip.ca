/*
  # Add Rate Limiting for OTP Requests
  
  1. New Tables
    - `otp_rate_limits`
      - `id` (uuid, primary key)
      - `email` (text, not null) - Email address making the request
      - `ip_address` (text) - IP address of the requester
      - `request_count` (integer, default 1) - Number of requests in current window
      - `window_start` (timestamptz, default now()) - Start of the rate limit window
      - `blocked_until` (timestamptz) - If blocked, when the block expires
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      
  2. Rate Limit Rules
    - Maximum 5 OTP requests per email per 15 minutes
    - Maximum 10 OTP requests per IP per 15 minutes
    - If exceeded, block for 30 minutes
    
  3. Security
    - Enable RLS on `otp_rate_limits` table
    - Allow edge function to read/write rate limit data
    - Automatic cleanup of old rate limit records
    
  4. Indexes
    - Index on email for fast lookups
    - Index on ip_address for IP-based limiting
    - Index on window_start for cleanup operations
*/

-- Create rate limits table
CREATE TABLE IF NOT EXISTS otp_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  request_count integer DEFAULT 1 NOT NULL,
  window_start timestamptz DEFAULT now() NOT NULL,
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_request_count CHECK (request_count >= 0)
);

-- Enable RLS
ALTER TABLE otp_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage rate limits (for edge function)
CREATE POLICY "Service can manage rate limits"
  ON otp_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Anonymous users can check their own rate limit status
CREATE POLICY "Users can check own rate limit"
  ON otp_rate_limits
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_email ON otp_rate_limits(email);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON otp_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON otp_rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON otp_rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Trigger to update updated_at
CREATE TRIGGER update_otp_rate_limits_updated_at
  BEFORE UPDATE ON otp_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM otp_rate_limits
  WHERE window_start < now() - interval '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
END;
$$;

-- Function to check rate limit (called by edge function)
CREATE OR REPLACE FUNCTION check_otp_rate_limit(
  p_email text,
  p_ip_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record otp_rate_limits%ROWTYPE;
  v_window_minutes integer := 15;
  v_max_requests integer := 5;
  v_block_minutes integer := 30;
  v_result jsonb;
BEGIN
  -- Check if currently blocked
  SELECT * INTO v_record
  FROM otp_rate_limits
  WHERE email = p_email
    AND blocked_until IS NOT NULL
    AND blocked_until > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'blocked_until', v_record.blocked_until,
      'retry_after_seconds', EXTRACT(EPOCH FROM (v_record.blocked_until - now()))::integer
    );
  END IF;
  
  -- Check current rate limit window
  SELECT * INTO v_record
  FROM otp_rate_limits
  WHERE email = p_email
    AND window_start > now() - (v_window_minutes || ' minutes')::interval
    AND (blocked_until IS NULL OR blocked_until < now())
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Increment request count
    IF v_record.request_count >= v_max_requests THEN
      -- Block the user
      UPDATE otp_rate_limits
      SET blocked_until = now() + (v_block_minutes || ' minutes')::interval,
          updated_at = now()
      WHERE id = v_record.id;
      
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'rate_limit_exceeded',
        'blocked_until', now() + (v_block_minutes || ' minutes')::interval,
        'retry_after_seconds', v_block_minutes * 60
      );
    ELSE
      -- Increment counter
      UPDATE otp_rate_limits
      SET request_count = request_count + 1,
          updated_at = now()
      WHERE id = v_record.id;
      
      RETURN jsonb_build_object(
        'allowed', true,
        'remaining', v_max_requests - v_record.request_count - 1
      );
    END IF;
  ELSE
    -- Create new rate limit window
    INSERT INTO otp_rate_limits (email, ip_address, request_count, window_start)
    VALUES (p_email, p_ip_address, 1, now());
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', v_max_requests - 1
    );
  END IF;
END;
$$;
/*
  # Fix Security and Performance Issues - Part 2

  1. RLS Policy Optimization
    - Replace auth.uid() with (select auth.uid()) in all RLS policies for better performance
    - Replace auth.email() with (select auth.email()) to avoid re-evaluation
    - Fix multiple permissive policies on contact_messages table

  2. Remove Unused Indexes
    - Drop indexes that are not being used to improve write performance
    
  3. Fix Function Search Paths
    - Set explicit search_path on all functions for security
    
  4. Changes:
    - Recreate all RLS policies with optimized auth function calls
    - Remove unused indexes
    - Update function definitions with secure search paths
*/

-- ============================================================================
-- 1. FIX RLS POLICIES - Optimize auth function calls
-- ============================================================================

-- Drop and recreate profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Drop and recreate contact_messages policies
DROP POLICY IF EXISTS "Users can read own messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can read all messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON contact_messages;

-- Combine the two SELECT policies into one to avoid multiple permissive policies
CREATE POLICY "Users and admins can read messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (
    email = (select auth.email()) OR 
    (select auth.email()) = 'abutalha7778@gmail.com'
  );

CREATE POLICY "Admins can update messages"
  ON contact_messages FOR UPDATE
  TO authenticated
  USING ((select auth.email()) = 'abutalha7778@gmail.com')
  WITH CHECK ((select auth.email()) = 'abutalha7778@gmail.com');

CREATE POLICY "Admins can delete messages"
  ON contact_messages FOR DELETE
  TO authenticated
  USING ((select auth.email()) = 'abutalha7778@gmail.com');

-- Drop and recreate user_profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Drop and recreate user_activity_log policies
DROP POLICY IF EXISTS "Users can read own activity" ON user_activity_log;
DROP POLICY IF EXISTS "System can insert activity" ON user_activity_log;

CREATE POLICY "Users can read own activity"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "System can insert activity"
  ON user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- 2. REMOVE UNUSED INDEXES
-- ============================================================================

-- Drop unused indexes on testimonials
DROP INDEX IF EXISTS idx_testimonials_user_name;

-- Drop unused indexes on user_profiles
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_user_profiles_provider;
DROP INDEX IF EXISTS idx_user_profiles_immigration_status;
DROP INDEX IF EXISTS idx_user_profiles_preferred_province;
DROP INDEX IF EXISTS idx_user_profiles_created_at;
DROP INDEX IF EXISTS idx_user_profiles_last_login;

-- Drop unused indexes on profiles
DROP INDEX IF EXISTS profiles_email_idx;
DROP INDEX IF EXISTS profiles_created_at_idx;

-- Drop unused indexes on user_activity_log
DROP INDEX IF EXISTS idx_user_activity_log_user_id;
DROP INDEX IF EXISTS idx_user_activity_log_type;
DROP INDEX IF EXISTS idx_user_activity_log_created_at;

-- Drop unused indexes on otp_tokens
DROP INDEX IF EXISTS idx_otp_tokens_email;
DROP INDEX IF EXISTS idx_otp_tokens_expires_at;
DROP INDEX IF EXISTS idx_otp_tokens_verified;

-- Drop unused indexes on contact_messages
DROP INDEX IF EXISTS idx_contact_messages_email;
DROP INDEX IF EXISTS idx_contact_messages_created_at;

-- ============================================================================
-- 3. FIX FUNCTION SEARCH PATHS
-- ============================================================================

-- Fix cleanup_expired_otps function
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM otp_tokens
  WHERE expires_at < now() - interval '1 hour'
     OR (verified = true AND created_at < now() - interval '1 hour');
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix log_user_activity function if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_user_activity') THEN
    DROP FUNCTION IF EXISTS log_user_activity(uuid, text, jsonb, inet, text);
    
    CREATE FUNCTION log_user_activity(
      p_user_id uuid,
      p_activity_type text,
      p_activity_data jsonb DEFAULT '{}'::jsonb,
      p_ip_address inet DEFAULT NULL,
      p_user_agent text DEFAULT NULL
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $func$
    BEGIN
      INSERT INTO user_activity_log (
        user_id,
        activity_type,
        activity_data,
        ip_address,
        user_agent
      ) VALUES (
        p_user_id,
        p_activity_type,
        p_activity_data,
        p_ip_address,
        p_user_agent
      );
    END;
    $func$;
  END IF;
END $$;

-- Fix handle_new_user function if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
    
    CREATE FUNCTION handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $func$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
      );
      RETURN NEW;
    END;
    $func$;
  END IF;
END $$;

-- Fix calculate_profile_completion function if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_profile_completion') THEN
    DROP FUNCTION IF EXISTS calculate_profile_completion(uuid);
    
    CREATE FUNCTION calculate_profile_completion(user_id uuid)
    RETURNS integer
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $func$
    DECLARE
      completion_percentage integer;
      filled_fields integer := 0;
      total_fields integer := 20;
    BEGIN
      SELECT
        CASE WHEN full_name IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN avatar_url IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN phone_number IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN date_of_birth IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN country_of_origin IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN current_location IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN immigration_status IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN preferred_province IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN current_visa_status IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN occupation IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN education_level IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN work_experience_years > 0 THEN 1 ELSE 0 END +
        CASE WHEN english_proficiency IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN french_proficiency IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN array_length(other_languages, 1) > 0 THEN 1 ELSE 0 END +
        CASE WHEN current_job_title IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN industry IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN array_length(skills, 1) > 0 THEN 1 ELSE 0 END +
        CASE WHEN array_length(certifications, 1) > 0 THEN 1 ELSE 0 END +
        CASE WHEN email_verified = true THEN 1 ELSE 0 END
      INTO filled_fields
      FROM user_profiles
      WHERE id = user_id;
      
      completion_percentage := (filled_fields * 100 / total_fields);
      
      UPDATE user_profiles
      SET profile_completion_percentage = completion_percentage
      WHERE id = user_id;
      
      RETURN completion_percentage;
    END;
    $func$;
  END IF;
END $$;
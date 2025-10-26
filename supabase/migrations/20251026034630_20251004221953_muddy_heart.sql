/*
  # Fix User Profiles Table and Ensure Proper Integration

  1. Enhanced User Profiles Table
    - Comprehensive user data storage
    - Immigration-specific fields
    - Professional information
    - Metadata for flexible expansion

  2. Security
    - Enable RLS on all tables
    - Proper policies for user data access
    - Secure functions for data operations

  3. Performance
    - Optimized indexes
    - Efficient queries
    - Proper constraints
*/

-- Drop existing table if it exists to recreate with proper structure
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create comprehensive user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  phone_number text,
  date_of_birth date,
  country_of_origin text,
  current_location text,
  
  -- Immigration specific fields
  immigration_status text DEFAULT 'exploring',
  preferred_province text,
  current_visa_status text,
  occupation text,
  education_level text,
  work_experience_years integer DEFAULT 0,
  
  -- Language skills
  english_proficiency text,
  french_proficiency text,
  other_languages text[],
  
  -- Professional information
  current_job_title text,
  industry text,
  skills text[],
  certifications text[],
  
  -- Authentication metadata
  provider text DEFAULT 'email',
  provider_id text,
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  
  -- Activity tracking
  last_login_at timestamptz,
  login_count integer DEFAULT 0,
  profile_completion_percentage integer DEFAULT 0,
  
  -- Flexible metadata storage
  preferences jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone_number IS NULL OR phone_number ~* '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT valid_work_experience CHECK (work_experience_years >= 0 AND work_experience_years <= 50),
  CONSTRAINT valid_completion_percentage CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_provider ON public.user_profiles(provider);
CREATE INDEX IF NOT EXISTS idx_user_profiles_immigration_status ON public.user_profiles(immigration_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_province ON public.user_profiles(preferred_province);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON public.user_profiles(last_login_at DESC);

-- Create RLS policies
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    provider,
    provider_id,
    email_verified,
    created_at,
    updated_at,
    last_login_at,
    login_count,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    NEW.raw_user_meta_data->>'provider_id',
    NEW.email_confirmed_at IS NOT NULL,
    NEW.created_at,
    NEW.updated_at,
    now(),
    1,
    COALESCE(NEW.raw_user_meta_data, '{}')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    provider = COALESCE(EXCLUDED.provider, user_profiles.provider),
    email_verified = EXCLUDED.email_verified,
    last_login_at = now(),
    login_count = user_profiles.login_count + 1,
    updated_at = now(),
    metadata = COALESCE(EXCLUDED.metadata, user_profiles.metadata);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to calculate profile completion
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(user_id uuid)
RETURNS integer AS $$
DECLARE
  completion_score integer := 0;
  profile_record record;
BEGIN
  SELECT * INTO profile_record FROM public.user_profiles WHERE id = user_id;
  
  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Basic information (40 points)
  IF profile_record.full_name IS NOT NULL AND length(profile_record.full_name) > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.phone_number IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.date_of_birth IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.country_of_origin IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  -- Immigration information (30 points)
  IF profile_record.preferred_province IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.current_visa_status IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.immigration_status IS NOT NULL AND profile_record.immigration_status != 'exploring' THEN
    completion_score := completion_score + 10;
  END IF;
  
  -- Professional information (30 points)
  IF profile_record.occupation IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.education_level IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.work_experience_years > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  -- Update the profile with calculated completion
  UPDATE public.user_profiles 
  SET profile_completion_percentage = completion_score,
      updated_at = now()
  WHERE id = user_id;
  
  RETURN completion_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user activity log table
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  activity_data jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'login', 'logout', 'profile_update', 'password_change', 
    'email_verification', 'phone_verification', 'contact_form_submission',
    'province_view', 'pathway_click', 'testimonial_view'
  ))
);

-- Enable RLS on activity log
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for activity log
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_type ON public.user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at DESC);

-- RLS policies for activity log
CREATE POLICY "Users can read own activity"
  ON public.user_activity_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert activity"
  ON public.user_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity(
  activity_type text,
  activity_data jsonb DEFAULT '{}',
  ip_address inet DEFAULT NULL,
  user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_activity_log (
    user_id,
    activity_type,
    activity_data,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    activity_type,
    activity_data,
    ip_address,
    user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_activity_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_activity(text, jsonb, inet, text) TO authenticated;
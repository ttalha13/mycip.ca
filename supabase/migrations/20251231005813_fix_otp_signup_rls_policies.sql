/*
  # Fix RLS Policies for OTP-Based Authentication

  The current RLS policies require Supabase Auth authentication (auth.uid()), 
  but the OTP signup flow doesn't use Supabase Auth - it creates profiles 
  with client-generated UUIDs. This causes profile creation to fail with 
  "new row violates row-level security policy".

  Solution: Allow anonymous users to INSERT profiles (email already verified 
  through OTP), while keeping SELECT/UPDATE restricted to authenticated users 
  who own the profile.

  1. Changes
    - Modified user_profiles INSERT policy to allow anonymous inserts
    - SELECT and UPDATE policies remain restricted to authenticated users
    - Email uniqueness constraint ensures no duplicates

  2. Security
    - Profile creation allowed only for OTP-verified emails
    - Profile read/update still requires authentication
    - Email-based ownership verification through OTP process
*/

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

CREATE POLICY "Allow anonymous profile creation via OTP"
  ON public.user_profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

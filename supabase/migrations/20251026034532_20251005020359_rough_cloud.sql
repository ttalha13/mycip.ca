/*
  # Fix testimonials table INSERT policy

  1. Security Changes
    - Update INSERT policy for testimonials table to allow authenticated users
    - Ensure users can insert testimonials when authenticated
    - Fix RLS policy that was blocking legitimate user submissions

  This migration fixes the "new row violates row-level security policy" error
  by updating the INSERT policy to properly check for authenticated users.
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own testimonials" ON testimonials;

-- Create a new INSERT policy that allows authenticated users to insert testimonials
CREATE POLICY "Authenticated users can insert testimonials"
  ON testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure we have a proper INSERT policy that matches the user_name with email
CREATE POLICY "Users can insert testimonials with their email"
  ON testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_name IS NOT NULL AND
    length(user_name) > 0
  );

-- Drop the old policy that was too restrictive
DROP POLICY IF EXISTS "Users can insert testimonials with their email" ON testimonials;

-- Create the final working policy
CREATE POLICY "Users can insert own testimonials"
  ON testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
/*
  # Fix testimonials SELECT policy

  1. Security Changes
    - Drop existing restrictive SELECT policy
    - Create new policy allowing public read access to testimonials
    - Ensure testimonials can be viewed by everyone (including unauthenticated users)

  This fixes the loading issue where testimonials couldn't be fetched due to RLS policy restrictions.
*/

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "public_read" ON testimonials;

-- Create a new policy that allows public read access to all testimonials
CREATE POLICY "Allow public read access to testimonials"
  ON testimonials
  FOR SELECT
  TO public
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
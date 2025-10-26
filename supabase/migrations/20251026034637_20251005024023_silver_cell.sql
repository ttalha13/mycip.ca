/*
  # Fix testimonials table structure and policies

  1. Ensure testimonials table exists with correct structure
  2. Add proper RLS policies for public read and authenticated insert
  3. Fix any column constraints that might be blocking inserts
*/

-- Ensure the testimonials table exists with correct structure
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL CHECK (length(comment) <= 1000 AND length(comment) >= 1),
  immigration_status text NOT NULL CHECK (length(immigration_status) <= 100),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to testimonials" ON testimonials;
DROP POLICY IF EXISTS "Authenticated users can insert testimonials" ON testimonials;
DROP POLICY IF EXISTS "Users can delete own testimonials" ON testimonials;
DROP POLICY IF EXISTS "Users can insert own testimonials" ON testimonials;
DROP POLICY IF EXISTS "Users can update own testimonials" ON testimonials;

-- Create new policies
CREATE POLICY "Public can read testimonials"
  ON testimonials
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert testimonials"
  ON testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON testimonials (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_testimonials_user_name ON testimonials (user_name);
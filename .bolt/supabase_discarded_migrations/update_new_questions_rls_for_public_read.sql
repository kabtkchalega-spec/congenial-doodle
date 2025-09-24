/*
  # Update new_questions RLS policy for public read
  1. Security: Drop existing RLS policy that only allows authenticated users to read.
  2. Security: Add a new RLS policy to allow public (anonymous) users to read the 'new_questions' table.
*/
DROP POLICY IF EXISTS "Allow authenticated users to read new_questions" ON new_questions;

CREATE POLICY "Allow public users to read new_questions" ON new_questions FOR SELECT TO public USING (true);
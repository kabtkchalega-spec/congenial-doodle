/*
  # Add is_wrong column to new_questions table and enable RLS
  1. New Columns: new_questions.is_wrong (boolean, default false)
  2. Security: Enable RLS, add policies for authenticated users to read and update questions.
*/
DO $$
BEGIN
    -- Add is_wrong column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='new_questions' AND column_name='is_wrong') THEN
        ALTER TABLE new_questions ADD COLUMN is_wrong BOOLEAN DEFAULT FALSE;
    END IF;

    -- Enable Row Level Security if not already enabled
    IF (SELECT relrowsecurity FROM pg_class WHERE relname='new_questions') IS NOT TRUE THEN
        ALTER TABLE new_questions ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Create policies if they don't exist
    -- Policy to allow authenticated users to read all questions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to read questions' AND tablename = 'new_questions') THEN
        CREATE POLICY "Allow authenticated users to read questions" ON new_questions FOR SELECT TO authenticated USING (true);
    END IF;

    -- Policy to allow authenticated users to update the is_wrong status of questions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to update question status' AND tablename = 'new_questions') THEN
        CREATE POLICY "Allow authenticated users to update question status" ON new_questions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;

END
$$;
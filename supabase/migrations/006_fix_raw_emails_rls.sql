-- Migration 006: Fix RLS policy for raw_emails table
-- The API needs to insert into raw_emails without user authentication
-- Run this in your Supabase SQL editor

-- Option 1: Allow public inserts to raw_emails (recommended for email processing)
-- This is safe because raw_emails is only for storing incoming emails temporarily

-- First, enable RLS on the table if not already
ALTER TABLE raw_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Allow public inserts" ON raw_emails;

-- Create a policy that allows inserts from anon/service role
CREATE POLICY "Allow public inserts" ON raw_emails
  FOR INSERT
  WITH CHECK (true);

-- Allow users to read only their own emails (by sender_email)
DROP POLICY IF EXISTS "Users can read own emails" ON raw_emails;

CREATE POLICY "Users can read own emails" ON raw_emails
  FOR SELECT
  USING (
    sender_email = auth.email() OR
    sender_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow service role full access for cleanup jobs
DROP POLICY IF EXISTS "Service role full access" ON raw_emails;

-- Grant necessary permissions
GRANT INSERT ON raw_emails TO anon;
GRANT INSERT ON raw_emails TO authenticated;


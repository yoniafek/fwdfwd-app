-- Migration: Add Trips Table and Update Travel Steps
-- Run this in your Supabase SQL editor

-- 1. Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  destination TEXT,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add trip_id column to travel_steps (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_steps' AND column_name = 'trip_id'
  ) THEN
    ALTER TABLE travel_steps ADD COLUMN trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON trips(share_token);
CREATE INDEX IF NOT EXISTS idx_travel_steps_trip_id ON travel_steps(trip_id);

-- 4. Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for trips table

-- Users can view their own trips
CREATE POLICY "Users can view own trips" ON trips
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view public trips via share token (handled in app)
CREATE POLICY "Anyone can view public trips" ON trips
  FOR SELECT USING (is_public = true);

-- Users can insert their own trips
CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own trips
CREATE POLICY "Users can delete own trips" ON trips
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Update travel_steps RLS to allow viewing via trip share
-- (This allows shared trip viewers to see travel steps)
DROP POLICY IF EXISTS "Users can view travel_steps in shared trips" ON travel_steps;
CREATE POLICY "Users can view travel_steps in shared trips" ON travel_steps
  FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    trip_id IN (SELECT id FROM trips WHERE is_public = true)
  );

-- 7. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Create raw_emails table if it doesn't exist (for anonymous forwarding)
CREATE TABLE IF NOT EXISTS raw_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_email TEXT NOT NULL,
  subject TEXT,
  html_content TEXT,
  text_content TEXT,
  parsed_data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,
  claimed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- 10. Index for looking up unclaimed emails
CREATE INDEX IF NOT EXISTS idx_raw_emails_sender ON raw_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_raw_emails_expires ON raw_emails(expires_at);

-- 11. RLS for raw_emails
ALTER TABLE raw_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their claimed emails" ON raw_emails
  FOR SELECT USING (claimed_by = auth.uid());

-- 12. Function to clean up expired emails (run via cron or scheduled function)
CREATE OR REPLACE FUNCTION cleanup_expired_emails()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM raw_emails 
  WHERE expires_at < NOW() AND claimed_by IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Note: To run cleanup automatically, set up a pg_cron job or Supabase Edge Function
-- Example pg_cron (if enabled):
-- SELECT cron.schedule('cleanup-expired-emails', '0 3 * * *', 'SELECT cleanup_expired_emails()');


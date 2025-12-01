-- Migration 004: Add custom title for stays and timezone fields
-- Run this in your Supabase SQL editor

-- Custom title for stays (homes, Airbnbs, etc.)
ALTER TABLE travel_steps 
ADD COLUMN IF NOT EXISTS custom_title TEXT;

-- Timezone fields for proper time display
ALTER TABLE travel_steps 
ADD COLUMN IF NOT EXISTS origin_timezone TEXT,
ADD COLUMN IF NOT EXISTS destination_timezone TEXT;


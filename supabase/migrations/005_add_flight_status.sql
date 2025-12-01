-- Migration 005: Add flight status tracking
-- Run this in your Supabase SQL editor

ALTER TABLE travel_steps 
ADD COLUMN IF NOT EXISTS flight_status TEXT,
ADD COLUMN IF NOT EXISTS flight_status_checked_at TIMESTAMPTZ;

-- Index for finding flights that need status updates
CREATE INDEX IF NOT EXISTS idx_travel_steps_flight_status 
ON travel_steps(type, start_datetime, flight_status_checked_at) 
WHERE type = 'flight';


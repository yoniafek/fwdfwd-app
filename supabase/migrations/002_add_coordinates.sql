-- Migration: Add coordinates to travel_steps for distance calculation
-- Run this in your Supabase SQL editor

-- Add coordinate columns to travel_steps
ALTER TABLE travel_steps 
ADD COLUMN IF NOT EXISTS origin_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS origin_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS origin_address TEXT,
ADD COLUMN IF NOT EXISTS destination_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS destination_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS destination_address TEXT;

-- Add indexes for potential geo queries
CREATE INDEX IF NOT EXISTS idx_travel_steps_origin_coords 
ON travel_steps(origin_lat, origin_lng) 
WHERE origin_lat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_steps_dest_coords 
ON travel_steps(destination_lat, destination_lng) 
WHERE destination_lat IS NOT NULL;


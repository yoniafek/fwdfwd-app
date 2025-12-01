-- Migration 003: Add terminal and gate fields for flights
-- Run this in your Supabase SQL editor

ALTER TABLE travel_steps 
ADD COLUMN IF NOT EXISTS origin_terminal TEXT,
ADD COLUMN IF NOT EXISTS origin_gate TEXT,
ADD COLUMN IF NOT EXISTS destination_terminal TEXT,
ADD COLUMN IF NOT EXISTS destination_gate TEXT,
ADD COLUMN IF NOT EXISTS duration TEXT;


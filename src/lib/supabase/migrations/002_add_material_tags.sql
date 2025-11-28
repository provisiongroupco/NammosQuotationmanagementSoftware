-- Migration: Add tags to materials table
-- Run this in your Supabase SQL Editor at: https://odzxiuodrrbxokqcztbf.supabase.co

-- Add tags column to materials table for grouping/indexing
ALTER TABLE materials ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for tag-based queries
CREATE INDEX IF NOT EXISTS idx_materials_tags ON materials USING GIN (tags);

-- Update existing materials with default tags based on type
UPDATE materials SET tags = ARRAY[type] WHERE tags = '{}' OR tags IS NULL;

-- Add sample tags to existing materials
UPDATE materials SET tags = ARRAY['fabric', 'upholstery', 'seat'] WHERE type = 'fabric';
UPDATE materials SET tags = ARRAY['leather', 'premium', 'upholstery'] WHERE type = 'leather';
UPDATE materials SET tags = ARRAY['wood', 'frame', 'legs'] WHERE type = 'wood';
UPDATE materials SET tags = ARRAY['metal', 'frame', 'legs', 'accent'] WHERE type = 'metal';
UPDATE materials SET tags = ARRAY['glass', 'tabletop', 'surface'] WHERE type = 'glass';
UPDATE materials SET tags = ARRAY['stone', 'tabletop', 'surface', 'premium'] WHERE type = 'stone';

-- Extension to Members Table
-- Add new fields to the members table
-- Run this in your Supabase SQL Editor

-- Update membership_type column to support alphanumeric values (e.g., GM-0202, LM-0204)
-- Increase size from VARCHAR(10) to VARCHAR(50) to accommodate longer membership codes
ALTER TABLE members 
ALTER COLUMN membership_type TYPE VARCHAR(50);

-- ============================================================================
-- MIGRATION: Drop old higher_study column
-- This removes the old single higher_study column that is being replaced
-- with multiple fields: higher_study_1, hs_1_institute, higher_study_2, hs_2_institute
-- ============================================================================
ALTER TABLE members 
DROP COLUMN IF EXISTS higher_study;

-- Add new columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10),
ADD COLUMN IF NOT EXISTS higher_study_1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS hs_1_institute VARCHAR(255),
ADD COLUMN IF NOT EXISTS higher_study_2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS hs_2_institute VARCHAR(255),
ADD COLUMN IF NOT EXISTS school VARCHAR(255),
ADD COLUMN IF NOT EXISTS home_district VARCHAR(255),
ADD COLUMN IF NOT EXISTS organization VARCHAR(255),
ADD COLUMN IF NOT EXISTS position VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(255),
ADD COLUMN IF NOT EXISTS profession VARCHAR(255),
ADD COLUMN IF NOT EXISTS nrb_country VARCHAR(255),
ADD COLUMN IF NOT EXISTS living_in_area VARCHAR(255),
ADD COLUMN IF NOT EXISTS other_club_member VARCHAR(255),
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'members' 
    AND table_schema = 'public'
    AND column_name IN (
        'blood_group',
        'higher_study_1',
        'hs_1_institute',
        'higher_study_2',
        'hs_2_institute',
        'school',
        'home_district',
        'organization',
        'position',
        'department',
        'profession',
        'nrb_country',
        'living_in_area',
        'other_club_member',
        'remarks'
    )
ORDER BY column_name;


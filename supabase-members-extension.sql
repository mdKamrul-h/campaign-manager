-- Extension to Members Table
-- Add new fields to the members table
-- Run this in your Supabase SQL Editor

-- Add new columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10),
ADD COLUMN IF NOT EXISTS higher_study VARCHAR(255),
ADD COLUMN IF NOT EXISTS school VARCHAR(255),
ADD COLUMN IF NOT EXISTS home_district VARCHAR(255),
ADD COLUMN IF NOT EXISTS organization VARCHAR(255),
ADD COLUMN IF NOT EXISTS position VARCHAR(255),
ADD COLUMN IF NOT EXISTS profession VARCHAR(255),
ADD COLUMN IF NOT EXISTS nrb_country VARCHAR(255),
ADD COLUMN IF NOT EXISTS living_in_area VARCHAR(255),
ADD COLUMN IF NOT EXISTS other_club_member VARCHAR(255);

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
        'higher_study',
        'school',
        'home_district',
        'organization',
        'position',
        'profession',
        'nrb_country',
        'living_in_area',
        'other_club_member'
    )
ORDER BY column_name;


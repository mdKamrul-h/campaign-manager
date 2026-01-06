-- ============================================================================
-- ADD NEW FIELDS TO MEMBERS TABLE
-- This script adds: group, roll_no, birthday_month, birthday_day, job_location
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add new columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS "group" VARCHAR(255),
ADD COLUMN IF NOT EXISTS roll_no VARCHAR(255),
ADD COLUMN IF NOT EXISTS birthday_month INTEGER,
ADD COLUMN IF NOT EXISTS birthday_day INTEGER,
ADD COLUMN IF NOT EXISTS job_location VARCHAR(255);

-- Add check constraints for birthday fields
-- Use DO block to check if constraints exist before adding them
DO $$ 
BEGIN
    -- Add birthday_month constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'birthday_month_check'
    ) THEN
        ALTER TABLE members 
        ADD CONSTRAINT birthday_month_check 
        CHECK (birthday_month IS NULL OR (birthday_month >= 1 AND birthday_month <= 12));
    END IF;

    -- Add birthday_day constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'birthday_day_check'
    ) THEN
        ALTER TABLE members 
        ADD CONSTRAINT birthday_day_check 
        CHECK (birthday_day IS NULL OR (birthday_day >= 1 AND birthday_day <= 31));
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'members' 
    AND table_schema = 'public'
    AND column_name IN (
        'group',
        'roll_no',
        'birthday_month',
        'birthday_day',
        'job_location'
    )
ORDER BY column_name;


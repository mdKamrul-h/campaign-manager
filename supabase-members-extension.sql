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

-- ============================================================================
-- UNIQUE CONSTRAINTS FOR DUPLICATE PREVENTION
-- These constraints ensure email and mobile are unique at database level
-- This provides an extra layer of protection beyond application-level checks
-- ============================================================================

-- Add unique constraint on email (if it doesn't exist)
-- This prevents duplicate emails even if application logic fails
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'members_email_unique'
    ) THEN
        ALTER TABLE members ADD CONSTRAINT members_email_unique UNIQUE (email);
        RAISE NOTICE 'Added unique constraint on email column';
    ELSE
        RAISE NOTICE 'Unique constraint on email already exists';
    END IF;
END $$;

-- Add unique constraint on mobile (if it doesn't exist)
-- Note: If multiple people can share the same mobile number, you may want to skip this
-- Uncomment the following block if you want mobile to be unique:
/*
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'members_mobile_unique'
    ) THEN
        ALTER TABLE members ADD CONSTRAINT members_mobile_unique UNIQUE (mobile);
        RAISE NOTICE 'Added unique constraint on mobile column';
    ELSE
        RAISE NOTICE 'Unique constraint on mobile already exists';
    END IF;
END $$;
*/

-- Create indexes for faster duplicate lookups (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_mobile ON members(mobile);

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


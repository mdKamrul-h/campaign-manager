-- ============================================================================
-- DUPLICATE PREVENTION SETUP FOR MEMBERS TABLE
-- Run this in your Supabase SQL Editor to add database-level duplicate protection
-- ============================================================================
-- 
-- This script:
-- 1. Checks for existing duplicate emails/mobiles
-- 2. Adds unique constraints (if no duplicates exist)
-- 3. Creates indexes for faster duplicate lookups
-- 4. Provides a safe way to handle duplicates
--
-- IMPORTANT: If you already have duplicate emails/mobiles in your database,
-- you'll need to clean them up first before running this script.
-- ============================================================================

-- ============================================================================
-- STEP 1: Check for existing duplicates
-- ============================================================================
-- Run these queries first to see if you have duplicates:

-- Check for duplicate emails
SELECT email, COUNT(*) as count
FROM members
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Check for duplicate mobiles
SELECT mobile, COUNT(*) as count
FROM members
GROUP BY mobile
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ============================================================================
-- STEP 2: Clean up duplicates (if any exist)
-- ============================================================================
-- If you have duplicates, you can keep the oldest record and delete others:
-- (Uncomment and modify as needed)

/*
-- Keep the oldest record for each duplicate email
DELETE FROM members
WHERE id NOT IN (
    SELECT MIN(id)
    FROM members
    GROUP BY email
);

-- Keep the oldest record for each duplicate mobile
DELETE FROM members
WHERE id NOT IN (
    SELECT MIN(id)
    FROM members
    GROUP BY mobile
);
*/

-- ============================================================================
-- STEP 3: Add unique constraints (safe - won't fail if already exists)
-- ============================================================================

-- Add unique constraint on email
DO $$ 
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'members_email_unique'
    ) THEN
        -- Check if there are any duplicate emails
        IF NOT EXISTS (
            SELECT email, COUNT(*) as count
            FROM members
            GROUP BY email
            HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE members ADD CONSTRAINT members_email_unique UNIQUE (email);
            RAISE NOTICE '✓ Added unique constraint on email column';
        ELSE
            RAISE NOTICE '⚠ Cannot add unique constraint: Duplicate emails found. Please clean up duplicates first.';
        END IF;
    ELSE
        RAISE NOTICE '✓ Unique constraint on email already exists';
    END IF;
END $$;

-- Add unique constraint on mobile (optional - uncomment if you want mobile to be unique)
-- Note: If multiple people can share the same mobile number, skip this constraint
/*
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'members_mobile_unique'
    ) THEN
        IF NOT EXISTS (
            SELECT mobile, COUNT(*) as count
            FROM members
            GROUP BY mobile
            HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE members ADD CONSTRAINT members_mobile_unique UNIQUE (mobile);
            RAISE NOTICE '✓ Added unique constraint on mobile column';
        ELSE
            RAISE NOTICE '⚠ Cannot add unique constraint: Duplicate mobiles found. Please clean up duplicates first.';
        END IF;
    ELSE
        RAISE NOTICE '✓ Unique constraint on mobile already exists';
    END IF;
END $$;
*/

-- ============================================================================
-- STEP 4: Create/Update indexes for faster lookups
-- ============================================================================

-- Index on email (for fast duplicate checks)
CREATE INDEX IF NOT EXISTS idx_members_email_unique ON members(email);

-- Index on mobile (for fast duplicate checks)
CREATE INDEX IF NOT EXISTS idx_members_mobile_unique ON members(mobile);

-- ============================================================================
-- STEP 5: Verify the setup
-- ============================================================================

-- Check constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'members'::regclass
    AND conname IN ('members_email_unique', 'members_mobile_unique');

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'members'
    AND indexname LIKE '%email%' OR indexname LIKE '%mobile%'
ORDER BY indexname;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. The application code already handles duplicate detection, so this is an
--    extra layer of protection at the database level.
--
-- 2. If a duplicate is attempted to be inserted, PostgreSQL will throw an error.
--    The application code catches this and handles it gracefully.
--
-- 3. The unique constraint on email is recommended.
--    The unique constraint on mobile is optional (uncomment if needed).
--
-- 4. If you have existing duplicates, you must clean them up first before
--    adding the constraints.
-- ============================================================================








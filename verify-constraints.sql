-- ============================================================================
-- VERIFY CONSTRAINTS ON MEMBERS TABLE
-- Run this in your Supabase SQL Editor to check current constraints
-- ============================================================================

-- Check all unique constraints on the members table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'members'::regclass
    AND contype = 'u'  -- 'u' = unique constraint
ORDER BY conname;

-- Check if name has any unique constraint (it should NOT)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'members'::regclass
            AND contype = 'u'
            AND pg_get_constraintdef(oid) LIKE '%name%'
        ) THEN '❌ ERROR: Name has unique constraint (should NOT)'
        ELSE '✅ OK: Name does NOT have unique constraint (allows duplicates)'
    END as name_constraint_status;

-- Verify email and mobile have unique constraints (they SHOULD)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'members'::regclass
            AND conname = 'members_email_unique'
        ) THEN '✅ OK: Email has unique constraint'
        ELSE '⚠️ WARNING: Email does NOT have unique constraint'
    END as email_constraint_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'members'::regclass
            AND conname = 'members_mobile_unique'
        ) THEN '✅ OK: Mobile has unique constraint'
        ELSE '⚠️ WARNING: Mobile does NOT have unique constraint'
    END as mobile_constraint_status;




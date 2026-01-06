-- ============================================
-- FIX FOR RECREATED MEMBERS TABLE
-- ============================================
-- Run this in Supabase SQL Editor after recreating the members table
-- This will ensure all required columns, indexes, and RLS policies are in place

-- ============================================
-- 1. VERIFY AND ADD MISSING COLUMNS
-- ============================================

-- Add name_bangla column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'name_bangla'
    ) THEN
        ALTER TABLE members ADD COLUMN name_bangla VARCHAR(255);
        RAISE NOTICE 'Added name_bangla column to members table';
    ELSE
        RAISE NOTICE 'name_bangla column already exists';
    END IF;
END $$;

-- Add image_url column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE members ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to members table';
    ELSE
        RAISE NOTICE 'image_url column already exists';
    END IF;
END $$;

-- ============================================
-- 2. CREATE INDEXES (if they don't exist)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_members_membership ON members(membership_type);
CREATE INDEX IF NOT EXISTS idx_members_batch ON members(batch);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

-- ============================================
-- 3. CREATE/UPDATE TRIGGERS
-- ============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at 
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to members" ON members;
DROP POLICY IF EXISTS "Allow public insert to members" ON members;
DROP POLICY IF EXISTS "Allow public update to members" ON members;
DROP POLICY IF EXISTS "Allow public delete to members" ON members;

-- Policy: Allow public read access (for viewing members)
CREATE POLICY "Allow public read access to members"
ON members
FOR SELECT
USING (true);

-- Policy: Allow public insert (for adding new members)
CREATE POLICY "Allow public insert to members"
ON members
FOR INSERT
WITH CHECK (true);

-- Policy: Allow public update (for editing members)
CREATE POLICY "Allow public update to members"
ON members
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow public delete (for deleting members)
CREATE POLICY "Allow public delete to members"
ON members
FOR DELETE
USING (true);

-- ============================================
-- 6. VERIFY TABLE STRUCTURE
-- ============================================

-- Check all columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'members' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'members';

-- Check policies exist
SELECT 
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'members';

-- Count members (to verify data is accessible)
SELECT COUNT(*) as total_members FROM members;

-- ============================================
-- DONE!
-- ============================================
-- After running this script:
-- 1. The name_bangla column should be added
-- 2. RLS policies should be in place
-- 3. Indexes should be created
-- 4. Triggers should be working
-- 
-- Try sending a campaign again - it should work now!









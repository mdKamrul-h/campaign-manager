-- Supabase Database Fixes and Updates
-- Run this in your Supabase SQL Editor if you encounter any issues
-- 
-- This file contains fixes for common database issues

-- ============================================
-- 1. FIX MEMBERSHIP_TYPE CONSTRAINT (if needed)
-- ============================================
-- If you want to add back the CHECK constraint for membership_type:
-- ALTER TABLE members DROP CONSTRAINT IF EXISTS members_membership_type_check;
-- ALTER TABLE members ADD CONSTRAINT members_membership_type_check 
--   CHECK (membership_type IN ('GM', 'LM', 'FM', 'OTHER'));

-- Or if you want to keep it flexible (current state), leave it as is.

-- ============================================
-- 2. ENSURE ALL TABLES EXIST
-- ============================================

-- Members Table (with flexible membership_type)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    membership_type VARCHAR(10) NOT NULL,
    batch VARCHAR(50),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    visual_url TEXT,
    custom_visual_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('facebook', 'instagram', 'linkedin', 'whatsapp', 'sms', 'email')),
    target_audience JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Social Connections Table
CREATE TABLE IF NOT EXISTS social_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- Username from auth system
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'whatsapp')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    platform_user_id VARCHAR(255) NOT NULL,
    platform_username VARCHAR(255),
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform) -- One connection per platform per user
);

-- Social Contacts Table
CREATE TABLE IF NOT EXISTS social_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES social_connections(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'whatsapp')),
    contact_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_picture_url TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    metadata JSONB,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, contact_id)
);

-- Campaign Logs Table
CREATE TABLE IF NOT EXISTS campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    content_text TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(50) DEFAULT 'admin'
);

-- ============================================
-- 3. ADD MISSING COLUMNS (if they don't exist)
-- ============================================

-- Add image_url to members if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE members ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Add name_bangla to members if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'name_bangla'
    ) THEN
        ALTER TABLE members ADD COLUMN name_bangla VARCHAR(255);
        RAISE NOTICE 'Added name_bangla column to members table';
    ELSE
        RAISE NOTICE 'name_bangla column already exists in members table';
    END IF;
END $$;

-- Add custom_visual_url to campaigns if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'custom_visual_url'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN custom_visual_url TEXT;
    END IF;
END $$;

-- Add sent_at to campaigns if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add scheduled_at to campaigns if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'scheduled_at'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add user_id to social_connections if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'social_connections' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE social_connections ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'default_user';
        -- Update existing rows (you may want to set actual user IDs)
        -- ALTER TABLE social_connections ALTER COLUMN user_id DROP DEFAULT;
    END IF;
END $$;

-- Add unique constraint for user_id + platform if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'social_connections_user_id_platform_key'
    ) THEN
        ALTER TABLE social_connections ADD CONSTRAINT social_connections_user_id_platform_key 
        UNIQUE(user_id, platform);
    END IF;
END $$;

-- ============================================
-- 4. CREATE INDEXES (if they don't exist)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_members_membership ON members(membership_type);
CREATE INDEX IF NOT EXISTS idx_members_batch ON members(batch);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_channel ON campaigns(channel);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign ON campaign_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON social_connections(platform);
CREATE INDEX IF NOT EXISTS idx_social_contacts_connection ON social_contacts(connection_id);
CREATE INDEX IF NOT EXISTS idx_social_contacts_platform ON social_contacts(platform);

-- ============================================
-- 5. CREATE/UPDATE TRIGGERS
-- ============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
DROP TRIGGER IF EXISTS update_social_connections_updated_at ON social_connections;

-- Create triggers
CREATE TRIGGER update_members_updated_at 
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_connections_updated_at 
    BEFORE UPDATE ON social_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. VERIFY TABLE STRUCTURE
-- ============================================

-- Check all tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_name IN ('members', 'campaigns', 'documents', 'social_connections', 'social_contacts', 'campaign_logs')
ORDER BY table_name;

-- ============================================
-- 7. FIX COMMON DATA ISSUES
-- ============================================

-- Ensure all campaigns have a status
UPDATE campaigns SET status = 'draft' WHERE status IS NULL;

-- Ensure all campaigns have a channel
UPDATE campaigns SET channel = 'email' WHERE channel IS NULL;

-- ============================================
-- NOTES:
-- ============================================
-- 1. This script is idempotent - you can run it multiple times safely
-- 2. It will not delete any existing data
-- 3. It will add missing columns and indexes
-- 4. Run supabase-rls-policies.sql after this to enable RLS






-- Row Level Security (RLS) Policies for Campaign Manager
-- Run this AFTER running supabase-schema.sql
-- This enables RLS and creates policies for secure access

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MEMBERS TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to members" ON members;
DROP POLICY IF EXISTS "Allow service role full access to members" ON members;
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

-- Note: Service role key bypasses RLS automatically, so no separate policy needed

-- ============================================
-- DOCUMENTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access to documents" ON documents;
DROP POLICY IF EXISTS "Allow public insert to documents" ON documents;
DROP POLICY IF EXISTS "Allow public update to documents" ON documents;
DROP POLICY IF EXISTS "Allow public delete to documents" ON documents;

CREATE POLICY "Allow public read access to documents"
ON documents
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to documents"
ON documents
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to documents"
ON documents
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to documents"
ON documents
FOR DELETE
USING (true);

-- ============================================
-- CAMPAIGNS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access to campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow public insert to campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow public update to campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow public delete to campaigns" ON campaigns;

CREATE POLICY "Allow public read access to campaigns"
ON campaigns
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to campaigns"
ON campaigns
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to campaigns"
ON campaigns
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to campaigns"
ON campaigns
FOR DELETE
USING (true);

-- ============================================
-- SOCIAL_CONNECTIONS TABLE POLICIES
-- ============================================
-- Note: These policies allow all operations for now
-- In production, you may want to restrict based on user_id
-- For example: USING (user_id = current_setting('app.user_id', true))

DROP POLICY IF EXISTS "Allow public read access to social_connections" ON social_connections;
DROP POLICY IF EXISTS "Allow public insert to social_connections" ON social_connections;
DROP POLICY IF EXISTS "Allow public update to social_connections" ON social_connections;
DROP POLICY IF EXISTS "Allow public delete to social_connections" ON social_connections;

CREATE POLICY "Allow public read access to social_connections"
ON social_connections
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to social_connections"
ON social_connections
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to social_connections"
ON social_connections
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to social_connections"
ON social_connections
FOR DELETE
USING (true);

-- ============================================
-- SOCIAL_CONTACTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access to social_contacts" ON social_contacts;
DROP POLICY IF EXISTS "Allow public insert to social_contacts" ON social_contacts;
DROP POLICY IF EXISTS "Allow public update to social_contacts" ON social_contacts;
DROP POLICY IF EXISTS "Allow public delete to social_contacts" ON social_contacts;

CREATE POLICY "Allow public read access to social_contacts"
ON social_contacts
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to social_contacts"
ON social_contacts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to social_contacts"
ON social_contacts
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to social_contacts"
ON social_contacts
FOR DELETE
USING (true);

-- ============================================
-- SOCIAL_CONNECTIONS TABLE POLICIES (OLD - REMOVE IF EXISTS)
-- ============================================

DROP POLICY IF EXISTS "Allow public read access to social_connections" ON social_connections;
DROP POLICY IF EXISTS "Allow public insert to social_connections" ON social_connections;
DROP POLICY IF EXISTS "Allow public update to social_connections" ON social_connections;
DROP POLICY IF EXISTS "Allow public delete to social_connections" ON social_connections;

CREATE POLICY "Allow public read access to social_connections"
ON social_connections
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to social_connections"
ON social_connections
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to social_connections"
ON social_connections
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to social_connections"
ON social_connections
FOR DELETE
USING (true);

-- ============================================
-- SOCIAL_CONTACTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access to social_contacts" ON social_contacts;
DROP POLICY IF EXISTS "Allow public insert to social_contacts" ON social_contacts;
DROP POLICY IF EXISTS "Allow public update to social_contacts" ON social_contacts;
DROP POLICY IF EXISTS "Allow public delete to social_contacts" ON social_contacts;

CREATE POLICY "Allow public read access to social_contacts"
ON social_contacts
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to social_contacts"
ON social_contacts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to social_contacts"
ON social_contacts
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to social_contacts"
ON social_contacts
FOR DELETE
USING (true);

-- ============================================
-- CAMPAIGN_LOGS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access to campaign_logs" ON campaign_logs;
DROP POLICY IF EXISTS "Allow public insert to campaign_logs" ON campaign_logs;
DROP POLICY IF EXISTS "Allow public update to campaign_logs" ON campaign_logs;
DROP POLICY IF EXISTS "Allow public delete to campaign_logs" ON campaign_logs;

CREATE POLICY "Allow public read access to campaign_logs"
ON campaign_logs
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to campaign_logs"
ON campaign_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to campaign_logs"
ON campaign_logs
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to campaign_logs"
ON campaign_logs
FOR DELETE
USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('members', 'documents', 'campaigns', 'social_connections', 'social_contacts', 'campaign_logs');

-- List all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


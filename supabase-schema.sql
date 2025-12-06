-- Campaign Manager Database Schema
-- Run this in your Supabase SQL Editor
-- 
-- IMPORTANT: After running this schema, run supabase-rls-policies.sql
-- to enable Row Level Security (RLS) and create security policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members Table
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    membership_type VARCHAR(10) NOT NULL ,
    batch VARCHAR(50),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Social Contacts Table (stores friends/contacts from social platforms)
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

-- Create Indexes for social contacts
CREATE INDEX idx_social_contacts_connection ON social_contacts(connection_id);
CREATE INDEX idx_social_contacts_platform ON social_contacts(platform);

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

-- Create Indexes
CREATE INDEX idx_members_membership ON members(membership_type);
CREATE INDEX idx_members_batch ON members(batch);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_channel ON campaigns(channel);
CREATE INDEX idx_campaign_logs_campaign ON campaign_logs(campaign_id);
CREATE INDEX idx_social_connections_platform ON social_connections(platform);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON social_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO members (name, email, mobile, membership_type, batch) VALUES
    ('John Doe', 'john@example.com', '+1234567890', 'GM', 'Batch2023'),
    ('Jane Smith', 'jane@example.com', '+1234567891', 'LM', 'Batch2022'),
    ('Bob Johnson', 'bob@example.com', '+1234567892', 'FM', 'Batch2023');

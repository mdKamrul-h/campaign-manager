-- Campaign Templates Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS campaign_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('facebook', 'instagram', 'linkedin', 'whatsapp', 'sms', 'email')),
    visual_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaign_templates_channel ON campaign_templates(channel);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_created_at ON campaign_templates(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_campaign_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_templates_updated_at
    BEFORE UPDATE ON campaign_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_templates_updated_at();

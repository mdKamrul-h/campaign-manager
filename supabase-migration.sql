-- Migration script for existing databases
-- Run this if you already have a database and need to update it

-- Add image_url column to members table if it doesn't exist
ALTER TABLE members ADD COLUMN IF NOT EXISTS image_url TEXT;

-- If you have a 'contacts' table that needs to be migrated to 'members'
-- Uncomment and modify the following section:

-- Step 1: Create members table if it doesn't exist (already in schema)
-- Step 2: Migrate data from contacts to members (if needed)
/*
INSERT INTO members (name, email, mobile, membership_type, batch, image_url, created_at, updated_at)
SELECT 
  COALESCE(first_name || ' ' || last_name, first_name, last_name) as name,
  email,
  phone_number as mobile,
  COALESCE((tags->>0)::VARCHAR(10), 'GM') as membership_type,
  (custom_fields->>'batch')::VARCHAR(50) as batch,
  NULL as image_url,
  created_at,
  updated_at
FROM contacts
WHERE NOT EXISTS (
  SELECT 1 FROM members WHERE members.email = contacts.email
);
*/

-- Verify the update
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name = 'image_url';




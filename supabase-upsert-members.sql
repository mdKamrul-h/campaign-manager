-- ============================================================================
-- UPSERT FUNCTION FOR MEMBERS TABLE
-- This function allows updating existing members or inserting new ones
-- based on email or mobile conflicts
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Create or replace function to upsert members
-- This handles conflicts on both email and mobile
CREATE OR REPLACE FUNCTION upsert_member(
    p_name VARCHAR(255),
    p_name_bangla VARCHAR(255),
    p_email VARCHAR(255),
    p_mobile VARCHAR(20),
    p_membership_type VARCHAR(50),
    p_batch VARCHAR(50),
    p_group VARCHAR(255),
    p_roll_no VARCHAR(255),
    p_image_url TEXT,
    p_blood_group VARCHAR(10),
    p_birthday_month INTEGER,
    p_birthday_day INTEGER,
    p_higher_study_1 VARCHAR(255),
    p_hs_1_institute VARCHAR(255),
    p_higher_study_2 VARCHAR(255),
    p_hs_2_institute VARCHAR(255),
    p_school VARCHAR(255),
    p_home_district VARCHAR(255),
    p_organization VARCHAR(255),
    p_position VARCHAR(255),
    p_department VARCHAR(255),
    p_profession VARCHAR(255),
    p_nrb_country VARCHAR(255),
    p_living_in_area VARCHAR(255),
    p_job_location VARCHAR(255),
    p_other_club_member VARCHAR(255),
    p_remarks TEXT
)
RETURNS TABLE(
    id UUID,
    name VARCHAR(255),
    email VARCHAR(255),
    mobile VARCHAR(20),
    updated BOOLEAN
) AS $$
DECLARE
    v_id UUID;
    v_updated BOOLEAN := FALSE;
BEGIN
    -- Try to find existing member by mobile (primary conflict key)
    SELECT m.id INTO v_id
    FROM members m
    WHERE m.mobile = p_mobile
    LIMIT 1;

    -- If found by mobile, update
    IF v_id IS NOT NULL THEN
        UPDATE members SET
            name = p_name,
            name_bangla = COALESCE(p_name_bangla, name_bangla),
            email = p_email,
            membership_type = p_membership_type,
            batch = COALESCE(p_batch, batch),
            "group" = COALESCE(p_group, "group"),
            roll_no = COALESCE(p_roll_no, roll_no),
            image_url = COALESCE(p_image_url, image_url),
            blood_group = COALESCE(p_blood_group, blood_group),
            birthday_month = COALESCE(p_birthday_month, birthday_month),
            birthday_day = COALESCE(p_birthday_day, birthday_day),
            higher_study_1 = COALESCE(p_higher_study_1, higher_study_1),
            hs_1_institute = COALESCE(p_hs_1_institute, hs_1_institute),
            higher_study_2 = COALESCE(p_higher_study_2, higher_study_2),
            hs_2_institute = COALESCE(p_hs_2_institute, hs_2_institute),
            school = COALESCE(p_school, school),
            home_district = COALESCE(p_home_district, home_district),
            organization = COALESCE(p_organization, organization),
            position = COALESCE(p_position, position),
            department = COALESCE(p_department, department),
            profession = COALESCE(p_profession, profession),
            nrb_country = COALESCE(p_nrb_country, nrb_country),
            living_in_area = COALESCE(p_living_in_area, living_in_area),
            job_location = COALESCE(p_job_location, job_location),
            other_club_member = COALESCE(p_other_club_member, other_club_member),
            remarks = COALESCE(p_remarks, remarks),
            updated_at = NOW()
        WHERE id = v_id;
        v_updated := TRUE;
    ELSE
        -- Try to find by email
        SELECT m.id INTO v_id
        FROM members m
        WHERE LOWER(m.email) = LOWER(p_email)
        LIMIT 1;

        -- If found by email, update
        IF v_id IS NOT NULL THEN
            UPDATE members SET
                name = p_name,
                name_bangla = COALESCE(p_name_bangla, name_bangla),
                mobile = p_mobile,
                membership_type = p_membership_type,
                batch = COALESCE(p_batch, batch),
                "group" = COALESCE(p_group, "group"),
                roll_no = COALESCE(p_roll_no, roll_no),
                image_url = COALESCE(p_image_url, image_url),
                blood_group = COALESCE(p_blood_group, blood_group),
                birthday_month = COALESCE(p_birthday_month, birthday_month),
                birthday_day = COALESCE(p_birthday_day, birthday_day),
                higher_study_1 = COALESCE(p_higher_study_1, higher_study_1),
                hs_1_institute = COALESCE(p_hs_1_institute, hs_1_institute),
                higher_study_2 = COALESCE(p_higher_study_2, higher_study_2),
                hs_2_institute = COALESCE(p_hs_2_institute, hs_2_institute),
                school = COALESCE(p_school, school),
                home_district = COALESCE(p_home_district, home_district),
                organization = COALESCE(p_organization, organization),
                position = COALESCE(p_position, position),
                department = COALESCE(p_department, department),
                profession = COALESCE(p_profession, profession),
                nrb_country = COALESCE(p_nrb_country, nrb_country),
                living_in_area = COALESCE(p_living_in_area, living_in_area),
                job_location = COALESCE(p_job_location, job_location),
                other_club_member = COALESCE(p_other_club_member, other_club_member),
                remarks = COALESCE(p_remarks, remarks),
                updated_at = NOW()
            WHERE id = v_id;
            v_updated := TRUE;
        ELSE
            -- Insert new member
            INSERT INTO members (
                name, name_bangla, email, mobile, membership_type, batch, "group", roll_no, image_url,
                blood_group, birthday_month, birthday_day, higher_study_1, hs_1_institute, higher_study_2, hs_2_institute,
                school, home_district, organization, position, department, profession,
                nrb_country, living_in_area, job_location, other_club_member, remarks
            ) VALUES (
                p_name, p_name_bangla, p_email, p_mobile, p_membership_type, p_batch, p_group, p_roll_no, p_image_url,
                p_blood_group, p_birthday_month, p_birthday_day, p_higher_study_1, p_hs_1_institute, p_higher_study_2, p_hs_2_institute,
                p_school, p_home_district, p_organization, p_position, p_department, p_profession,
                p_nrb_country, p_living_in_area, p_job_location, p_other_club_member, p_remarks
            )
            RETURNING id INTO v_id;
            v_updated := FALSE;
        END IF;
    END IF;

    -- Return the result
    RETURN QUERY
    SELECT m.id, m.name, m.email, m.mobile, v_updated
    FROM members m
    WHERE m.id = v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ALTERNATIVE: Simple approach using ON CONFLICT (if you prefer)
-- ============================================================================
-- This approach uses PostgreSQL's native ON CONFLICT clause
-- It's simpler but only handles one conflict key at a time

-- For mobile conflicts:
/*
INSERT INTO members (
    name, name_bangla, email, mobile, membership_type, batch, "group", roll_no, image_url,
    blood_group, birthday_month, birthday_day, higher_study_1, hs_1_institute, higher_study_2, hs_2_institute,
    school, home_district, organization, position, department, profession,
    nrb_country, living_in_area, job_location, other_club_member, remarks
)
VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
)
ON CONFLICT (mobile) DO UPDATE SET
    name = EXCLUDED.name,
    name_bangla = COALESCE(EXCLUDED.name_bangla, members.name_bangla),
    email = EXCLUDED.email,
    membership_type = EXCLUDED.membership_type,
    batch = COALESCE(EXCLUDED.batch, members.batch),
    "group" = COALESCE(EXCLUDED."group", members."group"),
    roll_no = COALESCE(EXCLUDED.roll_no, members.roll_no),
    image_url = COALESCE(EXCLUDED.image_url, members.image_url),
    blood_group = COALESCE(EXCLUDED.blood_group, members.blood_group),
    birthday_month = COALESCE(EXCLUDED.birthday_month, members.birthday_month),
    birthday_day = COALESCE(EXCLUDED.birthday_day, members.birthday_day),
    higher_study_1 = COALESCE(EXCLUDED.higher_study_1, members.higher_study_1),
    hs_1_institute = COALESCE(EXCLUDED.hs_1_institute, members.hs_1_institute),
    higher_study_2 = COALESCE(EXCLUDED.higher_study_2, members.higher_study_2),
    hs_2_institute = COALESCE(EXCLUDED.hs_2_institute, members.hs_2_institute),
    school = COALESCE(EXCLUDED.school, members.school),
    home_district = COALESCE(EXCLUDED.home_district, members.home_district),
    organization = COALESCE(EXCLUDED.organization, members.organization),
    position = COALESCE(EXCLUDED.position, members.position),
    department = COALESCE(EXCLUDED.department, members.department),
    profession = COALESCE(EXCLUDED.profession, members.profession),
    nrb_country = COALESCE(EXCLUDED.nrb_country, members.nrb_country),
    living_in_area = COALESCE(EXCLUDED.living_in_area, members.living_in_area),
    job_location = COALESCE(EXCLUDED.job_location, members.job_location),
    other_club_member = COALESCE(EXCLUDED.other_club_member, members.other_club_member),
    remarks = COALESCE(EXCLUDED.remarks, members.remarks),
    updated_at = NOW();
*/

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. The function approach handles both email and mobile conflicts
-- 2. The ON CONFLICT approach is simpler but only handles one conflict key
-- 3. For bulk imports, the application code will use Supabase's upsert method
--    which is more efficient than calling this function for each row
-- ============================================================================




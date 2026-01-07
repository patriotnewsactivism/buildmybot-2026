-- ============================================
-- Manual Admin Setup SQL
-- Run this in Supabase SQL Editor
-- ============================================

-- This script sets up full admin permissions for:
-- 1. mreardon@wtpnews.org (Master Admin)
-- 2. jadj19@gmail.com (Admin)

-- ============================================
-- STEP 1: Create/Update Admin Users
-- ============================================

-- Insert or update mreardon@wtpnews.org as MasterAdmin
INSERT INTO users (id, email, name, role, plan, status, created_at)
VALUES (
  gen_random_uuid()::text,
  'mreardon@wtpnews.org',
  'mreardon',
  'MasterAdmin',
  'ENTERPRISE',
  'Active',
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'MasterAdmin',
  plan = 'ENTERPRISE',
  status = 'Active';

-- Insert or update jadj19@gmail.com as ADMIN
INSERT INTO users (id, email, name, role, plan, status, created_at)
VALUES (
  gen_random_uuid()::text,
  'jadj19@gmail.com',
  'jadj19',
  'ADMIN',
  'ENTERPRISE',
  'Active',
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'ADMIN',
  plan = 'ENTERPRISE',
  status = 'Active';

-- ============================================
-- STEP 2: Create Organizations for Each Admin
-- ============================================

-- Create organization for mreardon@wtpnews.org
DO $$
DECLARE
  v_user_id TEXT;
  v_org_id TEXT;
  v_member_id TEXT;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'mreardon@wtpnews.org';

  -- Check if organization exists
  SELECT id INTO v_org_id FROM organizations WHERE owner_id = v_user_id;

  IF v_org_id IS NULL THEN
    -- Create new organization
    v_org_id := gen_random_uuid()::text;
    INSERT INTO organizations (id, name, slug, owner_id, plan, subscription_status, settings, created_at, updated_at)
    VALUES (
      v_org_id,
      'WTP News Admin',
      'mreardon-org',
      v_user_id,
      'ENTERPRISE',
      'active',
      '{}',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Created organization for mreardon@wtpnews.org';
  ELSE
    -- Update existing organization
    UPDATE organizations
    SET plan = 'ENTERPRISE',
        subscription_status = 'active',
        updated_at = NOW()
    WHERE id = v_org_id;
    RAISE NOTICE 'Updated organization for mreardon@wtpnews.org';
  END IF;

  -- Link user to organization
  UPDATE users SET organization_id = v_org_id WHERE id = v_user_id;

  -- Create or update organization membership
  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = v_user_id AND organization_id = v_org_id) THEN
    -- Update existing membership
    UPDATE organization_members
    SET role = 'owner',
        permissions = '["*"]'::jsonb
    WHERE user_id = v_user_id AND organization_id = v_org_id;
    RAISE NOTICE 'Updated membership for mreardon@wtpnews.org';
  ELSE
    -- Create new membership
    INSERT INTO organization_members (id, organization_id, user_id, role, permissions, joined_at)
    VALUES (
      gen_random_uuid()::text,
      v_org_id,
      v_user_id,
      'owner',
      '["*"]'::jsonb,
      NOW()
    );
    RAISE NOTICE 'Created membership for mreardon@wtpnews.org';
  END IF;
END $$;

-- Create organization for jadj19@gmail.com
DO $$
DECLARE
  v_user_id TEXT;
  v_org_id TEXT;
  v_member_id TEXT;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'jadj19@gmail.com';

  -- Check if organization exists
  SELECT id INTO v_org_id FROM organizations WHERE owner_id = v_user_id;

  IF v_org_id IS NULL THEN
    -- Create new organization
    v_org_id := gen_random_uuid()::text;
    INSERT INTO organizations (id, name, slug, owner_id, plan, subscription_status, settings, created_at, updated_at)
    VALUES (
      v_org_id,
      'Admin Organization',
      'jadj19-org',
      v_user_id,
      'ENTERPRISE',
      'active',
      '{}',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Created organization for jadj19@gmail.com';
  ELSE
    -- Update existing organization
    UPDATE organizations
    SET plan = 'ENTERPRISE',
        subscription_status = 'active',
        updated_at = NOW()
    WHERE id = v_org_id;
    RAISE NOTICE 'Updated organization for jadj19@gmail.com';
  END IF;

  -- Link user to organization
  UPDATE users SET organization_id = v_org_id WHERE id = v_user_id;

  -- Create or update organization membership
  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = v_user_id AND organization_id = v_org_id) THEN
    -- Update existing membership
    UPDATE organization_members
    SET role = 'owner',
        permissions = '["*"]'::jsonb
    WHERE user_id = v_user_id AND organization_id = v_org_id;
    RAISE NOTICE 'Updated membership for jadj19@gmail.com';
  ELSE
    -- Create new membership
    INSERT INTO organization_members (id, organization_id, user_id, role, permissions, joined_at)
    VALUES (
      gen_random_uuid()::text,
      v_org_id,
      v_user_id,
      'owner',
      '["*"]'::jsonb,
      NOW()
    );
    RAISE NOTICE 'Created membership for jadj19@gmail.com';
  END IF;
END $$;

-- ============================================
-- STEP 3: Verify the Configuration
-- ============================================

SELECT
  u.email,
  u.role AS system_role,
  u.plan AS user_plan,
  u.status,
  o.name AS org_name,
  o.plan AS org_plan,
  o.subscription_status,
  om.role AS org_role,
  om.permissions
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
LEFT JOIN organization_members om ON u.id = om.user_id AND o.id = om.organization_id
WHERE u.email IN ('mreardon@wtpnews.org', 'jadj19@gmail.com')
ORDER BY u.email;

-- You should see both users with:
-- - system_role: MasterAdmin or ADMIN
-- - user_plan: ENTERPRISE
-- - org_name: WTP News Admin or Admin Organization
-- - org_plan: ENTERPRISE
-- - subscription_status: active
-- - org_role: owner
-- - permissions: ["*"]

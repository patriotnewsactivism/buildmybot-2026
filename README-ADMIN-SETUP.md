# Admin Permissions Setup

This document explains how to set admin permissions for users in the BuildMyBot system.

## Overview

The system supports multiple admin levels:
- **MasterAdmin**: Highest level access with full system control
- **ADMIN**: Standard admin access

## Current Admin Configuration

The following users are configured as admins:

1. **mreardon@wtpnews.org** - MasterAdmin role with ENTERPRISE plan
2. **jadj19@gmail.com** - ADMIN role with ENTERPRISE plan

## Quick Setup (Recommended)

**Run the SQL script directly in Supabase:**

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `MANUAL_ADMIN_SETUP.sql`
4. Click "Run"
5. **Log out and log back in** to refresh your session

This is the fastest and most reliable method.

## Alternative: Using the Node.js Script

### Running the Script

To apply these admin permissions programmatically, run:

```bash
npm run set-admin-permissions
```

### What the Script Does

The script will:
1. Connect to the database using the DATABASE_URL environment variable
2. For each configured admin user:
   - Create/update user with admin role and ENTERPRISE plan
   - Create/update organization with ENTERPRISE plan
   - Link user to organization
   - Create/update organization membership with owner role and `["*"]` permissions
3. Verify and display the final admin configuration

### Requirements

- DATABASE_URL must be set in your `.env` or `.env.local` file
- Database must be accessible and properly migrated
- Network connectivity to your database

## IMPORTANT: After Running Either Method

**You MUST log out and log back in** to refresh your session. The admin permissions are stored in your session, so you need to reload the user data.

Steps:
1. Run the SQL script OR the Node.js script
2. **Log out of the application**
3. **Log back in**
4. Your admin permissions should now be active

If you're still seeing "Organization Required" after logging back in, check the verification query output to ensure all fields are set correctly.

## What Gets Configured

For each admin user, the setup ensures:

### 1. User Record
- `role`: MasterAdmin or ADMIN
- `plan`: ENTERPRISE
- `status`: Active
- `organization_id`: Linked to their organization

### 2. Organization Record
- `name`: Descriptive organization name
- `plan`: ENTERPRISE
- `subscription_status`: active
- `owner_id`: User's ID

### 3. Organization Membership
- `role`: owner
- `permissions`: `["*"]` (wildcard for all permissions)

## Troubleshooting

### "Organization Required" Message Still Appears

1. Verify the SQL script ran successfully (check the verification query output)
2. **Log out and log back in** (this is critical!)
3. Clear browser cache if the issue persists
4. Check browser console for errors

### Verification Query

Run this in Supabase SQL Editor to check the current state:

```sql
SELECT
  u.email,
  u.role AS system_role,
  u.plan AS user_plan,
  u.organization_id,
  o.name AS org_name,
  o.plan AS org_plan,
  om.role AS org_role,
  om.permissions
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
LEFT JOIN organization_members om ON u.id = om.user_id AND o.id = om.organization_id
WHERE u.email IN ('mreardon@wtpnews.org', 'jadj19@gmail.com');
```

Expected results:
- `system_role`: MasterAdmin or ADMIN ✓
- `user_plan`: ENTERPRISE ✓
- `organization_id`: Should have a UUID ✓
- `org_name`: Should have a name ✓
- `org_plan`: ENTERPRISE ✓
- `org_role`: owner ✓
- `permissions`: ["*"] ✓

## Admin Permissions in the System

### Role-Based Access

The system uses a three-layer permission model:

1. **User-level roles**: OWNER, ADMIN, RESELLER, CLIENT (and MasterAdmin for system admins)
2. **Organization-level roles**: owner, member
3. **Fine-grained permissions**: Array of permission strings

### Admin Privileges

- **MasterAdmin** and **ADMIN** roles bypass most permission checks (see `server/middleware/auth.ts:137-139`)
- Admins can impersonate users for support purposes
- Admin actions are logged in the audit trail

### Key Files

- `server/middleware/auth.ts` - Authentication and authorization middleware
- `server/routes/admin.ts` - Admin-specific API endpoints
- `shared/schema.ts` - Database schema including users and roles
- `types.ts` - User role enums and interfaces

## Security Notes

- All admin actions are logged in the audit_logs table
- Admin impersonation sessions are time-limited and tracked
- Sensitive operations require additional authentication/authorization

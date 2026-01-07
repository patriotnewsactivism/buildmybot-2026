import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env and .env.local
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}

async function setAdminPermissions() {
  console.log('🔧 Setting admin permissions and organization setup...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found!');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 60,
    idle_timeout: 120,
    max_lifetime: 600
  });

  try {
    // Define the users and their roles
    const adminUsers = [
      {
        email: 'mreardon@wtpnews.org',
        role: 'MasterAdmin',
        description: 'Master Admin',
        plan: 'ENTERPRISE',
        organizationName: 'WTP News Admin'
      },
      {
        email: 'jadj19@gmail.com',
        role: 'ADMIN',
        description: 'Admin',
        plan: 'ENTERPRISE',
        organizationName: 'Admin Organization'
      }
    ];

    console.log('Setting up admin users with full permissions:\n');

    for (const adminConfig of adminUsers) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${adminConfig.email}`);
      console.log('='.repeat(60));

      let userId: string;
      let organizationId: string;

      // Step 1: Check if user exists
      const existingUsers = await sql`
        SELECT id, email, role, name, plan, organization_id
        FROM users
        WHERE email = ${adminConfig.email}
      `;

      if (existingUsers.length === 0) {
        console.log(`\n1️⃣  Creating new user...`);

        // Generate UUID for new user
        const newUserResult = await sql`SELECT gen_random_uuid()::text as id`;
        userId = newUserResult[0].id;

        await sql`
          INSERT INTO users (id, email, name, role, plan, status, created_at)
          VALUES (
            ${userId},
            ${adminConfig.email},
            ${adminConfig.email.split('@')[0]},
            ${adminConfig.role},
            ${adminConfig.plan},
            'Active',
            NOW()
          )
        `;
        console.log(`   ✓ Created user with ID: ${userId}`);
      } else {
        const existingUser = existingUsers[0];
        userId = existingUser.id;
        console.log(`\n1️⃣  Found existing user`);
        console.log(`   ID: ${userId}`);
        console.log(`   Current role: ${existingUser.role || 'None'}`);
        console.log(`   Current plan: ${existingUser.plan || 'None'}`);

        // Update the user's role and plan
        await sql`
          UPDATE users
          SET role = ${adminConfig.role},
              plan = ${adminConfig.plan}
          WHERE id = ${userId}
        `;
        console.log(`   ✓ Updated to: ${adminConfig.role} with ${adminConfig.plan} plan`);
      }

      // Step 2: Check if user has an organization
      const userOrgs = await sql`
        SELECT id, name, slug, plan, owner_id
        FROM organizations
        WHERE owner_id = ${userId}
      `;

      if (userOrgs.length === 0) {
        console.log(`\n2️⃣  Creating organization...`);

        // Generate UUID and slug for organization
        const newOrgResult = await sql`SELECT gen_random_uuid()::text as id`;
        organizationId = newOrgResult[0].id;
        const slug = adminConfig.email.split('@')[0] + '-org';

        await sql`
          INSERT INTO organizations (id, name, slug, owner_id, plan, subscription_status, settings, created_at, updated_at)
          VALUES (
            ${organizationId},
            ${adminConfig.organizationName},
            ${slug},
            ${userId},
            ${adminConfig.plan},
            'active',
            '{}',
            NOW(),
            NOW()
          )
        `;
        console.log(`   ✓ Created organization: ${adminConfig.organizationName}`);
        console.log(`   Organization ID: ${organizationId}`);
      } else {
        organizationId = userOrgs[0].id;
        console.log(`\n2️⃣  Found existing organization`);
        console.log(`   Name: ${userOrgs[0].name}`);
        console.log(`   ID: ${organizationId}`);

        // Update organization plan
        await sql`
          UPDATE organizations
          SET plan = ${adminConfig.plan},
              subscription_status = 'active',
              updated_at = NOW()
          WHERE id = ${organizationId}
        `;
        console.log(`   ✓ Updated organization to ${adminConfig.plan} plan`);
      }

      // Step 3: Link user to organization
      console.log(`\n3️⃣  Updating user's organization link...`);
      await sql`
        UPDATE users
        SET organization_id = ${organizationId}
        WHERE id = ${userId}
      `;
      console.log(`   ✓ Linked user to organization`);

      // Step 4: Check/create organization membership
      const existingMemberships = await sql`
        SELECT id, role, permissions
        FROM organization_members
        WHERE user_id = ${userId} AND organization_id = ${organizationId}
      `;

      if (existingMemberships.length === 0) {
        console.log(`\n4️⃣  Creating organization membership...`);

        const newMemberResult = await sql`SELECT gen_random_uuid()::text as id`;
        const memberId = newMemberResult[0].id;

        await sql`
          INSERT INTO organization_members (id, organization_id, user_id, role, permissions, joined_at)
          VALUES (
            ${memberId},
            ${organizationId},
            ${userId},
            'owner',
            '["*"]'::jsonb,
            NOW()
          )
        `;
        console.log(`   ✓ Created membership with owner role and full permissions ["*"]`);
      } else {
        console.log(`\n4️⃣  Updating organization membership...`);

        await sql`
          UPDATE organization_members
          SET role = 'owner',
              permissions = '["*"]'::jsonb
          WHERE user_id = ${userId} AND organization_id = ${organizationId}
        `;
        console.log(`   ✓ Updated to owner role with full permissions ["*"]`);
      }

      console.log(`\n✅ ${adminConfig.email} setup complete!`);
    }

    // Step 5: Verify the final configuration
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('VERIFICATION - Final Admin Configuration');
    console.log('='.repeat(60));

    const verifyResults = await sql`
      SELECT
        u.email,
        u.role,
        u.plan as user_plan,
        u.status,
        o.name as org_name,
        o.plan as org_plan,
        o.subscription_status,
        om.role as org_role,
        om.permissions
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN organization_members om ON u.id = om.user_id AND o.id = om.organization_id
      WHERE u.email IN ('mreardon@wtpnews.org', 'jadj19@gmail.com')
      ORDER BY u.email
    `;

    verifyResults.forEach(user => {
      console.log(`\nUser: ${user.email}`);
      console.log(`├─ System Role: ${user.role}`);
      console.log(`├─ User Plan: ${user.user_plan}`);
      console.log(`├─ Status: ${user.status}`);
      console.log(`├─ Organization: ${user.org_name || 'None'}`);
      console.log(`├─ Organization Plan: ${user.org_plan || 'None'}`);
      console.log(`├─ Subscription: ${user.subscription_status || 'None'}`);
      console.log(`├─ Org Role: ${user.org_role || 'None'}`);
      console.log(`└─ Permissions: ${JSON.stringify(user.permissions) || 'None'}`);
    });

    console.log('\n\n✅ All admin permissions and organizations set successfully!');

  } catch (error) {
    console.error('\n❌ Failed to set admin permissions:');
    console.error('Error:', error);
    console.error('Error message:', (error as Error).message);
    console.error('Error stack:', (error as Error).stack);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('\n📡 Connection closed');
  }
}

setAdminPermissions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

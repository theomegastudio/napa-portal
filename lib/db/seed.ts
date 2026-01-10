import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { organizations, users } from './schema';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

// Create db connection with loaded env
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

// NAPA member organizations
const ORGANIZATIONS = [
  'National APIDA Panhellenic Association', // Must be first - required for NAPA admins (napahq.org)
  'alpha Kappa Delta Phi International Sorority, Inc.',
  'Alpha Phi Gamma National Sorority, Inc.',
  'Alpha Sigma Rho National Sorority, Inc.',
  'Chi Sigma Tau National Fraternity, Inc.',
  'Delta Epsilon Psi National Fraternity, Inc.',
  'Delta Kappa Delta National Sorority, Inc.',
  'Delta Phi Lambda National Sorority, Inc.',
  'Delta Phi Omega National Sorority, Inc.',
  'Delta Sigma Iota National Fraternity, Inc.',
  'Iota Nu Delta National Fraternity, Inc.',
  'Kappa Phi Gamma National Sorority, Inc.',
  'Kappa Phi Lambda National Sorority, Inc.',
  'Kappa Pi Beta National Fraternity, Inc.',
  'Lambda Phi Epsilon International Fraternity, Inc.',
  'Pi Delta Psi National Fraternity, Inc.',
  'Sigma Beta Rho National Fraternity, Inc.',
  'Sigma Psi Zeta National Sorority, Inc.',
  'Sigma Sigma Rho National Sorority, Inc.',
];

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // 1. Create all organizations
  console.log('Creating organizations...');
  for (const orgName of ORGANIZATIONS) {
    const result = await db
      .insert(organizations)
      .values({ organizationName: orgName })
      .onConflictDoNothing()
      .returning();

    if (result.length > 0) {
      console.log(`  ✓ ${orgName}`);
    }
  }
  console.log(`  Total: ${ORGANIZATIONS.length} organizations\n`);

  // 2. Create NAPA admin user
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminId = randomUUID();

  try {
    await db.insert(users).values({
      id: adminId,
      email: 'admin@napavalleyregister.com',
      name: 'NAPA Admin',
      password: adminPassword,
      organizationName: 'National APIDA Panhellenic Association',
      isAdmin: true,
      approvalStatus: 'approved',
      emailVerified: new Date(),
      lastOtpVerifiedAt: new Date(),
    });
    console.log('  ✓ Created NAPA admin user');
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      console.log('  ⏭ NAPA admin user already exists');
    } else {
      throw error;
    }
  }

  console.log('\n✅ Seed completed!\n');
  console.log('Login credentials:');
  console.log('  Email: admin@napavalleyregister.com');
  console.log('  Password: admin123');
  console.log('\n⚠️  Change this password after first login!\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

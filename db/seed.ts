/**
 * Database Seeding
 * Pre-populates essential data for development and first run.
 */

import { getDb } from '../api/queries/connection';
import { exercises, operators, detectionRules } from './schema';

async function seed() {
  const db = getDb();
  console.log('🌱 Seeding database...');

  // Seed default operators
  await db.insert(operators).values([
    {
      displayName: 'Sanctuary Admin',
      email: 'admin@kryptonite.local',
      hardwareKey: 'admin-key-placeholder',
      role: 'ADMIN',
    },
    {
      displayName: 'Red Team Lead',
      email: 'red@kryptonite.local',
      hardwareKey: 'red-key-placeholder',
      role: 'RED_OPERATOR',
    },
    {
      displayName: 'Blue Team Lead',
      email: 'blue@kryptonite.local',
      hardwareKey: 'blue-key-placeholder',
      role: 'BLUE_ANALYST',
    },
  ]);
  console.log('✓ Seeded operators');

  // Seed sample detection rules
  await db.insert(detectionRules).values([
    {
      name: 'Kerberoasting Detection',
      description: 'Detects potential Kerberoasting attempts',
      type: 'SIGMA',
      content: `title: Kerberoasting\nlogsource:\n  product: windows\n  service: security\ndetection:\n  selection:\n    EventID: 4769\n  condition: selection`,
      techniqueId: 'T1558.003',
      tactic: 'Credential Access',
    },
    {
      name: 'DCSync Detection',
      description: 'Detects DCSync replication abuse',
      type: 'SIGMA',
      content: `title: DCSync\nlogsource:\n  product: windows\n  service: security\ndetection:\n  selection:\n    EventID: 4662\n  condition: selection`,
      techniqueId: 'T1003.006',
      tactic: 'Credential Access',
    },
  ]);
  console.log('✓ Seeded detection rules');

  // Seed sample exercise template
  await db.insert(exercises).values([
    {
      name: 'Tier 1: AD Basics',
      description: 'Introduction to Active Directory attack and defense',
      scenarioId: 'tier-1-ad-basics',
      status: 'DRAFT',
      scopeConfig: {
        ipRanges: ['192.168.10.0/24'],
        vlans: [10, 20],
        techniqueClasses: ['T1003', 'T1558'],
        timeWindow: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    },
  ]);
  console.log('✓ Seeded exercise template');

  console.log('✅ Seeding complete!');
}

seed().catch(console.error);

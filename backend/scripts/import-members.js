import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import prismaPkg from '@prisma/client';
const {
  PrismaClient,
  AttendanceSessionCategory,
  AttendanceStatus,
  Gender,
  MembershipStatus
} = prismaPkg;

const prisma = new PrismaClient();
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const dataDir = path.resolve(scriptDir, '../data-import');

function readCsv(fileName) {
  const filePath = path.join(dataDir, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true
  });
}

function clean(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function parseOptionalDate(value) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapGender(value) {
  const normalized = (clean(value) || '').toUpperCase();
  if (normalized === 'MALE') return Gender.MALE;
  if (normalized === 'FEMALE') return Gender.FEMALE;
  return Gender.UNKNOWN;
}

function mapMembershipStatus(value) {
  const normalized = (clean(value) || '').toUpperCase();
  if (normalized === 'ACTIVE') return MembershipStatus.ACTIVE;
  if (normalized === 'DORMANT') return MembershipStatus.DORMANT;
  if (normalized === 'IRREGULAR') return MembershipStatus.IRREGULAR;
  if (normalized === 'ARCHIVED') return MembershipStatus.ARCHIVED;
  return MembershipStatus.ACTIVE;
}

async function seedDemoAttendance() {
  const existing = await prisma.attendanceSession.count();
  if (existing > 0) {
    console.log('Attendance sessions already exist; skipping demo attendance seed.');
    return;
  }

  const members = await prisma.member.findMany({
    where: {
      membershipStatus: { in: [MembershipStatus.ACTIVE, MembershipStatus.IRREGULAR] }
    },
    orderBy: { fullName: 'asc' },
    take: 60,
    select: { id: true, fullName: true }
  });

  if (!members.length) {
    console.log('No members available for attendance demo seed.');
    return;
  }

  const event = await prisma.event.create({
    data: {
      title: 'Sunday Worship Service',
      ministry: 'Main Service',
      startsAt: new Date(),
      location: 'Main Sanctuary'
    }
  });

  const sessionBlueprints = [
    {
      title: 'Sunday Worship — Week 1',
      category: AttendanceSessionCategory.SUNDAY_SERVICE,
      serviceDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Sunday Worship — Week 2',
      category: AttendanceSessionCategory.SUNDAY_SERVICE,
      serviceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Sunday Worship — This Week',
      category: AttendanceSessionCategory.SUNDAY_SERVICE,
      serviceDate: new Date()
    }
  ];

  for (const [sessionIndex, blueprint] of sessionBlueprints.entries()) {
    const session = await prisma.attendanceSession.create({
      data: {
        title: blueprint.title,
        category: blueprint.category,
        serviceDate: blueprint.serviceDate,
        eventId: event.id,
        createdBy: 'seed'
      }
    });

    const records = members.slice(0, 35 + sessionIndex * 5).map((member, index) => {
      let status = AttendanceStatus.PRESENT;
      if (index % 11 === 0) status = AttendanceStatus.LATE;
      if (index % 13 === 0) status = AttendanceStatus.VISITOR;
      if (index % 7 === 0) status = AttendanceStatus.ABSENT;
      if (index < 20 + sessionIndex * 8) status = index % 9 === 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

      return {
        sessionId: session.id,
        memberId: member.id,
        attendedOn: blueprint.serviceDate,
        status,
        checkInTime: status === AttendanceStatus.ABSENT ? null : new Date(blueprint.serviceDate.getTime() + (index + 1) * 60000)
      };
    });

    await prisma.attendanceRecord.createMany({
      data: records,
      skipDuplicates: true
    });
  }

  console.log('Seeded demo attendance sessions and records.');
}

async function main() {
  const households = readCsv('church_households_import.csv');
  const members = readCsv('church_members_import.csv');

  console.log(`Importing ${households.length} households...`);

  for (const row of households) {
    await prisma.household.upsert({
      where: {
        externalHouseholdId: row.household_id
      },
      update: {
        householdName: clean(row.household_name),
        addressFull: clean(row.address_full),
        postcode: clean(row.postcode)
      },
      create: {
        externalHouseholdId: row.household_id,
        householdName: clean(row.household_name),
        addressFull: clean(row.address_full),
        postcode: clean(row.postcode)
      }
    });
  }

  const householdMap = new Map();
  const dbHouseholds = await prisma.household.findMany({
    select: {
      id: true,
      externalHouseholdId: true
    }
  });

  dbHouseholds.forEach((household) => {
    householdMap.set(household.externalHouseholdId, household.id);
  });

  console.log(`Importing ${members.length} members...`);

  for (const row of members) {
    await prisma.member.upsert({
      where: {
        externalMemberId: row.external_member_id
      },
      update: {
        title: clean(row.title),
        firstName: clean(row.first_name),
        middleName: clean(row.middle_name),
        lastName: clean(row.last_name),
        fullName: row.full_name,
        dateOfBirth: parseOptionalDate(row.date_of_birth),
        gender: mapGender(row.gender),
        contactPreference: clean(row.contact_preference),
        phoneNumber: clean(row.phone_number),
        email: clean(row.email),
        membershipStatus: mapMembershipStatus(row.membership_status),
        joinDate: parseOptionalDate(row.join_date),
        householdId: householdMap.get(row.household_id) || null,
        addressFull: clean(row.address_full),
        postcode: clean(row.postcode),
        needsReview: String(row.needs_review).toLowerCase() === 'true',
        dataQualityNotes: clean(row.data_quality_notes)
      },
      create: {
        externalMemberId: row.external_member_id,
        title: clean(row.title),
        firstName: clean(row.first_name),
        middleName: clean(row.middle_name),
        lastName: clean(row.last_name),
        fullName: row.full_name,
        dateOfBirth: parseOptionalDate(row.date_of_birth),
        gender: mapGender(row.gender),
        contactPreference: clean(row.contact_preference),
        phoneNumber: clean(row.phone_number),
        email: clean(row.email),
        membershipStatus: mapMembershipStatus(row.membership_status),
        joinDate: parseOptionalDate(row.join_date),
        householdId: householdMap.get(row.household_id) || null,
        addressFull: clean(row.address_full),
        postcode: clean(row.postcode),
        needsReview: String(row.needs_review).toLowerCase() === 'true',
        dataQualityNotes: clean(row.data_quality_notes)
      }
    });
  }

  await seedDemoAttendance();
  console.log('Import complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import prismaPkg from '@prisma/client';
const { AttendanceSessionCategory, AttendanceStatus } = prismaPkg;
import { z } from 'zod';
import { logAuditEvent } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { parseOptionalDate } from '../utils/parseDate.js';

const categoryValues = Object.values(AttendanceSessionCategory);
const statusValues = Object.values(AttendanceStatus);

const createSessionSchema = z.object({
  title: z.string().trim().min(1),
  serviceDate: z.string().trim().min(1),
  category: z.enum(categoryValues).default('OTHER'),
  customCategory: z.string().trim().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal(''))
});

const recordSchema = z.object({
  memberId: z.string().trim().min(1),
  status: z.enum(statusValues),
  notes: z.string().optional().or(z.literal(''))
});

const bulkSchema = z.object({
  records: z.array(recordSchema).min(1)
});

function toDisplayCount(records) {
  return records.filter((record) => ['PRESENT', 'LATE', 'VISITOR'].includes(record.status)).length;
}

export async function listAttendanceSessions(req, res) {
  const data = await prisma.attendanceSession.findMany({
    include: {
      _count: {
        select: { records: true }
      }
    },
    orderBy: { serviceDate: 'desc' },
    take: 25
  });

  const decorated = await Promise.all(
    data.map(async (session) => {
      const presentCount = await prisma.attendanceRecord.count({
        where: {
          sessionId: session.id,
          status: { in: ['PRESENT', 'LATE', 'VISITOR'] }
        }
      });

      return {
        ...session,
        presentCount
      };
    })
  );

  res.json({ data: decorated });
}

export async function getAttendanceSession(req, res) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: req.params.id },
    include: {
      records: {
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              externalMemberId: true,
              membershipStatus: true,
              phoneNumber: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!session) {
    return res.status(404).json({ error: 'Attendance session not found' });
  }

  const records = [...session.records].sort((a, b) => a.member.fullName.localeCompare(b.member.fullName));

  res.json({
    ...session,
    records,
    summary: {
      totalRecords: records.length,
      countedPresent: toDisplayCount(records),
      absentCount: records.filter((record) => record.status === 'ABSENT').length,
      lateCount: records.filter((record) => record.status === 'LATE').length,
      visitorCount: records.filter((record) => record.status === 'VISITOR').length
    }
  });
}

export async function createAttendanceSession(req, res) {
  const payload = createSessionSchema.parse(req.body);
  const serviceDate = parseOptionalDate(payload.serviceDate);
  const customCategory = payload.category === 'OTHER' ? payload.customCategory?.trim() || null : null;

  if (!serviceDate) {
    return res.status(400).json({ error: 'serviceDate must be a valid date' });
  }

  if (payload.category === 'OTHER' && !customCategory) {
    return res.status(400).json({ error: 'Enter a custom category name or choose a predefined category' });
  }

  const session = await prisma.attendanceSession.create({
    data: {
      title: payload.title,
      category: payload.category,
      customCategory,
      serviceDate,
      notes: payload.notes || null,
      createdBy: 'system'
    }
  });

  await logAuditEvent(req, {
    action: 'ATTENDANCE_SESSION_CREATED',
    entityType: 'AttendanceSession',
    entityId: session.id,
    summary: `Created attendance session ${session.title}`,
    metadata: {
      category: session.category,
      customCategory: session.customCategory
    }
  });

  res.status(201).json(session);
}

export async function markAttendance(req, res) {
  const payload = recordSchema.parse(req.body);
  const session = await prisma.attendanceSession.findUnique({
    where: { id: req.params.id },
    select: { id: true, serviceDate: true }
  });

  if (!session) {
    return res.status(404).json({ error: 'Attendance session not found' });
  }

  const member = await prisma.member.findUnique({
    where: { id: payload.memberId },
    select: {
      id: true,
      assignedLeaderUserId: true
    }
  });

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  if (req.user?.role === 'MINISTRY_LEADER' && member.assignedLeaderUserId !== req.user.sub) {
    return res.status(403).json({ error: 'Ministry leaders can only mark attendance for members assigned to them' });
  }

  const record = await prisma.attendanceRecord.upsert({
    where: {
      sessionId_memberId: {
        sessionId: session.id,
        memberId: payload.memberId
      }
    },
    update: {
      status: payload.status,
      notes: payload.notes || null,
      checkInTime: payload.status === 'ABSENT' ? null : new Date()
    },
    create: {
      sessionId: session.id,
      memberId: payload.memberId,
      attendedOn: session.serviceDate,
      status: payload.status,
      notes: payload.notes || null,
      checkInTime: payload.status === 'ABSENT' ? null : new Date()
    },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          externalMemberId: true
        }
      }
    }
  });

  await logAuditEvent(req, {
    action: 'ATTENDANCE_MARKED',
    entityType: 'AttendanceSession',
    entityId: session.id,
    summary: `Marked attendance for member ${payload.memberId} as ${payload.status}`,
    metadata: {
      memberId: payload.memberId,
      status: payload.status
    }
  });

  res.json(record);
}

export async function bulkMarkAttendance(req, res) {
  const payload = bulkSchema.parse(req.body);
  const session = await prisma.attendanceSession.findUnique({
    where: { id: req.params.id },
    select: { id: true, serviceDate: true }
  });

  if (!session) {
    return res.status(404).json({ error: 'Attendance session not found' });
  }

  if (req.user?.role === 'MINISTRY_LEADER') {
    const assignedMembers = await prisma.member.findMany({
      where: {
        id: {
          in: payload.records.map((record) => record.memberId)
        }
      },
      select: {
        id: true,
        assignedLeaderUserId: true
      }
    });

    const hasUnassignedRecord = assignedMembers.some((member) => member.assignedLeaderUserId !== req.user.sub);

    if (hasUnassignedRecord) {
      return res.status(403).json({ error: 'Ministry leaders can only bulk mark attendance for members assigned to them' });
    }
  }

  for (const record of payload.records) {
    await prisma.attendanceRecord.upsert({
      where: {
        sessionId_memberId: {
          sessionId: session.id,
          memberId: record.memberId
        }
      },
      update: {
        status: record.status,
        notes: record.notes || null,
        checkInTime: record.status === 'ABSENT' ? null : new Date()
      },
      create: {
        sessionId: session.id,
        memberId: record.memberId,
        attendedOn: session.serviceDate,
        status: record.status,
        notes: record.notes || null,
        checkInTime: record.status === 'ABSENT' ? null : new Date()
      }
    });
  }

  const refreshed = await prisma.attendanceRecord.count({
    where: { sessionId: session.id }
  });

  await logAuditEvent(req, {
    action: 'ATTENDANCE_BULK_MARKED',
    entityType: 'AttendanceSession',
    entityId: session.id,
    summary: `Bulk updated attendance for session ${session.id}`,
    metadata: {
      updated: payload.records.length,
      totalRecords: refreshed
    }
  });

  res.json({ ok: true, updated: payload.records.length, totalRecords: refreshed });
}

export async function memberAttendanceHistory(req, res) {
  const member = await prisma.member.findUnique({
    where: { id: req.params.memberId },
    select: { id: true, fullName: true }
  });

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { memberId: req.params.memberId },
    include: {
      session: true
    },
    orderBy: { attendedOn: 'desc' },
    take: 50
  });

  res.json({ member, data: records });
}

export async function resetAttendance(req, res) {
  const deleted = await prisma.attendanceSession.deleteMany({});

  await logAuditEvent(req, {
    action: 'ATTENDANCE_RESET',
    entityType: 'AttendanceSession',
    summary: 'Reset all attendance sessions and records',
    metadata: {
      deletedSessions: deleted.count
    }
  });

  res.json({
    ok: true,
    deletedSessions: deleted.count,
    deletedRecords: 'Cascade deleted with sessions'
  });
}

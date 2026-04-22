import { prisma } from '../lib/prisma.js';

function formatCurrencyGBP(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(Number(value || 0));
}

export async function dashboardReport(req, res) {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const canViewGiving = req.user?.role === 'PASTOR';

  const [totalMembers, totalHouseholds, groupedStatuses, latestSession, currentMonthGiving, attendanceSessions, members, attendanceHistory] = await Promise.all([
    prisma.member.count(),
    prisma.household.count(),
    prisma.member.groupBy({
      by: ['membershipStatus'],
      _count: { membershipStatus: true }
    }),
    prisma.attendanceSession.findFirst({
      orderBy: { serviceDate: 'desc' },
      select: { id: true, serviceDate: true, title: true }
    }),
    prisma.givingRecord.aggregate({
      _sum: { amount: true },
      where: {
        donatedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    prisma.attendanceSession.count(),
    prisma.member.findMany({
      where: {
        membershipStatus: {
          not: 'ARCHIVED'
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        membershipStatus: true,
        joinDate: true,
        needsReview: true,
        dataQualityNotes: true,
        visitorFollowUpStatus: true,
        visitorFirstServiceDate: true
      }
    }),
    prisma.attendanceRecord.groupBy({
      by: ['memberId'],
      where: {
        status: {
          in: ['PRESENT', 'LATE', 'VISITOR']
        }
      },
      _max: {
        attendedOn: true
      }
    })
  ]);

  const statusCounts = {
    ACTIVE: 0,
    DORMANT: 0,
    IRREGULAR: 0,
    ARCHIVED: 0
  };

  groupedStatuses.forEach((row) => {
    statusCounts[row.membershipStatus] = row._count.membershipStatus;
  });

  let latestAttendanceCount = 0;
  if (latestSession?.id) {
    latestAttendanceCount = await prisma.attendanceRecord.count({
      where: {
        sessionId: latestSession.id,
        status: { in: ['PRESENT', 'LATE', 'VISITOR'] }
      }
    });
  }

  const lastAttendanceByMember = new Map(
    attendanceHistory.map((row) => [row.memberId, row._max.attendedOn || null])
  );

  const membersMissingTwoWeeks = members
    .filter((member) => !member.dataQualityNotes?.startsWith('Visitor registration'))
    .map((member) => {
      const lastAttendedAt = lastAttendanceByMember.get(member.id) || null;
      return {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        phoneNumber: member.phoneNumber,
        membershipStatus: member.membershipStatus,
        joinDate: member.joinDate,
        lastAttendedAt,
        daysSinceAttendance: lastAttendedAt
          ? Math.floor((Date.now() - new Date(lastAttendedAt).getTime()) / (1000 * 60 * 60 * 24))
          : null
      };
    })
    .filter((member) => !member.lastAttendedAt || new Date(member.lastAttendedAt) < twoWeeksAgo)
    .sort((a, b) => {
      if (!a.lastAttendedAt && !b.lastAttendedAt) return a.fullName.localeCompare(b.fullName);
      if (!a.lastAttendedAt) return -1;
      if (!b.lastAttendedAt) return 1;
      return new Date(a.lastAttendedAt) - new Date(b.lastAttendedAt);
    });

  const guestFollowUpPendingCount = members.filter((member) => {
    if (!member.visitorFollowUpStatus) return false;
    return !['JOINED', 'CLOSED'].includes(member.visitorFollowUpStatus);
  }).length;

  res.json({
    totalMembers,
    totalHouseholds,
    attendanceSessions,
    statusCounts,
    latestAttendanceDate: latestSession?.serviceDate || null,
    latestAttendanceTitle: latestSession?.title || null,
    latestAttendanceCount,
    guestFollowUpPendingCount,
    twoWeekAttendanceThreshold: twoWeeksAgo.toISOString(),
    membersMissingTwoWeeksCount: membersMissingTwoWeeks.length,
    membersMissingTwoWeeks: membersMissingTwoWeeks.slice(0, 12),
    givingThisMonth: canViewGiving ? currentMonthGiving._sum.amount || 0 : null,
    givingThisMonthFormatted: canViewGiving ? formatCurrencyGBP(currentMonthGiving._sum.amount || 0) : null,
    canViewGiving
  });
}

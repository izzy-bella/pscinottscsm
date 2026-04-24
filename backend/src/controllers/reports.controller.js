import { prisma } from '../lib/prisma.js';

function formatCurrencyGBP(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(Number(value || 0));
}

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = value.getDate() - day + (day === 0 ? -6 : 1);
  value.setDate(diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function dashboardReport(req, res) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const thisMonthStart = startOfMonth(now);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const canViewGiving = req.user?.role === 'PASTOR';

  const [
    totalMembers,
    totalHouseholds,
    groupedStatuses,
    currentMonthGiving,
    attendanceSessions,
    members,
    attendanceHistory,
    recentSessions,
    leaderWorkloads
  ] = await Promise.all([
    prisma.member.count(),
    prisma.household.count(),
    prisma.member.groupBy({
      by: ['membershipStatus'],
      _count: { membershipStatus: true }
    }),
    prisma.givingRecord.aggregate({
      _sum: { amount: true },
      where: {
        donatedAt: {
          gte: thisMonthStart
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
        addressFull: true,
        householdId: true,
        assignedLeaderUserId: true,
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
    }),
    prisma.attendanceSession.findMany({
      orderBy: { serviceDate: 'desc' },
      take: 8,
      select: {
        id: true,
        serviceDate: true,
        title: true,
        category: true,
        customCategory: true,
        records: {
          where: {
            status: {
              in: ['PRESENT', 'LATE', 'VISITOR']
            }
          },
          select: {
            id: true,
            status: true
          }
        }
      }
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MINISTRY_LEADER']
        }
      },
      orderBy: {
        fullName: 'asc'
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        _count: {
          select: {
            shepherdMembers: true
          }
        }
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

  const latestSession = recentSessions[0] || null;
  const previousSession = recentSessions[1] || null;
  const latestAttendanceCount = latestSession?.records?.length || 0;
  const previousAttendanceCount = previousSession?.records?.length || 0;

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

  const guestFollowUpPending = members.filter((member) => {
    if (!member.visitorFollowUpStatus) return false;
    return !['JOINED', 'CLOSED'].includes(member.visitorFollowUpStatus);
  });

  const firstTimeVisitorsThisWeek = members.filter((member) => (
    member.visitorFirstServiceDate && new Date(member.visitorFirstServiceDate) >= thisWeekStart
  )).length;

  const firstTimeVisitorsThisMonth = members.filter((member) => (
    member.visitorFirstServiceDate && new Date(member.visitorFirstServiceDate) >= thisMonthStart
  )).length;

  const newMembersThisMonth = members.filter((member) => (
    member.joinDate && new Date(member.joinDate) >= thisMonthStart
  )).length;

  const membersMissingContactCount = members.filter((member) => !member.phoneNumber && !member.email).length;
  const membersMissingHouseholdCount = members.filter((member) => !member.householdId && !member.addressFull).length;
  const unassignedMembersCount = members.filter((member) => (
    member.membershipStatus !== 'ARCHIVED'
    && !member.assignedLeaderUserId
    && !member.dataQualityNotes?.startsWith('Visitor registration')
  )).length;

  const visitorFollowUpFunnel = ['NEW', 'CONTACT_ATTEMPTED', 'CONTACTED', 'WELCOMED', 'JOINED', 'CLOSED'].map((status) => ({
    status,
    count: members.filter((member) => member.visitorFollowUpStatus === status).length
  }));

  const attendanceTrend = [...recentSessions]
    .reverse()
    .map((session) => ({
      id: session.id,
      title: session.title,
      serviceDate: session.serviceDate,
      label: new Date(session.serviceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      attendedCount: session.records.length,
      visitorCount: session.records.filter((record) => record.status === 'VISITOR').length
    }));

  const leaderCoverage = leaderWorkloads
    .map((leader) => ({
      id: leader.id,
      fullName: leader.fullName,
      role: leader.role,
      memberCount: leader._count.shepherdMembers
    }))
    .sort((a, b) => b.memberCount - a.memberCount || a.fullName.localeCompare(b.fullName));

  res.json({
    totalMembers,
    totalHouseholds,
    attendanceSessions,
    statusCounts,
    latestAttendanceDate: latestSession?.serviceDate || null,
    latestAttendanceTitle: latestSession?.title || null,
    latestAttendanceCount,
    previousAttendanceTitle: previousSession?.title || null,
    previousAttendanceCount,
    attendanceDelta: latestAttendanceCount - previousAttendanceCount,
    guestFollowUpPendingCount: guestFollowUpPending.length,
    firstTimeVisitorsThisWeek,
    firstTimeVisitorsThisMonth,
    newMembersThisMonth,
    membersMissingContactCount,
    membersMissingHouseholdCount,
    unassignedMembersCount,
    twoWeekAttendanceThreshold: twoWeeksAgo.toISOString(),
    membersMissingTwoWeeksCount: membersMissingTwoWeeks.length,
    membersMissingTwoWeeks: membersMissingTwoWeeks.slice(0, 12),
    visitorFollowUpFunnel,
    attendanceTrend,
    leaderCoverage: leaderCoverage.slice(0, 8),
    givingThisMonth: canViewGiving ? currentMonthGiving._sum.amount || 0 : null,
    givingThisMonthFormatted: canViewGiving ? formatCurrencyGBP(currentMonthGiving._sum.amount || 0) : null,
    canViewGiving
  });
}

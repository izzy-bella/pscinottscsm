import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prismaPkg from '@prisma/client';
const { Gender, MembershipStatus } = prismaPkg;
import { z } from 'zod';
import { logAuditEvent } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { parseOptionalDate } from '../utils/parseDate.js';

const memberStatusValues = Object.values(MembershipStatus);
const genderValues = Object.values(Gender);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.resolve(__dirname, '../../uploads');

const baseMemberSchema = z.object({
  externalMemberId: z.string().trim().optional().or(z.literal('')),
  fullName: z.string().trim().min(1),
  email: z.string().email().optional().or(z.literal('')).or(z.null()),
  phoneNumber: z.string().trim().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(genderValues).default('UNKNOWN'),
  membershipStatus: z.enum(memberStatusValues).default('ACTIVE'),
  isLeader: z.boolean().optional().default(false),
  fellowshipType: z.string().trim().optional().or(z.literal('')),
  fellowshipName: z.string().trim().optional().or(z.literal('')),
  leadershipRole: z.string().trim().optional().or(z.literal('')),
  basontaCategory: z.string().trim().optional().or(z.literal('')),
  addressFull: z.string().trim().optional().or(z.literal('')),
  contactPreference: z.string().trim().optional().or(z.literal('')),
  joinDate: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  postcode: z.string().trim().optional().or(z.literal(''))
});

const createMemberSchema = baseMemberSchema;
const updateMemberSchema = baseMemberSchema.partial();

const uploadSchema = z.object({
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().optional().or(z.literal('')),
  dataUrl: z.string().trim().min(1),
  category: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal(''))
});

const memberNoteSchema = z.object({
  title: z.string().trim().optional().or(z.literal('')),
  body: z.string().trim().min(1),
  createdBy: z.string().trim().optional().or(z.literal(''))
});

const visitorSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().email().optional().or(z.literal('')).or(z.null()),
  phoneNumber: z.string().trim().optional().or(z.literal('')),
  addressFull: z.string().trim().optional().or(z.literal('')),
  postcode: z.string().trim().optional().or(z.literal('')),
  serviceDate: z.string().optional().or(z.literal('')),
  invitedBy: z.string().trim().optional().or(z.literal('')),
  howHeard: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal(''))
});

const visitorFollowUpStatuses = ['NEW', 'CONTACT_ATTEMPTED', 'CONTACTED', 'WELCOMED', 'JOINED', 'CLOSED'];

const visitorFollowUpSchema = z.object({
  visitorFollowUpStatus: z.enum(visitorFollowUpStatuses),
  visitorAssignedTo: z.string().trim().optional().or(z.literal('')),
  visitorLastContactAt: z.string().optional().or(z.literal('')),
  visitorNextStep: z.string().trim().optional().or(z.literal('')),
  visitorFollowUpNotes: z.string().trim().optional().or(z.literal(''))
});

function normalizeMemberInput(payload) {
  return {
    externalMemberId: payload.externalMemberId || null,
    fullName: payload.fullName,
    email: payload.email || null,
    phoneNumber: payload.phoneNumber || null,
    dateOfBirth: parseOptionalDate(payload.dateOfBirth),
    gender: payload.gender || 'UNKNOWN',
    membershipStatus: payload.membershipStatus || 'ACTIVE',
    isLeader: Boolean(payload.isLeader),
    fellowshipType: payload.fellowshipType || null,
    fellowshipName: payload.fellowshipName || null,
    leadershipRole: payload.leadershipRole || null,
    basontaCategory: payload.basontaCategory || null,
    addressFull: payload.addressFull || null,
    contactPreference: payload.contactPreference || null,
    joinDate: parseOptionalDate(payload.joinDate),
    notes: payload.notes || null,
    postcode: payload.postcode || null
  };
}

function sanitizeFileName(fileName) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function saveDataUrlToDisk({ directory, fileName, dataUrl }) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error('Upload payload must be a valid data URL');
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  const cleanName = sanitizeFileName(fileName);
  const ext = path.extname(cleanName) || '';
  const base = path.basename(cleanName, ext);
  const storedFileName = `${base}-${Date.now()}${ext}`;
  const targetDir = path.join(uploadRoot, directory);
  await fs.mkdir(targetDir, { recursive: true });
  const fullPath = path.join(targetDir, storedFileName);
  await fs.writeFile(fullPath, buffer);

  return {
    mimeType,
    fileSize: buffer.length,
    storedFileName,
    fileUrl: `/uploads/${directory}/${storedFileName}`
  };
}

async function getMemberById(memberId) {
  return prisma.member.findUnique({
    where: { id: memberId },
    include: {
      household: true,
      attendanceRecords: {
        include: {
          session: true
        },
        orderBy: { attendedOn: 'desc' },
        take: 10
      },
      givingRecords: {
        orderBy: { donatedAt: 'desc' },
        take: 10
      },
      careCases: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      memberNotes: {
        orderBy: { createdAt: 'desc' },
        take: 50
      },
      memberDocuments: {
        orderBy: { createdAt: 'desc' },
        take: 50
      },
      _count: {
        select: {
          attendanceRecords: true,
          givingRecords: true,
          careCases: true,
          memberNotes: true,
          memberDocuments: true
        }
      }
    }
  });
}

export async function listMembers(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 250);
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();

  const where = {
    AND: [
      status ? { membershipStatus: status } : {},
      search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { externalMemberId: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { addressFull: { contains: search, mode: 'insensitive' } },
              { household: { is: { addressFull: { contains: search, mode: 'insensitive' } } } }
            ]
          }
        : {}
    ]
  };

  const [total, data] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      include: {
        household: true
      },
      orderBy: {
        fullName: 'asc'
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  res.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
}

export async function getMember(req, res) {
  const member = await getMemberById(req.params.id);

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  res.json(member);
}

export async function listLeaders(req, res) {
  const data = await prisma.member.findMany({
    where: {
      OR: [
        { isLeader: true },
        { leadershipRole: { not: null } }
      ]
    },
    orderBy: [
      { fellowshipType: 'asc' },
      { fellowshipName: 'asc' },
      { fullName: 'asc' }
    ],
    include: {
      household: true
    }
  });

  res.json({ data });
}

export async function createMember(req, res) {
  const payload = createMemberSchema.parse(req.body);
  const data = normalizeMemberInput(payload);

  if (data.externalMemberId) {
    const existing = await prisma.member.findUnique({
      where: { externalMemberId: data.externalMemberId }
    });

    if (existing) {
      return res.status(409).json({ error: 'Member ID already exists' });
    }
  }

  let householdId = null;
  if (data.addressFull) {
    const existingHousehold = await prisma.household.findFirst({
      where: { addressFull: data.addressFull }
    });

    if (existingHousehold) {
      householdId = existingHousehold.id;
    }
  }

  const member = await prisma.member.create({
    data: {
      ...data,
      householdId
    },
    include: {
      household: true
    }
  });

  await logAuditEvent(req, {
    action: 'MEMBER_CREATED',
    entityType: 'Member',
    entityId: member.id,
    summary: `Created member ${member.fullName}`,
    metadata: {
      membershipStatus: member.membershipStatus,
      fellowshipType: member.fellowshipType,
      leadershipRole: member.leadershipRole
    }
  });

  res.status(201).json(member);
}

export async function listVisitors(req, res) {
  const visitors = await prisma.member.findMany({
    where: {
      OR: [
        {
          dataQualityNotes: {
            startsWith: 'Visitor registration'
          }
        },
        {
          visitorFollowUpStatus: {
            not: null
          }
        }
      ]
    },
    orderBy: {
      visitorFirstServiceDate: 'desc'
    },
    take: 50
  });

  res.json({ data: visitors });
}

export async function registerVisitor(req, res) {
  const payload = visitorSchema.parse(req.body);
  const serviceDate = parseOptionalDate(payload.serviceDate) || new Date();
  const visitMeta = [
    'Visitor registration',
    payload.serviceDate ? `serviceDate=${payload.serviceDate}` : null,
    payload.invitedBy ? `invitedBy=${payload.invitedBy}` : null,
    payload.howHeard ? `howHeard=${payload.howHeard}` : null
  ]
    .filter(Boolean)
    .join(' | ');

  const visitor = await prisma.member.create({
    data: {
      fullName: payload.fullName,
      email: payload.email || null,
      phoneNumber: payload.phoneNumber || null,
      addressFull: payload.addressFull || null,
      postcode: payload.postcode || null,
      membershipStatus: 'IRREGULAR',
      joinDate: serviceDate,
      notes: payload.notes || null,
      visitorFirstServiceDate: serviceDate,
      visitorInvitedBy: payload.invitedBy || null,
      visitorHowHeard: payload.howHeard || null,
      visitorFollowUpStatus: 'NEW',
      needsReview: true,
      dataQualityNotes: visitMeta
    }
  });

  await logAuditEvent(req, {
    action: 'VISITOR_REGISTERED',
    entityType: 'Member',
    entityId: visitor.id,
    summary: `Registered visitor ${visitor.fullName}`,
    metadata: {
      visitorFollowUpStatus: visitor.visitorFollowUpStatus,
      invitedBy: visitor.visitorInvitedBy,
      howHeard: visitor.visitorHowHeard
    }
  });

  res.status(201).json(visitor);
}

export async function updateVisitorFollowUp(req, res) {
  const payload = visitorFollowUpSchema.parse(req.body);
  const existing = await prisma.member.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Visitor not found' });
  }

  const followUpStatus = payload.visitorFollowUpStatus;
  const member = await prisma.member.update({
    where: { id: req.params.id },
    data: {
      visitorFollowUpStatus: followUpStatus,
      visitorAssignedTo: payload.visitorAssignedTo || null,
      visitorLastContactAt: parseOptionalDate(payload.visitorLastContactAt),
      visitorNextStep: payload.visitorNextStep || null,
      visitorFollowUpNotes: payload.visitorFollowUpNotes || null,
      needsReview: !['JOINED', 'CLOSED'].includes(followUpStatus)
    }
  });

  await logAuditEvent(req, {
    action: 'VISITOR_FOLLOW_UP_UPDATED',
    entityType: 'Member',
    entityId: member.id,
    summary: `Updated visitor follow-up for ${member.fullName}`,
    metadata: {
      visitorFollowUpStatus: member.visitorFollowUpStatus,
      visitorAssignedTo: member.visitorAssignedTo,
      needsReview: member.needsReview
    }
  });

  res.json(member);
}

export async function updateMember(req, res) {
  const payload = updateMemberSchema.parse(req.body);
  const existing = await prisma.member.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const normalized = {
    ...(payload.externalMemberId !== undefined ? { externalMemberId: payload.externalMemberId || null } : {}),
    ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
    ...(payload.email !== undefined ? { email: payload.email || null } : {}),
    ...(payload.phoneNumber !== undefined ? { phoneNumber: payload.phoneNumber || null } : {}),
    ...(payload.dateOfBirth !== undefined ? { dateOfBirth: parseOptionalDate(payload.dateOfBirth) } : {}),
    ...(payload.gender !== undefined ? { gender: payload.gender || 'UNKNOWN' } : {}),
    ...(payload.membershipStatus !== undefined ? { membershipStatus: payload.membershipStatus || 'ACTIVE' } : {}),
    ...(payload.isLeader !== undefined ? { isLeader: Boolean(payload.isLeader) } : {}),
    ...(payload.fellowshipType !== undefined ? { fellowshipType: payload.fellowshipType || null } : {}),
    ...(payload.fellowshipName !== undefined ? { fellowshipName: payload.fellowshipName || null } : {}),
    ...(payload.leadershipRole !== undefined ? { leadershipRole: payload.leadershipRole || null } : {}),
    ...(payload.basontaCategory !== undefined ? { basontaCategory: payload.basontaCategory || null } : {}),
    ...(payload.addressFull !== undefined ? { addressFull: payload.addressFull || null } : {}),
    ...(payload.contactPreference !== undefined ? { contactPreference: payload.contactPreference || null } : {}),
    ...(payload.joinDate !== undefined ? { joinDate: parseOptionalDate(payload.joinDate) } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes || null } : {}),
    ...(payload.postcode !== undefined ? { postcode: payload.postcode || null } : {})
  };

  const member = await prisma.member.update({
    where: { id: req.params.id },
    data: normalized,
    include: {
      household: true
    }
  });

  await logAuditEvent(req, {
    action: 'MEMBER_UPDATED',
    entityType: 'Member',
    entityId: member.id,
    summary: `Updated member ${member.fullName}`,
    metadata: {
      membershipStatus: member.membershipStatus,
      fellowshipType: member.fellowshipType,
      leadershipRole: member.leadershipRole,
      isLeader: member.isLeader
    }
  });

  res.json(member);
}

export async function uploadProfileImage(req, res) {
  const payload = uploadSchema.parse(req.body);
  const existing = await prisma.member.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const saved = await saveDataUrlToDisk({
    directory: 'profile-images',
    fileName: payload.fileName,
    dataUrl: payload.dataUrl
  });

  const member = await prisma.member.update({
    where: { id: req.params.id },
    data: {
      profileImageUrl: saved.fileUrl,
      profileImageName: payload.fileName
    }
  });

  await logAuditEvent(req, {
    action: 'MEMBER_PROFILE_IMAGE_UPDATED',
    entityType: 'Member',
    entityId: member.id,
    summary: `Updated profile image for ${existing.fullName || existing.id}`
  });

  res.json({
    id: member.id,
    profileImageUrl: member.profileImageUrl,
    profileImageName: member.profileImageName
  });
}

export async function uploadMemberDocument(req, res) {
  const payload = uploadSchema.parse(req.body);
  const existing = await prisma.member.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const saved = await saveDataUrlToDisk({
    directory: 'member-documents',
    fileName: payload.fileName,
    dataUrl: payload.dataUrl
  });

  const document = await prisma.memberDocument.create({
    data: {
      memberId: req.params.id,
      fileName: payload.fileName,
      storedFileName: saved.storedFileName,
      fileUrl: saved.fileUrl,
      fileType: payload.contentType || saved.mimeType,
      fileSize: saved.fileSize,
      category: payload.category || 'General',
      note: payload.note || null,
      uploadedBy: 'local-admin'
    }
  });

  await logAuditEvent(req, {
    action: 'MEMBER_DOCUMENT_UPLOADED',
    entityType: 'Member',
    entityId: req.params.id,
    summary: `Uploaded document for member ${req.params.id}`,
    metadata: {
      fileName: document.fileName,
      category: document.category
    }
  });

  res.status(201).json(document);
}

export async function addMemberNote(req, res) {
  const payload = memberNoteSchema.parse(req.body);
  const existing = await prisma.member.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const note = await prisma.memberNote.create({
    data: {
      memberId: req.params.id,
      title: payload.title || null,
      body: payload.body,
      createdBy: payload.createdBy || 'local-admin'
    }
  });

  await logAuditEvent(req, {
    action: 'MEMBER_NOTE_ADDED',
    entityType: 'Member',
    entityId: req.params.id,
    summary: `Added note to member ${req.params.id}`,
    metadata: {
      title: note.title
    }
  });

  res.status(201).json(note);
}

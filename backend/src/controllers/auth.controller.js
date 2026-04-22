import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prismaPkg from '@prisma/client';
const { UserRole } = prismaPkg;
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { logAuditEvent } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';

const roleValues = Object.values(UserRole);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(roleValues).default('VIEWER'),
  isActive: z.boolean().optional().default(true)
});

const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(roleValues).optional(),
  isActive: z.boolean().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

const requestPasswordResetSchema = z.object({
  email: z.string().email()
});

const resetPasswordWithTokenSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8)
});

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function deliverResetEmail({ email, fullName, resetUrl }) {
  const mailTarget = process.env.SMTP_FROM || 'no-reply@church-cms.local';
  const message = `Password reset requested for ${fullName || email} via ${mailTarget}`;

  // Placeholder delivery until SMTP/provider wiring is added.
  console.log(message);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Reset link for ${email}: ${resetUrl}`);
  }
}

function createAuthResponse(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace_this_with_a_long_secret') {
    const error = new Error('JWT secret is not configured securely');
    error.status = 500;
    throw error;
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    }
  };
}

export async function login(req, res) {
  const payload = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: payload.email }
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(payload.password, user.passwordHash);

  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json(createAuthResponse(user));
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Authenticated user no longer exists or is inactive' });
  }

  res.json({ user });
}

export async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.json({ data: users });
}

export async function registerUser(req, res) {
  const payload = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({
    where: { email: payload.email }
  });

  if (existing) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      email: payload.email,
      passwordHash,
      role: payload.role,
      isActive: payload.isActive
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  await logAuditEvent(req, {
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: user.id,
    summary: `Created user ${user.email} with role ${user.role}`,
    metadata: {
      email: user.email,
      role: user.role,
      isActive: user.isActive
    }
  });

  res.status(201).json(user);
}

export async function updateUser(req, res) {
  const payload = updateUserSchema.parse(req.body);
  const existing = await prisma.user.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (payload.email && payload.email !== existing.email) {
    const emailInUse = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (emailInUse) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
  }

  const updateData = {
    ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
    ...(payload.email !== undefined ? { email: payload.email } : {}),
    ...(payload.role !== undefined ? { role: payload.role } : {}),
    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    ...(payload.password ? { passwordHash: await bcrypt.hash(payload.password, 10) } : {})
  };

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  await logAuditEvent(req, {
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: user.id,
    summary: `Updated user ${user.email}`,
    metadata: {
      role: user.role,
      isActive: user.isActive,
      passwordChanged: Boolean(payload.password)
    }
  });

  res.json(user);
}

export async function changeOwnPassword(req, res) {
  const payload = changePasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub }
  });

  if (!user || !user.isActive) {
    return res.status(404).json({ error: 'User not found or inactive' });
  }

  const passwordMatches = await bcrypt.compare(payload.currentPassword, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = await bcrypt.hash(payload.newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  await logAuditEvent(req, {
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: user.id,
    summary: `User ${user.email} changed their own password`
  });

  res.json({ ok: true });
}

export async function requestPasswordReset(req, res) {
  const payload = requestPasswordResetSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: payload.email }
  });

  if (user?.isActive) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    const appBaseUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
    const resetUrl = `${appBaseUrl.replace(/\/$/, '')}/?resetToken=${rawToken}`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt
      }
    });

    await deliverResetEmail({
      email: user.email,
      fullName: user.fullName,
      resetUrl
    });
  }

  res.json({
    ok: true,
    message: 'If an active account exists for that email, a password reset request has been accepted.'
  });
}

export async function resetPasswordWithToken(req, res) {
  const payload = resetPasswordWithTokenSchema.parse(req.body);
  const tokenHash = hashResetToken(payload.token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: {
        gt: new Date()
      },
      isActive: true
    }
  });

  if (!user) {
    return res.status(400).json({ error: 'This password reset link is invalid or has expired' });
  }

  const passwordHash = await bcrypt.hash(payload.newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null
    }
  });

  await logAuditEvent(
    { user: { sub: user.id } },
    {
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id,
      summary: `Password reset completed for ${user.email}`
    }
  );

  res.json({ ok: true });
}

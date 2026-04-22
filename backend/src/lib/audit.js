import { prisma } from './prisma.js';

export async function logAuditEvent(req, { action, entityType, entityId = null, summary = null, metadata = null }) {
  if (!req?.user?.sub) return;

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.sub,
      action,
      entityType,
      entityId,
      summary,
      metadata
    }
  });
}

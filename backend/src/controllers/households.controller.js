import { prisma } from '../lib/prisma.js';

export async function listHouseholds(req, res) {
  const data = await prisma.household.findMany({
    include: {
      _count: {
        select: {
          members: true
        }
      }
    },
    orderBy: {
      householdName: 'asc'
    }
  });

  res.json({ data });
}

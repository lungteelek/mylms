import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { ensureTenantLicense, getTenantFeatureMap } from '../lib/tenant';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/context', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user!.userId,
          tenantId: req.user!.tenantId,
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Tenant membership not found' });
    }

    const license = await ensureTenantLicense(prisma, req.user!.tenantId);
    const features = await getTenantFeatureMap(prisma, req.user!.tenantId);

    res.json({
      tenant: membership.tenant,
      membership: {
        role: membership.role,
        isDefault: membership.isDefault,
      },
      license: {
        status: license.status,
        plan: license.plan,
        expiresAt: license.expiresAt,
      },
      features,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

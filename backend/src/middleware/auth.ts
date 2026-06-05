import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    tenantId: number;
    platformRole: string;
  };
  tenantSlug?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role: string;
      tenantId: number;
      platformRole: string;
    };
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const resolveTenantSlug = (req: AuthRequest, res: Response, next: NextFunction) => {
  const headerTenantSlug = req.headers['x-tenant-slug']?.toString() || req.query.tenantSlug?.toString();
  const hostHeader = req.headers.host?.toString() || '';
  const appDomain = process.env.APP_DOMAIN?.toLowerCase();
  const hostName = hostHeader.split(':')[0].toLowerCase();
  const subdomainTenantSlug =
    appDomain && hostName.endsWith(`.${appDomain}`) && hostName !== appDomain
      ? hostName.slice(0, -(appDomain.length + 1))
      : null;

  const tenantSlug = headerTenantSlug || subdomainTenantSlug || process.env.DEFAULT_TENANT_SLUG;

  if (!tenantSlug) {
    return res.status(400).json({ error: 'Tenant slug is required' });
  }

  req.tenantSlug = tenantSlug;
  next();
};

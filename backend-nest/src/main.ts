import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import fs from 'fs';
import path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prisma = app.get(PrismaService);
  const publicDomain = (process.env.APP_DOMAIN || 'coursechic.com').toLowerCase();
  const uploadsDir = path.join(__dirname, '../../uploads');
  const landingPagesDir = path.join(uploadsDir, 'landing-pages');

  const resolveTenantLanding = async (req: Request, res: Response) => {
    const hostHeader = req.headers.host?.toString() || '';
    const hostName = hostHeader.split(':')[0].toLowerCase();
    if (!hostName.endsWith(`.${publicDomain}`) || hostName === publicDomain) {
      return null;
    }

    const tenantSlug = hostName.slice(0, -(publicDomain.length + 1));
    const tenant = await prisma.organization.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, name: true },
    });
    const landingPath = tenant ? path.join(landingPagesDir, tenant.slug, 'index.html') : null;
    const landingExists = landingPath ? fs.existsSync(landingPath) : false;

    if (!tenant || !landingExists || !landingPath) {
      return {
        host: hostHeader,
        path: req.path,
        appDomain: publicDomain,
        configuredAppDomain: process.env.APP_DOMAIN || null,
        tenantSlug,
        tenant: tenant || null,
        landingPath,
        landingExists,
        resolved: false,
        publicFallback: true,
      };
    }

    return {
      host: hostHeader,
      path: req.path,
      appDomain: publicDomain,
      configuredAppDomain: process.env.APP_DOMAIN || null,
      tenantSlug,
      tenant,
      landingPath,
      landingExists,
      resolved: true,
      publicFallback: false,
    };
  };

  const debugHandler = async (req: Request, res: Response) => {
    const result = await resolveTenantLanding(req, res);
    if (!result) {
      return res.json({
        host: req.headers.host || null,
        path: req.path,
        appDomain: publicDomain,
        configuredAppDomain: process.env.APP_DOMAIN || null,
        tenantSlug: null,
        tenant: null,
        landingPath: null,
        landingExists: false,
        resolved: false,
        publicFallback: true,
        note: 'Host นี้ไม่ตรงกับ subdomain pattern ของ APP_DOMAIN',
      });
    }
    return res.json(result);
  };

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/debug/tenant-resolution', debugHandler);
  expressApp.get('/api/debug/tenant-resolution', debugHandler);
  expressApp.get('/api/debug/landing-page/:slug', async (req: Request, res: Response) => {
    const slug = String(req.params.slug || '').trim();
    if (!slug) {
      return res.status(400).json({ error: 'slug is required' });
    }
    const tenant = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });
    const landingPath = path.join(landingPagesDir, slug, 'index.html');
    const exists = fs.existsSync(landingPath);
    const preview = exists ? fs.readFileSync(landingPath, 'utf8').slice(0, 600) : '';
    return res.json({
      slug,
      tenant: tenant || null,
      landingPath,
      exists,
      sizeBytes: exists ? fs.statSync(landingPath).size : 0,
      modifiedAt: exists ? fs.statSync(landingPath).mtime.toISOString() : null,
      preview,
    });
  });

  app.setGlobalPrefix('api');
  app.enableCors();

  const port = process.env.PORT || 3001;
  await app.listen(port);
}

bootstrap();

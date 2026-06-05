"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const prisma_service_1 = require("./prisma/prisma.service");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const prisma = app.get(prisma_service_1.PrismaService);
    const publicDomain = (process.env.APP_DOMAIN || 'coursechic.com').toLowerCase();
    const uploadsDir = path_1.default.join(__dirname, '../../uploads');
    const landingPagesDir = path_1.default.join(uploadsDir, 'landing-pages');
    const resolveTenantLanding = async (req, res) => {
        const hostHeader = req.headers.host?.toString() || '';
        const hostName = hostHeader.split(':')[0].toLowerCase();
        if (!hostName.endsWith(`.${publicDomain}`) || hostName === publicDomain) {
            return null;
        }
        const tenantSlug = hostName.slice(0, -(publicDomain.length + 1));
        const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug },
            select: { id: true, slug: true, name: true },
        });
        const landingPath = tenant ? path_1.default.join(landingPagesDir, tenant.slug, 'index.html') : null;
        const landingExists = landingPath ? fs_1.default.existsSync(landingPath) : false;
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
    const debugHandler = async (req, res) => {
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
    expressApp.get('/api/debug/landing-page/:slug', async (req, res) => {
        const slug = String(req.params.slug || '').trim();
        if (!slug) {
            return res.status(400).json({ error: 'slug is required' });
        }
        const tenant = await prisma.tenant.findUnique({
            where: { slug },
            select: { id: true, slug: true, name: true },
        });
        const landingPath = path_1.default.join(landingPagesDir, slug, 'index.html');
        const exists = fs_1.default.existsSync(landingPath);
        const preview = exists ? fs_1.default.readFileSync(landingPath, 'utf8').slice(0, 600) : '';
        return res.json({
            slug,
            tenant: tenant || null,
            landingPath,
            exists,
            sizeBytes: exists ? fs_1.default.statSync(landingPath).size : 0,
            modifiedAt: exists ? fs_1.default.statSync(landingPath).mtime.toISOString() : null,
            preview,
        });
    });
    app.setGlobalPrefix('api');
    app.enableCors();
    const port = process.env.PORT || 3001;
    await app.listen(port);
}
bootstrap();

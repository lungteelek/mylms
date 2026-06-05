# Self-hosted deployment

## Prerequisites

- Docker
- Docker Compose

## Quick start

1. Copy `.env.example` to `.env`
2. Set `JWT_SECRET` and database credentials
3. Run:

```bash
docker compose up -d --build
```

The backend container will:

- generate the Prisma client
- push the current schema to Postgres
- seed a default tenant and owner account
- start the API on port `3000`

## Default seed account

- Email: `instructor@example.com`
- Password: `password123`
- Tenant slug: value of `DEFAULT_TENANT_SLUG`

## Tenant-aware login

For SaaS or multi-tenant clients, send `tenantSlug` in the login body or `x-tenant-slug` in the request headers.

## License and feature flags

- Tenant license state is stored in the `License` table
- Feature flags are stored in the `FeatureFlag` table
- Current tenant context is available at `GET /api/tenant/context`

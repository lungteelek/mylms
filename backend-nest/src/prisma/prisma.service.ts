import 'dotenv/config';
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../../backend/node_modules/@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private static databaseUrl = process.env.DATABASE_URL?.replace(/^file:/, '') || './data/mylms.db';

  constructor() {
    super({
      adapter: new PrismaBetterSqlite3({ url: PrismaService.databaseUrl }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}

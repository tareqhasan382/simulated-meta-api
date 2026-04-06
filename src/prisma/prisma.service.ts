import 'dotenv/config';

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor() {
    //console.log('🔍 PrismaService DATABASE_URL:', process.env.DATABASE_URL);

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    pool.on('error', (err) => {
      console.error('❌ PostgreSQL pool error:', err);
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      console.log('✅ pg Pool connected successfully');
      client.release();
    } catch (err) {
      console.error('❌ pg Pool connection failed:', err.message);
    }

    await this.$connect();
    console.log('✅ Prisma connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
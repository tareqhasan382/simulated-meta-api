import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(SeederService.name);

  async onApplicationBootstrap() {
    await this.seedInsights();
  }

  private async seedInsights() {
    this.logger.log('🌱 Seeding initial insights...');

    const count = await this.prisma.insight.count();
    if (count > 0) {
      this.logger.log('Insights already exist, skipping seeding.');
      return;
    }

    const insights = [
      {
        campaign_id: 'camp_1',
        date: new Date('2024-03-01'),
        impressions: 1200,
        clicks: 45,
        spend: 25.50,
      },
      {
        campaign_id: 'camp_1',
        date: new Date('2024-03-02'),
        impressions: 1500,
        clicks: 60,
        spend: 32.00,
      },
      {
        campaign_id: 'camp_2',
        date: new Date('2024-03-01'),
        impressions: 800,
        clicks: 20,
        spend: 15.00,
      },
    ];

    try {
      for (const insight of insights) {
        await this.prisma.insight.create({
          data: insight,
        });
      }
      this.logger.log('✅ Seeding finished successfully.');
    } catch (error) {
      this.logger.error(`❌ Seeding failed: ${error.message}`);
    }
  }
}

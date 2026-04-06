import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MetaApiService } from '../meta-api/meta-api.service';
import { PrismaService } from '../prisma/prisma.service';
import { SyncInsightDto } from './dto/sync-insight.dto';

@Processor('ad-sync')
export class InsightsProcessor extends WorkerHost {
  private readonly logger = new Logger(InsightsProcessor.name);

  constructor(
    private readonly metaApiService: MetaApiService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<SyncInsightDto>): Promise<any> {
    const { campaign_id, date } = job.data;
    this.logger.log(`Processing job ${job.id} for campaign ${campaign_id} on ${date}`);

    try {
      // Mock API call (might throw 429 or 500)
      const insightData = await this.metaApiService.getInsights(campaign_id, date);

      // Idempotent upsert
      await this.prisma.insight.upsert({
        where: {
          campaign_id_date: {
            campaign_id: insightData.campaign_id,
            date: new Date(insightData.date),
          },
        },
        update: {
          impressions: insightData.impressions,
          clicks: insightData.clicks,
          spend: insightData.spend,
        },
        create: {
          campaign_id: insightData.campaign_id,
          date: new Date(insightData.date),
          impressions: insightData.impressions,
          clicks: insightData.clicks,
          spend: insightData.spend,
        },
      });

      this.logger.log(`Job ${job.id} completed successfully for campaign ${campaign_id}`);
      return { success: true };
    } catch (error) {
      // Re-throw the error to BullMQ to trigger retry (exponential backoff handled by BullMQ config)
      this.logger.error(`Job ${job.id} failed for campaign ${campaign_id}: ${error.message}`);
      throw error;
    }
  }
}

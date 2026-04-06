import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncInsightDto } from './dto/sync-insight.dto';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ad-sync') private readonly adSyncQueue: Queue,
  ) {}

  async triggerSync(dto: SyncInsightDto) {
    this.logger.log(`Triggering ad-sync for campaign ${dto.campaign_id} on ${dto.date}`);
    
    // Add job to queue with exponential backoff
    await this.adSyncQueue.add(
      'sync-job',
      dto,
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000, // starts with 1s
        },
        removeOnComplete: true,
      }
    );

    return { message: 'Sync job queued successfully' };
  }

  async getAllInsights() {
    return this.prisma.insight.findMany({
      orderBy: { date: 'desc' },
    });
  }
}

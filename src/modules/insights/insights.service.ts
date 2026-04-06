import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncInsightDto } from './dto/sync-insight.dto';
import { GetInsightsDto } from './dto/get-insights.dto';

@Injectable() 
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ad-sync') private readonly adSyncQueue: Queue,
  ) {}

  /**
   * Triggers an asynchronous sync job for a specific campaign and date.
   * Uses an idempotent jobId to prevent duplicate active jobs for the same campaign/date.
   */
  async triggerSync(dto: SyncInsightDto) {
    const { campaign_id, date } = dto;
    
    // Idempotent Job ID: Prevents multiple active jobs for same campaign + date
    // Note: BullMQ does not allow ':' in jobId as it's a separator in Redis
    const jobId = `${campaign_id}_${date}`;
    
    this.logger.log(`Enqueuing ad-sync job | Campaign: ${campaign_id} | Date: ${date} | JobId: ${jobId}`);
    
    const job = await this.adSyncQueue.add(
      'sync-job',
      dto,
      {
        jobId,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    return { 
      message: 'Sync job queued successfully',
      jobId: job.id,
      campaign_id,
      date
    };
  }

  /**
   * Retrieves paginated and filtered insights from the database.
   */
  async getAllInsights(query: GetInsightsDto) {
    const limit = query.limit ?? 10;
    const offset = query.offset ?? 0;
    const { campaign_id, from, to } = query;

    // Build Prisma where clause dynamically
    const where: any = {};
    if (campaign_id) where.campaign_id = campaign_id;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    
    const [total, items] = await Promise.all([
      this.prisma.insight.count({ where }),
      this.prisma.insight.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { date: 'desc' },
      }),
    ]);

    return {
      message: 'Insights retrieved successfully',
      data: items,
      meta: {
        total,
        offset,
        limit,
        page: Math.floor(offset / limit) + 1,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

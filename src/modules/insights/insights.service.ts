import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncInsightDto } from './dto/sync-insight.dto';
import { PaginationDto } from './dto/pagination.dto';

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
    
    this.logger.log(`Enqueuing ad-sync job for Campaign: ${campaign_id} | Date: ${date} | JobId: ${jobId}`);
    
    const job = await this.adSyncQueue.add(
      'sync-job',
      dto,
      {
        jobId, // Idempotent key
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000, // Starting delay of 1s
        },
        removeOnComplete: true, // Auto-cleanup successful jobs
        removeOnFail: false,    // Keep failed jobs for debugging
      }
    );

    return { 
      message: 'Sync job has been accepted and queued.',
      jobId: job.id,
      campaign_id,
      date
    };
  }

  /**
   * Retrieves paginated insights from the database.
   */
  async getAllInsights(pagination: PaginationDto) {
    const limit = pagination.limit ?? 10;
    const offset = pagination.offset ?? 0;
    
    const [total, items] = await Promise.all([
      this.prisma.insight.count(),
      this.prisma.insight.findMany({
        skip: offset,
        take: limit,
        orderBy: { date: 'desc' },
      }),
    ]);

    return {
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

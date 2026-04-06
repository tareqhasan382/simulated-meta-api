import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, HttpException, HttpStatus } from '@nestjs/common';
import { MockMetaService } from '../mock-meta/mock-meta.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncInsightDto } from './dto/sync-insight.dto';

@Processor('ad-sync')
export class InsightsProcessor extends WorkerHost {
  private readonly logger = new Logger(InsightsProcessor.name);

  constructor(
    private readonly mockMetaService: MockMetaService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  /**
   * Main job processing logic.
   * Handles 429 (Rate Limit) and 500 (Internal Error) with structured logging and progress tracking.
   */
  async process(job: Job<SyncInsightDto>): Promise<any> {
    const { campaign_id, date } = job.data;
    const attempt = job.attemptsMade + 1;
    
    this.logger.log(`[Job:${job.id}] PROCESSING | Campaign: ${campaign_id} | Date: ${date} | Attempt: ${attempt}`);
    await job.updateProgress(10);

    try {
      // Step 1: Call Mock Meta API
      const insightData = await this.mockMetaService.getInsights(campaign_id, date);
      await job.updateProgress(50);

      // Step 2: Idempotent Upsert to Postgres using composite unique key (campaign_id + date)
      const result = await this.prisma.insight.upsert({
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

      await job.updateProgress(100);
      this.logger.log(`[Job:${job.id}] SUCCESS | Campaign: ${campaign_id} | Upserted Insight ID: ${result.id}`);
      
      return { success: true, insightId: result.id };
    } catch (error) {
      await this.handleJobError(job, error);
    }
  }

  /**
   * Specialized error handler to differentiate between 429 Rate Limits and other errors.
   */
  private async handleJobError(job: Job, error: any) {
    const isRateLimit = error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS;
    const attempt = job.attemptsMade + 1;
 
    if (isRateLimit) {
      // Explicit Rate Limit Handling
      this.logger.warn(`[Job:${job.id}] RATE_LIMIT_DETECTED | Attempt: ${attempt} | Strategy: BullMQ Exponential Backoff`);
    } else {
      // Generic Error Handling
      this.logger.error(`[Job:${job.id}] ERROR_DETECTED | Attempt: ${attempt} | Message: ${error.message}`);
      if (error.status === 500) {
        this.logger.debug(error.stack);
      }
    }

    // Re-throw so BullMQ triggers its retry strategy (1s -> 2s -> 4s -> 8s -> 16s)
    throw error;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const maxAttempts = job.opts.attempts || 5;
    const currentAttempt = job.attemptsMade;

    if (currentAttempt >= maxAttempts) {
      this.logger.error(`[Job:${job.id}] CRITICAL_FAILURE | Attempts: ${currentAttempt}/${maxAttempts} | Message: ${error.message}`);
    } else {
      this.logger.warn(`[Job:${job.id}] RETRY_SCHEDULED | Attempt ${currentAttempt} failed. Backing off...`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`[Job:${job.id}] CLEANUP | Job removed from queue`);
  }
}

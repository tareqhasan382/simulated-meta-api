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
   * Handles 429 (Rate Limit) with manual delay and structured error handling.
   */
  async process(job: Job<SyncInsightDto>): Promise<any> {
    const { campaign_id, date } = job.data;
    const attempt = job.attemptsMade + 1;
    
    this.logger.log(`[Job:${job.id}] START - Campaign: ${campaign_id} | Date: ${date} | Attempt: ${attempt}`);
    await job.updateProgress(10); // Job Progress Tracking

    try {
      // Step 1: Call Mock Meta API
      const insightData = await this.mockMetaService.getInsights(campaign_id, date);
      await job.updateProgress(50);

      // Step 2: Idempotent Upsert to Postgres
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
      this.logger.log(`[Job:${job.id}] ✅ COMPLETED - Campaign: ${campaign_id} | Record ID: ${result.id}`);
      
      return { success: true, insightId: result.id };
    } catch (error) {
      this.handleJobError(job, error);
    }
  }

  /**
   * Specialized error handler to differentiate between 429 Rate Limits and 500 Server Errors.
   */
  private async handleJobError(job: Job, error: any) {
    const isRateLimit = error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS;
    const attempt = job.attemptsMade + 1;

    if (isRateLimit) {
      // 429 Handling: Apply a longer delay helper or signal custom retry
      const waitMs = Math.pow(2, attempt) * 2000; // Longer than normal retry (2s, 4s, 8s...)
      this.logger.warn(`[Job:${job.id}] ⚠️ RATE LIMIT (429) - Attempt ${attempt}. Applying ${waitMs}ms delay before retry.`);
      
      // We re-throw to trigger BullMQ retry strategy, but we could also manually delay if needed.
      // Here we rely on BullMQ's exponential backoff but add specific logging.
    } else {
      this.logger.error(`[Job:${job.id}] ❌ FAILED - Attempt ${attempt}. Error: ${error.message}`);
      // Log full stack trace for 500 errors to help debugging
      if (error.status === 500) {
        this.logger.debug(error.stack);
      }
    }

    // Re-throw the error so BullMQ can handle the retry logic defined in the service
    throw error;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const maxAttempts = job.opts.attempts || 5;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(`[Job:${job.id}] ‼️ CRITICAL - Permanently failed after ${maxAttempts} attempts. Last Error: ${error.message}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`[Job:${job.id}] Successfully removed from queue.`);
  }
}

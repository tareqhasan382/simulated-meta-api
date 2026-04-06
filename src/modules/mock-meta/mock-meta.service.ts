import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Injectable()
export class MockMetaService {
  private readonly logger = new Logger(MockMetaService.name);

  async getInsights(campaign_id: string, date: string) {
    const random = Math.random();

    // 20% → Rate Limit (429)
    if (random < 0.2) {
      this.logger.warn(`Mocking 429 Too Many Requests for campaign ${campaign_id}`);
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    // 20% → Internal Error (500)
    if (random < 0.4) {
      this.logger.error(`Mocking 500 Internal Server Error for campaign ${campaign_id}`);
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 60% → Success
    this.logger.log(`Success: Fetching insights for campaign ${campaign_id}`);
    return {
      campaign_id,
      date,
      impressions: Math.floor(Math.random() * 10000),
      clicks: Math.floor(Math.random() * 500),
      spend: parseFloat((Math.random() * 100).toFixed(2)),
    };
  }
}

import { Controller, Post, Get, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { SyncInsightDto } from './dto/sync-insight.dto';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Post('sync')
  @UsePipes(new ValidationPipe({ transform: true }))
  async sync(@Body() dto: SyncInsightDto) {
    return this.insightsService.triggerSync(dto);
  }

  @Get()
  async findAll() {
    return this.insightsService.getAllInsights();
  }
}

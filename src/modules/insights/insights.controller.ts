import { Controller, Post, Get, Body, Query, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { SyncInsightDto } from './dto/sync-insight.dto';
import { PaginationDto } from './dto/pagination.dto';

@ApiTags('Insights')
@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED) // Return 202 Accepted for async jobs
  @ApiOperation({ 
    summary: 'Trigger a background sync for Meta insights',
    description: 'Enqueues a job to fetch insights from Meta API and store them in the database.'
  })
  @ApiResponse({ 
    status: HttpStatus.ACCEPTED, 
    description: 'Sync job has been accepted and queued for background processing.' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input data (e.g., malformed date or missing campaign_id).' 
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async sync(@Body() dto: SyncInsightDto) {
    return this.insightsService.triggerSync(dto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Retrieve stored insights with pagination',
    description: 'Returns a list of synced insights from the local database.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of insights retrieved successfully.' 
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@Query() pagination: PaginationDto) {
    return this.insightsService.getAllInsights(pagination);
  }
}

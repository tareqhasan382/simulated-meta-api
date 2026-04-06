import { Controller, Post, Get, Body, Query, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { SyncInsightDto } from './dto/sync-insight.dto';
import { GetInsightsDto } from './dto/get-insights.dto';

@ApiTags('Insights')
@ApiExtraModels(GetInsightsDto)
@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Trigger a background sync for Meta insights',
    description: 'Enqueues a job in BullMQ to fetch insights from a simulated Meta API and upsert them into PostgreSQL.'
  })
  @ApiResponse({ 
    status: HttpStatus.ACCEPTED, 
    description: 'Sync job has been accepted and queued.',
    schema: {
      example: {
        statusCode: 202,
        message: 'Sync job queued successfully',
        data: {
          jobId: 'camp_123_2024-03-20',
          campaign_id: 'camp_123',
          date: '2024-03-20'
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid payload provided.' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async sync(@Body() dto: SyncInsightDto) {
    return this.insightsService.triggerSync(dto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Retrieve stored insights with filters and pagination',
    description: 'Returns a list of synced insights from the database. Supports filtering by campaign_id and date ranges.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Insights retrieved successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Insights retrieved successfully',
        data: [
          {
            id: 'uuid',
            campaign_id: 'camp_123',
            date: '2024-03-20T00:00:00.000Z',
            impressions: 1200,
            clicks: 45,
            spend: 25.5,
            created_at: '2024-03-20T10:00:00.000Z',
            updated_at: '2024-03-20T10:00:00.000Z'
          }
        ],
        meta: {
          total: 1,
          offset: 0,
          limit: 10,
          page: 1,
          pages: 1
        }
      }
    }
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@Query() query: GetInsightsDto) {
    return this.insightsService.getAllInsights(query);
  }
}

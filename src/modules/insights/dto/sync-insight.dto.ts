import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncInsightDto {
  @ApiProperty({
    description: 'Unique identifier for the Meta Ad Campaign',
    example: 'camp_12345',
  })
  @IsString()
  campaign_id: string;

  @ApiProperty({
    description: 'Date for which to sync insights (ISO 8601 format)',
    example: '2024-03-20',
  })
  @IsDateString()
  date: string;
}

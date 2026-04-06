import { IsString, IsDateString } from 'class-validator';

export class SyncInsightDto {
  @IsString()
  campaign_id: string;

  @IsDateString()
  date: string;
}

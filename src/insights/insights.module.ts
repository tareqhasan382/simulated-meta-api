import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightsProcessor } from './insights.processor';
import { MetaApiModule } from '../meta-api/meta-api.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ad-sync',
    }),
    MetaApiModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService, InsightsProcessor],
})
export class InsightsModule {}

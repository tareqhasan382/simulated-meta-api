import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightsProcessor } from './insights.processor';
import { MockMetaModule } from '../mock-meta/mock-meta.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ad-sync',
    }),
    MockMetaModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService, InsightsProcessor],
})
export class InsightsModule {}

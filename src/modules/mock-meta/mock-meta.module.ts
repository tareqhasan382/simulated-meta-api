import { Module } from '@nestjs/common';
import { MockMetaService } from './mock-meta.service';

@Module({
  providers: [MockMetaService],
  exports: [MockMetaService],
})
export class MockMetaModule {}

import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SeederService],
})
export class SeederModule {}

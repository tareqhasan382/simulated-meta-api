import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Simulated Meta API')
  .setDescription('Resilient Meta Ads API Integration Service with BullMQ and Prisma')
  .setVersion('1.0')
  .addCookieAuth('refreshToken')
  .addTag('API')
  .addApiKey(
    {
      type: 'apiKey',
      name: 'authorization',
      in: 'header',
    },
    'auth', 
  )
  .addSecurityRequirements({
    auth: [],
  })
  .build();
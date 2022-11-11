import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import getLogLevels from './utils/getLogLevels';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: getLogLevels(process.env.NODE_ENV === 'production'),
  });
  const configService = app.get(ConfigService);

  await app.listen(configService.get('PORT'));
}
bootstrap();

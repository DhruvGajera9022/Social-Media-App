import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Initialize the app
  const app = await NestFactory.create(AppModule);

  // Using custom logger instead of default logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Using validation pipe for input validation
  app.useGlobalPipes(new ValidationPipe());

  // Start the server
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

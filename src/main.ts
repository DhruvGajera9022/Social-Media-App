import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // Initialize the app
  const app = await NestFactory.create(AppModule);

  // Using custom logger instead of default logger
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // Using validation pipe for input validation
  app.useGlobalPipes(new ValidationPipe());

  // config for api documentation
  const config = new DocumentBuilder()
    .setTitle('Nest.js Project')
    .setDescription('API documentation for out Nest.js application')
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();

  // Create the document
  const document = SwaggerModule.createDocument(app, config);

  // Setup the api path
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keeps the token saved
    },
  });

  // Start the server
  await app.listen(process.env.PORT ?? 3000);

  logger.log(
    `🚀 Server running on: http://localhost:${process.env.PORT ?? 3000}/api/docs`,
  );
}
bootstrap();

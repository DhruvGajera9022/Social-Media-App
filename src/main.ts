import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // Initialize the app
  const app = await NestFactory.create(AppModule);

  // Using custom logger instead of default logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Using validation pipe for input validation
  app.useGlobalPipes(new ValidationPipe());

  // config for api documentation
  const config = new DocumentBuilder()
    .setTitle('Nest.js Project')
    .setDescription('API documentation for out Nest.js application')
    .setVersion('1.0')
    .build();

  // Create the document
  const document = SwaggerModule.createDocument(app, config);

  // Setup the api path
  SwaggerModule.setup('api', app, document);

  // Start the server
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

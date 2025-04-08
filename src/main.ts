import { NestContainer, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'colors';
import { SpelunkerModule } from 'nestjs-spelunker';
import * as fs from 'fs';

// Get global modules
const getGlobalModule = (app: INestApplication) => {
  const modules = ((app as any).container as NestContainer).getModules();
  const modulesArray = Array.from(modules.values());
  const globalModules = modulesArray
    .filter((module) => module.isGlobal)
    .map((module) => module.metatype.name);

  return globalModules;
};

// For generate graph visualization
const generateAppGraph = (app: INestApplication) => {
  const globalModules = getGlobalModule(app);
  const tree = SpelunkerModule.explore(app);
  const root = SpelunkerModule.graph(tree);
  const edges = SpelunkerModule.findGraphEdges(root);

  let graph = 'graph LR\n';
  edges.forEach(({ from, to }) => {
    graph += `  ${from.module.name}-->${to.module.name}\n`;
  });

  return graph;
};

async function bootstrap() {
  // Initialize the app
  const app = await NestFactory.create(AppModule);

  // Using custom logger instead of default logger
  // Changes
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // Using validation pipe for input validation
  app.useGlobalPipes(new ValidationPipe());

  // Enable CORS
  app.enableCors();

  // config for api documentation
  const config = new DocumentBuilder()
    .setTitle('Social Media App')
    .setDescription('API documentation for out Social Media App')
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();

  // Create the documents
  const document = SwaggerModule.createDocument(app, config);

  // Setup the api path
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keeps the token saved
    },
  });

  // Using for debugging
  // logger.log(SpelunkerModule.explore(app));

  // Generate graph
  const graph = generateAppGraph(app);
  fs.writeFileSync('./visualizations/app.modules.mmd', graph);

  // Start the server
  await app.listen(process.env.PORT ?? 3000);

  logger.log(
    `🚀 Server running on: http://localhost:${process.env.PORT ?? 3000}`.bgWhite
      .black,
  );
  logger.log(
    `🚀 API Docs: http://localhost:${process.env.PORT ?? 3000}/api/docs`.bgWhite
      .black,
  );
}
bootstrap();

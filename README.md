<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

A feature-rich social media backend built with NestJS, featuring authentication, user management, posts, profiles, and more.

## Features

- 🔐 **Authentication**
  - JWT-based authentication
  - OAuth support (Google, Facebook, Twitter)
  - Two-Factor Authentication (2FA) with OTP
  - Password reset and email verification

- 👤 **User Management**
  - Role-based access control
  - Profile management
  - User search and following system

- 📝 **Content Management**
  - Post creation and management
  - Comments and reactions
  - File uploads with Cloudinary integration

- 🛠 **Technical Features**
  - Prisma ORM for database management
  - Winston for logging
  - Email functionality with Nodemailer
  - API documentation with Swagger
  - Comprehensive testing setup with Jest

## Project Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database

### Installation

```bash
# Install dependencies
$ npm install

# Set up environment variables
$ cp .env.example .env
# Update .env with your configuration

# Run database migrations
$ npx prisma migrate dev

# Seed the database (if needed)
$ npm run seed
```

## Running the Application

```bash
# Development mode
$ npm run start

# Watch mode (recommended for development)
$ npm run dev

# Production mode
$ npm run start:prod
```

## API Documentation

Once the application is running, you can access the Swagger API documentation at:

```
http://localhost:3000/api/docs
```

## Project Structure

```
src/
├── common/         # Shared resources (decorators, filters, guards)
├── config/         # Configuration files
├── dto/            # Data Transfer Objects
├── modules/        # Feature modules
│   ├── auth/       # Authentication module
│   ├── user/       # User management
│   ├── post/       # Post management
│   └── profile/    # Profile management
├── prisma/         # Database schema and migrations
└── main.ts         # Application entry point
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Application
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
TWITTER_CONSUMER_KEY=your-twitter-consumer-key
TWITTER_CONSUMER_SECRET=your-twitter-consumer-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-email-password
```

## Deployment

### Docker Deployment

1. Build the Docker image:
```bash
$ docker build -t social-media-backend .
```

2. Run the container:
```bash
$ docker run -p 3000:3000 --env-file .env social-media-backend
```

### Traditional Deployment

1. Build the application:
```bash
$ npm run build
```

2. Start the production server:
```bash
$ npm run start:prod
```

### CI/CD Pipeline

This project includes GitHub Actions workflows for:
- Automated testing
- Code quality checks
- Docker image builds
- Automated deployments

Check `.github/workflows` for detailed configurations.

## Development Guidelines

### Branch Strategy

The project follows a feature-branch workflow:
- `master` - Production-ready code
- `auth-branch` - Authentication features
- `post-branch` - Post management features
- `profile-branch` - User profile features
- `roles-branch` - Role management
- `users-branch` - User management

### Code Style

- Follow the `.eslintrc` and `.prettierrc` configurations
- Run linting before commits:
```bash
$ npm run lint
```

### Testing Standards

- Write unit tests for all new features
- Maintain minimum 80% code coverage
- Run tests before pushing:
```bash
$ npm run test
$ npm run test:e2e
```

## Performance Optimization

- Database indexing on frequently queried fields
- Caching implemented for frequently accessed data
- Rate limiting on API endpoints
- Pagination for list endpoints

## Security Measures

- JWT token rotation
- Rate limiting
- CORS configuration
- Request validation
- SQL injection protection
- XSS prevention

## Resources

Project-specific resources:

- [API Documentation](http://localhost:3000/api/docs) - Interactive API documentation
- [Prisma Documentation](https://www.prisma.io/docs) - Database ORM
- [Jest Documentation](https://jestjs.io/docs/getting-started) - Testing framework
- [Cloudinary Documentation](https://cloudinary.com/documentation) - File upload service

### Monitoring and Logging

- Winston logging configured for:
  - Error tracking
  - API request logging
  - Performance monitoring
- Log levels: error, warn, info, debug
- Logs stored in: `/logs` directory

### Troubleshooting

Common issues and solutions:

1. Database Connection Issues
```bash
# Check database status
$ npx prisma db push --preview-feature

# Reset database
$ npx prisma migrate reset
```

2. Authentication Issues
```bash
# Clear token cache
$ npm run clear:cache

# Check OAuth configurations
$ npm run check:oauth
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

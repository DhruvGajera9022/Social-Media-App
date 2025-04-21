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
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRATION=7d

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
FRONTEND_URL=http://localhost:3001
```

## Technology Stack

### Core Framework
- **NestJS** (v11.0.1) - Progressive Node.js framework
- **TypeScript** (v5.7.3) - Typed JavaScript

### Database
- **PostgreSQL** - Primary database
- **Prisma ORM** (v6.5.0) - Next-generation ORM

### Authentication
- **@nestjs/jwt** (v11.0.0) - JWT implementation
- **@nestjs/passport** (v11.0.5) - Authentication middleware
- **bcrypt** (v5.1.1) - Password hashing
- **passport-jwt** (v4.0.1) - JWT strategy
- **passport-google-oauth20** (v2.0.0) - Google OAuth
- **passport-facebook** (v3.0.0) - Facebook OAuth
- **passport-twitter** (v1.0.4) - Twitter OAuth

### Security
- **otplib** (v12.0.1) - Two-factor authentication
- **qrcode** (v1.5.4) - QR code generation for 2FA

### File Storage
- **cloudinary** (v2.6.0) - Cloud-based image and video management
- **multer** (v1.4.5-lts.1) - File upload handling

### Email
- **nodemailer** (v6.10.0) - Email sending

### Validation & Transformation
- **class-validator** (v0.14.1) - Validation decorators
- **class-transformer** (v0.5.1) - Object transformation

### Logging
- **winston** (v3.17.0) - Logging library
- **nest-winston** (v1.10.2) - Winston integration for NestJS

### API Documentation
- **@nestjs/swagger** (v11.0.7) - OpenAPI specification

## API Endpoints

### Authentication

```
POST /auth/register           - Register a new user
POST /auth/login              - Authenticate user and generate tokens
POST /auth/2fa/authenticate   - Authenticate with 2FA code
GET  /auth/google             - Initiate Google OAuth login
GET  /auth/google/callback    - Google OAuth callback
POST /auth/refresh            - Refresh access token
PATCH /auth/change-password   - Change user password (protected)
POST /auth/forgot-password    - Request password reset
PATCH /auth/reset-password    - Reset password with token
```

### Posts

```
GET  /post                    - Get all posts
GET  /post/bookmarks          - Get bookmarked posts (protected)
GET  /post/:id/comment        - Get comments for a post
GET  /post/:id                - Get post by ID (protected)
POST /post                    - Create new post (protected)
PATCH /post/:id               - Edit post (protected)
PATCH /post/:id/pin           - Pin/unpin post (protected)
PATCH /post/:id/like          - Like/unlike post (protected)
DELETE /post/:id              - Delete post (protected)
POST /post/:id/comment        - Comment on post (protected)
PATCH /post/:id/bookmark      - Bookmark/unbookmark post (protected)
```

### Profile

```
GET  /profile                 - Get user profile (protected)
GET  /profile/:id             - Get profile by user ID
PATCH /profile                - Update profile (protected)
POST /profile/2fa/generate    - Generate 2FA secret (protected)
POST /profile/2fa/turn-on     - Enable 2FA (protected)
POST /profile/2fa/turn-off    - Disable 2FA (protected)
POST /profile/upload-avatar   - Upload profile avatar (protected)
```

### Users

```
GET  /users                   - Get all users (admin only)
GET  /users/:id               - Get user by ID (admin only)
PATCH /users/:id/role         - Update user role (admin only)
DELETE /users/:id             - Delete user (admin only)
POST /users/follow/:id        - Follow user (protected)
DELETE /users/unfollow/:id    - Unfollow user (protected)
GET  /users/followers         - Get followers (protected)
GET  /users/following         - Get following users (protected)
```

### Roles

```
GET  /roles                   - Get all roles (admin only)
POST /roles                   - Create new role (admin only)
PATCH /roles/:id              - Update role (admin only)
DELETE /roles/:id             - Delete role (admin only)
```

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

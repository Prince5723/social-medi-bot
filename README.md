# Social Media Automation Bot

A production-ready Node.js backend for social media automation with scheduled posting, user interaction automation, trend monitoring, and analytics.

## Features

- **Scheduled Posting**: Schedule posts across Twitter, Instagram, and LinkedIn
- **User Interaction Automation**: Automated likes, comments, and follows based on rules
- **Data Scraping**: Collect public data from social media platforms
- **Trend Monitoring**: Monitor trending hashtags and topics in real-time
- **Analytics & Reporting**: Generate comprehensive engagement reports
- **JWT Authentication**: Secure API with JWT-based authentication
- **Social Media OAuth**: Connect accounts via OAuth 1.0a/2.0 flows
- **Input Validation**: Robust validation using Zod
- **Error Handling**: Comprehensive error handling and logging
- **API Documentation**: Swagger/OpenAPI documentation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Queue System**: Bull with Redis
- **Authentication**: JWT
- **OAuth**: OAuth 1.0a (Twitter), OAuth 2.0 (Instagram, LinkedIn)
- **Validation**: Zod
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Redis (for job queues)
- Social Media API credentials (Twitter, Instagram, LinkedIn)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd social-media-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/social-media-bot
   JWT_SECRET=your_jwt_secret_here
   REDIS_URL=redis://localhost:6379
   
   # Twitter API (OAuth 1.0a)
   TWITTER_API_KEY=your_twitter_api_key
   TWITTER_API_SECRET=your_twitter_api_secret
   
   # Instagram API (OAuth 2.0)
   INSTAGRAM_CLIENT_ID=your_instagram_client_id
   INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
   INSTAGRAM_REDIRECT_URI=http://localhost:8000/api/social-auth/instagram/callback
   
   # LinkedIn API (OAuth 2.0)
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   LINKEDIN_REDIRECT_URI=http://localhost:8000/api/social-auth/linkedin/callback
   
   # Server Configuration
   PORT=8000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Connecting Social Media Accounts

### 1. Register and Login
First, create an account and get your JWT token:
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 2. Connect Twitter Account
```bash
# Initiate Twitter OAuth
curl -X POST http://localhost:8000/api/social-auth/twitter/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"callbackUrl":"http://localhost:8000/api/social-auth/twitter/callback?userId=Your_user_id"}'

# User will be redirected to Twitter for authorization
# After authorization, Twitter redirects back to the callback URL
```

### 3. Connect Instagram Account
```bash
# Initiate Instagram OAuth
curl -X POST http://localhost:8000/api/social-auth/instagram/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"callbackUrl":"http://localhost:8000/api/social-auth/instagram/callback/YOUR_USER_ID"}'

# User will be redirected to Instagram for authorization
```

### 4. Connect LinkedIn Account
```bash
# Initiate LinkedIn OAuth
curl -X POST http://localhost:8000/api/social-auth/linkedin/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"callbackUrl":"http://localhost:8000/api/social-auth/linkedin/callback/YOUR_USER_ID"}'

# User will be redirected to LinkedIn for authorization
```

### 5. Check Connected Accounts
```bash
# Get list of connected accounts
curl -X GET http://localhost:8000/api/social-auth/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Disconnect Account
```bash
# Disconnect a specific platform
curl -X DELETE http://localhost:8000/api/social-auth/accounts/twitter \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API Documentation

Once the server is running, visit `http://localhost:8000/api-docs` for interactive API documentation.

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Social Media Authentication

- `POST /api/social-auth/twitter/initiate` - Start Twitter OAuth flow
- `GET /api/social-auth/twitter/callback/:userId` - Twitter OAuth callback
- `POST /api/social-auth/instagram/initiate` - Start Instagram OAuth flow
- `GET /api/social-auth/instagram/callback/:userId` - Instagram OAuth callback
- `POST /api/social-auth/linkedin/initiate` - Start LinkedIn OAuth flow
- `GET /api/social-auth/linkedin/callback/:userId` - LinkedIn OAuth callback
- `GET /api/social-auth/accounts` - Get connected accounts
- `DELETE /api/social-auth/accounts/:platform` - Disconnect account

### Scheduled Posts

- `POST /api/posts` - Create a scheduled post
- `GET /api/posts` - Get scheduled posts
- `GET /api/posts/:id` - Get specific scheduled post
- `PUT /api/posts/:id` - Update scheduled post
- `DELETE /api/posts/:id` - Cancel scheduled post

### User Interactions

- `POST /api/interactions` - Create an interaction
- `POST /api/interactions/:id/execute` - Execute an interaction
- `GET /api/interactions/history` - Get interaction history
- `GET /api/interactions/stats` - Get interaction statistics
- `GET /api/interactions/content/:platform` - Find content for interaction
- `PUT /api/interactions/rules` - Update interaction rules
- `PUT /api/interactions/auto-interaction` - Toggle auto-interaction

### Analytics & Reports

- `POST /api/reports` - Generate a new report
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get specific report
- `DELETE /api/reports/:id` - Delete report

### Trend Monitoring

- `GET /api/trends` - Get trending topics
- `GET /api/trends/:id` - Get specific trend
- `POST /api/trends/custom` - Create custom trend
- `PUT /api/trends/:id/status` - Update trend status
- `DELETE /api/trends/:id` - Delete trend

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── db.js        # Database connection
│   └── logger.js    # Winston logger setup
├── controllers/      # Route controllers
│   ├── auth.controller.js
│   ├── social-auth.controller.js
│   ├── post.controller.js
│   ├── interaction.controller.js
│   ├── report.controller.js
│   ├── trend.controller.js
│   └── user.controller.js
├── middlewares/      # Express middlewares
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   └── validate.middleware.js
├── models/          # Mongoose models
│   ├── user.model.js
│   ├── schedule.model.js
│   ├── interaction.model.js
│   ├── report.model.js
│   └── trend.model.js
├── routes/          # Express routes
│   ├── auth.routes.js
│   ├── social-auth.routes.js
│   ├── post.routes.js
│   ├── interaction.routes.js
│   ├── report.routes.js
│   ├── trend.routes.js
│   ├── user.routes.js
│   └── index.js
├── services/        # Business logic
│   ├── scheduler.service.js
│   ├── interaction.service.js
│   ├── social-auth.service.js
│   └── social/      # Social media platform services
│       ├── twitter.service.js
│       ├── instagram.service.js
│       └── linkedin.service.js
├── utils/           # Utility functions
│   └── jwt.js
├── app.js           # Express app setup
└── server.js        # Server entry point
```

## Social Media Integration

The application includes OAuth flows for connecting social media accounts:

### Twitter (OAuth 1.0a)
- Uses OAuth 1.0a for authentication
- Stores access token and secret
- No refresh token support

### Instagram (OAuth 2.0)
- Uses OAuth 2.0 for authentication
- Basic Display API
- No refresh token in basic flow

### LinkedIn (OAuth 2.0)
- Uses OAuth 2.0 for authentication
- Supports refresh tokens
- Professional API access

Each platform service implements:
- `createPost(schedule)` - Create a new post
- `likePost(postId)` - Like a post
- `commentOnPost(postId, comment)` - Comment on a post
- `followUser(userId)` - Follow a user
- `searchByHashtag(hashtag, limit)` - Search posts by hashtag
- `searchByKeyword(keyword, limit)` - Search posts by keyword

## Deployment

### Render Deployment

1. **Create a Render account** and connect your repository
2. **Set environment variables** in Render dashboard
3. **Configure build command**: `npm install`
4. **Configure start command**: `npm start`
5. **Add MongoDB and Redis services** or use external providers

### Environment Variables for Production

```env
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_secure_jwt_secret
REDIS_URL=your_redis_url
NODE_ENV=production
PORT=10000

# Social Media API Keys
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/api/social-auth/instagram/callback
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=https://yourdomain.com/api/social-auth/linkedin/callback
```

## Rate Limiting & Best Practices

- Respect social media platform rate limits
- Implement exponential backoff for failed requests
- Use environment variables for sensitive data
- Monitor API usage and implement proper logging
- Follow each platform's terms of service
- Store OAuth tokens securely
- Implement token refresh for LinkedIn

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository. 
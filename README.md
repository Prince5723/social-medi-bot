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
   INSTAGRAM_REDIRECT_URI=https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/instagram/callback
   
   # LinkedIn API (OAuth 2.0)
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   LINKEDIN_REDIRECT_URI=https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/linkedin/callback
   
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
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'

# Login
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 2. Connect Twitter Account
```bash
# Initiate Twitter OAuth
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/twitter/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"callbackUrl":"https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/twitter/callback/YOUR_USER_ID"}'

# Copy the 'authUrl' from the response and open it in your browser to authorize.
```

### 3. Connect Instagram Account
```bash
# Initiate Instagram OAuth
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/instagram/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"callbackUrl":"https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/instagram/callback/YOUR_USER_ID"}'

# Copy the 'authUrl' from the response and open it in your browser to authorize.
```

### 4. Connect LinkedIn Account
```bash
# Initiate LinkedIn OAuth
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/linkedin/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"callbackUrl":"https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/linkedin/callback/YOUR_USER_ID"}'

# Copy the 'authUrl' from the response and open it in your browser to authorize.
```

### 5. Check Connected Accounts
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Disconnect Account
```bash
curl -X DELETE https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/accounts/twitter \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API Documentation

Once the server is running, visit `https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api-docs` for interactive API documentation.

---

## API Endpoints

### Authentication

#### Register
```bash
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'
```

#### Login
```bash
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### Get Profile
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Profile
```bash
curl -X PUT https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Name"}'
```

### Social Media Authentication

#### Twitter
- **Initiate:**
  ```bash
  curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/twitter/initiate \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"callbackUrl":"https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/twitter/callback/YOUR_USER_ID"}'
  # Copy the 'authUrl' from the response and open it in your browser to authorize.
  ```
- **Callback:**
  ```
  GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/twitter/callback/YOUR_USER_ID?oauth_token=...&oauth_verifier=...
  ```

#### Instagram
- **Initiate:**
  ```bash
  curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/instagram/initiate \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"callbackUrl":"https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/instagram/callback/YOUR_USER_ID"}'
  # Copy the 'authUrl' from the response and open it in your browser to authorize.
  ```
- **Callback:**
  ```
  GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/instagram/callback/YOUR_USER_ID?code=...
  ```

#### LinkedIn
- **Initiate:**
  ```bash
  curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/linkedin/initiate \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"callbackUrl":"https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/linkedin/callback/YOUR_USER_ID"}'
  # Copy the 'authUrl' from the response and open it in your browser to authorize.
  ```
- **Callback:**
  ```
  GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/linkedin/callback/YOUR_USER_ID?code=...
  ```

- **Get Connected Accounts:**
  ```bash
  curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/accounts \
    -H "Authorization: Bearer YOUR_JWT_TOKEN"
  ```
- **Disconnect Account:**
  ```bash
  curl -X DELETE https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/social-auth/accounts/:platform \
    -H "Authorization: Bearer YOUR_JWT_TOKEN"
  ```

### Scheduled Posts

#### Create Scheduled Post
```bash
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello World!","platform":"twitter","scheduleTime":"2025-07-03T10:00:00Z"}'
```

#### Get Scheduled Posts
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Specific Scheduled Post
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/posts/POST_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Scheduled Post
```bash
curl -X PUT https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/posts/POST_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Updated content"}'
```

#### Cancel Scheduled Post
```bash
curl -X DELETE https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/posts/POST_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### User Interactions

#### Create Interaction
```bash
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/interactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"like","targetId":"SOME_ID","platform":"twitter"}'
```

#### Execute Interaction
```bash
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/interactions/INTERACTION_ID/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Interaction History
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/interactions/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Interaction Statistics
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/interactions/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Find Content for Interaction
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/interactions/content/twitter \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Interaction Rules
```bash
curl -X PUT https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/interactions/rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rule":"new rule"}'
```

#### Toggle Auto-Interaction
```bash
curl -X PUT https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/interactions/auto-interaction \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
```

### Analytics & Reports

#### Generate New Report
```bash
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/reports \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"engagement","platform":"twitter"}'
```

#### Get All Reports
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/reports \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Specific Report
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/reports/REPORT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Delete Report
```bash
curl -X DELETE https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/reports/REPORT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Trend Monitoring

#### Get Trending Topics
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/trends \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Specific Trend
```bash
curl -X GET https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/trends/TREND_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create Custom Trend
```bash
curl -X POST https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/trends/custom \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Custom Trend","keywords":["keyword1","keyword2"]}'
```

#### Update Trend Status
```bash
curl -X PUT https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/trends/TREND_ID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

#### Delete Trend
```bash
curl -X DELETE https://95bd-2404-7c80-5c-d4b-c90e-f60b-c3a8-344.ngrok-free.app/api/trends/TREND_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

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
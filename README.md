# Social Media Automation Bot

A production-ready Node.js backend for social media automation with scheduled posting, user interaction automation, trend monitoring, and analytics.

## Features

- **Scheduled Posting**: Schedule posts across Twitter and LinkedIn
- **User Interaction Automation**: Automated likes, comments, and follows based on rules
- **Data Scraping**: Collect public data from social media platforms
- **Trend Monitoring**: Monitor trending hashtags and topics in real-time
- **Analytics & Reporting**: Generate comprehensive engagement reports
- **JWT Authentication**: Secure API with JWT-based authentication
- **Social Media OAuth**: Connect accounts via OAuth 2.0 flows
- **Input Validation**: Robust validation using Zod
- **Error Handling**: Comprehensive error handling and logging
- **API Documentation**: Swagger/OpenAPI documentation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Queue System**: Bull with Redis
- **Authentication**: JWT
- **OAuth**: OAuth 2.0 (Twitter, LinkedIn)
- **Validation**: Zod
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Redis (for job queues)
- Social Media API credentials (Twitter, LinkedIn)

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

   # Twitter API
   TWITTER_API_KEY=your_twitter_api_key
   TWITTER_API_SECRET=your_twitter_api_secret

   # LinkedIn API
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

---

## API Documentation

All endpoints are prefixed with `/api`.  
Replace `YOUR_JWT_TOKEN` with your actual JWT token.

Access Swagger documentation here:  
📄 [http://localhost:8000/api-docs](http://localhost:8000/api-docs)

---

### 🔐 Authentication

#### Register  
`POST /api/auth/register`
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login  
`POST /api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Profile  
`GET /api/auth/profile`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Update Profile  
`PUT /api/auth/profile`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "name": "New Name"
}
```

---

### 🔗 Social Media Authentication

#### Connect Twitter  
**Initiate:**  
`POST /api/social-auth/twitter/initiate`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "callbackUrl": "http://localhost:8000/api/social-auth/twitter/callback/YOUR_USER_ID"
}
```
_Response will contain `authUrl` — open in browser to complete the OAuth process._

#### Connect LinkedIn  
**Initiate:**  
`POST /api/social-auth/linkedin/initiate`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "callbackUrl": "http://localhost:8000/api/social-auth/linkedin/callback/YOUR_USER_ID"
}
```

#### Get Connected Accounts  
`GET /api/social-auth/accounts`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Disconnect Account  
`DELETE /api/social-auth/accounts/:platform`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

---

### 📅 Scheduled Posts

#### Create Scheduled Post  
`POST /api/posts`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "content": "Hello World!",
  "platform": "twitter",
  "scheduleTime": "2025-07-03T10:00:00Z"
}
```

#### Get All Scheduled Posts  
`GET /api/posts`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Get Specific Scheduled Post  
`GET /api/posts/:postId`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Update Scheduled Post  
`PUT /api/posts/:postId`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "content": "Updated content"
}
```

#### Cancel Scheduled Post  
`DELETE /api/posts/:postId`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

---

### 🤖 User Interactions

#### Create Interaction  
`POST /api/interactions`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "type": "like",
  "targetId": "SOME_ID",
  "platform": "twitter"
}
```

#### Execute Interaction  
`POST /api/interactions/:interactionId/execute`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Get Interaction History  
`GET /api/interactions/history`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Get Interaction Stats  
`GET /api/interactions/stats`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Discover Content  
`GET /api/interactions/content/twitter`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Update Interaction Rules  
`PUT /api/interactions/rules`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "rule": "new rule"
}
```

#### Toggle Auto Interaction  
`PUT /api/interactions/auto-interaction`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "enabled": true
}
```

---

### 📊 Analytics & Reports

#### Generate Report  
`POST /api/reports`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "type": "engagement",
  "platform": "twitter"
}
```

#### Get All Reports  
`GET /api/reports`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Get Specific Report  
`GET /api/reports/:reportId`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Delete Report  
`DELETE /api/reports/:reportId`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

---

### 📈 Trend Monitoring

#### Get Trending Topics  
`GET /api/trends`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Get Specific Trend  
`GET /api/trends/:trendId`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

#### Create Custom Trend  
`POST /api/trends/custom`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "name": "Custom Trend",
  "keywords": ["keyword1", "keyword2"]
}
```

#### Update Trend Status  
`PUT /api/trends/:trendId/status`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`  
`Content-Type: application/json`  
```json
{
  "status": "active"
}
```

#### Delete Trend  
`DELETE /api/trends/:trendId`  
**Headers:**  
`Authorization: Bearer <YOUR_JWT_TOKEN>`

---

## Project Structure

```
src/
├── config/
├── controllers/
├── middlewares/
├── models/
├── routes/
├── services/
│   └── social/
├── utils/
├── app.js
└── server.js
```

## Social Media Integration

- OAuth flows for Twitter and LinkedIn
- Each platform service implements:
  - `createPost(schedule)`
  - `likePost(postId)`
  - `commentOnPost(postId, comment)`
  - `followUser(userId)`
  - `searchByHashtag(hashtag, limit)`
  - `searchByKeyword(keyword, limit)`

## Rate Limiting & Best Practices

- Respect platform rate limits
- Use environment variables for secrets
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
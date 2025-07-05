const axios = require('axios');
const User = require('../../models/user.model');
const logger = require('../../config/logger');

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

// Validate required environment variables
if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
  logger.error('Twitter OAuth 2.0 credentials not configured');
  throw new Error('Twitter OAuth 2.0 credentials missing');
}

const TWITTER_API_BASE = 'https://api.twitter.com/2';

class TwitterService {
  async getUserCredentials(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.socialAccounts?.twitter?.accessToken) {
        throw new Error('Twitter account not connected or credentials missing');
      }
      
      console.log("user.socialAccounts.twitter.accessToken", user.socialAccounts.twitter.accessToken);
      
      return user.socialAccounts.twitter;
    } catch (error) {
      logger.error('Error getting user credentials:', error);
      throw error;
    }
  }

  async refreshAccessToken(userId) {
    try {
      const user = await User.findById(userId);
      if (!user?.socialAccounts?.twitter?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('https://api.twitter.com/2/oauth2/token', {
        refresh_token: user.socialAccounts.twitter.refreshToken,
        grant_type: 'refresh_token',
        client_id: TWITTER_CLIENT_ID,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`
        }
      });

      const { access_token, refresh_token, expires_in } = response.data;
      
      // Update user's tokens
      await User.findByIdAndUpdate(userId, {
        'socialAccounts.twitter.accessToken': access_token,
        'socialAccounts.twitter.refreshToken': refresh_token,
        'socialAccounts.twitter.expiresAt': new Date(Date.now() + expires_in * 1000)
      });

      return access_token;
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  async getValidAccessToken(userId) {
    try {
      const credentials = await this.getUserCredentials(userId);
      
      // Check if token is expired (if expiresAt is stored)
      if (credentials.expiresAt && new Date() >= new Date(credentials.expiresAt)) {
        logger.info('Access token expired, refreshing...');
        return await this.refreshAccessToken(userId);
      }
      
      return credentials.accessToken;
    } catch (error) {
      // If refresh fails, try to refresh anyway
      if (error.message.includes('expired') || error.message.includes('invalid_token')) {
        return await this.refreshAccessToken(userId);
      }
      throw error;
    }
  }

  getAuthHeader(accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`
    };
  }

  async createPost(schedule) {
    try {
      const accessToken = await this.getValidAccessToken(schedule.user);
      const url = `${TWITTER_API_BASE}/tweets`;
      
      // Validate content
      if (!schedule.content?.text) {
        throw new Error('Tweet content is required');
      }
      
      const data = { text: schedule.content.text };
      
      // Check tweet length (Twitter limit is 280 characters)
      if (data.text.length > 280) {
        throw new Error('Tweet exceeds 280 character limit');
      }
      
      const headers = {
        ...this.getAuthHeader(accessToken),
        'Content-Type': 'application/json'
      };
      
      logger.info('Posting tweet', { 
        user: schedule.user, 
        textLength: data.text.length,
        scheduleId: schedule._id 
      });
      
      const response = await axios.post(url, data, { headers });
      
      if (!response.data?.data?.id) {
        throw new Error('Invalid response from Twitter API');
      }
      
      logger.info('Tweet posted successfully', { 
        tweetId: response.data.data.id,
        scheduleId: schedule._id 
      });
      
      return { id: response.data.data.id };
    } catch (error) {
      logger.error('Error creating tweet:', error);
      this.handleApiError(error, 'createPost');
    }
  }

  async likePost(postId, userId) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      
      // Get user id from Twitter API
      const userInfo = await this.getTwitterUser(accessToken);
      const url = `${TWITTER_API_BASE}/users/${userInfo.id}/likes`;
      const data = { tweet_id: postId };
      
      const headers = {
        ...this.getAuthHeader(accessToken),
        'Content-Type': 'application/json'
      };
      
      logger.info('Liking tweet', { user: userId, tweet: postId });
      
      const response = await axios.post(url, data, { headers });
      
      return { 
        id: response.data?.data?.liked ? postId : null,
        liked: response.data?.data?.liked || false
      };
    } catch (error) {
      logger.error('Error liking tweet:', error);
      this.handleApiError(error, 'likePost');
    }
  }

  async commentOnPost(postId, comment, userId) {
    try {
      if (!comment || comment.trim().length === 0) {
        throw new Error('Comment text is required');
      }
      
      if (comment.length > 280) {
        throw new Error('Comment exceeds 280 character limit');
      }
      
      const accessToken = await this.getValidAccessToken(userId);
      const url = `${TWITTER_API_BASE}/tweets`;
      
      const data = {
        text: comment.trim(),
        reply: { in_reply_to_tweet_id: postId }
      };
      
      const headers = {
        ...this.getAuthHeader(accessToken),
        'Content-Type': 'application/json'
      };
      
      logger.info('Replying to tweet', { user: userId, tweet: postId });
      
      const response = await axios.post(url, data, { headers });
      
      if (!response.data?.data?.id) {
        throw new Error('Invalid response from Twitter API');
      }
      
      return { id: response.data.data.id };
    } catch (error) {
      logger.error('Error commenting on tweet:', error);
      this.handleApiError(error, 'commentOnPost');
    }
  }

  async followUser(targetUserId, userId) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      const userInfo = await this.getTwitterUser(accessToken);
      
      const url = `${TWITTER_API_BASE}/users/${userInfo.id}/following`;
      const data = { target_user_id: targetUserId };
      
      const headers = {
        ...this.getAuthHeader(accessToken),
        'Content-Type': 'application/json'
      };
      
      logger.info('Following user', { user: userId, target: targetUserId });
      
      const response = await axios.post(url, data, { headers });
      
      return { 
        id: response.data?.data?.following ? targetUserId : null,
        following: response.data?.data?.following || false
      };
    } catch (error) {
      logger.error('Error following user:', error);
      this.handleApiError(error, 'followUser');
    }
  }

  async retweetPost(postId, userId) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      const userInfo = await this.getTwitterUser(accessToken);
      
      const url = `${TWITTER_API_BASE}/users/${userInfo.id}/retweets`;
      const data = { tweet_id: postId };
      
      const headers = {
        ...this.getAuthHeader(accessToken),
        'Content-Type': 'application/json'
      };
      
      logger.info('Retweeting', { user: userId, tweet: postId });
      
      const response = await axios.post(url, data, { headers });
      
      return { 
        id: response.data?.data?.retweeted ? postId : null,
        retweeted: response.data?.data?.retweeted || false
      };
    } catch (error) {
      logger.error('Error retweeting:', error);
      this.handleApiError(error, 'retweetPost');
    }
  }

  async searchByHashtag(hashtag, userId, limit = 10) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      
      // Validate hashtag
      if (!hashtag || hashtag.trim().length === 0) {
        throw new Error('Hashtag is required');
      }
      
      // Remove # if present and encode
      const cleanHashtag = hashtag.replace(/^#/, '');
      const query = encodeURIComponent(`#${cleanHashtag}`);
      
      // Limit validation
      const maxResults = Math.min(Math.max(limit, 1), 100); // Twitter API limit
      
      const url = `${TWITTER_API_BASE}/tweets/search/recent?query=${query}&max_results=${maxResults}&tweet.fields=created_at,author_id`;
      
      const headers = {
        ...this.getAuthHeader(accessToken),
        'Content-Type': 'application/json'
      };
      
      logger.info('Searching tweets by hashtag', { user: userId, hashtag: cleanHashtag });
      
      const response = await axios.get(url, { headers });
      
      if (!response.data?.data) {
        return [];
      }
      
      return response.data.data.map(tweet => ({
        contentId: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        user: { userId: tweet.author_id }
      }));
    } catch (error) {
      logger.error('Error searching by hashtag:', error);
      this.handleApiError(error, 'searchByHashtag');
    }
  }

  async searchByKeyword(keyword, userId, limit = 10) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      
      // Validate keyword
      if (!keyword || keyword.trim().length === 0) {
        throw new Error('Keyword is required');
      }
      
      const query = encodeURIComponent(keyword.trim());
      const maxResults = Math.min(Math.max(limit, 1), 100);
      
      const url = `${TWITTER_API_BASE}/tweets/search/recent?query=${query}&max_results=${maxResults}&tweet.fields=created_at,author_id`;
      
      const headers = {
        ...this.getAuthHeader(accessToken),
        'Content-Type': 'application/json'
      };
      
      logger.info('Searching tweets by keyword', { user: userId, keyword });
      
      const response = await axios.get(url, { headers });
      
      if (!response.data?.data) {
        return [];
      }
      
      return response.data.data.map(tweet => ({
        contentId: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        user: { userId: tweet.author_id }
      }));
    } catch (error) {
      logger.error('Error searching by keyword:', error);
      this.handleApiError(error, 'searchByKeyword');
    }
  }

  async getTwitterUser(accessToken) {
    try {
      const url = 'https://api.twitter.com/2/users/me';
      
      const headers = {
        ...this.getAuthHeader(accessToken),
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get(url, { headers });
      
      if (!response.data?.data) {
        throw new Error('Invalid user data from Twitter API');
      }
      
      return response.data.data;
    } catch (error) {
      logger.error('Error getting Twitter user:', error);
      throw error;
    }
  }

  handleApiError(error, context) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      logger.error(`Twitter API error [${context}]`, {
        status,
        data,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Handle specific error codes
      switch (status) {
        case 400:
          throw new Error(data?.detail || data?.title || 'Bad request to Twitter API');
        case 401:
          throw new Error('Twitter authentication failed. Please reconnect your account.');
        case 403:
          throw new Error('Twitter API access forbidden. Check your permissions.');
        case 404:
          throw new Error('Twitter resource not found.');
        case 429:
          const resetTime = error.response.headers['x-rate-limit-reset'];
          const resetDate = resetTime ? new Date(resetTime * 1000) : null;
          throw new Error(`Twitter rate limit exceeded. ${resetDate ? `Try again after ${resetDate.toLocaleString()}` : 'Please try again later.'}`);
        case 500:
        case 502:
        case 503:
          throw new Error('Twitter API is temporarily unavailable. Please try again later.');
        default:
          throw new Error(data?.detail || data?.title || `Twitter API error (${status})`);
      }
    } else if (error.request) {
      logger.error(`Twitter API network error [${context}]`, { 
        message: error.message,
        code: error.code 
      });
      throw new Error('Network error connecting to Twitter API');
    } else {
      logger.error(`Twitter API error [${context}]`, { message: error.message });
      throw new Error('Twitter API error: ' + error.message);
    }
  }

  // Health check method
  async healthCheck(userId) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      await this.getTwitterUser(accessToken);
      return { status: 'healthy', service: 'twitter' };
    } catch (error) {
      logger.error('Twitter health check failed:', error);
      return { status: 'unhealthy', service: 'twitter', error: error.message };
    }
  }

  // Get rate limit status (Note: This endpoint may not be available in OAuth 2.0)
  async getRateLimitStatus(userId) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      
      // Note: Rate limit status endpoint might not be available with OAuth 2.0
      // You might need to use a different approach or endpoint
      const url = 'https://api.twitter.com/2/users/me';
      
      const headers = {
        ...this.getAuthHeader(accessToken),
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get(url, { headers });
      
      // Extract rate limit info from response headers
      const rateLimitInfo = {
        remaining: response.headers['x-rate-limit-remaining'],
        reset: response.headers['x-rate-limit-reset'],
        limit: response.headers['x-rate-limit-limit']
      };
      
      return rateLimitInfo;
    } catch (error) {
      logger.error('Error getting rate limit status:', error);
      throw error;
    }
  }
}

module.exports = new TwitterService();
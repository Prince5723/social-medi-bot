const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const User = require('../../models/user.model');
const logger = require('../../config/logger');

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;

// Validate required environment variables
if (!TWITTER_API_KEY || !TWITTER_API_SECRET) {
  logger.error('Twitter API credentials not configured');
  throw new Error('Twitter API credentials missing');
}

const twitterOAuth = new OAuth({
  consumer: { key: TWITTER_API_KEY, secret: TWITTER_API_SECRET },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

const TWITTER_API_BASE = 'https://api.twitter.com/2';

class TwitterService {
  async getUserCredentials(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.socialAccounts?.twitter?.accessToken || !user.socialAccounts?.twitter?.accessTokenSecret) {
        throw new Error('Twitter account not connected or credentials missing');
      }
      console.log("user.socialAccounts.twitter.accessToken", user.socialAccounts.twitter.accessToken);
      console.log("user.socialAccounts.twitter.accessTokenSecret", user.socialAccounts.twitter.accessTokenSecret);
      
      return user.socialAccounts.twitter;
    } catch (error) {
      logger.error('Error getting user credentials:', error);
      throw error;
    }
  }

  getAuthHeader(url, method, userCreds, data = {}) {
    try {
      const token = {
        key: userCreds.accessToken,
        secret: userCreds.accessTokenSecret
      };
      
      // For OAuth 1.0a, we need to include data in the signature for POST requests
      const requestData = method === 'POST' ? data : {};
      
      return twitterOAuth.toHeader(
        twitterOAuth.authorize({ url, method, data: requestData }, token)
      );
    } catch (error) {
      logger.error('Error generating auth header:', error);
      throw new Error('Authentication failed');
    }
  }

  async createPost(schedule) {
    try {
      const credentials = await this.getUserCredentials(schedule.user);
      const url = `${TWITTER_API_BASE}/tweets`;
      const method = 'POST';
      
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
        ...this.getAuthHeader(url, method, credentials, data),
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
      const credentials = await this.getUserCredentials(userId);
      
      // Get user id from Twitter API
      const userInfo = await this.getTwitterUser(credentials);
      const url = `${TWITTER_API_BASE}/users/${userInfo.id}/likes`;
      const method = 'POST';
      const data = { tweet_id: postId };
      
      const headers = {
        ...this.getAuthHeader(url, method, credentials, data),
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
      
      const credentials = await this.getUserCredentials(userId);
      const url = `${TWITTER_API_BASE}/tweets`;
      const method = 'POST';
      
      const data = {
        text: comment.trim(),
        reply: { in_reply_to_tweet_id: postId }
      };
      
      const headers = {
        ...this.getAuthHeader(url, method, credentials, data),
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
      const credentials = await this.getUserCredentials(userId);
      const userInfo = await this.getTwitterUser(credentials);
      
      const url = `${TWITTER_API_BASE}/users/${userInfo.id}/following`;
      const method = 'POST';
      const data = { target_user_id: targetUserId };
      
      const headers = {
        ...this.getAuthHeader(url, method, credentials, data),
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
      const credentials = await this.getUserCredentials(userId);
      const userInfo = await this.getTwitterUser(credentials);
      
      const url = `${TWITTER_API_BASE}/users/${userInfo.id}/retweets`;
      const method = 'POST';
      const data = { tweet_id: postId };
      
      const headers = {
        ...this.getAuthHeader(url, method, credentials, data),
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
      const credentials = await this.getUserCredentials(userId);
      
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
      const method = 'GET';
      
      const headers = {
        ...this.getAuthHeader(url, method, credentials),
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
      const credentials = await this.getUserCredentials(userId);
      
      // Validate keyword
      if (!keyword || keyword.trim().length === 0) {
        throw new Error('Keyword is required');
      }
      
      const query = encodeURIComponent(keyword.trim());
      const maxResults = Math.min(Math.max(limit, 1), 100);
      
      const url = `${TWITTER_API_BASE}/tweets/search/recent?query=${query}&max_results=${maxResults}&tweet.fields=created_at,author_id`;
      const method = 'GET';
      
      const headers = {
        ...this.getAuthHeader(url, method, credentials),
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

  async getTwitterUser(credentials) {
    try {
      const url = 'https://api.twitter.com/2/users/me';
      const method = 'GET';
      
      const headers = {
        ...this.getAuthHeader(url, method, credentials),
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
      const credentials = await this.getUserCredentials(userId);
      await this.getTwitterUser(credentials);
      return { status: 'healthy', service: 'twitter' };
    } catch (error) {
      logger.error('Twitter health check failed:', error);
      return { status: 'unhealthy', service: 'twitter', error: error.message };
    }
  }

  // Get rate limit status
  async getRateLimitStatus(userId) {
    try {
      const credentials = await this.getUserCredentials(userId);
      const url = 'https://api.twitter.com/1.1/application/rate_limit_status.json';
      const method = 'GET';
      
      const headers = {
        ...this.getAuthHeader(url, method, credentials),
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      logger.error('Error getting rate limit status:', error);
      throw error;
    }
  }
}

module.exports = new TwitterService();
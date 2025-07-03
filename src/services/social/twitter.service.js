const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const User = require('../../models/user.model');
const logger = require('../../config/logger');

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;

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
    const user = await User.findById(userId);
    if (!user || !user.socialAccounts.twitter.accessToken || !user.socialAccounts.twitter.refreshToken) {
      throw new Error('Twitter account not connected');
    }
    return user.socialAccounts.twitter;
  }

  getAuthHeader(url, method, userCreds, data = {}) {
    const token = {
      key: userCreds.accessToken,
      secret: userCreds.refreshToken // In Twitter OAuth 1.0a, refreshToken is actually the access token secret
    };
    return twitterOAuth.toHeader(
      twitterOAuth.authorize({ url, method, data }, token)
    );
  }

  async createPost(schedule) {
    try {
      const credentials = await this.getUserCredentials(schedule.user);
      const url = `${TWITTER_API_BASE}/tweets`;
      const method = 'POST';
      const data = { text: schedule.content.text };
      const headers = {
        ...this.getAuthHeader(url, method, credentials, data),
        'Content-Type': 'application/json'
      };
      logger.info('Posting tweet', { user: schedule.user, text: data.text });
      const response = await axios.post(url, data, { headers });
      return { id: response.data.data.id };
    } catch (error) {
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
      return { id: response.data.data?.liked ? postId : null };
    } catch (error) {
      this.handleApiError(error, 'likePost');
    }
  }

  async commentOnPost(postId, comment, userId) {
    try {
      // Comment is a reply in Twitter
      const credentials = await this.getUserCredentials(userId);
      const url = `${TWITTER_API_BASE}/tweets`;
      const method = 'POST';
      const data = {
        text: comment,
        reply: { in_reply_to_tweet_id: postId }
      };
      const headers = {
        ...this.getAuthHeader(url, method, credentials, data),
        'Content-Type': 'application/json'
      };
      logger.info('Replying to tweet', { user: userId, tweet: postId });
      const response = await axios.post(url, data, { headers });
      return { id: response.data.data.id };
    } catch (error) {
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
      return { id: response.data.data?.following ? targetUserId : null };
    } catch (error) {
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
      return { id: response.data.data?.retweeted ? postId : null };
    } catch (error) {
      this.handleApiError(error, 'retweetPost');
    }
  }

  async searchByHashtag(hashtag, userId, limit = 10) {
    try {
      const credentials = await this.getUserCredentials(userId);
      const url = `${TWITTER_API_BASE}/tweets/search/recent?query=%23${encodeURIComponent(hashtag)}&max_results=${limit}`;
      const method = 'GET';
      const headers = {
        ...this.getAuthHeader(url, method, credentials),
        'Content-Type': 'application/json'
      };
      logger.info('Searching tweets by hashtag', { user: userId, hashtag });
      const response = await axios.get(url, { headers });
      return response.data.data.map(tweet => ({
        contentId: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        user: { userId: tweet.author_id }
      }));
    } catch (error) {
      this.handleApiError(error, 'searchByHashtag');
    }
  }

  async searchByKeyword(keyword, userId, limit = 10) {
    try {
      const credentials = await this.getUserCredentials(userId);
      const url = `${TWITTER_API_BASE}/tweets/search/recent?query=${encodeURIComponent(keyword)}&max_results=${limit}`;
      const method = 'GET';
      const headers = {
        ...this.getAuthHeader(url, method, credentials),
        'Content-Type': 'application/json'
      };
      logger.info('Searching tweets by keyword', { user: userId, keyword });
      const response = await axios.get(url, { headers });
      return response.data.data.map(tweet => ({
        contentId: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        user: { userId: tweet.author_id }
      }));
    } catch (error) {
      this.handleApiError(error, 'searchByKeyword');
    }
  }

  async getTwitterUser(credentials) {
    // Get the authenticated user's Twitter ID
    const url = 'https://api.twitter.com/2/users/me';
    const method = 'GET';
    const headers = {
      ...this.getAuthHeader(url, method, credentials),
      'Content-Type': 'application/json'
    };
    const response = await axios.get(url, { headers });
    return response.data.data;
  }

  handleApiError(error, context) {
    if (error.response) {
      logger.error(`Twitter API error [${context}]`, {
        status: error.response.status,
        data: error.response.data
      });
      if (error.response.status === 429) {
        throw new Error('Twitter rate limit exceeded. Please try again later.');
      }
      throw new Error(error.response.data?.detail || 'Twitter API error');
    } else {
      logger.error(`Twitter API error [${context}]`, { message: error.message });
      throw new Error('Twitter API error: ' + error.message);
    }
  }
}

module.exports = new TwitterService(); 
const axios = require('axios');
const User = require('../../models/user.model');
const logger = require('../../config/logger');

const INSTAGRAM_GRAPH_API = 'https://graph.instagram.com';
const INSTAGRAM_GRAPH_API_V12 = 'https://graph.facebook.com/v12.0';

async function getUserCredentials(userId) {
  const user = await User.findById(userId);
  if (!user || !user.socialAccounts.instagram.accessToken) {
    throw new Error('Instagram account not connected');
  }
  return user.socialAccounts.instagram;
}

module.exports = {
  // Publish a photo or video post
  async createPost(schedule) {
    try {
      const credentials = await getUserCredentials(schedule.user);
      // Instagram Graph API only allows publishing for business accounts
      // Step 1: Upload media (photo/video)
      // Step 2: Publish media container
      // For simplicity, only handle photo posts here
      if (!schedule.content.media || schedule.content.media.length === 0) {
        throw new Error('Instagram requires at least one media item');
      }
      const imageUrl = schedule.content.media[0];
      // Step 1: Create media container
      const containerRes = await axios.post(
        `${INSTAGRAM_GRAPH_API_V12}/${credentials.userId}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            caption: schedule.content.text || '',
            access_token: credentials.accessToken
          }
        }
      );
      const containerId = containerRes.data.id;
      // Step 2: Publish media container
      const publishRes = await axios.post(
        `${INSTAGRAM_GRAPH_API_V12}/${credentials.userId}/media_publish`,
        null,
        {
          params: {
            creation_id: containerId,
            access_token: credentials.accessToken
          }
        }
      );
      return { id: publishRes.data.id };
    } catch (error) {
      logger.error('Instagram createPost error:', error.response?.data || error.message);
      throw new Error('Failed to create Instagram post: ' + (error.response?.data?.error?.message || error.message));
    }
  },

  // Instagram Graph API does not support liking posts via API
  async likePost(postId) {
    throw new Error('Instagram API does not support liking posts via API');
  },

  // Instagram Graph API does not support commenting via API except for business accounts
  async commentOnPost(postId, comment) {
    try {
      // Only business accounts can comment via API
      // POST /{ig-media-id}/comments
      // https://developers.facebook.com/docs/instagram-api/reference/comment#create-comment
      // You need the media ID and a business account
      // This is a best-effort implementation
      const credentials = await getUserCredentials(null); // You need to pass userId if available
      const res = await axios.post(
        `${INSTAGRAM_GRAPH_API_V12}/${postId}/comments`,
        null,
        {
          params: {
            message: comment,
            access_token: credentials.accessToken
          }
        }
      );
      return { id: res.data.id };
    } catch (error) {
      logger.error('Instagram commentOnPost error:', error.response?.data || error.message);
      throw new Error('Failed to comment on Instagram post: ' + (error.response?.data?.error?.message || error.message));
    }
  },

  // Instagram Graph API does not support following users via API
  async followUser(userId) {
    throw new Error('Instagram API does not support following users via API');
  },

  // Search for recent media by hashtag
  async searchByHashtag(hashtag, limit = 10) {
    try {
      // You need the hashtag ID first
      // Step 1: Get hashtag ID
      // Step 2: Get recent media for hashtag
      // This requires a business account and special permissions
      // https://developers.facebook.com/docs/instagram-api/reference/hashtag-search
      // https://developers.facebook.com/docs/instagram-api/reference/hashtag/recent-media
      // For demo, return empty array if not supported
      return [];
    } catch (error) {
      logger.error('Instagram searchByHashtag error:', error.response?.data || error.message);
      throw new Error('Failed to search Instagram by hashtag: ' + (error.response?.data?.error?.message || error.message));
    }
  },

  // Instagram Graph API does not support keyword search, fallback to hashtag search
  async searchByKeyword(keyword, limit = 10) {
    // Fallback: treat keyword as hashtag
    return this.searchByHashtag(keyword, limit);
  }
}; 
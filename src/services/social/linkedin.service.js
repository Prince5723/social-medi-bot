const axios = require('axios');
const User = require('../../models/user.model');
const logger = require('../../config/logger');

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

async function getUserCredentials(userId) {
  const user = await User.findById(userId);
  if (!user || !user.socialAccounts.linkedin.accessToken) {
    throw new Error('LinkedIn account not connected');
  }
  return user.socialAccounts.linkedin;
}

module.exports = {
  // Create a post on LinkedIn
  async createPost(schedule) {
    try {
      const credentials = await getUserCredentials(schedule.user);
      // https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api
      const res = await axios.post(
        `${LINKEDIN_API_BASE}/ugcPosts`,
        {
          author: `urn:li:person:${credentials.userId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: schedule.content.text
              },
              shareMediaCategory: schedule.content.media && schedule.content.media.length > 0 ? 'IMAGE' : 'NONE',
              media: schedule.content.media && schedule.content.media.length > 0 ? [
                {
                  status: 'READY',
                  originalUrl: schedule.content.media[0]
                }
              ] : []
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        },
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
          }
        }
      );
      return { id: res.data.id };
    } catch (error) {
      logger.error('LinkedIn createPost error:', error.response?.data || error.message);
      throw new Error('Failed to create LinkedIn post: ' + (error.response?.data?.message || error.message));
    }
  },

  // Like a post
  async likePost(postId) {
    try {
      // https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api#social-actions
      // POST /socialActions/{id}/likes
      throw new Error('LinkedIn API likePost not implemented.');
    } catch (error) {
      logger.error('LinkedIn likePost error:', error.response?.data || error.message);
      throw new Error('Failed to like LinkedIn post: ' + (error.response?.data?.message || error.message));
    }
  },

  // Comment on a post
  async commentOnPost(postId, comment) {
    try {
      // https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api#social-actions
      // POST /socialActions/{id}/comments
      throw new Error('LinkedIn API commentOnPost not implemented.');
    } catch (error) {
      logger.error('LinkedIn commentOnPost error:', error.response?.data || error.message);
      throw new Error('Failed to comment on LinkedIn post: ' + (error.response?.data?.message || error.message));
    }
  },

  // Follow a user (not supported via API for most apps)
  async followUser(userId) {
    throw new Error('LinkedIn API does not support following users via API for most apps');
  },

  // Share a post (reshare)
  async sharePost(postId) {
    try {
      // https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api#reshare
      throw new Error('LinkedIn API sharePost not implemented.');
    } catch (error) {
      logger.error('LinkedIn sharePost error:', error.response?.data || error.message);
      throw new Error('Failed to share LinkedIn post: ' + (error.response?.data?.message || error.message));
    }
  },

  // Search by hashtag (not directly supported, would require scraping or partner API)
  async searchByHashtag(hashtag, limit = 10) {
    // Not supported by public LinkedIn API
    return [];
  },

  // Search by keyword (not directly supported, would require scraping or partner API)
  async searchByKeyword(keyword, limit = 10) {
    // Not supported by public LinkedIn API
    return [];
  }
}; 
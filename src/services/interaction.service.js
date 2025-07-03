const Interaction = require('../models/interaction.model');
const User = require('../models/user.model');
const logger = require('../config/logger');

class InteractionService {
  async createInteraction(interactionData) {
    try {
      const interaction = new Interaction({
        user: interactionData.user._id,
        platform: interactionData.platform,
        action: interactionData.action,
        targetUser: interactionData.targetUser,
        targetContent: interactionData.targetContent,
        comment: interactionData.comment,
        automationRule: interactionData.automationRule,
        metadata: interactionData.metadata
      });

      await interaction.save();
      return interaction;
    } catch (error) {
      logger.error('Error creating interaction:', error);
      throw error;
    }
  }

  async executeInteraction(interactionId) {
    try {
      const interaction = await Interaction.findById(interactionId);
      if (!interaction) {
        throw new Error('Interaction not found');
      }

      // Update status to processing
      interaction.status = 'processing';
      await interaction.save();

      // Get platform service
      const platformService = require(`./social/${interaction.platform}.service`);
      
      let result;
      switch (interaction.action) {
        case 'like':
          result = await platformService.likePost(interaction.targetContent.contentId);
          break;
        case 'comment':
          result = await platformService.commentOnPost(
            interaction.targetContent.contentId,
            interaction.comment.text
          );
          break;
        case 'follow':
          result = await platformService.followUser(interaction.targetUser.userId);
          break;
        case 'retweet':
          result = await platformService.retweetPost(interaction.targetContent.contentId);
          break;
        default:
          throw new Error(`Unsupported action: ${interaction.action}`);
      }

      // Update interaction with success
      interaction.status = 'completed';
      interaction.platformResponse = {
        success: true,
        responseId: result.id
      };
      await interaction.save();

      logger.info(`Interaction ${interaction.action} completed for ${interaction.platform}`);
      return result;
    } catch (error) {
      logger.error(`Error executing interaction:`, error);
      
      // Update interaction with error
      const interaction = await Interaction.findById(interactionId);
      if (interaction) {
        interaction.status = 'failed';
        interaction.platformResponse = {
          success: false,
          error: {
            message: error.message,
            code: error.code || 'UNKNOWN'
          }
        };
        await interaction.save();
      }
      
      throw error;
    }
  }

  async findContentForInteraction(userId, platform, rules) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.settings.autoInteraction) {
        return [];
      }

      const platformService = require(`./social/${platform}.service`);
      const content = [];

      for (const rule of rules) {
        if (rule.platform !== platform) continue;

        let searchResults = [];
        
        // Search by hashtags
        if (rule.hashtags && rule.hashtags.length > 0) {
          for (const hashtag of rule.hashtags) {
            const results = await platformService.searchByHashtag(hashtag, 10);
            searchResults.push(...results);
          }
        }

        // Search by keywords
        if (rule.keywords && rule.keywords.length > 0) {
          for (const keyword of rule.keywords) {
            const results = await platformService.searchByKeyword(keyword, 10);
            searchResults.push(...results);
          }
        }

        // Filter and rank content
        const filteredContent = this.filterContentByRules(searchResults, rule);
        content.push(...filteredContent);
      }

      return content.slice(0, 20); // Limit to 20 items
    } catch (error) {
      logger.error('Error finding content for interaction:', error);
      throw error;
    }
  }

  filterContentByRules(content, rule) {
    return content.filter(item => {
      // Check if we've already interacted with this content
      // Check if content is recent (within last 24 hours)
      // Check if content matches our criteria
      const isRecent = new Date(item.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
      const hasRelevantText = rule.keywords ? 
        rule.keywords.some(keyword => 
          item.text.toLowerCase().includes(keyword.toLowerCase())
        ) : true;
      
      return isRecent && hasRelevantText;
    });
  }

  async getInteractionHistory(userId, filters = {}) {
    try {
      const query = { user: userId };
      
      if (filters.platform) query.platform = filters.platform;
      if (filters.action) query.action = filters.action;
      if (filters.status) query.status = filters.status;
      if (filters.startDate) query.createdAt = { $gte: filters.startDate };
      if (filters.endDate) query.createdAt = { ...query.createdAt, $lte: filters.endDate };

      const interactions = await Interaction.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return interactions;
    } catch (error) {
      logger.error('Error getting interaction history:', error);
      throw error;
    }
  }

  async getInteractionStats(userId, platform, dateRange) {
    try {
      const query = { user: userId };
      if (platform) query.platform = platform;
      if (dateRange) {
        query.createdAt = {
          $gte: dateRange.start,
          $lte: dateRange.end
        };
      }

      const stats = await Interaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              action: '$action',
              status: '$status'
            },
            count: { $sum: 1 }
          }
        }
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting interaction stats:', error);
      throw error;
    }
  }
}

module.exports = new InteractionService(); 
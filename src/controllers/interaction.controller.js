const InteractionService = require('../services/interaction.service');
const User = require('../models/user.model');
const logger = require('../config/logger');

// Create a new interaction
const createInteraction = async (req, res) => {
  try {
    const interactionData = {
      ...req.body,
      user: req.user
    };
    
    const interaction = await InteractionService.createInteraction(interactionData);
    res.status(201).json({ success: true, data: interaction });
  } catch (error) {
    logger.error('Create interaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to create interaction' });
  }
};

// Execute an interaction
const executeInteraction = async (req, res) => {
  try {
    const result = await InteractionService.executeInteraction(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Execute interaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to execute interaction' });
  }
};

// Get interaction history
const getInteractionHistory = async (req, res) => {
  try {
    const filters = {
      platform: req.query.platform,
      action: req.query.action,
      status: req.query.status,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };
    
    const interactions = await InteractionService.getInteractionHistory(req.user._id, filters);
    res.json({ success: true, data: interactions });
  } catch (error) {
    logger.error('Get interaction history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interaction history' });
  }
};

// Get interaction statistics
const getInteractionStats = async (req, res) => {
  try {
    const { platform, startDate, endDate } = req.query;
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : undefined;
    
    const stats = await InteractionService.getInteractionStats(
      req.user._id,
      platform,
      dateRange
    );
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Get interaction stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interaction statistics' });
  }
};

// Find content for interaction based on rules
const findContentForInteraction = async (req, res) => {
  try {
    const { platform } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user.settings.interactionRules) {
      return res.json({ success: true, data: [] });
    }
    
    const content = await InteractionService.findContentForInteraction(
      req.user._id,
      platform,
      user.settings.interactionRules
    );
    
    res.json({ success: true, data: content });
  } catch (error) {
    logger.error('Find content for interaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to find content for interaction' });
  }
};

// Update user's interaction rules
const updateInteractionRules = async (req, res) => {
  try {
    const { interactionRules } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'settings.interactionRules': interactionRules },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: 'Interaction rules updated successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Update interaction rules error:', error);
    res.status(500).json({ success: false, message: 'Failed to update interaction rules' });
  }
};

// Toggle auto-interaction setting
const toggleAutoInteraction = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'settings.autoInteraction': enabled },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: `Auto-interaction ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: { user }
    });
  } catch (error) {
    logger.error('Toggle auto-interaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle auto-interaction' });
  }
};

module.exports = {
  createInteraction,
  executeInteraction,
  getInteractionHistory,
  getInteractionStats,
  findContentForInteraction,
  updateInteractionRules,
  toggleAutoInteraction
}; 
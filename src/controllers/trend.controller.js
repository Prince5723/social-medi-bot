const Trend = require('../models/trend.model');
const logger = require('../config/logger');

// Get trending topics
const getTrends = async (req, res) => {
  try {
    const { platform, category, limit = 20 } = req.query;
    
    const query = { isActive: true };
    if (platform) query.platform = platform;
    if (category) query.category = category;
    
    const trends = await Trend.find(query)
      .sort({ volume: -1, lastUpdated: -1 })
      .limit(parseInt(limit));
    
    res.json({ success: true, data: trends });
  } catch (error) {
    logger.error('Get trends error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trends' });
  }
};

// Get a specific trend
const getTrend = async (req, res) => {
  try {
    const trend = await Trend.findById(req.params.id);
    
    if (!trend) {
      return res.status(404).json({ success: false, message: 'Trend not found' });
    }
    
    res.json({ success: true, data: trend });
  } catch (error) {
    logger.error('Get trend error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trend' });
  }
};

// Create a custom trend to monitor
const createCustomTrend = async (req, res) => {
  try {
    const { platform, trendType, value, displayName, category } = req.body;
    
    const trend = new Trend({
      platform,
      trendType,
      value,
      displayName,
      category,
      isActive: true
    });
    
    await trend.save();
    
    res.status(201).json({ success: true, data: trend });
  } catch (error) {
    logger.error('Create custom trend error:', error);
    res.status(500).json({ success: false, message: 'Failed to create custom trend' });
  }
};

// Update trend monitoring status
const updateTrendStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const trend = await Trend.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    
    if (!trend) {
      return res.status(404).json({ success: false, message: 'Trend not found' });
    }
    
    res.json({ success: true, data: trend });
  } catch (error) {
    logger.error('Update trend status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update trend status' });
  }
};

// Delete a custom trend
const deleteTrend = async (req, res) => {
  try {
    const trend = await Trend.findByIdAndDelete(req.params.id);
    
    if (!trend) {
      return res.status(404).json({ success: false, message: 'Trend not found' });
    }
    
    res.json({ success: true, message: 'Trend deleted successfully' });
  } catch (error) {
    logger.error('Delete trend error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete trend' });
  }
};

module.exports = {
  getTrends,
  getTrend,
  createCustomTrend,
  updateTrendStatus,
  deleteTrend
}; 
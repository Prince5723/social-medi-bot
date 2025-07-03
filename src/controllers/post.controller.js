const SchedulerService = require('../services/scheduler.service');
const Schedule = require('../models/schedule.model');
const logger = require('../config/logger');

// Create a scheduled post
const createScheduledPost = async (req, res) => {
  try {
    const scheduleData = {
      ...req.body,
      user: req.user
    };
    const schedule = await SchedulerService.schedulePost(scheduleData);
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    logger.error('Create scheduled post error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule post' });
  }
};

// List scheduled posts for the user
const listScheduledPosts = async (req, res) => {
  try {
    const filters = {
      platform: req.query.platform,
      status: req.query.status,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };
    const schedules = await SchedulerService.getScheduledPosts(req.user._id, filters);
    res.json({ success: true, data: schedules });
  } catch (error) {
    logger.error('List scheduled posts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scheduled posts' });
  }
};

// Get a single scheduled post
const getScheduledPost = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, user: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Scheduled post not found' });
    }
    res.json({ success: true, data: schedule });
  } catch (error) {
    logger.error('Get scheduled post error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scheduled post' });
  }
};

// Update a scheduled post (only if pending)
const updateScheduledPost = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, user: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Scheduled post not found' });
    }
    if (schedule.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending posts can be updated' });
    }
    Object.assign(schedule, req.body);
    await schedule.save();
    res.json({ success: true, data: schedule });
  } catch (error) {
    logger.error('Update scheduled post error:', error);
    res.status(500).json({ success: false, message: 'Failed to update scheduled post' });
  }
};

// Cancel (delete) a scheduled post
const cancelScheduledPost = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, user: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Scheduled post not found' });
    }
    if (schedule.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending posts can be cancelled' });
    }
    await SchedulerService.cancelScheduledPost(schedule._id);
    res.json({ success: true, message: 'Scheduled post cancelled' });
  } catch (error) {
    logger.error('Cancel scheduled post error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel scheduled post' });
  }
};

module.exports = {
  createScheduledPost,
  listScheduledPosts,
  getScheduledPost,
  updateScheduledPost,
  cancelScheduledPost
}; 
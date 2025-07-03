const Report = require('../models/report.model');
const logger = require('../config/logger');
const Schedule = require('../models/schedule.model');
const Interaction = require('../models/interaction.model');
const SchedulerService = require('../services/scheduler.service');

// Generate a new report
const generateReport = async (req, res) => {
  try {
    const { platform, reportType, dateRange } = req.body;
    
    // TODO: Implement report generation logic
    // This would aggregate data from Schedule, Interaction, and other models
    
    const report = new Report({
      user: req.user._id,
      platform,
      reportType,
      dateRange,
      status: 'generating'
    });

    await report.save();
    
    // TODO: Start async report generation process
    await SchedulerService.queueReportGeneration(report._id);
    
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    logger.error('Generate report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

// Get all reports for user
const getReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id })
      .sort({ generatedAt: -1 })
      .limit(50);
    
    res.json({ success: true, data: reports });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

// Get a specific report
const getReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Get report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};

// Delete a report
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    logger.error('Delete report error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete report' });
  }
};

// Async report generation processor
SchedulerService.processReportGeneration = async function(reportId) {
  try {
    const report = await Report.findById(reportId);
    if (!report) throw new Error('Report not found');
    // Aggregate metrics from Schedule and Interaction
    const scheduleQuery = { user: report.user, scheduledTime: { $gte: report.dateRange.start, $lte: report.dateRange.end } };
    if (report.platform !== 'all') scheduleQuery.platform = report.platform;
    const schedules = await Schedule.find(scheduleQuery);
    const interactionQuery = { user: report.user, createdAt: { $gte: report.dateRange.start, $lte: report.dateRange.end } };
    if (report.platform !== 'all') interactionQuery.platform = report.platform;
    const interactions = await Interaction.find(interactionQuery);
    // Fill metrics
    report.metrics = {
      posts: {
        total: schedules.length,
        scheduled: schedules.filter(s => s.status === 'pending').length,
        posted: schedules.filter(s => s.status === 'posted').length,
        failed: schedules.filter(s => s.status === 'failed').length
      },
      engagement: {
        likes: interactions.filter(i => i.action === 'like').length,
        comments: interactions.filter(i => i.action === 'comment').length,
        shares: interactions.filter(i => i.action === 'share').length,
        retweets: interactions.filter(i => i.action === 'retweet').length,
        impressions: 0, // Not tracked
        reach: 0 // Not tracked
      },
      followers: {
        gained: 0, // Not tracked
        lost: 0, // Not tracked
        netGrowth: 0, // Not tracked
        totalFollowers: 0 // Not tracked
      },
      interactions: {
        total: interactions.length,
        likes: interactions.filter(i => i.action === 'like').length,
        comments: interactions.filter(i => i.action === 'comment').length,
        follows: interactions.filter(i => i.action === 'follow').length,
        successful: interactions.filter(i => i.status === 'completed').length,
        failed: interactions.filter(i => i.status === 'failed').length
      }
    };
    // Top content (by number of likes/comments)
    report.topContent = schedules
      .filter(s => s.status === 'posted')
      .slice(0, 5)
      .map(s => ({
        contentId: s.postId,
        platform: s.platform,
        text: s.content.text,
        engagement: {
          likes: 0, // Not tracked
          comments: 0, // Not tracked
          shares: 0 // Not tracked
        },
        postedAt: s.scheduledTime
      }));
    // Top hashtags (by usage)
    const hashtagCounts = {};
    schedules.forEach(s => {
      (s.metadata?.hashtags || []).forEach(tag => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    });
    report.topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hashtag, usageCount]) => ({ hashtag, usageCount, engagement: 0 }));
    // Audience insights, comparison, etc. can be left empty or with default values
    report.status = 'completed';
    report.generatedAt = new Date();
    await report.save();
    logger.info(`Report ${reportId} generated successfully.`);
  } catch (error) {
    logger.error('Report generation failed:', error);
    await Report.findByIdAndUpdate(reportId, { status: 'failed' });
  }
};

module.exports = {
  generateReport,
  getReports,
  getReport,
  deleteReport
}; 
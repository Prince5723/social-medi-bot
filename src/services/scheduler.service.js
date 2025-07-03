const Queue = require('bull');
const Schedule = require('../models/schedule.model');
const logger = require('../config/logger');

// Create queues for different platforms
const twitterQueue = new Queue('twitter-posts', process.env.REDIS_URL);
const instagramQueue = new Queue('instagram-posts', process.env.REDIS_URL);
const linkedinQueue = new Queue('linkedin-posts', process.env.REDIS_URL);
const reportQueue = new Queue('report-generation', process.env.REDIS_URL);

// Platform queue mapping
const platformQueues = {
  twitter: twitterQueue,
  instagram: instagramQueue,
  linkedin: linkedinQueue
};

class SchedulerService {
  constructor() {
    this.setupQueueProcessors();
  }

  setupQueueProcessors() {
    // Process Twitter posts
    twitterQueue.process(async (job) => {
      try {
        const { scheduleId } = job.data;
        await this.processScheduledPost(scheduleId, 'twitter');
      } catch (error) {
        logger.error('Twitter queue processing error:', error);
        throw error;
      }
    });

    // Process Instagram posts
    instagramQueue.process(async (job) => {
      try {
        const { scheduleId } = job.data;
        await this.processScheduledPost(scheduleId, 'instagram');
      } catch (error) {
        logger.error('Instagram queue processing error:', error);
        throw error;
      }
    });

    // Process LinkedIn posts
    linkedinQueue.process(async (job) => {
      try {
        const { scheduleId } = job.data;
        await this.processScheduledPost(scheduleId, 'linkedin');
      } catch (error) {
        logger.error('LinkedIn queue processing error:', error);
        throw error;
      }
    });

    // Process report generation
    reportQueue.process(async (job) => {
      try {
        const { reportId } = job.data;
        await this.processReportGeneration(reportId);
      } catch (error) {
        logger.error('Report queue processing error:', error);
        throw error;
      }
    });

    // Handle failed jobs
    [twitterQueue, instagramQueue, linkedinQueue].forEach(queue => {
      queue.on('failed', async (job, err) => {
        logger.error(`Job ${job.id} failed:`, err);
        await this.handleFailedJob(job.data.scheduleId, err);
      });
    });
  }

  async schedulePost(scheduleData) {
    try {
      const { platform, scheduledTime, content, user } = scheduleData;

      // Create schedule record
      const schedule = new Schedule({
        user: user._id,
        platform,
        content,
        scheduledTime,
        status: 'pending'
      });

      await schedule.save();

      // Add to queue
      const queue = platformQueues[platform];
      const delay = scheduledTime.getTime() - Date.now();

      if (delay <= 0) {
        // Post immediately if scheduled time has passed
        await queue.add({ scheduleId: schedule._id });
      } else {
        // Schedule for later
        await queue.add(
          { scheduleId: schedule._id },
          { delay }
        );
      }

      logger.info(`Post scheduled for ${platform} at ${scheduledTime}`);
      return schedule;
    } catch (error) {
      logger.error('Error scheduling post:', error);
      throw error;
    }
  }

  async processScheduledPost(scheduleId, platform) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Update status to processing
      schedule.status = 'processing';
      await schedule.save();

      // Get platform service
      const platformService = require(`./social/${platform}.service`);
      
      // Post to platform
      const result = await platformService.createPost(schedule);
      
      // Update schedule with success
      schedule.status = 'posted';
      schedule.postId = result.id;
      await schedule.save();

      logger.info(`Post successfully published to ${platform}: ${result.id}`);
      return result;
    } catch (error) {
      logger.error(`Error processing scheduled post for ${platform}:`, error);
      
      // Update schedule with error
      const schedule = await Schedule.findById(scheduleId);
      if (schedule) {
        schedule.status = 'failed';
        schedule.error = {
          message: error.message,
          code: error.code || 'UNKNOWN',
          timestamp: new Date()
        };
        await schedule.save();
      }
      
      throw error;
    }
  }

  async handleFailedJob(scheduleId, error) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) return;

      schedule.retryCount += 1;
      
      if (schedule.retryCount >= schedule.maxRetries) {
        schedule.status = 'failed';
        schedule.error = {
          message: error.message,
          code: error.code || 'MAX_RETRIES_EXCEEDED',
          timestamp: new Date()
        };
      } else {
        schedule.status = 'pending';
        // Re-queue with exponential backoff
        const queue = platformQueues[schedule.platform];
        const delay = Math.pow(2, schedule.retryCount) * 60000; // 1min, 2min, 4min
        
        await queue.add(
          { scheduleId: schedule._id },
          { delay }
        );
      }

      await schedule.save();
    } catch (err) {
      logger.error('Error handling failed job:', err);
    }
  }

  async cancelScheduledPost(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      if (schedule.status === 'pending') {
        schedule.status = 'cancelled';
        await schedule.save();
        
        // Remove from queue if not yet processed
        const queue = platformQueues[schedule.platform];
        const jobs = await queue.getJobs(['waiting', 'delayed']);
        const job = jobs.find(j => j.data.scheduleId.toString() === scheduleId);
        
        if (job) {
          await job.remove();
        }
      }

      return schedule;
    } catch (error) {
      logger.error('Error cancelling scheduled post:', error);
      throw error;
    }
  }

  async getScheduledPosts(userId, filters = {}) {
    try {
      const query = { user: userId };
      
      if (filters.platform) query.platform = filters.platform;
      if (filters.status) query.status = filters.status;
      if (filters.startDate) query.scheduledTime = { $gte: filters.startDate };
      if (filters.endDate) query.scheduledTime = { ...query.scheduledTime, $lte: filters.endDate };

      const schedules = await Schedule.find(query)
        .sort({ scheduledTime: 1 })
        .limit(filters.limit || 50);

      return schedules;
    } catch (error) {
      logger.error('Error getting scheduled posts:', error);
      throw error;
    }
  }

  // Add a job to the report queue
  async queueReportGeneration(reportId) {
    await reportQueue.add({ reportId });
  }

  // Process report generation (to be implemented in report.controller.js)
  async processReportGeneration(reportId) {
    // Placeholder: actual logic will be in report.controller.js
    logger.info(`Processing report generation for reportId: ${reportId}`);
  }
}

module.exports = new SchedulerService(); 
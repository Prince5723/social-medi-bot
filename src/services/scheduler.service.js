const Queue = require('bull');
const Schedule = require('../models/schedule.model');
const logger = require('../config/logger');

// Redis connection options - works with both URL and individual params
const redisConfig = process.env.REDIS_URL || {
  redis: {
    port: process.env.REDIS_PORT || 15546,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 60000,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  },
};

// Create queues for different platforms
const twitterQueue = new Queue('twitter-posts', redisConfig);
const instagramQueue = new Queue('instagram-posts', redisConfig);
const linkedinQueue = new Queue('linkedin-posts', redisConfig);
const reportQueue = new Queue('report-generation', redisConfig);

// Platform queue mapping
const platformQueues = {
  twitter: twitterQueue,
  instagram: instagramQueue,
  linkedin: linkedinQueue
};

class SchedulerService {
  constructor() {
    this.setupQueueProcessors();
    this.setupQueueEventHandlers();
  }

  setupQueueProcessors() {
    // Process Twitter posts
    twitterQueue.process('process-post', async (job) => {
      try {
        const { scheduleId } = job.data;
        logger.info(`Processing Twitter post for schedule: ${scheduleId}`);
        return await this.processScheduledPost(scheduleId, 'twitter');
      } catch (error) {
        logger.error('Twitter queue processing error:', error);
        throw error;
      }
    });

    // Process Instagram posts
    instagramQueue.process('process-post', async (job) => {
      try {
        const { scheduleId } = job.data;
        logger.info(`Processing Instagram post for schedule: ${scheduleId}`);
        return await this.processScheduledPost(scheduleId, 'instagram');
      } catch (error) {
        logger.error('Instagram queue processing error:', error);
        throw error;
      }
    });

    // Process LinkedIn posts
    linkedinQueue.process('process-post', async (job) => {
      try {
        const { scheduleId } = job.data;
        logger.info(`Processing LinkedIn post for schedule: ${scheduleId}`);
        return await this.processScheduledPost(scheduleId, 'linkedin');
      } catch (error) {
        logger.error('LinkedIn queue processing error:', error);
        throw error;
      }
    });

    // Process report generation
    reportQueue.process('generate-report', async (job) => {
      try {
        const { reportId } = job.data;
        logger.info(`Processing report generation for: ${reportId}`);
        return await this.processReportGeneration(reportId);
      } catch (error) {
        logger.error('Report queue processing error:', error);
        throw error;
      }
    });
  }

  setupQueueEventHandlers() {
    // Handle queue events
    const queues = [twitterQueue, instagramQueue, linkedinQueue, reportQueue];
    
    queues.forEach((queue, index) => {
      const queueNames = ['Twitter', 'Instagram', 'LinkedIn', 'Report'];
      const queueName = queueNames[index];
      
      queue.on('ready', () => {
        logger.info(`${queueName} queue is ready`);
      });

      queue.on('error', (error) => {
        logger.error(`${queueName} queue error:`, error);
      });

      queue.on('failed', async (job, err) => {
        logger.error(`${queueName} job ${job.id} failed:`, err);
        if (job.data.scheduleId) {
          await this.handleFailedJob(job.data.scheduleId, err);
        }
      });

      queue.on('completed', (job) => {
        logger.info(`${queueName} job ${job.id} completed successfully`);
      });

      queue.on('stalled', (job) => {
        logger.warn(`${queueName} job ${job.id} stalled`);
      });
    });
  }

  async schedulePost(scheduleData) {
    try {
      const { platform, scheduledTime, content, user } = scheduleData;

      // Validate platform
      if (!platformQueues[platform]) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Create schedule record
      const schedule = new Schedule({
        user: user._id,
        platform,
        content,
        scheduledTime: new Date(scheduledTime),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      });

      await schedule.save();
      logger.info("Schedule saved to database:", schedule._id);

      // Add to queue
      const queue = platformQueues[platform];
      const delay = new Date(scheduledTime).getTime() - Date.now();
      
      logger.info(`Calculated delay: ${delay}ms`);

      const jobOptions = {
        removeOnComplete: 10, // Keep only 10 completed jobs
        removeOnFail: 50,     // Keep 50 failed jobs for debugging
        attempts: 3,          // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 5000,        // Start with 5 second delay
        },
      };

      let job;
      if (delay <= 0) {
        // Post immediately if scheduled time has passed
        job = await queue.add('process-post', { scheduleId: schedule._id }, jobOptions);
        logger.info("Job added to queue immediately:", job.id);
      } else {
        // Schedule for later
        job = await queue.add('process-post', { scheduleId: schedule._id }, {
          ...jobOptions,
          delay: delay
        });
        logger.info("Job scheduled for later:", job.id);
      }

      // Store job ID in schedule for tracking
      schedule.jobId = job.id;
      await schedule.save();

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

      // Check if already processed
      if (schedule.status === 'posted') {
        logger.info(`Schedule ${scheduleId} already processed`);
        return { id: schedule.postId, message: 'Already processed' };
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
      schedule.publishedAt = new Date();
      await schedule.save();

      logger.info(`Post successfully published to ${platform}: ${result.id}`);
      return result;
    } catch (error) {
      logger.error(`Error processing scheduled post for ${platform}:`, error);
      
      // Update schedule with error
      try {
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
      } catch (updateError) {
        logger.error('Error updating schedule status:', updateError);
      }
      
      throw error;
    }
  }

  async handleFailedJob(scheduleId, error) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) return;

      schedule.retryCount = (schedule.retryCount || 0) + 1;
      
      if (schedule.retryCount >= (schedule.maxRetries || 3)) {
        schedule.status = 'failed';
        schedule.error = {
          message: error.message,
          code: error.code || 'MAX_RETRIES_EXCEEDED',
          timestamp: new Date()
        };
        logger.error(`Schedule ${scheduleId} failed after ${schedule.retryCount} attempts`);
      } else {
        schedule.status = 'pending';
        logger.info(`Retrying schedule ${scheduleId}, attempt ${schedule.retryCount}`);
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
        
        if (schedule.jobId) {
          try {
            const job = await queue.getJob(schedule.jobId);
            if (job) {
              await job.remove();
              logger.info(`Removed job ${schedule.jobId} from queue`);
            }
          } catch (jobError) {
            logger.warn(`Could not remove job ${schedule.jobId}:`, jobError.message);
          }
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
      if (filters.startDate) query.scheduledTime = { $gte: new Date(filters.startDate) };
      if (filters.endDate) {
        query.scheduledTime = { 
          ...query.scheduledTime, 
          $lte: new Date(filters.endDate) 
        };
      }

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
    try {
      const job = await reportQueue.add('generate-report', { reportId }, {
        removeOnComplete: 5,
        removeOnFail: 10,
        attempts: 2,
      });
      logger.info(`Report generation queued: ${job.id}`);
      return job;
    } catch (error) {
      logger.error('Error queueing report generation:', error);
      throw error;
    }
  }

  // Process report generation (to be implemented in report.controller.js)
  async processReportGeneration(reportId) {
    // Placeholder: actual logic will be in report.controller.js
    logger.info(`Processing report generation for reportId: ${reportId}`);
    return { reportId, status: 'completed' };
  }

  // Graceful shutdown
  async shutdown() {
    logger.info('Shutting down scheduler service...');
    await Promise.all([
      twitterQueue.close(),
      instagramQueue.close(),
      linkedinQueue.close(),
      reportQueue.close()
    ]);
    logger.info('Scheduler service shut down successfully');
  }

  // Health check method
  async getQueueStats() {
    const stats = {};
    
    for (const [platform, queue] of Object.entries(platformQueues)) {
      stats[platform] = {
        waiting: await queue.getWaiting().then(jobs => jobs.length),
        active: await queue.getActive().then(jobs => jobs.length),
        completed: await queue.getCompleted().then(jobs => jobs.length),
        failed: await queue.getFailed().then(jobs => jobs.length),
        delayed: await queue.getDelayed().then(jobs => jobs.length),
      };
    }
    
    return stats;
  }
}

module.exports = new SchedulerService();
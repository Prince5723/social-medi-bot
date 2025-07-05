const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['twitter',  'linkedin', 'all']
  },
  reportType: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'custom']
  },
  dateRange: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  metrics: {
    posts: {
      total: Number,
      scheduled: Number,
      posted: Number,
      failed: Number
    },
    engagement: {
      likes: Number,
      comments: Number,
      shares: Number,
      retweets: Number,
      impressions: Number,
      reach: Number
    },
    followers: {
      gained: Number,
      lost: Number,
      netGrowth: Number,
      totalFollowers: Number
    },
    interactions: {
      total: Number,
      likes: Number,
      comments: Number,
      follows: Number,
      successful: Number,
      failed: Number
    }
  },
  topContent: [{
    contentId: String,
    platform: String,
    text: String,
    engagement: {
      likes: Number,
      comments: Number,
      shares: Number
    },
    postedAt: Date
  }],
  topHashtags: [{
    hashtag: String,
    usageCount: Number,
    engagement: Number
  }],
  audienceInsights: {
    demographics: {
      ageRanges: [{
        range: String,
        percentage: Number
      }],
      locations: [{
        location: String,
        percentage: Number
      }],
      languages: [{
        language: String,
        percentage: Number
      }]
    },
    activeHours: [{
      hour: Number,
      engagement: Number
    }],
    activeDays: [{
      day: String,
      engagement: Number
    }]
  },
  comparison: {
    previousPeriod: {
      engagement: Number,
      followers: Number,
      posts: Number
    },
    growthRate: {
      engagement: Number,
      followers: Number,
      posts: Number
    }
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
reportSchema.index({ user: 1, platform: 1, 'dateRange.start': -1 });
reportSchema.index({ user: 1, reportType: 1, generatedAt: -1 });

module.exports = mongoose.model('Report', reportSchema); 
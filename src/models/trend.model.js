const mongoose = require('mongoose');

const trendSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    enum: ['twitter',  'linkedin', 'global']
  },
  trendType: {
    type: String,
    required: true,
    enum: ['hashtag', 'topic', 'keyword', 'user']
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true
  },
  volume: {
    type: Number,
    default: 0
  },
  trendRank: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['entertainment', 'sports', 'politics', 'technology', 'business', 'health', 'other'],
    default: 'other'
  },
  metadata: {
    description: String,
    relatedTopics: [String],
    language: String,
    location: String,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    }
  },
  engagement: {
    posts: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    impressions: Number
  },
  trendingPeriod: {
    start: {
      type: Date,
      default: Date.now
    },
    end: Date,
    duration: Number // in hours
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
trendSchema.index({ platform: 1, trendType: 1, isActive: 1 });
trendSchema.index({ platform: 1, trendRank: 1, lastUpdated: -1 });
trendSchema.index({ value: 1, platform: 1 });
trendSchema.index({ category: 1, volume: -1 });

module.exports = mongoose.model('Trend', trendSchema); 
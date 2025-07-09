const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['twitter', 'linkedin']
  },
  action: {
    type: String,
    required: true,
    enum: ['like', 'comment', 'follow', 'retweet', 'share']
  },
  targetUser: {
    userId: String,
    username: String,
    displayName: String
  },
  targetContent: {
    contentId: String, // Post ID from platform
    contentType: {
      type: String,
      enum: ['post', 'story', 'reel', 'article']
    },
    text: String,
    hashtags: [String]
  },
  comment: {
    text: String,
    timestamp: Date
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'rate_limited'],
    default: 'pending'
  },
  platformResponse: {
    success: Boolean,
    responseId: String, // ID returned from platform
    error: {
      message: String,
      code: String
    }
  },
  automationRule: {
    ruleId: mongoose.Schema.Types.ObjectId,
    ruleType: {
      type: String,
      enum: ['hashtag', 'keyword', 'user_target', 'trending']
    },
    trigger: String // What triggered this interaction
  },
  metadata: {
    hashtags: [String],
    keywords: [String],
    location: String,
    language: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
interactionSchema.index({ user: 1, platform: 1, createdAt: -1 });
interactionSchema.index({ platform: 1, action: 1, status: 1 });
interactionSchema.index({ 'targetUser.userId': 1, action: 1 });

module.exports = mongoose.model('Interaction', interactionSchema); 
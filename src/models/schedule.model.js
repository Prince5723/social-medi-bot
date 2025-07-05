const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['twitter',  'linkedin']
  },
  content: {
    text: {
      type: String,
      required: true,
      maxlength: 280 // Twitter limit
    },
    media: [{
      type: String, // URL to media file
      mediaType: {
        type: String,
        enum: ['image', 'video', 'gif']
      }
    }]
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'posted', 'failed', 'cancelled'],
    default: 'pending'
  },
  postId: {
    type: String, // ID returned from social media platform
    default: null
  },
  error: {
    message: String,
    code: String,
    timestamp: Date
  },
  metadata: {
    hashtags: [String],
    mentions: [String],
    location: String,
    replyTo: String // For replies/threads
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

// Index for efficient querying
scheduleSchema.index({ user: 1, scheduledTime: 1, status: 1 });
scheduleSchema.index({ scheduledTime: 1, status: 'pending' });

module.exports = mongoose.model('Schedule', scheduleSchema); 
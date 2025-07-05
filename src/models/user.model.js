const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  socialAccounts: {
    twitter: {
      accessToken: String,
      refreshToken: String,
      expiresIn: Number,
      userId: String,
      username: String,
      profileImageUrl: String,
      publicMetrics: {
        followers_count: Number,
        following_count: Number,
        tweet_count: Number,
        listed_count: Number,
        media_count: Number,
      }
    },
    linkedin: {
      accessToken: String,
      refreshToken: String,
      userId: String,
      username: String
    }
  },
  settings: {
    autoPosting: {
      type: Boolean,
      default: false
    },
    autoInteraction: {
      type: Boolean,
      default: false
    },
    dailyPostLimit: {
      type: Number,
      default: 5
    },
    interactionRules: [{
      platform: String,
      hashtags: [String],
      keywords: [String],
      action: {
        type: String,
        enum: ['like', 'comment', 'follow'],
        default: 'like'
      },
      frequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly'],
        default: 'daily'
      }
    }]
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 
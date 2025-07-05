const User = require('../models/user.model');
const logger = require('../config/logger');
const SocialAuthService = require('../services/social-auth.service');

// Initiate Twitter OAuth 2.0
const initiateTwitterAuth = async (req, res) => {
  try {
    const { callbackUrl } = req.body;
    
    if (!callbackUrl) {
      return res.status(400).json({
        success: false,
        message: 'Callback URL is required'
      });
    }

    const authData = await SocialAuthService.getTwitterAuthUrl(callbackUrl);
    
    res.json({
      success: true,
      data: { 
        authUrl: authData.url,
        state: authData.state // Include state for security verification
      }
    });
  } catch (error) {
    logger.error('Twitter auth initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate Twitter authentication'
    });
  }
};

// Twitter OAuth 2.0 callback
const twitterCallback = async (req, res) => {
  try {
    const { code, state, userId } = req.query;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing OAuth parameters (code or state)'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Note: In production, you should verify the state parameter against stored values
    // For now, we'll pass it through to the service

    const tokens = await SocialAuthService.completeTwitterAuth(code, state, userId);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user's Twitter credentials (OAuth 2.0 structure)
    await User.findByIdAndUpdate(userId, {
      'socialAccounts.twitter': {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken, // Now available in OAuth 2.0
        userId: tokens.userId,
        username: tokens.username,
        name: tokens.name,
        profileImage: tokens.profileImage,
        publicMetrics: tokens.publicMetrics,
        expiresIn: tokens.expiresIn,
        connectedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Twitter account connected successfully',
      data: { 
        username: tokens.username,
        name: tokens.name,
        userId: tokens.userId,
        profileImage: tokens.profileImage
      }
    });
  } catch (error) {
    logger.error('Twitter callback error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete Twitter authentication'
    });
  }
};

// Initiate LinkedIn OAuth
const initiateLinkedInAuth = async (req, res) => {
  try {
    const { callbackUrl } = req.body;
    
    if (!callbackUrl) {
      return res.status(400).json({
        success: false,
        message: 'Callback URL is required'
      });
    }

    const authData = await SocialAuthService.getLinkedInAuthUrl(callbackUrl);
    console.log("LinkedIn authData", authData);
    
    res.json({
      success: true,
      data: { 
        authUrl: authData.url,
        state: authData.state // Include state for security verification
      }
    });
  } catch (error) {
    logger.error('LinkedIn auth initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate LinkedIn authentication'
    });
  }
};

// LinkedIn OAuth callback
const linkedinCallback = async (req, res) => {
  try {
    const { code, state, userId } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Missing authorization code'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Verify state parameter for security (implement state verification logic)
    // In production, you should store and verify the state parameter

    const tokens = await SocialAuthService.completeLinkedInAuth(code);
    // console.log("tokens", tokens);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user's LinkedIn credentials
    await User.findByIdAndUpdate(userId, {
      'socialAccounts.linkedin': {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,    //not provided by linkedin-api : undefined as of now
        userId: tokens.userId,
        username: tokens.username,
        connectedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'LinkedIn account connected successfully',
      data: { 
        userId: tokens.userId,
        username: tokens.username,
      }
    });
  } catch (error) {
    logger.error('LinkedIn callback error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete LinkedIn authentication'
    });
  }
};

// Get connected social accounts
const getConnectedAccounts = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(req.user._id).select('socialAccounts');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const connectedAccounts = {};
    
    // Check which accounts are connected
    if (user.socialAccounts?.twitter?.accessToken) {
      connectedAccounts.twitter = {
        username: user.socialAccounts.twitter.username,
        name: user.socialAccounts.twitter.name,
        profileImage: user.socialAccounts.twitter.profileImage,
        connected: true,
        connectedAt: user.socialAccounts.twitter.connectedAt,
        hasRefreshToken: !!user.socialAccounts.twitter.refreshToken // OAuth 2.0 has refresh tokens
      };
    } else {
      connectedAccounts.twitter = { connected: false };
    }
    
    if (user.socialAccounts?.linkedin?.accessToken) {
      connectedAccounts.linkedin = {
        username: user.socialAccounts.linkedin.username,
        connected: true,
        connectedAt: user.socialAccounts.linkedin.connectedAt
      };
    } else {
      connectedAccounts.linkedin = { connected: false };
    }

    res.json({
      success: true,
      data: connectedAccounts
    });
  } catch (error) {
    logger.error('Get connected accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connected accounts'
    });
  }
};

// Disconnect social account
const disconnectAccount = async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Validate platform
    const validPlatforms = ['twitter', 'linkedin'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform specified'
      });
    }

    // Check if user exists
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is connected
    if (!user.socialAccounts?.[platform]?.accessToken) {
      return res.status(400).json({
        success: false,
        message: `${platform} account is not connected`
      });
    }

    // Clear the social account data
    const updateData = {};
    updateData[`socialAccounts.${platform}`] = {
      accessToken: null,
      refreshToken: null,
      accessTokenSecret: null, // For backward compatibility
      userId: null,
      username: null,
      name: null,
      firstName: null,
      lastName: null,
      email: null,
      profileImage: null,
      accountType: null,
      publicMetrics: null, // Twitter OAuth 2.0 specific
      expiresIn: null, // Twitter OAuth 2.0 specific
      connectedAt: null
    };

    await User.findByIdAndUpdate(req.user._id, updateData);

    res.json({
      success: true,
      message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account disconnected successfully`
    });
  } catch (error) {
    logger.error('Disconnect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect account'
    });
  }
};

// Refresh access token (now supports Twitter OAuth 2.0)
const refreshAccessToken = async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let newTokens;
    
    switch (platform) {
      case 'twitter':
        const twitterRefreshToken = user.socialAccounts?.twitter?.refreshToken;
        if (!twitterRefreshToken) {
          return res.status(400).json({
            success: false,
            message: 'No refresh token available for Twitter'
          });
        }
        
        newTokens = await SocialAuthService.refreshTwitterToken(twitterRefreshToken);
        
        // Update user's Twitter credentials
        await User.findByIdAndUpdate(req.user._id, {
          'socialAccounts.twitter.accessToken': newTokens.accessToken,
          'socialAccounts.twitter.refreshToken': newTokens.refreshToken,
          'socialAccounts.twitter.expiresIn': newTokens.expiresIn
        });
        
        break;
      
      case 'linkedin':
        const linkedinRefreshToken = user.socialAccounts?.linkedin?.refreshToken;
        if (!linkedinRefreshToken) {
          return res.status(400).json({
            success: false,
            message: 'No refresh token available for LinkedIn'
          });
        }
        
        newTokens = await SocialAuthService.refreshLinkedInToken(linkedinRefreshToken);
        
        // Update user's LinkedIn credentials
        await User.findByIdAndUpdate(req.user._id, {
          'socialAccounts.linkedin.accessToken': newTokens.accessToken,
          'socialAccounts.linkedin.refreshToken': newTokens.refreshToken
        });
        
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid platform specified'
        });
    }

    res.json({
      success: true,
      message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} token refreshed successfully`
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to refresh access token'
    });
  }
};

module.exports = {
  initiateTwitterAuth,
  twitterCallback,
  initiateLinkedInAuth,
  linkedinCallback,
  getConnectedAccounts,
  disconnectAccount,
  refreshAccessToken
};
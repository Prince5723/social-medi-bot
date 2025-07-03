const User = require('../models/user.model');
const logger = require('../config/logger');
const SocialAuthService = require('../services/social-auth.service');

// Initiate Twitter OAuth
const initiateTwitterAuth = async (req, res) => {
  try {
    const { callbackUrl } = req.body;
    
    if (!callbackUrl) {
      return res.status(400).json({
        success: false,
        message: 'Callback URL is required'
      });
    }

    const authUrl = await SocialAuthService.getTwitterAuthUrl(callbackUrl);
    console.log("authUrl", authUrl);
    
    res.json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    logger.error('Twitter auth initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate Twitter authentication'
    });
  }
};

// Twitter OAuth callback
const twitterCallback = async (req, res) => {
  try {
    const { oauth_token, oauth_verifier, userId } = req.query;

    if (!oauth_token || !oauth_verifier) {
      return res.status(400).json({
        success: false,
        message: 'Missing OAuth parameters (oauth_token or oauth_verifier)'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const tokens = await SocialAuthService.completeTwitterAuth(oauth_token, oauth_verifier);
    console.log("tokens", tokens);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user's Twitter credentials
    await User.findByIdAndUpdate(userId, {
      'socialAccounts.twitter': {
        accessToken: tokens.accessToken,
        accessTokenSecret: tokens.accessTokenSecret,
        userId: tokens.userId,
        username: tokens.username
      }
    });

    res.json({
      success: true,
      message: 'Twitter account connected successfully',
      data: { 
        username: tokens.username,
        name: tokens.name,
        userId: tokens.userId
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

// Initiate Instagram OAuth
const initiateInstagramAuth = async (req, res) => {
  try {
    const { callbackUrl } = req.body;
    
    if (!callbackUrl) {
      return res.status(400).json({
        success: false,
        message: 'Callback URL is required'
      });
    }

    const authData = await SocialAuthService.getInstagramAuthUrl(callbackUrl);
    
    res.json({
      success: true,
      data: { 
        authUrl: authData.url,
        state: authData.state // Include state for security verification
      }
    });
  } catch (error) {
    logger.error('Instagram auth initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate Instagram authentication'
    });
  }
};

// Instagram OAuth callback
const instagramCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const { userId } = req.params;
    const { callbackUrl } = req.body; // May need callback URL for token exchange

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

    const tokens = await SocialAuthService.completeInstagramAuth(code, callbackUrl);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user's Instagram credentials
    await User.findByIdAndUpdate(userId, {
      'socialAccounts.instagram': {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userId: tokens.userId,
        username: tokens.username,
        accountType: tokens.accountType,
        connectedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Instagram account connected successfully',
      data: { 
        username: tokens.username,
        accountType: tokens.accountType,
        userId: tokens.userId
      }
    });
  } catch (error) {
    logger.error('Instagram callback error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete Instagram authentication'
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
        connected: true,
        connectedAt: user.socialAccounts.twitter.connectedAt
      };
    } else {
      connectedAccounts.twitter = { connected: false };
    }
    
    if (user.socialAccounts?.instagram?.accessToken) {
      connectedAccounts.instagram = {
        username: user.socialAccounts.instagram.username,
        accountType: user.socialAccounts.instagram.accountType,
        connected: true,
        connectedAt: user.socialAccounts.instagram.connectedAt
      };
    } else {
      connectedAccounts.instagram = { connected: false };
    }
    
    if (user.socialAccounts?.linkedin?.accessToken) {
      connectedAccounts.linkedin = {
        firstName: user.socialAccounts.linkedin.firstName,
        lastName: user.socialAccounts.linkedin.lastName,
        email: user.socialAccounts.linkedin.email,
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
    const validPlatforms = ['twitter', 'instagram', 'linkedin'];
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
      accessTokenSecret: null, // For Twitter
      userId: null,
      username: null,
      name: null,
      firstName: null,
      lastName: null,
      email: null,
      profileImage: null,
      accountType: null,
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

// Refresh access token (for LinkedIn)
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
        return res.status(400).json({
          success: false,
          message: 'Twitter OAuth 1.0a does not support refresh tokens'
        });
      
      case 'instagram':
        return res.status(400).json({
          success: false,
          message: 'Instagram Basic Display API does not support refresh tokens'
        });
      
      case 'linkedin':
        const refreshToken = user.socialAccounts?.linkedin?.refreshToken;
        if (!refreshToken) {
          return res.status(400).json({
            success: false,
            message: 'No refresh token available for LinkedIn'
          });
        }
        
        newTokens = await SocialAuthService.refreshLinkedInToken(refreshToken);
        
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
  initiateInstagramAuth,
  instagramCallback,
  initiateLinkedInAuth,
  linkedinCallback,
  getConnectedAccounts,
  disconnectAccount,
  refreshAccessToken
};
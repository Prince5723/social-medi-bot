const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');

class SocialAuthService {
  constructor() {
    // Twitter OAuth 2.0 (PKCE)
    this.twitterConfig = {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET, // Optional for public clients
      redirectUri: process.env.TWITTER_REDIRECT_URI
    };

    // LinkedIn OAuth 2.0
    this.linkedinConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      redirectUri: process.env.LINKEDIN_REDIRECT_URI
    };

    // In-memory store for PKCE code verifiers (use Redis/DB in production)
    this.codeVerifierStore = new Map();
  }

  // Utility function to generate PKCE code verifier and challenge
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return { codeVerifier, codeChallenge };
  }

  // Twitter OAuth 2.0 Implementation
  async getTwitterAuthUrl(callbackUrl) {
    try {
      // Validate callback URL
      if (!callbackUrl) {
        throw new Error('Callback URL is required');
      }

      // Generate PKCE parameters
      const { codeVerifier, codeChallenge } = this.generatePKCE();
      const state = crypto.randomBytes(16).toString('hex');

      // Store code verifier for later use
      this.codeVerifierStore.set(state, codeVerifier);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.twitterConfig.clientId,
        redirect_uri: callbackUrl,
        scope: 'tweet.read tweet.write users.read follows.read follows.write offline.access',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      return {
        url: `https://twitter.com/i/oauth2/authorize?${params.toString()}`,
        state: state
      };
      
    } catch (error) {
      logger.error('Twitter auth URL generation error:', error);
      throw new Error(`Failed to generate Twitter auth URL: ${error.message}`);
    }
  }

  async completeTwitterAuth(code, state, userId) {
    const callbackUrl = `${process.env.TWITTER_REDIRECT_URI}?userId=${userId}`;
    try {
      if (!code || !state) {
        throw new Error('Authorization code and state are required');
      }

      // Retrieve the stored code verifier
      const codeVerifier = this.codeVerifierStore.get(state);
      if (!codeVerifier) {
        throw new Error('Code verifier not found. State may have expired or be invalid.');
      }

      // Exchange code for access token
      const tokenData = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl || this.twitterConfig.redirectUri,
        code_verifier: codeVerifier,
        client_id: this.twitterConfig.clientId
      });

      // Add client_secret for confidential clients (optional for public clients)
      if (this.twitterConfig.clientSecret) {
        tokenData.append('client_secret', this.twitterConfig.clientSecret);
      }

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      if (this.twitterConfig.clientSecret) {
        const basicAuth = Buffer.from(
          `${this.twitterConfig.clientId}:${this.twitterConfig.clientSecret}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
      }

      const tokenResponse = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        tokenData,
        { headers }
      );

      if (tokenResponse.status !== 200) {
        throw new Error(`Twitter API returned status ${tokenResponse.status}`);
      }

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Clean up stored code verifier
      this.codeVerifierStore.delete(state);

      // Get user information
      const userResponse = await axios.get('https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url,public_metrics', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      if (userResponse.status !== 200) {
        throw new Error(`Failed to fetch user data: ${userResponse.status}`);
      }

      const userData = userResponse.data.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        userId: userData.id,
        username: userData.username,
        name: userData.name,
        profileImage: userData.profile_image_url,
        publicMetrics: userData.public_metrics
      };
    } catch (error) {
      if (error.response) {
        console.error('Twitter auth completion error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        // Handle specific Twitter API errors
        if (error.response.status === 400) {
          throw new Error('Invalid request parameters. Check your authorization code or PKCE parameters.');
        } else if (error.response.status === 401) {
          throw new Error('Twitter OAuth authentication failed. Check your client credentials.');
        } else if (error.response.status === 403) {
          throw new Error('Twitter API access forbidden. Check your app permissions.');
        } else if (error.response.status === 429) {
          throw new Error('Twitter API rate limit exceeded. Try again later.');
        }
      } else if (error.request) {
        console.error('No response received from Twitter API');
        throw new Error('No response received from Twitter API');
      } else {
        console.error('Error setting up Twitter API request:', error.message);
      }
      
      logger.error('Twitter auth completion error:', error);
      throw new Error(`Failed to complete Twitter authentication: ${error.message}`);
    }
  }

  // LinkedIn OAuth 2.0 Implementation
  async getLinkedInAuthUrl(callbackUrl) {
    try {
      if (!callbackUrl) {
        throw new Error('Callback URL is required');
      }

      //setting this to use in completeLinkedInAuth
      this.linkedinConfig.redirectUri = callbackUrl;
  
      const state = crypto.randomBytes(16).toString('hex');
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.linkedinConfig.clientId,
        redirect_uri: callbackUrl,
        scope: 'openid profile email w_member_social', // Updated scopes
        state: state
      });
  
      return {
        url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
        state: state
      };
    } catch (error) {
      logger.error('LinkedIn auth URL generation error:', error);
      throw new Error('Failed to generate LinkedIn auth URL');
    }
  }

  async completeLinkedInAuth(code, callbackUrl) {
    try {
      if (!code) {
        throw new Error('Authorization code is required');
      }
  
      // Exchange code for access token
      const tokenData = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.linkedinConfig.clientId,
        client_secret: this.linkedinConfig.clientSecret,
        redirect_uri: this.linkedinConfig.redirectUri
      });
  
      const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
  
      if (tokenResponse.status !== 200) {
        throw new Error(`LinkedIn API returned status ${tokenResponse.status}`);
      }
  
      const { access_token, refresh_token } = tokenResponse.data;
  
      // Get user profile info
      const userResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-RestLi-Protocol-Version': '2.0.0' // Required for LinkedIn API v2
        }
      });
  
      // Extract user data from userinfo endpoint
      const userData = userResponse.data;
  
      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        userId: userData.sub, // 'sub' is the user ID in userinfo
        username: userData.name,
      };
  
    } catch (error) {
      if (error.response) {
        console.error('LinkedIn auth completion error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      logger.error('LinkedIn auth completion error:', error.response.data);
      throw new Error(`Failed to complete LinkedIn authentication: ${error.message}`);
    }
  }

  // Refresh token methods
  async refreshTwitterToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }

      const tokenData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.twitterConfig.clientId
      });

      // Add client_secret for confidential clients
      if (this.twitterConfig.clientSecret) {
        tokenData.append('client_secret', this.twitterConfig.clientSecret);
      }

      const response = await axios.post('https://api.twitter.com/2/oauth2/token', tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Twitter API returned status ${response.status}`);
      }

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      if (error.response) {
        console.error('Twitter token refresh error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      logger.error('Twitter token refresh error:', error);
      throw new Error(`Failed to refresh Twitter token: ${error.message}`);
    }
  }


  async refreshLinkedInToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }

      const tokenData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.linkedinConfig.clientId,
        client_secret: this.linkedinConfig.clientSecret
      });

      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.status !== 200) {
        throw new Error(`LinkedIn API returned status ${response.status}`);
      }

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken
      };
    } catch (error) {
      if (error.response) {
        console.error('LinkedIn token refresh error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      logger.error('LinkedIn token refresh error:', error);
      throw new Error(`Failed to refresh LinkedIn token: ${error.message}`);
    }
  }

  // Utility method to clean up expired tokens
  cleanupExpiredTokens() {
    // Clean up expired code verifiers (you'd implement TTL logic here)
    console.log('Token cleanup would be implemented here');
  }
}

module.exports = new SocialAuthService();
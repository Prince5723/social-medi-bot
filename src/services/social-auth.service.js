const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const logger = require('../config/logger');

class SocialAuthService {
  constructor() {
    // Twitter OAuth 1.0a
    this.twitterOAuth = new OAuth({
      consumer: {
        key: process.env.TWITTER_API_KEY,
        secret: process.env.TWITTER_API_SECRET
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto
          .createHmac('sha1', key)
          .update(base_string)
          .digest('base64');
      }
    });

    // Instagram OAuth 2.0
    this.instagramConfig = {
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI
    };

    // LinkedIn OAuth 2.0
    this.linkedinConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      redirectUri: process.env.LINKEDIN_REDIRECT_URI
    };

    // In-memory store for request tokens (use Redis/DB in production)
    this.tokenStore = new Map();
  }

  // Twitter OAuth 1.0a Implementation
  async getTwitterAuthUrl(callbackUrl) {
    try {
      // Validate callback URL
      if (!callbackUrl) {
        throw new Error('Callback URL is required');
      }

      const request_data = {
        url: 'https://api.twitter.com/oauth/request_token',
        method: 'POST',
        data: { oauth_callback: callbackUrl }
      };

      // Generate OAuth headers
      const authHeader = this.twitterOAuth.toHeader(this.twitterOAuth.authorize(request_data));
      console.log("Generated OAuth headers");

      // Make the request
      const response = await axios.post(request_data.url, null, {
        headers: {
          ...authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log("Response status:", response.status);

      // Check if response is successful
      if (response.status !== 200) {
        throw new Error(`Twitter API returned status ${response.status}`);
      }

      // Parse the response
      const params = new URLSearchParams(response.data);
      const oauth_token = params.get('oauth_token');
      const oauth_token_secret = params.get('oauth_token_secret');
      const oauth_callback_confirmed = params.get('oauth_callback_confirmed');

      // Validate required parameters
      if (!oauth_token) {
        throw new Error('oauth_token not found in response');
      }

      if (!oauth_token_secret) {
        throw new Error('oauth_token_secret not found in response');
      }

      if (oauth_callback_confirmed !== 'true') {
        throw new Error('OAuth callback not confirmed by Twitter');
      }

      // Store the oauth_token_secret for later use
      this.tokenStore.set(oauth_token, oauth_token_secret);

      return `https://api.twitter.com/oauth/authorize?oauth_token=${oauth_token}`;
      
    } catch (error) {
      // Enhanced error logging
      if (error.response) {
        console.error('Twitter API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        // Handle specific Twitter API errors
        if (error.response.status === 401) {
          throw new Error('Twitter OAuth authentication failed. Check your API keys and signatures.');
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
      
      logger.error('Twitter auth URL generation error:', error);
      throw new Error(`Failed to generate Twitter auth URL: ${error.message}`);
    }
  }

  async completeTwitterAuth(oauth_token, oauth_verifier) {
    try {
      if (!oauth_token || !oauth_verifier) {
        throw new Error('oauth_token and oauth_verifier are required');
      }

      // Retrieve the stored token secret
      const oauth_token_secret = this.tokenStore.get(oauth_token);
      if (!oauth_token_secret) {
        throw new Error('oauth_token_secret not found. Token may have expired.');
      }

      const request_data = {
        url: 'https://api.twitter.com/oauth/access_token',
        method: 'POST',
        data: { oauth_token, oauth_verifier }
      };

      // Create OAuth with the request token
      const token = {
        key: oauth_token,
        secret: oauth_token_secret
      };

      const headers = this.twitterOAuth.toHeader(this.twitterOAuth.authorize(request_data, token));

      const response = await axios.post(request_data.url, null, {
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Twitter API returned status ${response.status}`);
      }

      const params = new URLSearchParams(response.data);
      const access_token = params.get('oauth_token');
      const access_token_secret = params.get('oauth_token_secret');
      const user_id = params.get('user_id');
      const screen_name = params.get('screen_name');

      // Clean up stored token
      this.tokenStore.delete(oauth_token);

      // Get additional user info using Twitter API v2
      let userDetails = { username: screen_name };
      try {
        const userToken = { key: access_token, secret: access_token_secret };
        const userRequest = {
          url: `https://api.twitter.com/2/users/${user_id}?user.fields=name,username,profile_image_url`,
          method: 'GET'
        };

        const userHeaders = this.twitterOAuth.toHeader(this.twitterOAuth.authorize(userRequest, userToken));
        const userResponse = await axios.get(userRequest.url, {
          headers: userHeaders
        });

        if (userResponse.status === 200 && userResponse.data.data) {
          userDetails = {
            username: userResponse.data.data.username,
            name: userResponse.data.data.name,
            profileImage: userResponse.data.data.profile_image_url
          };
        }
      } catch (userError) {
        console.warn('Failed to fetch additional user details:', userError.message);
      }

      return {
        accessToken: access_token,
        accessTokenSecret: access_token_secret,
        userId: user_id,
        username: userDetails.username,
        name: userDetails.name,
        profileImage: userDetails.profileImage
      };
    } catch (error) {
      if (error.response) {
        console.error('Twitter auth completion error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      logger.error('Twitter auth completion error:', error);
      throw new Error(`Failed to complete Twitter authentication: ${error.message}`);
    }
  }

  // Instagram OAuth 2.0 Implementation
  async getInstagramAuthUrl(callbackUrl) {
    try {
      if (!callbackUrl) {
        throw new Error('Callback URL is required');
      }

      const state = crypto.randomBytes(16).toString('hex');
      const params = new URLSearchParams({
        client_id: this.instagramConfig.clientId,
        redirect_uri: callbackUrl,
        scope: 'user_profile,user_media',
        response_type: 'code',
        state: state
      });

      return {
        url: `https://api.instagram.com/oauth/authorize?${params.toString()}`,
        state: state
      };
    } catch (error) {
      logger.error('Instagram auth URL generation error:', error);
      throw new Error('Failed to generate Instagram auth URL');
    }
  }

  async completeInstagramAuth(code, callbackUrl) {
    try {
      if (!code) {
        throw new Error('Authorization code is required');
      }

      // Exchange code for access token
      const tokenData = new URLSearchParams({
        client_id: this.instagramConfig.clientId,
        client_secret: this.instagramConfig.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl || this.instagramConfig.redirectUri,
        code
      });

      const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (tokenResponse.status !== 200) {
        throw new Error(`Instagram API returned status ${tokenResponse.status}`);
      }

      const { access_token, user_id } = tokenResponse.data;

      // Get user info
      const userResponse = await axios.get(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${access_token}`);

      return {
        accessToken: access_token,
        refreshToken: null, // Instagram doesn't provide refresh tokens in basic flow
        userId: user_id,
        username: userResponse.data.username,
        accountType: userResponse.data.account_type
      };
    } catch (error) {
      if (error.response) {
        console.error('Instagram auth completion error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      logger.error('Instagram auth completion error:', error);
      throw new Error(`Failed to complete Instagram authentication: ${error.message}`);
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
      // console.log("code", code);
      // console.log("callbackUrl", callbackUrl);
      // console.log("this.linkedinConfig.clientId", this.linkedinConfig.clientId);
      // console.log("this.linkedinConfig.clientSecret", this.linkedinConfig.clientSecret);
      // console.log("this.linkedinConfig.redirectUri", this.linkedinConfig.redirectUri);
  
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
      // console.log("tokenResponse", tokenResponse);
  
      if (tokenResponse.status !== 200) {
        throw new Error(`LinkedIn API returned status ${tokenResponse.status}`);
      }
  
      const { access_token, refresh_token } = tokenResponse.data;
  
      // Get user profile info - FIXED: Added required header
      const userResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-RestLi-Protocol-Version': '2.0.0' // Required for LinkedIn API v2
        }
      });
  
      // Extract user data from userinfo endpoint
      const userData = userResponse.data;
      // console.log("userData", userData);
  
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
    // Twitter OAuth 1.0a doesn't have refresh tokens
    throw new Error('Twitter OAuth 1.0a does not support refresh tokens');
  }

  async refreshInstagramToken(refreshToken) {
    // Instagram basic display API doesn't provide refresh tokens
    throw new Error('Instagram basic display API does not support refresh tokens');
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
    // In production, you'd want to implement proper token cleanup with TTL
    // For now, this is a placeholder
    console.log('Token cleanup would be implemented here');
  }
}

module.exports = new SocialAuthService();
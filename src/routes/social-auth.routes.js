const express = require('express');
const { z } = require('zod');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const socialAuthController = require('../controllers/social-auth.controller');

const router = express.Router();

// Validation schemas
const initiateAuthSchema = z.object({
  body: z.object({
    callbackUrl: z.string().url('Invalid callback URL')
  })
});

// Twitter OAuth routes
router.post('/twitter/initiate', auth, validate(initiateAuthSchema), socialAuthController.initiateTwitterAuth);
router.get('/twitter/callback', socialAuthController.twitterCallback);

// LinkedIn OAuth routes
router.post('/linkedin/initiate', auth, validate(initiateAuthSchema), socialAuthController.initiateLinkedInAuth);
router.get('/linkedin/callback', socialAuthController.linkedinCallback);

// Account management routes
router.get('/accounts', auth, socialAuthController.getConnectedAccounts);
router.delete('/accounts/:platform', auth, socialAuthController.disconnectAccount);

module.exports = router; 
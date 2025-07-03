const express = require('express');
const { z } = require('zod');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const interactionController = require('../controllers/interaction.controller');

const router = express.Router();

// Validation schemas
const createInteractionSchema = z.object({
  body: z.object({
    platform: z.enum(['twitter', 'instagram', 'linkedin']),
    action: z.enum(['like', 'comment', 'follow', 'retweet', 'share']),
    targetUser: z.object({
      userId: z.string(),
      username: z.string(),
      displayName: z.string().optional()
    }).optional(),
    targetContent: z.object({
      contentId: z.string(),
      contentType: z.enum(['post', 'story', 'reel', 'article']).optional(),
      text: z.string().optional(),
      hashtags: z.array(z.string()).optional()
    }).optional(),
    comment: z.object({
      text: z.string()
    }).optional(),
    automationRule: z.object({
      ruleId: z.string().optional(),
      ruleType: z.enum(['hashtag', 'keyword', 'user_target', 'trending']).optional(),
      trigger: z.string().optional()
    }).optional(),
    metadata: z.object({
      hashtags: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
      location: z.string().optional(),
      language: z.string().optional()
    }).optional()
  })
});

const updateInteractionRulesSchema = z.object({
  body: z.object({
    interactionRules: z.array(z.object({
      platform: z.string(),
      hashtags: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
      action: z.enum(['like', 'comment', 'follow']),
      frequency: z.enum(['hourly', 'daily', 'weekly'])
    }))
  })
});

const toggleAutoInteractionSchema = z.object({
  body: z.object({
    enabled: z.boolean()
  })
});

// Routes
router.post('/', auth, validate(createInteractionSchema), interactionController.createInteraction);
router.post('/:id/execute', auth, interactionController.executeInteraction);
router.get('/history', auth, interactionController.getInteractionHistory);
router.get('/stats', auth, interactionController.getInteractionStats);
router.get('/content/:platform', auth, interactionController.findContentForInteraction);
router.put('/rules', auth, validate(updateInteractionRulesSchema), interactionController.updateInteractionRules);
router.put('/auto-interaction', auth, validate(toggleAutoInteractionSchema), interactionController.toggleAutoInteraction);

module.exports = router; 
const express = require('express');
const { z } = require('zod');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const trendController = require('../controllers/trend.controller');

const router = express.Router();

// Validation schemas
const createCustomTrendSchema = z.object({
  body: z.object({
    platform: z.enum(['twitter', 'linkedin', 'global']),
    trendType: z.enum(['hashtag', 'topic', 'keyword', 'user']),
    value: z.string().min(1),
    displayName: z.string().min(1),
    category: z.enum(['entertainment', 'sports', 'politics', 'technology', 'business', 'health', 'other']).optional()
  })
});

const updateTrendStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean()
  })
});

// Routes
router.get('/', trendController.getTrends); // Public endpoint for trends
router.get('/:id', trendController.getTrend);
router.post('/custom', auth, validate(createCustomTrendSchema), trendController.createCustomTrend);
router.put('/:id/status', auth, validate(updateTrendStatusSchema), trendController.updateTrendStatus);
router.delete('/:id', auth, trendController.deleteTrend);

module.exports = router; 
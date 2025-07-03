const express = require('express');
const { z } = require('zod');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters')
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    settings: z.object({
      autoPosting: z.boolean().optional(),
      autoInteraction: z.boolean().optional(),
      dailyPostLimit: z.number().min(1).max(50).optional(),
      interactionRules: z.array(z.object({
        platform: z.string(),
        hashtags: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
        action: z.enum(['like', 'comment', 'follow']).optional(),
        frequency: z.enum(['hourly', 'daily', 'weekly']).optional()
      })).optional()
    }).optional()
  })
});

// Routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, validate(updateProfileSchema), authController.updateProfile);

module.exports = router; 
const express = require('express');
const { z } = require('zod');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const postController = require('../controllers/post.controller');

const router = express.Router();

// Validation schemas
const createPostSchema = z.object({
  body: z.object({
    platform: z.enum(['twitter',  'linkedin']),
    content: z.object({
      text: z.string().min(1).max(280),
      media: z.array(z.string()).optional()
    }),
    scheduledTime: z.string().datetime()
  })
});

const updatePostSchema = z.object({
  body: z.object({
    content: z.object({
      text: z.string().min(1).max(280).optional(),
      media: z.array(z.string()).optional()
    }).optional(),
    scheduledTime: z.string().datetime().optional()
  })
});

// Routes
router.post('/', auth, validate(createPostSchema), postController.createScheduledPost);
router.get('/', auth, postController.listScheduledPosts);
router.get('/:id', auth, postController.getScheduledPost);
router.put('/:id', auth, validate(updatePostSchema), postController.updateScheduledPost);
router.delete('/:id', auth, postController.cancelScheduledPost);

module.exports = router; 
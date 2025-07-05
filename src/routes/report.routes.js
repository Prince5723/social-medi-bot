const express = require('express');
const { z } = require('zod');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const reportController = require('../controllers/report.controller');

const router = express.Router();

// Validation schemas
const generateReportSchema = z.object({
  body: z.object({
    platform: z.enum(['twitter', 'linkedin', 'all']),
    reportType: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    })
  })
});

// Routes
router.post('/', auth, validate(generateReportSchema), reportController.generateReport);
router.get('/', auth, reportController.getReports);
router.get('/:id', auth, reportController.getReport);
router.delete('/:id', auth, reportController.deleteReport);

module.exports = router; 
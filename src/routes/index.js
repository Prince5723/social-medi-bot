const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/posts', require('./post.routes'));
router.use('/interactions', require('./interaction.routes'));
router.use('/reports', require('./report.routes'));
router.use('/trends', require('./trend.routes'));
router.use('/social-auth', require('./social-auth.routes'));

module.exports = router; 
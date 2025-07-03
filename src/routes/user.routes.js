const express = require('express');
const auth = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

// Routes
router.get('/', auth, userController.getUsers);
router.get('/:id', auth, userController.getUserById);
router.delete('/:id', auth, userController.deleteUser);

module.exports = router; 
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth');

router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Auth Routes',
  })
});

router.use('/login', authController.login);
router.use('/register', authController.register);
router.use('/logout', authController.logout);
router.use('/user-info', authController.verifyToken, authController.userInfo);
// Create a refresh token endpoint

module.exports = router;
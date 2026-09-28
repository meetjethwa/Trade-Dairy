const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile, requestPasswordResetOtp, resetPasswordWithOtp } = require('../Controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', requestPasswordResetOtp);
router.post('/reset-password', resetPasswordWithOtp);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;

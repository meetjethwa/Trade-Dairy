const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const hashResetOtp = (otp) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(otp).digest('hex');

const sendResetOtpEmail = async (email, otp) => {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is missing');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESET_EMAIL_FROM || 'TradeDiary <onboarding@resend.dev>',
      to: [email],
      subject: 'Your TradeDiary password reset code',
      text: `Your TradeDiary verification code is ${otp}. It expires in 10 minutes. If you did not request a password reset, you can ignore this email.`,
      html: `<p>Your TradeDiary verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Password reset email provider returned ${response.status}`);
};

const clearPasswordResetOtp = (user) => {
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  user.passwordResetOtpRequestedAt = undefined;
  user.passwordResetOtpAttempts = 0;
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password });

    if (user) {
      res.status(201).json({
        token: generateToken(user._id),
        user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        avatar: user.avatar,
        createdAt: user.createdAt,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        token: generateToken(user._id),
        user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        avatar: user.avatar,
        createdAt: user.createdAt,
        },
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    username: req.user.username,
    phone: req.user.phone,
    dateOfBirth: req.user.dateOfBirth,
    avatar: req.user.avatar,
    createdAt: req.user.createdAt,
  });
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, username, phone, dateOfBirth, avatar } = req.body;
    if (!name || !email || !username) return res.status(400).json({ message: 'Name, email and username are required' });
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({ message: 'Username must be 3–30 letters, numbers, or underscores' });
    const existing = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user._id } });
    if (existing) return res.status(400).json({ message: 'That username is already in use' });
    const user = await User.findByIdAndUpdate(req.user._id, { name, email: email.toLowerCase(), username: username.toLowerCase(), phone: phone || '', dateOfBirth: dateOfBirth || '', avatar: avatar || '' }, { new: true });
    res.json({ _id: user._id, name: user.name, email: user.email, username: user.username, phone: user.phone, dateOfBirth: user.dateOfBirth, avatar: user.avatar, createdAt: user.createdAt });
  } catch (error) {
    res.status(500).json({ message: 'Unable to update profile' });
  }
};

// @route POST /api/auth/forgot-password
const requestPasswordResetOtp = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
  if (!process.env.JWT_SECRET || !process.env.RESEND_API_KEY) {
    return res.status(503).json({ message: 'Email delivery is not configured. Add RESEND_API_KEY to Backend/.env, then restart the backend.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If an account exists for that email, a verification code has been sent.' });

    const now = Date.now();
    if (user.passwordResetOtpRequestedAt && now - user.passwordResetOtpRequestedAt.getTime() < 60_000) {
      return res.status(429).json({ message: 'Please wait a minute before requesting another code.' });
    }

    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    user.passwordResetOtpHash = hashResetOtp(otp);
    user.passwordResetOtpExpiresAt = new Date(now + 10 * 60_000);
    user.passwordResetOtpRequestedAt = new Date(now);
    user.passwordResetOtpAttempts = 0;
    await user.save();
    await sendResetOtpEmail(email, otp);
    return res.json({ message: 'If an account exists for that email, a verification code has been sent.' });
  } catch (error) {
    console.error('Password reset email error:', error.message);
    return res.status(503).json({ message: 'Unable to send a verification code right now. Please try again later.' });
  }
};

// @route POST /api/auth/reset-password
const resetPasswordWithOtp = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  const password = String(req.body.password || '');
  if (!email || !/^\d{6}$/.test(otp)) return res.status(400).json({ message: 'Enter the email and 6-digit verification code' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    const user = await User.findOne({ email });
    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt <= new Date()) {
      return res.status(400).json({ message: 'The code is invalid or expired. Request a new code.' });
    }
    if (user.passwordResetOtpAttempts >= 5) {
      clearPasswordResetOtp(user);
      await user.save();
      return res.status(400).json({ message: 'Too many incorrect attempts. Request a new code.' });
    }

    const expected = Buffer.from(user.passwordResetOtpHash, 'hex');
    const received = Buffer.from(hashResetOtp(otp), 'hex');
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      user.passwordResetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: 'The code is invalid or expired. Request a new code.' });
    }

    user.password = password;
    clearPasswordResetOtp(user);
    await user.save();
    return res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to reset password right now.' });
  }
};

module.exports = { registerUser, loginUser, getMe, updateProfile, requestPasswordResetOtp, resetPasswordWithOtp };

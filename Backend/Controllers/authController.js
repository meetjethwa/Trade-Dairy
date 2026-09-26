const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = { registerUser, loginUser, getMe, updateProfile };

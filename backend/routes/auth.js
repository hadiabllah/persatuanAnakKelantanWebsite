const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: '24h'
  });
};

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (!(role === 'Pentadbir' || role === 'admin')) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: username }
      ],
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        icNumber: user.icNumber,
        occupation: user.occupation,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Register route
// Public self-registration (if you want to keep it). For admin-only creation, use /create below.
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, icNumber, occupation } = req.body;

    // Validate input
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Create new user
    const allowedOccupations = [
      'Keselamatan',
      'Perkhidmatan & Hospitaliti',
      'Pertanian & Alam Sekitar',
      'Undang-Undang & Pendtadbiran',
      'Seni & Kreatif',
      'Perniagaan & Kewangan',
      'Pendidikan & Latihan',
      'Sains & Kesihatan',
      'Teknologi Maklumat',
      'Teknikal & Kejuruteraan'
    ];
    const occCandidate = (occupation || '').toString();
    const occupationToSet = allowedOccupations.includes(occCandidate) ? occCandidate : undefined;

    const user = new User({
      username,
      email,
      password,
      fullName,
      icNumber,
      ...(occupationToSet ? { occupation: occupationToSet } : {})
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        icNumber: user.icNumber,
        occupation: user.occupation,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Admin-only: create user
router.post('/create', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, fullName, icNumber, occupation, role } = req.body;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' });
    }

    // validate role
    const allowedRoles = ['Pentadbir', 'Setiausaha', 'Bendahari', 'Ahli'];
    const roleCandidate = (role || '').toString();
    const roleToSet = allowedRoles.includes(roleCandidate) ? roleCandidate : 'Ahli';

    const allowedOccupations = [
      'Keselamatan',
      'Perkhidmatan & Hospitaliti',
      'Pertanian & Alam Sekitar',
      'Undang-Undang & Pendtadbiran',
      'Seni & Kreatif',
      'Perniagaan & Kewangan',
      'Pendidikan & Latihan',
      'Sains & Kesihatan',
      'Teknologi Maklumat',
      'Teknikal & Kejuruteraan'
    ];
    const occCandidate = (occupation || '').toString();
    const occupationToSet = allowedOccupations.includes(occCandidate) ? occCandidate : undefined;

    const user = new User({ username, email, password, fullName, icNumber, role: roleToSet, ...(occupationToSet ? { occupation: occupationToSet } : {}) });
    await user.save();

    res.status(201).json({ success: true, message: 'User created', user: { id: user._id, username: user.username, email: user.email, fullName: user.fullName, icNumber: user.icNumber, occupation: user.occupation, role: user.role } });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ success: false, message: 'Server error during user creation' });
  }
});

// Verify token route
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Update current user's profile (name/password)
router.put('/me', authenticate, async (req, res) => {
  try {
    const { fullName, password } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName && typeof fullName === 'string' && fullName.trim().length > 0) {
      user.fullName = fullName.trim();
    }
    if (password && typeof password === 'string') {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      user.password = password; // will be hashed by pre-save hook
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
});

// Admin-only: list users
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'username email fullName icNumber occupation role createdAt').sort({ createdAt: -1 });
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
});

// Admin-only: delete user by id
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // prevent admin from deleting self
    if (req.user && String(req.user._id) === String(id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted', userId: id });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting user' });
  }
});

module.exports = router;
const express = require('express');
const jwt = require('jsonwebtoken');
const Ahli = require('../models/Ahli');
const User = require('../models/User');

const router = express.Router();

// Auth middleware (copied pattern from auth routes)
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

// Create Ahli
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { idNo, fullName, icNumber, phoneNumber, email, address, gender, job } = req.body;

    if (!idNo || !fullName) {
      return res.status(400).json({ success: false, message: 'idNo and fullName are required' });
    }

    // Validate enums
    const allowedGenders = ['Lelaki', 'Perempuan'];
    const allowedJobs = [
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

    const genderToSet = allowedGenders.includes((gender || '').toString()) ? gender : undefined;
    const jobToSet = allowedJobs.includes((job || '').toString()) ? job : undefined;

    const ahli = new Ahli({ idNo, fullName, icNumber, phoneNumber, email, address, ...(genderToSet ? { gender: genderToSet } : {}), ...(jobToSet ? { job: jobToSet } : {}) });
    await ahli.save();

    res.status(201).json({ success: true, message: 'Ahli created', ahli });
  } catch (error) {
    console.error('Create Ahli error:', error);
    if (error && error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate idNo' });
    }
    res.status(500).json({ success: false, message: 'Server error creating Ahli' });
  }
});

// List Ahli
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const list = await Ahli.find({}, 'idNo fullName icNumber phoneNumber email address gender job createdAt').sort({ createdAt: -1 });
    res.json({ success: true, ahli: list });
  } catch (error) {
    console.error('List Ahli error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching Ahli' });
  }
});

// Delete Ahli
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Ahli.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Ahli not found' });
    }
    res.json({ success: true, message: 'Ahli deleted', id });
  } catch (error) {
    console.error('Delete Ahli error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting Ahli' });
  }
});

// Update Ahli
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { idNo, fullName, icNumber, phoneNumber, email, address, gender, job } = req.body;

    const allowedGenders = ['Lelaki', 'Perempuan'];
    const allowedJobs = [
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

    const update = {};
    if (typeof idNo === 'string' && idNo.trim()) update.idNo = idNo.trim();
    if (typeof fullName === 'string' && fullName.trim()) update.fullName = fullName.trim();
    if (typeof icNumber === 'string') update.icNumber = icNumber.trim();
    if (typeof phoneNumber === 'string') update.phoneNumber = phoneNumber.trim();
    if (typeof email === 'string') update.email = email.trim();
    if (typeof address === 'string') update.address = address.trim();
    if (typeof gender === 'string' && allowedGenders.includes(gender)) update.gender = gender;
    if (typeof job === 'string' && allowedJobs.includes(job)) update.job = job;

    const updated = await Ahli.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Ahli not found' });
    }
    res.json({ success: true, message: 'Ahli updated', ahli: updated });
  } catch (error) {
    console.error('Update Ahli error:', error);
    if (error && error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate idNo' });
    }
    res.status(500).json({ success: false, message: 'Server error updating Ahli' });
  }
});

module.exports = router;



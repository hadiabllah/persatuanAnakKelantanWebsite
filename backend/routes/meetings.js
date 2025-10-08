const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

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

// Create a new meeting
router.post('/create', authenticate, async (req, res) => {
  try {
    const { title, datetime, place, agenda } = req.body;
    const createdBy = req.user.id;

    // Validate required fields
    if (!title || !datetime || !place) {
      return res.status(400).json({
        success: false,
        message: 'Title, date & time, and place are required'
      });
    }

    // Parse agenda if it's a string (from textarea)
    let agendaArray = [];
    if (agenda) {
      if (typeof agenda === 'string') {
        agendaArray = agenda.split('\n').filter(item => item.trim());
      } else if (Array.isArray(agenda)) {
        agendaArray = agenda.filter(item => item.trim());
      }
    }

    const meeting = new Meeting({
      title,
      datetime: new Date(datetime),
      place,
      agenda: agendaArray,
      createdBy
    });

    await meeting.save();

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      meeting
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating meeting'
    });
  }
});

// Get all meetings
router.get('/', authenticate, async (req, res) => {
  try {
    const meetings = await Meeting.find({ isActive: true })
      .populate('createdBy', 'username fullName')
      .populate('attendees.user', 'username fullName email')
      .sort({ datetime: 1 });

    res.json({
      success: true,
      meetings
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching meetings'
    });
  }
});

// Get upcoming meetings
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const meetings = await Meeting.find({
      isActive: true,
      datetime: { $gte: now },
      status: 'upcoming'
    })
      .populate('createdBy', 'username fullName')
      .sort({ datetime: 1 })
      .limit(5);

    res.json({
      success: true,
      meetings
    });
  } catch (error) {
    console.error('Get upcoming meetings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming meetings'
    });
  }
});

// Get meeting by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('createdBy', 'username fullName')
      .populate('attendees.user', 'username fullName email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching meeting'
    });
  }
});

// Update meeting RSVP
router.post('/:id/rsvp', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;
    const meetingId = req.params.id;

    if (!['attending', 'not_attending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid RSVP status'
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user already has an RSVP
    const existingRSVP = meeting.attendees.find(
      attendee => attendee.user.toString() === userId
    );

    if (existingRSVP) {
      // Update existing RSVP
      existingRSVP.status = status;
      existingRSVP.respondedAt = new Date();
    } else {
      // Add new RSVP
      meeting.attendees.push({
        user: userId,
        status,
        respondedAt: new Date()
      });
    }

    await meeting.save();

    res.json({
      success: true,
      message: `RSVP updated: ${status === 'attending' ? 'Attending' : 'Not attending'}`
    });
  } catch (error) {
    console.error('Update RSVP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating RSVP'
    });
  }
});

// Update meeting
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, datetime, place, agenda } = req.body;
    const meetingId = req.params.id;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is the creator or admin
    if (meeting.createdBy.toString() !== userId && req.user.role !== 'Pentadbir') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this meeting'
      });
    }

    // Update fields
    if (title) meeting.title = title;
    if (datetime) meeting.datetime = new Date(datetime);
    if (place) meeting.place = place;
    if (agenda) {
      let agendaArray = [];
      if (typeof agenda === 'string') {
        agendaArray = agenda.split('\n').filter(item => item.trim());
      } else if (Array.isArray(agenda)) {
        agendaArray = agenda.filter(item => item.trim());
      }
      meeting.agenda = agendaArray;
    }

    await meeting.save();

    res.json({
      success: true,
      message: 'Meeting updated successfully',
      meeting
    });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating meeting'
    });
  }
});

// Delete meeting
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is the creator or admin
    if (meeting.createdBy.toString() !== userId && req.user.role !== 'Pentadbir') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this meeting'
      });
    }

    // Soft delete
    meeting.isActive = false;
    await meeting.save();

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting meeting'
    });
  }
});

module.exports = router;

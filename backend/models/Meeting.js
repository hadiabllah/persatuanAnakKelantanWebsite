const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  datetime: {
    type: Date,
    required: true
  },
  place: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  agenda: [{
    type: String,
    trim: true,
    maxlength: 500
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['attending', 'not_attending', 'pending'],
      default: 'pending'
    },
    respondedAt: {
      type: Date
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  }
}, {
  timestamps: true
});

// Index for better query performance
meetingSchema.index({ datetime: 1 });
meetingSchema.index({ createdBy: 1 });
meetingSchema.index({ status: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);

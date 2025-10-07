const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  icNumber: {
    type: String,
    required: false,
    trim: true
  },
  occupation: {
    type: String,
    enum: [
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
    ]
  },
  role: {
    type: String,
    enum: ['Pentadbir', 'Setiausaha', 'Bendahari', 'Ahli'],
    default: 'Ahli'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

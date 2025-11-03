const mongoose = require('mongoose');

const ahliSchema = new mongoose.Schema({
  idNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
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
  phoneNumber: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    required: false,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Lelaki', 'Perempuan'],
    required: false
  },
  job: {
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
    ],
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ahli', ahliSchema);



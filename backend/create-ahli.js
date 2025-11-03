const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/database');
const Ahli = require('./models/Ahli');

async function run() {
  try {
    await connectDB();

    const sample = {
      idNo: 'PAK-0001',
      fullName: 'Ahmad Bin Ali',
      icNumber: '900101011111',
      phoneNumber: '0123456789',
      email: 'ahmad@example.com',
      address: 'Kota Bharu, Kelantan',
      gender: 'Lelaki',
      job: 'Teknologi Maklumat'
    };

    const existing = await Ahli.findOne({ idNo: sample.idNo });
    if (existing) {
      console.log('Ahli exists, skipping create:', existing.idNo);
    } else {
      const created = await Ahli.create(sample);
      console.log('✅ Created sample Ahli:', created.idNo);
    }
  } catch (err) {
    console.error('Seed Ahli error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();



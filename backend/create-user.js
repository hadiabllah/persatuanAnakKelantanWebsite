const mongoose = require('mongoose');
const User = require('./models/User');

const createTestUser = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = 'mongodb://hdabllah6172_db_user:123@ac-lmi34xp-shard-00-00.7he571s.mongodb.net:27017,ac-lmi34xp-shard-00-01.7he571s.mongodb.net:27017,ac-lmi34xp-shard-00-02.7he571s.mongodb.net:27017/persatuan_anak_kelantan?replicaSet=atlas-yh2r8j-shard-0&ssl=true&authSource=admin';
    
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Create a test user
    const testUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      fullName: 'Administrator',
      role: 'admin'
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('Username: admin');
    console.log('Password: password123');
    console.log('Email: admin@example.com');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  }
};

createTestUser();

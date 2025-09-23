const mongoose = require('mongoose');
const User = require('./models/User');

const checkUsers = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = 'mongodb://hdabllah6172_db_user:123@ac-lmi34xp-shard-00-00.7he571s.mongodb.net:27017,ac-lmi34xp-shard-00-01.7he571s.mongodb.net:27017,ac-lmi34xp-shard-00-02.7he571s.mongodb.net:27017/persatuan_anak_kelantan?replicaSet=atlas-yh2r8j-shard-0&ssl=true&authSource=admin';
    
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Check all users
    const users = await User.find({});
    console.log(`Found ${users.length} users in database:`);
    
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`- ID: ${user._id}`);
      console.log(`- Username: ${user.username}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Full Name: ${user.fullName}`);
      console.log(`- IC Number: ${user.icNumber || 'N/A'}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Created: ${user.createdAt}`);
    });

    if (users.length === 0) {
      console.log('No users found in database!');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error checking users:', error.message);
    process.exit(1);
  }
};

checkUsers();

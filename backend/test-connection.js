const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    
    const mongoURI = 'mongodb://hdabllah6172_db_user:123@ac-lmi34xp-shard-00-00.7he571s.mongodb.net:27017,ac-lmi34xp-shard-00-01.7he571s.mongodb.net:27017,ac-lmi34xp-shard-00-02.7he571s.mongodb.net:27017/persatuan_anak_kelantan?replicaSet=atlas-yh2r8j-shard-0&ssl=true&authSource=admin';
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });

    console.log('✅ MongoDB Connected Successfully!');
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    
    await mongoose.disconnect();
    console.log('✅ Connection test completed');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
};

testConnection();

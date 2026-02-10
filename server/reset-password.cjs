const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db('school-saas');
    
    // First, check if user exists
    const user = await db.collection('users').findOne({
      email: 'admin@ghalibschool.com'
    });
    
    if (!user) {
      console.log('❌ User not found!');
      await client.close();
      return;
    }
    
    console.log('✅ User found:', user.email, user.name);
    
    // Hash the new password
    const newPassword = 'admin123';
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    console.log('Updating password...');
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { passwordHash: passwordHash } }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ PASSWORD UPDATED!');
      console.log('');
      console.log('LOGIN DETAILS:');
      console.log('Email: admin@ghalibschool.com');
      console.log('Password: admin123');
    } else {
      console.log('❌ Update failed');
    }
    
    await client.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();

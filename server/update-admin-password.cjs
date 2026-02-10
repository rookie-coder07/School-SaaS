const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

(async () => {
  try {
    await client.connect();
    const db = client.db('school-saas');

    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const result = await db.collection('users').updateOne(
      { email: 'admin@ghalibschool.com' },
      { $set: { passwordHash: passwordHash } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Password updated successfully!');
      console.log('Email: admin@ghalibschool.com');
      console.log('Password: admin123');
    } else {
      console.log('❌ User not found or not updated');
    }

    await client.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();

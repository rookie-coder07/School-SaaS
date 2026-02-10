const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

(async () => {
  try {
    await client.connect();
    const db = client.db('school-saas');

    // Find a school to associate with
    const schools = await db.collection('schools').find().toArray();
    if (schools.length === 0) {
      console.log('❌ No schools found. Create a school first.');
      await client.close();
      return;
    }

    const school = schools[0];
    console.log('Using school:', school.name);

    // Hash password
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Create admin user
    const result = await db.collection('users').insertOne({
      email: 'admin@ghalibschool.com',
      name: 'Admin Ghalib',
      passwordHash: passwordHash,
      role: 'ADMIN',
      schoolId: school._id,
      createdAt: new Date()
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@ghalibschool.com');
    console.log('Password: admin123');
    console.log('School:', school.name);

    await client.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.close();
    process.exit(1);
  }
})();
